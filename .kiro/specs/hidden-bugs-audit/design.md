# Hidden Bugs Audit Bugfix Design

## Overview

A read-only audit of PROMETHEUS-iPSC found 12 runtime and behavioral bugs (requirements 1.1-1.12). Type checks, unit tests, and the build all pass, so none of them is a compile error. They fall into five groups:

- **Media failure handling (1.1, 1.2, 1.3, 1.10):** missing fallback assets, a viewport that unmounts a working video, no canvas bio-simulation fallback, and leaked blob URLs and timers.
- **Resilience (1.4, 1.5, 1.7):** no `ErrorBoundary` in the tree, stale or leaked speech and audio resources, and a chat lock that never resets after a hung fetch.
- **Steering conformance (1.6):** the Lab Manual layout, card count, and localization differ from the tech and product steering.
- **Serverless API (1.8, 1.9):** timeout, payload size, Luma response shape, token mixing, and a spoofable rate limit in `api/generate-video.ts`.
- **Realtime contract (1.11, 1.12, latent):** `src/modules/**` is not mounted by `App.tsx`, but it deviates from the `AGENTS.md` WebRTC rules.

The strategy is to make the smallest change per bug, keep each fix local to the files named in the requirements, and add regression tests. No source code is changed in this spec phase. Deployment happens only after the user approves.

Constraints that apply to every fix:

- `AGENTS.md` Realtime flow stays as specified: `/v1/realtime/client_secrets` with `{"session":{"type":"realtime","model"}}`, then raw SDP with `Content-Type: application/sdp` and the ephemeral token to `/v1/realtime/calls`. The master-key fallback uses `multipart/form-data` with only `sdp` and a minimal `session`. `voice`, `instructions`, `tools`, and `input_audio_transcription` go in `session.update` after the data channel opens. The `gpt-realtime` / `gpt-4o-realtime-preview` fallback stays.
- Tech steering: every microscopy video pairs with a confocal photo and a canvas bio-simulation fallback. The `<video>` stays muted. Mobile chat absorbs with `-translate-y-full opacity-0` 3 seconds after the last message. The Help button sits next to the top-left `LIVE BIO-FEED` badge and opens a 6-point modal.
- Dev-server rule from `AGENTS.md`: only one dev server instance may run at a time. Stop the previous one before starting another.
- Circuit-breaker rule from `AGENTS.md`: if the same edit or command fails twice, stop and report instead of retrying.

## Glossary

- **Bug_Condition (C)**: The condition under which one of the 12 defects shows. Each bug has its own `C_n`, formalized below.
- **Property (P)**: The desired behavior for inputs where `C_n` holds (requirements 2.1-2.12).
- **Preservation**: Behavior for inputs where `C_n` does not hold, which must stay identical (requirements 3.1-3.8).
- **BioStitchLabView**: `src/components/BioStitchLabView.tsx`, the only view mounted by `App.tsx`. It holds the video viewport, narrator, chat, and Lab Manual.
- **scienceStitchService**: `src/services/scienceStitchService.ts`, which calls EuropePMC, Wikipedia, and Google Translate.
- **generate-video handler**: `api/generate-video.ts`, the Vercel function that proxies HuggingFace and Luma.
- **GptLiveService**: `src/modules/agent/gptLiveService.ts`, which performs the Realtime WebRTC handshake.
- **useGptLiveVoice**: `src/modules/voice/useGptLiveVoice.ts`, the React hook that manages the voice session state.
- **Ephemeral token**: the short-lived `client_secret` from `/v1/realtime/client_secrets`. It is bound to one session.
- **Latent code**: modules that exist and are tested but are not mounted by `App.tsx`.
- **AbortError**: the rejection `HTMLMediaElement.play()` raises when a newer `load()` or `pause()` interrupts it.

## Bug Details

### Bug Condition

Each bug has a trigger. The code listed is either missing an asset, missing a guard (timeout, `finally`, cleanup, re-entry), or ordering operations incorrectly.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AppEvent (request, render, user action, or lifecycle event)
  OUTPUT: boolean

  RETURN C1(input) OR C2(input) OR C3(input) OR C4(input) OR C5(input) OR C6(input)
      OR C7(input) OR C8(input) OR C9(input) OR C10(input) OR C11(input) OR C12(input)
