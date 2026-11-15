# Bugfix Requirements Document

## Introduction

This document reports hidden bugs found by a read-only audit of PROMETHEUS-iPSC (React 18, TypeScript, Vite, Tailwind, WebAudio, Vercel function in `/api`). No source file was changed. Fixes and deployment wait for user approval.

Baseline checks: `tsc --noEmit` (src and api) reports no errors, `vitest run` passes (18 files, 104 tests), and `vite build` succeeds (output written to a temp folder). The bugs below are therefore runtime and behavioral, not compile errors.

Findings are ordered by severity. Items marked (latent) are in code that `App.tsx` does not mount: only `BioStitchLabView` is rendered, so `src/modules/**` (agent, voice, stream, admin) is unreachable from the UI today. They still matter because `AGENTS.md` forbids regressions in the OpenAI Realtime flow.

Severity summary:
- High: 1.1, 1.2, 1.3, 1.4
- Medium: 1.5, 1.6, 1.7, 1.8, 1.9
- Low / latent: 1.10, 1.11, 1.12

Not verified (no evidence gathered, excluded from scope): whether `api-inference.huggingface.co` still serves `Lightricks/LTX-Video`, and whether the GA Realtime `session.update` accepts the flat fields (`modalities`, `input_audio_format`) used in the data-channel config.

## Bug Analysis

### Current Behavior (Defect)

1.1 (High) WHEN any code path falls back to `/videos/fallback.mp4` (`src/utils/security.ts:6`, `src/services/videoConcatenationService.ts:8`, used by `safeVideoUrl` and `LazyVideo`) THEN the system requests a file that does not exist in `public/videos/`. On Vercel the catch-all rewrite in `vercel.json` (`/(.*)` to `/index.html`) answers that request with HTML, so the fallback video never plays and the "no unhandled media failures" rule is broken.

1.2 (High) WHEN a user creates a custom monster and the generated video or audio is absent THEN the system assigns `videoSrc: "/videos/dragon_growth.mp4"` and `roarAudio: "/sounds/dragon_roar.mp3"` (`src/components/bioreactor/CustomMonsterStudio.tsx:192-193`). Neither file exists (`public/videos` holds `chimera_growth_dragon_24s.mp4`, and `public/sounds` has no dragon roar), so the bioreactor, arena preview, and roar playback fail silently for every custom monster without generated media.

1.3 (High) WHEN the active experiment changes or the microscopy video cannot play THEN the viewport in `src/components/BioStitchLabView.tsx` handles media failure incorrectly:
- The effect at lines 1006-1014 calls `videoRef.current.load()` and `play()` on an element that already has `autoPlay` and a changing `key` (line ~1660). An interrupted `play()` (AbortError) or an autoplay block runs `.catch(() => setVideoFailed(true))`, which unmounts a video that would have played.
- All experiment videos are Wikimedia `.ogv` (Ogg Theora) files (`src/data/bioExperiments.ts:205-476`), which Safari and iOS do not decode, so those users always lose the video layer.
- When the video fails, the only fallback is the background `<img>` (line ~1650), which has no `onError` handler and no canvas bio-simulation. A broken hotlinked Wikimedia photo leaves a blank viewport.

1.4 (High) WHEN a React render error is thrown in any component THEN the app shows a blank white-on-dark page, because `src/ErrorBoundary.tsx` exists but `src/main.tsx` and `src/App.tsx` never wrap the tree in it.

1.5 (Medium) WHEN the narrator toggles, the language changes, or the component unmounts THEN speech and audio resources are mishandled in `BioStitchLabView.tsx`:
- `speakText` (line ~1206) awaits a Google Translate fetch after calling `speechSynthesis.cancel()`. If the user mutes or switches experiment during that await, the stale utterance still starts and speaks over the new state.
- The effect at lines ~1264-1291 returns a cleanup that clears the interval but never calls `speechSynthesis.cancel()`, so narration continues after unmount.
- The shared `AudioContext` in `audioCtxRef` (created at lines ~212, 1028, 1056, 1121) is never closed on unmount, and the browser limits the number of live contexts.

1.6 (Medium) WHEN the user opens the Lab Manual THEN the layout and content do not match the steering rules:
- The Help button is in the page header after the `PROMETHEUS-iPSC` title (lines ~1596-1606), and no `LIVE BIO-FEED` badge exists in the source, so the button is not next to such a badge.
- The modal (lines ~2514-2580) shows 4 cards, not the required 6-point summary.
- The confirm button text "확인 완료 — 현재 실험실 화면으로 돌아가기" is hard-coded Korean, and all four card bodies ignore `isKo`, so English users see Korean text.

