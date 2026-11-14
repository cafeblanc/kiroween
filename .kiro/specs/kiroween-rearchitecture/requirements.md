# Requirements Document

## Introduction

This specification defines the functional and technical requirements for **Kiroween Rearchitecture**, implementing a scientifically accurate 15-second documentary-style timelapse showing continuous biological growth from stem cell to adult monster. The system must handle AI video generation with graceful fallback to pre-made reference videos, ensure fixed-frame rendering without CSS shaking, support a 16x16 Monster Clash Arena, and implement proper video API error handling and caching.

---

## Glossary

- **Bioreactor**: The glass chamber container that displays growth sequences with fluid dynamics
- **Growth Stage**: One of six sequential phases (STEM CELL, CELL DIVISION, EMBRYO, GROWTH, JUVENILE, ADULT) in the 15-second sequence
- **Stage Duration**: Fixed 2.5 seconds per stage, totaling 15.0 seconds for complete growth sequence
- **BPM (Beats Per Minute)**: Heart rate metric that increases through growth stages (58 → 260+)
- **Hybrid Video Pipeline**: System that uses AI video generation when available, falling back to pre-made MP4 concatenation
- **Fixed-Frame Rendering**: Video display method where the outer glass border remains completely stationary
- **Awakening Roar**: Final cut-in sequence when Stage ⑥ (ADULT) completes, showing monster roaring in 3D

- **Monster**: A defined creature type from the 16 available options (mythic, gamer, disco categories)
- **Battle Matrix**: 16×16 grid of all possible monster pair combinations (240 unique pairs)
- **Video Cache**: Client-side storage for previously generated videos with SHA256 hash keys and 24-hour expiry

---

## Requirements

### REQ-1: Complete 6-Stage Growth Sequence (EARS Notation)

- **WHERE** a user selects any monster from the 16 available options,
- **THE SYSTEM SHALL** display a complete 15-second growth sequence showing all six stages in strict chronological order: STEM CELL (0.0-2.5s) → CELL DIVISION (2.5-5.0s) → EMBRYO (5.0-7.5s) → GROWTH (7.5-10.0s) → JUVENILE (10.0-12.5s) → ADULT (12.5-15.0s)

### REQ-2: Stage Duration and Timing Accuracy (EARS Notation)

- **WHEN** a growth sequence begins,
- **THE SYSTEM SHALL** display each stage for exactly 2.5 seconds with start/end times exactly matching: Stage ① (0.0-2.5s), Stage ② (2.5-5.0s), Stage ③ (5.0-7.5s), Stage ④ (7.5-10.0s), Stage ⑤ (10.0-12.5s), Stage ⑥ (12.5-15.0s)

### REQ-3: Fixed-Frame Rendering Boundary (EARS Notation)

- **WHILE** any growth sequence is playing,
- **THE SYSTEM SHALL** maintain a stationary outer glass border with zero movement or shaking throughout the entire 15-second sequence, and all visual effects (bubbles, particles, lighting, fluid dynamics) must remain contained within the fixed frame boundaries

### REQ-4: Hybrid Video Pipeline with AI Fallback (EARS Notation)

- **WHERE** AI video API keys (HF_TOKEN or LUMA_API_KEY) are available,
- **THE SYSTEM SHALL** generate all six growth stages via AI video API and concatenate them with 0.15-second crossfades

- **WHEN** AI video API is unavailable or returns an error,
- **THE SYSTEM SHALL** automatically fall back to concatenating pre-made reference MP4 videos extracted from existing battle videos, without user intervention

### REQ-5: Video Crossfade Transition Quality (EARS Notation)

- **WHEN** any stage transition occurs,
- **THE SYSTEM SHALL** complete the crossfade transition in exactly 0.15 seconds with no visible gaps, flickering, or double-video overlay

### REQ-6: BPM Progression Through Growth Stages (EARS Notation)