END FUNCTION

FUNCTION C1(i)   // missing fallback video
  RETURN i.requestedUrl == "/videos/fallback.mp4" AND NOT fileExists("public/videos/fallback.mp4")
END FUNCTION

FUNCTION C2(i)   // custom monster default paths
  RETURN i.kind == "createCustomMonster" AND (i.generatedVideo IS NULL OR i.generatedAudio IS NULL)
         AND (NOT fileExists(i.defaultVideoSrc) OR NOT fileExists(i.defaultRoarAudio))
END FUNCTION

FUNCTION C3(i)   // viewport media handling
  RETURN (i.kind == "experimentChange" AND i.playInterruptedOrAutoplayBlocked)
      OR (i.kind == "videoLoad" AND i.browserLacksOggTheora)
      OR (i.kind == "mediaFailure" AND i.photoFailed AND NOT canvasSimulationShown)
END FUNCTION

FUNCTION C4(i)   // no error boundary
  RETURN i.kind == "renderError" AND NOT treeWrappedInErrorBoundary
END FUNCTION

FUNCTION C5(i)   // narrator and audio lifecycle
  RETURN (i.kind IN {"mute", "langChange", "experimentChange"} AND i.translateAwaitPending)
      OR (i.kind == "unmount" AND (speechPlaying OR audioContextOpen))
END FUNCTION

FUNCTION C6(i)   // Lab Manual
  RETURN i.kind == "openLabManual"
         AND (NOT liveBioFeedBadgeBesideHelp OR modalCardCount != 6 OR (i.isKo == false AND hasKoreanText))
END FUNCTION

FUNCTION C7(i)   // chat lock
  RETURN i.kind == "sendChat" AND i.needsLiveLookup AND (i.fetchHangs OR i.fetchThrows)
END FUNCTION

FUNCTION C8(i)   // generate-video behavior
  RETURN i.kind == "generateVideo"
         AND (i.upstreamMs >= maxDurationMs OR i.mp4Bytes > 4_500_000
              OR (i.provider == "luma" AND NOT responseHasVideoUrl)
              OR i.sharedApiKeyUsedForOtherProvider)
END FUNCTION

FUNCTION C9(i)   // rate limit bypass
  RETURN i.kind == "generateVideo" AND (i.xForwardedForSpoofed OR i.requestsSpreadAcrossInstances)
END FUNCTION

FUNCTION C10(i)  // leaks
  RETURN (i.kind == "blobReplaced" AND NOT revoked(i.oldBlobUrl))
      OR (i.kind == "unmount" AND pendingArenaTimers > 0)
END FUNCTION

FUNCTION C11(i)  // GptLiveService contract
  RETURN i.kind == "realtimeConnect"
         AND (ephemeralCallUsesMultipart OR clientSecretsBodyHasVoice
              OR sessionFieldHasInstructionsOrVoice OR NOT modelFallback)
END FUNCTION

FUNCTION C12(i)  // useGptLiveVoice state
  RETURN (i.kind == "voiceFailure" AND statusOverwrittenToIdle)
      OR (i.kind == "transcriptEvent" AND domainCapturedAtSetup)
      OR (i.kind == "startVoice" AND sessionActive)
      OR (i.kind == "modelFallbackRetry" AND usesEphemeralTokenAgain)
      OR (i.kind == "saveApiKey" AND storedPlainWithoutConsent)