1.7 (Medium) WHEN a user sends a chat question that needs live lookup THEN the system can leave the Send button disabled indefinitely. `handleSendChat` sets `setIsQueryingApi(true)` at line 1540 and resets it at line 1542 outside a `try/finally`, and every `fetch` in `src/services/scienceStitchService.ts` (EuropePMC, Wikipedia, Google Translate) has no timeout or `AbortController`. A hung request or a thrown error keeps `isQueryingApi` true and the input unusable until reload.

1.8 (Medium) WHEN `/api/generate-video` is called THEN `api/generate-video.ts` misbehaves:
- `UPSTREAM_TIMEOUT_MS` (60 s) equals `config.maxDuration` (60 s), so the platform can terminate the function before the 504 handler runs.
- The HuggingFace branch buffers the whole MP4 and returns it with `res.send(Buffer)`. Vercel serverless responses are limited to about 4.5 MB, so a typical video fails with a payload-too-large error instead of the controlled error path.
- The Luma branch returns the raw generation JSON, which has no `videoUrl`, `assets.video`, or `video.url` field at creation time. `pickVideoUrl` (`src/services/aiVideoService.ts`) and `generateMonsterVideo` (`src/services/videoGenService.ts:41-48`) then discard it, and the client reports a misleading `NO_API_KEY` error.
- A single `apiKey` from the request body is used as both the HuggingFace and Luma token (`hfToken`/`lumaKey`), so a Luma key can be sent to HuggingFace and the reverse.

1.9 (Medium) WHEN a caller sends many requests to `/api/generate-video` THEN the rate limit is weak. `clientIp` trusts the first `x-forwarded-for` value, which a client can set freely, and `SlidingWindowRateLimiter` keeps state in module memory, so each serverless instance has its own counter. The 10 requests per minute limit is easy to bypass.

1.10 (Low) WHEN video generation or custom-monster rendering succeeds repeatedly THEN `URL.createObjectURL` blobs are created and never revoked (`src/services/aiVideoService.ts:162,181`, `src/services/videoGenService.ts:35,68`, `src/services/customMonsterMediaService.ts:495`), so memory grows for the whole session. In `BioStitchLabView.tsx` the arena `setTimeout` handles in `arenaTimersRef` are cleared only when a new battle starts (line ~341), not on unmount.

1.11 (Low, latent) WHEN `GptLiveService.connect` runs (`src/modules/agent/gptLiveService.ts`) THEN it breaks the `AGENTS.md` Realtime contract:
- It always posts `multipart/form-data` to `/v1/realtime/calls` (lines 147-166), even after obtaining an ephemeral `client_secret`. The ephemeral path must send raw SDP with `Content-Type: application/sdp`.
- The `session` form field includes `instructions` and `voice` (lines 152-156), and the `client_secrets` body includes `voice` (line 100). `AGENTS.md` says these cause `Unknown parameter` 400 errors and belong in the later `session.update`.
- The model is hard-coded to `gpt-4o-realtime-preview` with no fallback to `gpt-realtime`.

1.12 (Low, latent) WHEN `useGptLiveVoice` (`src/modules/voice/useGptLiveVoice.ts`) handles errors and events THEN it has state bugs:
- Failure paths call `reportError(...)` and then `stopVoice()` (lines 222-223, 233-234, 241-242, 390-391). `stopVoice` ends with `updateStatus('idle')`, so the `error` status is overwritten and the UI never shows the failure state.
- `dc.onmessage` captures `activeDomain` when the channel is set up (lines 527-577), so transcripts are always tagged `general`.
- `startVoice` has no re-entry guard. A second call while connecting overwrites `pcRef`, `dcRef`, and the microphone stream without closing the first set.
- The model-fallback retry (lines 348-358) sends multipart with the ephemeral token, which is already bound to one session.
- The OpenAI API key is stored in `localStorage` (`kiroween_openai_api_key`) in plain text.

### Expected Behavior (Correct)

2.1 WHEN any code path falls back to `/videos/fallback.mp4` THEN the system SHALL serve a real, playable fallback MP4 from `public/videos/fallback.mp4`, and SHALL configure routing so a missing static media file returns 404 instead of the SPA HTML.

2.2 WHEN a custom monster has no generated media THEN the system SHALL use default `videoSrc` and `roarAudio` paths that exist in `public/` (for example `/videos/chimera_growth_dragon_24s.mp4` and `/sounds/monster_roar_ferocious.wav`).

