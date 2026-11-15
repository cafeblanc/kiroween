# Implementation Plan

## Overview

This plan fixes the 12 hidden bugs from `bugfix.md` following the rollout order in `design.md`: small isolated fixes first, latent Realtime code last. Tests that expose the bugs and tests that preserve existing behavior are written before any fix. Deployment is the final task and runs only after explicit user approval. This spec phase changes no source code.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["3.4"] },
    { "id": 5, "tasks": ["3.5"] },
    { "id": 6, "tasks": ["3.6", "3.7"] },
    { "id": 7, "tasks": ["4"] },
    { "id": 8, "tasks": ["5"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Hidden Bugs C1-C12 Surface on Unfixed Code
  - **CRITICAL**: This test MUST FAIL on unfixed code. Failure confirms the bugs exist.
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior. It validates the fix when it passes after implementation.
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: Scope each property to the concrete failing case from `isBugCondition` (C1-C12). Use fast-check only if it is already a dependency, otherwise table-driven vitest cases.
  - Write the tests in new files under the existing vitest layout. Run with `vitest --run` (no watch).
  - C1/C2: every fallback and default media path (`/videos/fallback.mp4`, custom monster `videoSrc` and `roarAudio`) exists under `public/`; `vercel.json` does not rewrite media paths to `index.html`
  - C3: mock `HTMLMediaElement.play` to reject with `AbortError` and assert `videoFailed` stays false; fire `error` on video and photo and assert the canvas bio-simulation is present
  - C4: render `<App />` with a throwing child and assert the `ErrorBoundary` recovery text appears
  - C5: resolve the translate promise after mute and assert `speechSynthesis.speak` is not called; assert `speechSynthesis.cancel` and `AudioContext.close` on unmount
  - C6: assert the Lab Manual has 6 points, the `LIVE BIO-FEED` badge sits beside the Help button, and no Korean text appears when `isKo` is false
  - C7: mock a never-resolving fetch with fake timers, advance 8 s, and assert the Send button is enabled and a fallback reply is posted
  - C8/C9: call the generate-video handler with mocked upstreams (large HuggingFace body, Luma create JSON, spoofed `x-forwarded-for`, one `apiKey` for both providers) and assert the new behavior
  - C10: spy on `URL.revokeObjectURL` and `clearTimeout` and assert blob URLs are revoked and arena timers cleared on unmount
  - C11: mock `fetch` and assert the ephemeral `/calls` request uses `application/sdp` with a raw body, `client_secrets` has no `voice`, and the master-key multipart `session` has no `instructions` or `voice`
  - C12: force `getUserMedia` to reject and assert status stays `error`; call `startVoice` twice and assert one peer connection; assert transcripts use the current domain
  - Run the tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct, it proves the bugs exist)
  - Document counterexamples found (for example "`public/videos/fallback.mp4` missing", "AbortError sets `videoFailed`", "`stopVoice` overwrites `error` with `idle`")
  - Do not modify source code in this task. Only add test files.
  - Mark the task complete when the tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Run `vitest --run` on UNFIXED code and record the baseline (18 files, 104 tests passing), plus `tsc --noEmit` (src and api) and `vite build`
  - Observe behavior on UNFIXED code for inputs where no `C_n` holds, then write tests that assert the observed behavior:
    - Realtime happy path: `client_secrets` first, raw SDP with the ephemeral token to `/calls`, `voice`/`instructions`/`tools` in `session.update` (3.1)
    - Mobile synapse chat applies `-translate-y-full opacity-0` 3 seconds after the last message (3.2)
    - Muted `<video>` layered over the confocal photo when both load (3.3)
    - Curated experiment questions (including follow-up and intent detection) make zero `fetch` calls (3.4)
    - Fast EuropePMC and Wikipedia mocks produce the same dossier with PMID badge, related paper, and Wikipedia summary (3.5)
    - `/api/generate-video` returns 405 for non-POST, 400 for empty prompt, 400 for no token (3.6)
    - Property-based: for generated URL strings, `sanitizeVideoUrl` and `assertAllowedApiEndpoint` accept and reject exactly as before; `javascript:`, `data:`, protocol-relative, and non-allowlisted URLs stay rejected (3.7)
    - Bioreactor 15-second 6-stage sequence, BattleMatrix pairing, AwakeningRoar, and cardiac thump covered by the existing tests (3.8)
  - Run the new tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms the baseline behavior to preserve)
  - Mark the task complete when the tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3. Fix hidden bugs (rollout in 5 batches, small isolated fixes first, latent Realtime code last)

  - [x] 3.1 Batch 1: small isolated fixes (1.1, 1.2, 1.4)
    - 1.1: add a real looping `public/videos/fallback.mp4` reusing an existing clip; keep the fallback path constant in one place and import it in `src/utils/security.ts` and `src/services/videoConcatenationService.ts`; update `vercel.json` so media paths (`videos/`, `sounds/`, `images/`, `assets/`, `api/`) are excluded from the catch-all rewrite and a missing file returns 404
    - 1.2: in `src/components/bioreactor/CustomMonsterStudio.tsx:192-193` set the defaults to `/videos/chimera_growth_dragon_24s.mp4` and `/sounds/monster_roar_ferocious.wav`
    - 1.4: wrap the tree in `ErrorBoundary` in `src/main.tsx` or `src/App.tsx`; change `ErrorBoundary.tsx` only if its recovery screen lacks a reload action
    - _Bug_Condition: C1, C2, C4 from isBugCondition in design_
    - _Expected_Behavior: Design Properties 1 (C1, C2) and 2 (C4)_
    - _Preservation: Design Property 7 (3.3, 3.7, 3.8)_
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.4, 3.3, 3.7, 3.8_

  - [x] 3.2 Batch 2: viewport and chat resilience (1.3, 1.7, 1.5)
    - 1.3: in `BioStitchLabView.tsx` (~1006-1014, ~1650-1660) remove the manual `load()`; ignore `AbortError`; on `NotAllowedError` set `muted` and retry once; set `videoFailed` only on a media `error` event or after the retry fails; add `<source>` fallbacks or a `canPlayType` check for Ogg Theora; add `onError` on the background `<img>` with a local confocal fallback; add a `BioSimCanvas` component (palette `#10b981`, `#06b6d4`, `#ef4444`, `#020617`, `requestAnimationFrame` cancelled on unmount)
    - 1.7: add `fetchWithTimeout(url, ms = 8000, init)` using `AbortController` in `src/services/scienceStitchService.ts` and use it for EuropePMC, Wikipedia, and Google Translate; wrap `handleSendChat` lookup in `try/catch/finally` with a fallback reply and `setIsQueryingApi(false)` in `finally`
    - 1.5: add `narrationIdRef` checked after the translate await, pass an `AbortSignal`, call `speechSynthesis.cancel()` in the effect cleanup (~1264-1291), and close `audioCtxRef` on unmount
    - _Bug_Condition: C3, C5, C7 from isBugCondition in design_
    - _Expected_Behavior: Design Properties 1 (C3) and 2 (C5, C7)_
    - _Preservation: Design Property 7 (3.2, 3.3, 3.4, 3.5)_
    - _Requirements: 1.3, 1.5, 1.7, 2.3, 2.5, 2.7, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Batch 3: Lab Manual and leaks (1.6, 1.10)
    - 1.6: add a top-left `LIVE BIO-FEED` badge with the `[❓ Help / Lab Guide]` button beside it and no viewer counters; add a `LAB_MANUAL_POINTS` constant with 6 `{ko, en}` entries; localize the confirm button by `isKo`; closing the modal only toggles its open state
    - 1.10: track and revoke the previous blob URL in `aiVideoService.ts:162,181`, `videoGenService.ts:35,68`, and `customMonsterMediaService.ts:495`; add an unmount effect in `BioStitchLabView.tsx` that clears every `arenaTimersRef` timer
    - _Bug_Condition: C6, C10 from isBugCondition in design_
    - _Expected_Behavior: Design Properties 3 (C6) and 5 (C10)_
    - _Preservation: Design Property 7 (3.2, 3.8)_
    - _Requirements: 1.6, 1.10, 2.6, 2.10, 3.2, 3.8_

  - [x] 3.4 Batch 4: serverless API (1.8, 1.9)
    - **Final decisions (approved by the user)**:
      - 1.8 Luma: add a polling GET route that returns `{ jobId, status, videoUrl }`. The client polls at an interval of 5 seconds or more, with a bounded total timeout. The solution stays within the Vercel Hobby plan and adds no new paid service.
      - 1.9 Rate limit: keep the in-memory limiter, keyed on `x-vercel-forwarded-for`. Document that it is per instance. Do NOT add Vercel KV or Upstash now. Mention a shared store as a future option only if abuse occurs.
    - 1.8: in `api/generate-video.ts` set `UPSTREAM_TIMEOUT_MS` below `maxDuration` (about 45-50 s); do not return large video bodies through `res.send(Buffer)` (return JSON with `videoUrl` or a controlled status); return `{ jobId, status: "queued" }` for Luma from the POST create call; add the polling GET handler (`GET /api/generate-video?provider=luma&id=...`, in the same function file so no extra serverless function is needed) that returns `{ jobId, status, videoUrl }`; the client in `aiVideoService.ts` and `videoGenService.ts` polls every 5 s or more until `completed`, `failed`, or a total timeout; read provider-specific tokens (`LUMA_API_KEY` for Luma, `HF_TOKEN` for HuggingFace); update `pickVideoUrl` and `generateMonsterVideo` so a pending job is not reported as `NO_API_KEY`
    - 1.9: derive the client key from `x-vercel-forwarded-for`, fall back to `req.socket.remoteAddress`, and ignore `x-forwarded-for`; add a header comment that the in-memory limiter is per instance and that Vercel KV or Upstash is a future option if abuse occurs (not implemented now)
    - Keep 405, 400 (empty prompt), and 400 (no token) responses unchanged. A GET without valid `provider=luma` and `id` parameters still returns 405.
    - _Bug_Condition: C8, C9 from isBugCondition in design_
    - _Expected_Behavior: Design Property 4_
    - _Preservation: Design Property 7 (3.6, 3.7)_
    - _Requirements: 1.8, 1.9, 2.8, 2.9, 3.6, 3.7_

  - [x] 3.5 Batch 5: latent Realtime code (1.11, 1.12), last
    - Run the existing Realtime tests and the Property 2 Realtime happy-path test BEFORE editing and again AFTER
    - 1.11: in `src/modules/agent/gptLiveService.ts` (lines 100, 147-166) send `client_secrets` with only `{session: {type: "realtime", model}}`; on ephemeral success send raw SDP with `Content-Type: application/sdp` and the ephemeral token to `/v1/realtime/calls`; on master-key fallback send multipart with only `sdp` and `session: {type: "realtime", model}`; move `voice`, `instructions`, `tools`, `input_audio_transcription` into `session.update` after the data channel opens; keep the `gpt-realtime` / `gpt-4o-realtime-preview` fallback and request a new ephemeral token for each model attempt
    - 1.12: in `src/modules/voice/useGptLiveVoice.ts` add `cleanup()` that releases `pc`, `dc`, and the mic without changing status, and make failure paths call `reportError` then `cleanup()` only; add `activeDomainRef` read in `dc.onmessage`; add `isStartingRef` re-entry guard reset in `finally`; keep the API key in memory unless the user ticks "remember on this device" (existing stored keys keep working)
    - Follow the `AGENTS.md` circuit breaker: if the same edit or command fails twice, stop and report
    - _Bug_Condition: C11, C12 from isBugCondition in design_
    - _Expected_Behavior: Design Property 6_
    - _Preservation: Design Property 7 (3.1)_
    - _Requirements: 1.11, 1.12, 2.11, 2.12, 3.1_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Hidden Bugs C1-C12 Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1. Do NOT write new tests.
    - The tests from task 1 encode the expected behavior
    - Run the bug condition exploration tests from task 1 with `vitest --run`
    - **EXPECTED OUTCOME**: Tests PASS (confirms the bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2. Do NOT write new tests.
    - Run the preservation property tests from task 2 plus the original 104 tests
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after the fix
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `tsc --noEmit` (src and api), `vitest --run`, and `vite build`
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Deploy (ONLY after explicit user approval)
  - **GATE**: Do NOT start this task until the user has reviewed the results of task 4 and explicitly approved deployment. If approval is not given, stop and report.
  - Present a summary of the changes per batch and the check results (`tsc`, `vitest`, `vite build`) and ask for approval
  - Confirm the deploy target (branch, Vercel project, environment) with the user before running any command; if it differs from what was assumed, stop and ask
  - Make sure no API keys or secrets are committed; provider tokens come from Vercel environment variables
  - After approval, deploy the approved batches, then smoke-test: fallback video and a missing media path (404), `ErrorBoundary`, Lab Manual, chat timeout fallback, `/api/generate-video` status codes
  - Follow the `AGENTS.md` rules: run at most one dev server instance, and stop and report if the same command fails twice
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

## Notes

- Batches 3.1 to 3.5 are sequential on purpose: each batch is shipped and checked separately, and the latent Realtime batch runs last.
- Task 3.4 decisions are final (approved): Luma polling GET route with a client interval of 5 s or more, and the in-memory per-instance limiter keyed on `x-vercel-forwarded-for` with no Vercel KV or Upstash for now.
- Task 5 (deploy) must not run without explicit user approval.
- Run tests with `vitest --run` only. Do not start watchers or more than one dev server.