- **WHILE** a growth sequence is playing,
- **THE SYSTEM SHALL** display BPM values matching the specification: Stage ① (58 BPM), Stage ② (66 BPM), Stage ③ (105 BPM), Stage ④ (142 BPM), Stage ⑤ (192 BPM), Stage ⑥ (255-260+ BPM)

### REQ-7: Final Stage Awakening Roar Trigger (EARS Notation)

- **WHEN** Stage ⑥ (ADULT) completes at 15.0 seconds,
- **THE SYSTEM SHALL** trigger a 3D awakening roar cut-in using video from `public/videos/chimera_awakening_*.mp4` and audio from `public/sounds/monster_roar_*.wav`

### REQ-8: 16x16 Monster Clash Arena Video Matrix (EARS Notation)

- **WHERE** a user selects two monsters from the 16 available options for combat,
- **THE SYSTEM SHALL** return a valid battle video URL for all 240 possible monster pair combinations (16 × 15)

- **WHEN** the system cannot find a pre-made battle video for a specific monster pair,
- **THE SYSTEM SHALL** automatically assign the generic "dragon_vs_kraken" battle video as fallback without error

### REQ-9: Video Generation API Error Handling (EARS Notation)

- **WHEN** AI video generation API returns an error or timeout,
- **THE SYSTEM SHALL** log the error to the console, display a user-friendly message ("AI generation unavailable, using reference video"), and immediately fall back to reference video concatenation

### REQ-10: Video Cache Management (EARS Notation)

- **WHERE** a video has been previously generated via AI API,
- **THE SYSTEM SHALL** check the client-side cache first, and if a valid cached entry exists (timestamp within 24-hour expiry), return the cached video URL without re-generating

- **WHEN** a new video needs to be generated and cached,
- **THE SYSTEM SHALL** store the generated video URL in cache with a SHA256 hash of the prompt as key, current timestamp, and 24-hour expiry

### REQ-11: Bioreactor Fluid and Visual Effects (EARS Notation)

- **WHILE** a growth sequence is playing,
- **THE SYSTEM SHALL** display rising bubbles that move upward from the bottom of the bioreactor, with bubble size, speed, and opacity dynamically calculated based on current stage BPM

- **WHILE** a growth sequence is playing,
- **THE SYSTEM SHALL** display surface waves on the bioreactor fluid that oscillate using sine wave calculations based on current stage BPM

### REQ-12: Stage Progress HUD Display (EARS Notation)

- **WHILE** a growth sequence is playing,
- **THE SYSTEM SHALL** display a Heads-Up Display (HUD) showing: current stage label (① STEM CELL through ⑥ ADULT), progress percentage (0-100%), current BPM, and stage timer

- **WHEN** stage progress reaches 100%,
- **THE SYSTEM SHALL** change the stage label to the next stage and update all displayed metrics accordingly

### REQ-13: Awakening Roar Audio Synthesis (EARS Notation)

- **WHEN** Stage ⑥ (ADULT) triggers the awakening roar,
- **THE SYSTEM SHALL** play multi-harmonic roar audio using WebAudioContext with base frequency derived from monster color and harmonics generated from stage BPM progression

### REQ-14: Graded Error Degradation (EARS Notation)

- **WHEN** video concatenation fails,
- **THE SYSTEM SHALL** play the growth sequence with direct-cut transitions (0.15s black screen between stages) instead of crossfades, maintaining BPM progression and stage timing

- **WHEN** WebAudioContext is unavailable or suspended,
- **THE SYSTEM SHALL** fall back to HTML5 Audio element with 30% volume reduction, keeping visual BPM pulses visible

- **WHEN** Canvas rendering fails due to browser unsupported or GPU issue,
- **THE SYSTEM SHALL** gracefully degrade to HTML5 video element only, disabling fluid dynamics but keeping the HUD (stage timer + BPM + %) visible

### REQ-15: Arena Battle Winner Determination (EARS Notation)

- **WHEN** a battle sequence completes,
- **THE SYSTEM SHALL** determine a random winner based on monster type combination (mythic vs. gamer vs. disco) and display the winner's roar and victory animation

---

## EARS Pattern Compliance