END FUNCTION
```

### Examples

- **1.1:** `LazyVideo` receives a failing source and falls back to `/videos/fallback.mp4`. Vercel's catch-all rewrite returns `index.html` with status 200, so the `<video>` gets HTML and shows nothing. Expected: a playable MP4, or 404 so `onError` can run.
- **1.2:** A user builds a custom monster with no generated media. `videoSrc` is `/videos/dragon_growth.mp4` and `roarAudio` is `/sounds/dragon_roar.mp3`. Neither file exists. Expected: `/videos/chimera_growth_dragon_24s.mp4` and `/sounds/monster_roar_ferocious.wav`.
- **1.3:** The user clicks a second experiment quickly. The effect calls `load()` then `play()`. The first `play()` rejects with AbortError, and `.catch` sets `videoFailed`, which unmounts a video that would play. Expected: ignore AbortError and retry muted once.
- **1.4:** A component throws during render. The page is blank. Expected: the `ErrorBoundary` recovery screen.
- **1.5:** The user mutes while the Google Translate fetch is pending. Expected: no speech. Actual: the stale utterance starts.
- **1.6:** English user opens the Lab Manual. Actual: 4 cards, Korean confirm text. Expected: 6 English points.
- **1.7:** EuropePMC hangs. `isQueryingApi` stays true. Expected: after 8 s a fallback reply appears and the Send button is enabled.
- **1.8:** HuggingFace returns a 6 MB MP4. `res.send(Buffer)` fails with a payload-too-large error. Expected: controlled JSON response.
- **1.9:** A caller rotates `x-forwarded-for` values to get unlimited requests. Expected: the limiter keys on a trusted header.
- **1.11 edge:** If `client_secrets` fails and the master key is used, the multipart path remains valid but must contain only `sdp` and a minimal `session`.
- **1.12:** `startVoice` fails on `getUserMedia`. `reportError` sets `error`, then `stopVoice` sets `idle`. Expected: `error` stays visible.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Realtime happy path in `useGptLiveVoice` (3.1): `client_secrets` first, raw SDP with the ephemeral token, details through `session.update`.
- Mobile synapse chat slide-up and 3-second absorption (3.2).
- Muted `<video>` layered over the confocal photo when both load (3.3).
- Curated experiment questions answered locally with no network call (3.4).
- Stitched dossier (PMID badge, related paper, Wikipedia summary) when APIs respond within the timeout (3.5).
- `/api/generate-video` returns 405, 400, and 400 for non-POST, empty prompt, and no token (3.6).
- `sanitizeVideoUrl` and `assertAllowedApiEndpoint` accept and reject the same URLs (3.7).
- Bioreactor 15-second 6-stage sequence, BattleMatrix pairing, AwakeningRoar, and WebAudio cardiac thump; the existing 104 tests, `tsc`, and `vite build` (3.8).

**Scope:**
All inputs where no `C_n` holds must behave exactly as before. This includes:
- Experiment playback where the video plays and the photo loads
- Chat questions that match curated data
- Realtime sessions that start and end without errors
- Requests to `/api/generate-video` that are rate-limited correctly, use a small response, and succeed

## Hypothesized Root Cause

1. **Assets never created (1.1, 1.2):** The code references `fallback.mp4`, `dragon_growth.mp4`, and `dragon_roar.mp3`, but the files were never added to `public/`. `vercel.json` rewrites every path to `index.html`, so a missing file returns HTML with 200.
2. **Imperative media control fighting declarative attributes (1.3):** The `<video>` has `autoPlay` and a changing `key`, so React remounts it on each experiment. The extra `load()`/`play()` effect interrupts the element's own autoplay. The `.catch` treats every rejection as a hard failure. The `.ogv` sources are unplayable on Safari and iOS, and the image layer has no `onError`.
3. **Missing wiring (1.4):** `ErrorBoundary` is defined but not imported in `main.tsx` or `App.tsx`.
4. **Missing cancellation and cleanup (1.5, 1.7, 1.10):** The narrator awaits a fetch with no request id. Effects return no cleanup for `speechSynthesis`, `AudioContext`, blob URLs, or timers. `setIsQueryingApi(false)` is not in a `finally`, and fetches have no `AbortController`.
5. **Steering drift (1.6):** The Lab Manual was built before the steering rules, with 4 cards and unlocalized strings. No `LIVE BIO-FEED` badge exists.
6. **Serverless platform limits not accounted for (1.8, 1.9):** The upstream timeout equals `maxDuration`. The function buffers whole videos. The Luma create response is treated as a finished video. One `apiKey` field serves two providers. `x-forwarded-for` is client-controlled, and module memory is per instance.
7. **Contract drift in latent Realtime code (1.11, 1.12):** `GptLiveService` was written before `AGENTS.md` pinned the WebRTC contract. `stopVoice` always ends with `updateStatus('idle')`. `activeDomain` is captured in a closure rather than a ref. There is no re-entry guard.

## Correctness Properties

Property 1: Bug Condition - Media Fallbacks and Asset Paths Resolve

_For any_ input where C1, C2, or C3 holds, the fixed system SHALL resolve every fallback and default media path to an existing playable file or to an HTTP 404, SHALL NOT treat AbortError or an autoplay block as a media failure, SHALL retry muted playback once, and SHALL show a canvas bio-simulation when both video and photo fail so the viewport is never blank.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Failures Are Contained and Recoverable

_For any_ input where C4, C5, or C7 holds, the fixed system SHALL show the `ErrorBoundary` recovery screen on render errors, SHALL discard stale narration and call `speechSynthesis.cancel()` and `AudioContext.close()` on cleanup, and SHALL reset `isQueryingApi` in a `finally` block with every fetch bounded by a timeout and followed by a fallback reply.

**Validates: Requirements 2.4, 2.5, 2.7**

Property 3: Bug Condition - Lab Manual Matches Steering

_For any_ input where C6 holds, the fixed system SHALL render the Help button beside a top-left `LIVE BIO-FEED` badge, show exactly 6 localized points selected by `isKo`, and return to the active experiment state on close.

**Validates: Requirements 2.6**

Property 4: Bug Condition - generate-video Is Bounded and Correct

_For any_ input where C8 or C9 holds, the fixed handler SHALL use an upstream timeout below `maxDuration`, SHALL NOT return video bytes through the function response, SHALL return a `videoUrl` or a pollable job id that the client parses for Luma, SHALL use only the provider's own token, and SHALL key the rate limiter on a trusted platform header.

**Validates: Requirements 2.8, 2.9**

Property 5: Bug Condition - Resources Are Released

_For any_ input where C10 holds, the fixed system SHALL revoke replaced or unneeded blob URLs and SHALL clear every pending arena timer on unmount.

**Validates: Requirements 2.10**

Property 6: Bug Condition - Realtime Contract Followed

_For any_ input where C11 or C12 holds, the fixed code SHALL follow the `AGENTS.md` three-step flow, SHALL keep the model fallback, SHALL keep `error` status visible after cleanup, SHALL read the current domain from a ref, SHALL ignore `startVoice` while a session is active, SHALL NOT reuse an ephemeral token for a second session, and SHALL NOT persist the API key without consent.

**Validates: Requirements 2.11, 2.12**

Property 7: Preservation - Non-Buggy Behavior Unchanged

_For any_ input where no bug condition holds, the fixed system SHALL produce the same result as the original system, preserving the Realtime happy path, mobile chat absorption, muted video over photo, local curated answers, the stitched dossier, 405/400/400 API responses, URL sanitization rules, and the bioreactor, battle, roar, and cardiac thump behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct. Fixes are ordered by severity. Items are independent, so they can be shipped in separate commits.

**1.1 Fallback video** (`public/videos/fallback.mp4`, `vercel.json`, `src/utils/security.ts`, `src/services/videoConcatenationService.ts`)
- Add a short looping fallback MP4 to `public/videos/`. Reuse an existing clip (for example a trimmed `bioreactor` or microscopy loop) so no new licensing question arises.
- Add a `vercel.json` rewrite exclusion so paths with a media extension (`.mp4`, `.webm`, `.ogv`, `.wav`, `.mp3`, `.jpg`, `.png`, `.gif`) are not rewritten to `index.html`. For example, use a negative-lookahead source pattern `/((?!api/|videos/|sounds/|images/|assets/).*)`. A missing file then returns 404.
- Keep the constant in one place and import it in both files.

**1.2 Custom monster defaults** (`src/components/bioreactor/CustomMonsterStudio.tsx:192-193`)
- Replace the defaults with `/videos/chimera_growth_dragon_24s.mp4` and `/sounds/monster_roar_ferocious.wav`.
- Add a unit test that asserts every default path exists under `public/`.

**1.3 Viewport media handling** (`src/components/BioStitchLabView.tsx` ~1006-1014, ~1650-1660; `src/data/bioExperiments.ts`)
- Remove the manual `load()` from the effect. Rely on `key` remount plus `autoPlay muted playsInline`.
- Keep a `play()` call only for the retry path. In `.catch`, check `err.name`. For `AbortError` do nothing. For `NotAllowedError`, set `muted = true` and retry once. Set `videoFailed` only on `MediaError` from the `error` event or after the single retry fails.
- Add a `<source>` list per experiment: the existing `.ogv` plus a `.webm` or `.mp4` where Wikimedia Commons offers a transcode (Commons serves `.webm`/`.mp4` derivatives for many files). Where none exists, check `video.canPlayType('video/ogg; codecs="theora"')` and skip straight to the photo layer without setting an error.
- Add `onError` to the background `<img>` that swaps to a verified local confocal image in `public/images/`. If that also fails, render a new `BioSimCanvas` component (a small `<canvas>` with an animated cell field using the steering palette `#10b981`, `#06b6d4`, `#ef4444`, `#020617`). It uses `requestAnimationFrame` and cancels it on unmount.
- Preserve: the `<video>` stays muted and layered over the photo (3.3).