2.3 WHEN the active experiment changes or media fails THEN the system SHALL:
- Not set `videoFailed` for an AbortError or an autoplay block, and SHALL retry muted playback once.
- Offer a playable source for browsers without Ogg Theora support, or skip straight to the photo layer without error.
- Give the background `<img>` an `onError` fallback and show a canvas bio-simulation when both video and photo fail, so the viewport is never blank.

2.4 WHEN a render error occurs THEN the system SHALL show the `ErrorBoundary` recovery screen, because `main.tsx` or `App.tsx` wraps the app in `ErrorBoundary`.

2.5 WHEN the narrator toggles, the language or experiment changes, or the component unmounts THEN the system SHALL discard stale narration (request-id or abort check after the translate await), call `speechSynthesis.cancel()` in effect cleanup, and close the shared `AudioContext` on unmount.

2.6 WHEN the user opens the Lab Manual THEN the system SHALL show the `[❓ Help / Lab Guide]` button next to a top-left `LIVE BIO-FEED` badge, show a 6-point summary modal, localize every string by `isKo`, and return to the active experiment state on close.

2.7 WHEN a chat question needs live lookup THEN the system SHALL put every `fetch` behind a timeout (for example 8 s with `AbortController`), reset `isQueryingApi` in a `finally` block, and show a fallback reply on timeout or error.

2.8 WHEN `/api/generate-video` is called THEN the system SHALL set the upstream timeout below `maxDuration`, avoid returning large video bodies through the function response (return an upstream URL or JSON status instead), return a `videoUrl` or a pollable job id for Luma that the client understands, and read separate tokens for each provider (`provider === "luma"` uses only the Luma key).

2.9 WHEN a caller sends many requests to `/api/generate-video` THEN the system SHALL derive the client key from a trusted platform header (for example `x-vercel-forwarded-for`) and SHALL document or replace the per-instance in-memory limiter with a shared store.

2.10 WHEN generated blob URLs are replaced or no longer needed, and when `BioStitchLabView` unmounts THEN the system SHALL revoke the blob URLs and clear every pending arena timer.

2.11 WHEN `GptLiveService.connect` runs THEN the system SHALL follow `AGENTS.md`: request `client_secrets` with only `{session: {type: "realtime", model}}`, send raw SDP with `application/sdp` and the ephemeral token to `/v1/realtime/calls`, use multipart with only `sdp` and a minimal `session` on the master-key fallback, move `instructions`, `voice`, and tools into `session.update` after the data channel opens, and keep the `gpt-realtime` / `gpt-4o-realtime-preview` fallback.

2.12 WHEN `useGptLiveVoice` fails or receives events THEN the system SHALL keep the `error` status visible after cleanup, read the current domain from a ref inside `dc.onmessage`, ignore or cancel a `startVoice` call while a session is active, avoid reusing an ephemeral token for a second session, and avoid persisting the API key in plain `localStorage` without user consent.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the OpenAI Realtime flow in `useGptLiveVoice` runs on its happy path THEN the system SHALL CONTINUE TO call `/v1/realtime/client_secrets` first, send raw SDP with the ephemeral token to `/v1/realtime/calls`, and send `voice`, `instructions`, and `tools` through `session.update` after the data channel opens.

3.2 WHEN a new message arrives on a mobile viewport THEN the system SHALL CONTINUE TO slide the synapse chat over the video and absorb it with `-translate-y-full opacity-0` 3 seconds after the last message.

3.3 WHEN the active experiment's video plays and the photo loads THEN the system SHALL CONTINUE TO keep the `<video>` muted and layer it over the confocal photograph.

3.4 WHEN the user asks a question that matches a curated experiment (including follow-up and intent detection) THEN the system SHALL CONTINUE TO answer from local experiment data without a network call.

3.5 WHEN EuropePMC and Wikipedia respond within the timeout THEN the system SHALL CONTINUE TO show the stitched dossier with PMID badge, related paper, and Wikipedia summary.

3.6 WHEN `/api/generate-video` receives a non-POST request, an empty prompt, or no configured token THEN the system SHALL CONTINUE TO return 405, 400, and 400 respectively.

3.7 WHEN URLs pass `sanitizeVideoUrl` and `assertAllowedApiEndpoint` (allowlisted hosts, safe protocols) THEN the system SHALL CONTINUE TO accept them, and SHALL CONTINUE TO reject `javascript:`, `data:`, protocol-relative, and non-allowlisted URLs.

3.8 WHEN the 15-second, 6-stage bioreactor growth sequence, BattleMatrix pairing, AwakeningRoar, and the WebAudio cardiac thump run THEN the system SHALL CONTINUE TO behave as covered by the existing 104 passing tests, and `tsc` and `vite build` SHALL CONTINUE TO succeed.