All requirements follow the EARS specification patterns:

- **Ubiquitous Pattern**: Requirements 3, 6, 11, 12 (constants that always apply)
- **Event-driven Pattern**: Requirements 1, 2, 4, 5, 7, 8, 9, 10, 13, 14, 15 (triggered by specific events)
- **State-driven Pattern**: Requirements 3, 6, 11, 12 (apply while sequence is playing)
- **Optional feature Pattern**: Requirements 4, 14 (where specific conditions enable fallback behavior)

### Pattern Verification

| Requirement | EARS Pattern | Clause Structure |
|-------------|--------------|------------------|
| REQ-1 | Optional feature | WHERE + THE SYSTEM SHALL |
| REQ-2 | Event-driven | WHEN + THE SYSTEM SHALL |
| REQ-3 | State-driven | WHILE + THE SYSTEM SHALL |
| REQ-4 | Optional feature + Event-driven | WHERE + WHEN + THE SYSTEM SHALL |
| REQ-5 | Event-driven | WHEN + THE SYSTEM SHALL |
| REQ-6 | State-driven | WHILE + THE SYSTEM SHALL |
| REQ-7 | Event-driven | WHEN + THE SYSTEM SHALL |
| REQ-8 | Optional feature + Event-driven | WHERE + WHEN + THE SYSTEM SHALL |
| REQ-9 | Event-driven | WHEN + THE SYSTEM SHALL |
| REQ-10 | Optional feature + Event-driven | WHERE + WHEN + THE SYSTEM SHALL |
| REQ-11 | State-driven | WHILE + THE SYSTEM SHALL |
| REQ-12 | State-driven + Event-driven | WHILE + WHEN + THE SYSTEM SHALL |
| REQ-13 | Event-driven | WHEN + THE SYSTEM SHALL |
| REQ-14 | Event-driven + Optional feature | WHEN + WHEN + WHEN + THE SYSTEM SHALL |
| REQ-15 | Event-driven | WHEN + THE SYSTEM SHALL |

---

## Quality Assurance

### Clarity and Precision

- **Active voice**: All requirements use clear, active subject-verb-object structure
- **No vague terms**: All timing, percentages, and values are explicitly defined
- **No pronouns**: System name "THE SYSTEM" used consistently instead of "it"
- **Consistent terminology**: Glossary terms used throughout

### Testability

- **Explicit conditions**: All conditions are measurable or verifiable (0.15s, 2.5s, 58 BPM, etc.)
- **Measurable criteria**: All visual and timing requirements have concrete thresholds
- **Realistic tolerances**: Timing bounds specified in milliseconds (0.15s crossfade)
- **One thought per requirement**: Each requirement validates a single aspect

### Completeness

- **No escape clauses**: No "where possible", "if feasible", "as appropriate"
- **No absolutes**: Avoided "never", "always", "100%" where not truly absolute
- **Solution-free**: Focuses on what, not how (implementation details in design document)

### Positive Statements

- **No negative statements**: All requirements use "SHALL" for desired behavior
- Error handling specified as fallback behavior rather than "shall not fail"

---

## EARS Pattern Rules Verification

- **System names defined**: All requirements use "THE SYSTEM" which is defined in the Glossary
- **Clause order correct**: Complex patterns follow WHERE → WHILE → WHEN → THE → SHALL
- **No mixed patterns**: Each requirement uses exactly one primary EARS pattern
- **Technical terms defined**: All glossary terms defined before use

---

## Testing Strategy Alignment

### Property-Based Testing Candidates

The following requirements are suitable for property-based testing:

1. **REQ-2 (Stage Duration)**: *For any* growth sequence, each stage must play for exactly 2.5 seconds
2. **REQ-3 (Fixed-Frame)**: *For any* bioreactor rendering, the outer glass border must remain stationary
3. **REQ-6 (BPM Progression)**: *For any* growth sequence, BPM must match stage specification
4. **REQ-8 (Battle Matrix)**: *For any* monster pair combination, a valid video URL must be returned
5. **REQ-10 (Cache Hit)**: *For any* cached video entry within 24-hour expiry, the cached URL must be returned