**1.4 Error boundary** (`src/main.tsx` or `src/App.tsx`)
- Wrap `<App />` (or its child) in `<ErrorBoundary>`. No change to `ErrorBoundary.tsx` unless its recovery screen lacks a reload action.

**1.5 Narrator and audio lifecycle** (`BioStitchLabView.tsx` ~1206, ~1264-1291, ~212/1028/1056/1121)
- Add `narrationIdRef`. Increment it on every `speakText` call, mute, language change, and experiment change. After the translate await, return if the captured id differs from the current id. Also pass an `AbortSignal` to the translate fetch.
- The effect cleanup at ~1264-1291 calls `window.speechSynthesis.cancel()` in addition to `clearInterval`.
- Add an unmount effect that calls `audioCtxRef.current?.close()` and sets the ref to `null`. Existing code that creates the context lazily already handles a null ref.

**1.6 Lab Manual** (`BioStitchLabView.tsx` ~1596-1606, ~2514-2580)
- Add a top-left `LIVE BIO-FEED` badge over the viewport and move the `[❓ Help / Lab Guide]` button directly beside it. Do not add viewer counters.
- Define a `LAB_MANUAL_POINTS` constant with 6 entries, each with `{ko, en}` fields. The modal maps over it and picks by `isKo`. Localize the confirm button.
- Closing the modal only toggles its open state, so the active experiment state is untouched.

**1.7 Chat lock and timeouts** (`BioStitchLabView.tsx` ~1540-1542; `src/services/scienceStitchService.ts`)
- Add `fetchWithTimeout(url, ms = 8000, init)` in the service, using `AbortController` and clearing the timer in `finally`. Replace the bare `fetch` calls (EuropePMC, Wikipedia, Google Translate).
- In `handleSendChat`, wrap the lookup in `try { ... } catch { post fallback reply } finally { setIsQueryingApi(false) }`.
- Preserve: the curated-experiment path makes no network call (3.4), and a timely response shows the same dossier (3.5).

**1.8 generate-video handler** (`api/generate-video.ts`, `src/services/aiVideoService.ts`, `src/services/videoGenService.ts`)
- Set `UPSTREAM_TIMEOUT_MS` to about 50 s with `maxDuration` at 60 s, or lower the timeout to 45 s if cold start is a concern.
- HuggingFace branch: when the upstream response is larger than a safe size (for example 3 MB by `content-length`), do not buffer it. Return `202`/`200` JSON `{status, message}` with an error code that the client already handles, or return JSON with a `videoUrl` when the upstream gives one. For small bodies, a base64 `data:` URL in JSON stays acceptable only if under the limit.
- Luma branch: return `{ jobId, status: "queued" }` from the create call. Add a `GET /api/generate-video?provider=luma&id=...` handler in the same function file (approved; no new function or paid service, Hobby plan) that polls Luma and returns `{jobId, status, videoUrl}`. The client polls every 5 s or more with a bounded total timeout. A GET without valid parameters still returns 405.
- Read provider-specific tokens: `provider === "luma"` uses `LUMA_API_KEY` (or the request's Luma key), `provider === "huggingface"` uses `HF_TOKEN`. Remove the shared `apiKey` reuse.
- Preserve 405, 400 (empty prompt), and 400 (no token) responses (3.6).
- Update the client parsers (`pickVideoUrl`, `generateMonsterVideo`) so a pending job is not reported as `NO_API_KEY`.

**1.9 Rate limit** (`api/generate-video.ts`)
- Derive the key from `x-vercel-forwarded-for`, falling back to `req.socket.remoteAddress`, and ignore `x-forwarded-for`.
- Add a header comment that the in-memory limiter is per instance. Decision (approved): keep the in-memory limiter and do not add Vercel KV or Upstash now. Note them in the comment as a future option if abuse occurs.

**1.10 Leaks** (`aiVideoService.ts:162,181`, `videoGenService.ts:35,68`, `customMonsterMediaService.ts:495`, `BioStitchLabView.tsx` ~341)
- Track the last created blob URL per consumer. Call `URL.revokeObjectURL(prev)` before assigning a new one and in the owning effect's cleanup.
- Add an unmount effect that loops over `arenaTimersRef.current`, calls `clearTimeout`, and empties the array.

**1.11 GptLiveService** (`src/modules/agent/gptLiveService.ts` 100, 147-166)
- Step 1: `client_secrets` body is `{ session: { type: "realtime", model } }` only.
- Step 2 (ephemeral succeeds): `fetch('/v1/realtime/calls', { headers: { Authorization: 'Bearer ' + ephemeral, 'Content-Type': 'application/sdp' }, body: offerSdp })`.
- Step 2 (master-key fallback): `FormData` with `sdp` (string) and `session` set to `JSON.stringify({ type: 'realtime', model })`. No `voice`, `instructions`, or `input_audio_transcription`.
- Step 3: after the data channel opens, send `session.update` with `voice`, `instructions`, `tools`, and `input_audio_transcription`.
- Model loop: try `gpt-realtime`, then `gpt-4o-realtime-preview`. A model fallback requests a new ephemeral token rather than reusing the old one.

**1.12 useGptLiveVoice** (`src/modules/voice/useGptLiveVoice.ts` 222-242, 348-358, 390, 527-577)
- Add a `cleanup()` that releases `pc`, `dc`, and the mic stream without changing status. `stopVoice()` calls `cleanup()` then `updateStatus('idle')`. Failure paths call `reportError(...)` then `cleanup()` only, so `error` remains visible.
- Add `activeDomainRef`, update it in an effect, and read `activeDomainRef.current` in `dc.onmessage`.
- Add `isStartingRef`. At the top of `startVoice`, return if it or the session is active. Reset it in `finally`.
- Model fallback retry fetches a new ephemeral token (see 1.11).
- API key: keep in memory by default. Persist to `localStorage` only when the user ticks an explicit "remember on this device" option, and show a short warning. Existing stored keys keep working.
- Preserve the happy path exactly (3.1).

### Rollout Order

1. 1.1, 1.2, 1.4 (small, isolated, high value)
2. 1.3, 1.7, 1.5 (viewport and chat resilience)
3. 1.6, 1.10
4. 1.8, 1.9 (API; decisions approved: Luma polling GET route, in-memory limiter on `x-vercel-forwarded-for`)
5. 1.11, 1.12 (latent; run the Realtime tests before and after)

Nothing is deployed until the user approves each batch.

## Testing Strategy

### Validation Approach

First surface counterexamples on the unfixed code, then verify the fix and check preservation. Test runner is `vitest --run` (single execution, no watch). The existing 104 tests are the baseline for preservation.

### Exploratory Bug Condition Checking

**Goal**: Show each bug on unfixed code to confirm or refute the root cause. If a test passes unexpectedly, re-hypothesize before fixing.

**Test Plan**: Write tests for each `C_n`, run them on the current code, and record the failures.

**Test Cases**:
1. **Asset existence (1.1, 1.2)**: Assert every default and fallback media path resolves to a file in `public/` (will fail on unfixed code).
2. **Rewrite config (1.1)**: Parse `vercel.json` and assert a media path does not match the catch-all rewrite (will fail on unfixed code).
3. **Play rejection (1.3)**: Mock `HTMLMediaElement.play` to reject with `AbortError` and assert `videoFailed` stays false (will fail on unfixed code).
4. **Image error (1.3)**: Fire `error` on both video and image and assert the canvas simulation is present (will fail on unfixed code).
5. **Error boundary (1.4)**: Render `<App />` with a child that throws and assert the recovery text appears (will fail on unfixed code).
6. **Narration race (1.5)**: Resolve the translate promise after mute and assert `speechSynthesis.speak` was not called; assert `cancel` and `AudioContext.close` on unmount (will fail on unfixed code).
7. **Lab Manual (1.6)**: Assert 6 points and no Korean text when `isKo` is false (will fail on unfixed code).
8. **Chat lock (1.7)**: Mock a never-resolving fetch with fake timers, advance 8 s, assert Send is enabled (will fail on unfixed code).
9. **API handler (1.8, 1.9)**: Call the handler with mocked upstreams (large HF body, Luma create JSON, spoofed `x-forwarded-for`) and assert the new behavior (will fail on unfixed code).
10. **Leaks (1.10)**: Spy on `URL.revokeObjectURL` and `clearTimeout` (will fail on unfixed code).
11. **Realtime contract (1.11)**: Mock `fetch` and assert the ephemeral call uses `application/sdp` with a raw body and that `client_secrets` has no `voice` (will fail on unfixed code).
12. **Hook state (1.12)**: Force `getUserMedia` to reject and assert status is `error`; call `startVoice` twice and assert one peer connection (will fail on unfixed code).

**Expected Counterexamples**:
- Missing files, HTML responses for media paths, `videoFailed` set by AbortError, `idle` after failure, multipart for the ephemeral call.
- Possible causes: unadded assets, unguarded rejections, unconditional `updateStatus('idle')`, closure-captured state.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does not hold, the fixed code matches the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Property-based testing (fast-check, if already a dependency; otherwise table-driven vitest cases) suits preservation because it covers many generated inputs and catches edge cases that hand-written cases miss.

**Test Plan**: Run the existing 104 tests on unfixed code to record the baseline, then add the tests below and run them on both versions.

**Test Cases**:
1. **Realtime happy path**: With a successful `client_secrets`, the call order and bodies match the `AGENTS.md` flow.
2. **Mobile chat absorption**: The `-translate-y-full opacity-0` class is applied 3 seconds after the last message.
3. **Muted video over photo**: When both load, the video is muted and layered above the photo.
4. **Curated answers**: Curated questions produce zero `fetch` calls.
5. **Stitched dossier**: Fast EuropePMC and Wikipedia mocks produce the same dossier.
6. **API status codes**: 405, 400, and 400 are unchanged.
7. **URL sanitization**: Generated URL strings are accepted and rejected exactly as before by `sanitizeVideoUrl` and `assertAllowedApiEndpoint`.
8. **Bioreactor, battle, roar, thump**: Existing tests pass unchanged.

### Unit Tests

- Asset-path existence for all fallback and default media constants
- `play()` rejection handling by error name (`AbortError`, `NotAllowedError`, other)
- `fetchWithTimeout` aborts at the limit and clears its timer
- Narration id guard, cleanup calls, and `AudioContext.close`
- Lab Manual point count and localization by `isKo`
- `generate-video` timeout value, provider token selection, client key derivation
- `GptLiveService` request shapes for ephemeral and master-key paths
- `useGptLiveVoice` status after failure, re-entry guard, domain ref

### Property-Based Tests

- Random sequences of mute, language, and experiment changes never let a stale utterance speak
- Random provider and key combinations never send one provider's token to the other
- Random header sets never let `x-forwarded-for` change the rate-limit key
- Random sequences of `startVoice` and `stopVoice` calls leave at most one active peer connection
- Random non-buggy URL strings give identical results from `sanitizeVideoUrl` before and after

### Integration Tests

- Mount `App` with a throwing child and confirm the recovery screen
- Switch experiments rapidly with mocked media and confirm the viewport never goes blank (video, photo, or canvas is always present)
- Send chat questions with hung, failing, and fast APIs, and confirm the input is always usable afterward
- Simulate a full Realtime handshake with mocked `fetch` and `RTCPeerConnection`, including the model fallback
- Run `tsc --noEmit` (src and api), `vitest --run`, and `vite build` before any deployment request. Then ask the user for approval to deploy.