### Unit Testing Candidates

The following requirements are suitable for example-based unit tests:

1. **REQ-4 (Hybrid Pipeline)**: Test AI API path and reference video fallback path
2. **REQ-5 (Crossfade)**: Verify 0.15s crossfade timing with specific test videos
3. **REQ-9 (Error Handling)**: Test error scenarios with simulated API failures
4. **REQ-11 (Fluid Effects)**: Test bubble and wave calculations with specific BPM values
5. **REQ-14 (Error Degradation)**: Test fallback behaviors with simulated failures

### Integration Testing Candidates

The following requirements require end-to-end integration testing:

1. **REQ-1 (Complete Sequence)**: Full 15-second growth sequence end-to-end
2. **REQ-7 (Awakening)**: Stage ⑥ completion → roar trigger flow
3. **REQ-13 (Audio)**: WebAudioContext → multi-harmonic synthesis pipeline
4. **REQ-15 (Arena)**: Battle selection → video load → winner determination flow

---

## Requirement Traceability

| Requirement | Design Section | Test Type |
|-------------|----------------|-----------|
| REQ-1 | Overview, Correctness Properties | Property |
| REQ-2 | Correctness Properties, Performance | Property + Unit |
| REQ-3 | Correctness Properties, Architecture | Property |
| REQ-4 | Architecture, Components | Unit + Integration |
| REQ-5 | Correctness Properties, Performance | Property |
| REQ-6 | Correctness Properties, Architecture | Property |
| REQ-7 | Architecture, Components | Unit + Integration |
| REQ-8 | Architecture, Data Models | Property |
| REQ-9 | Error Handling | Unit |
| REQ-10 | Data Models, Error Handling | Property |
| REQ-11 | Components | Unit |
| REQ-12 | Components | Unit |
| REQ-13 | Architecture, Components | Unit + Integration |
| REQ-14 | Error Handling | Unit + Integration |
| REQ-15 | Architecture | Integration |

---

## Priority and Risk Assessment

### High Priority (MVP)

- REQ-1: Complete 6-stage growth sequence (core feature)
- REQ-2: Stage duration accuracy (timing critical)
- REQ-3: Fixed-frame rendering (visual quality requirement)
- REQ-4: Hybrid video pipeline (availability requirement)
- REQ-7: Awakening roar trigger (user experience)

### Medium Priority (Post-MVP)

- REQ-6: BPM progression (enhancement)
- REQ-8: Battle matrix (arena feature)
- REQ-11: Fluid effects (visual enhancement)
- REQ-12: HUD display (user feedback)

### Low Priority (Nice to Have)

- REQ-5: Crossfade quality (improvement over direct cuts)
- REQ-9: Detailed error handling (already covered by REQ-4)
- REQ-10: Video caching (performance optimization)
- REQ-13: Audio synthesis (enhancement over basic audio)
- REQ-14: Error degradation (already covered by REQ-4, REQ-11)
- REQ-15: Battle winner (arena feature, low priority)

---

## Acceptance Criteria Summary

### Functional Acceptance

- [ ] User can select any of 16 monsters
- [ ] Each monster shows complete 15-second growth sequence
- [ ] All 6 stages play in correct order with exact timing
- [ ] Fixed frame remains stationary (no shaking)
- [ ] AI API generation works when token available
- [ ] Reference video fallback works when AI unavailable
- [ ] 16x16 battle matrix returns valid videos for all pairs
- [ ] Awakening roar triggers at stage ⑥ completion

### Non-Functional Acceptance

- [ ] All effects contained within fixed frame boundaries
- [ ] BPM progression matches specification (58 → 260+)
- [ ] Crossfades complete in exactly 0.15 seconds
- [ ] Fluid dynamics update based on current BPM
- [ ] HUD displays stage, progress, BPM, timer
- [ ] Error handling provides graceful degradation
- [ ] Cache reduces redundant API calls
