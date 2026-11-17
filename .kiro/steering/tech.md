# Technical & Architectural Steering

## 1. Technology Stack (Frankenstein Chimera Stack)
- **Frontend Framework**: React 18 + TypeScript + Vite
- **Styling & Bio-Gothic UI**: Tailwind CSS (Bioluminescent Emerald `#10b981`, Neural Cyan `#06b6d4`, Arterial Crimson `#ef4444`, Deep Lab Obsidian `#020617`)
- **Acoustic Engine**: WebAudio API (`AudioContext`, oscillator bio-monitors, neural speech synthesis)
- **Live Scientific Knowledge APIs (Zero-Key, CORS-Enabled)**:
  - **EuropePMC / PubMed REST API**: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=...&format=json` for real-time peer-reviewed stem cell and chimera papers.
  - **Wikipedia REST Summary API**: `https://en.wikipedia.org/api/rest_v1/page/summary/...` for historical and anatomical context.
  - **Wikimedia Commons API**: Verified public-domain microscopy videos (`.ogv`/`.webm`/`.mp4`) and high-resolution confocal fluorescence photographs.

## 2. Strict Engineering Rules
- **No Unhandled Media Failures**: Every microscopy video stream must pair with a verified high-resolution confocal microscopy photograph and fallback canvas bio-simulation so the viewport is always visually arresting.
- **5-Second Synapse Chat Rule (all viewports)**: Incoming chat messages and AI bio-telemetry responses must appear over the bottom of the full-screen video player and automatically slide upward out of view (`-translate-y-full opacity-0`) about 5 seconds after the last message (named constant `SYNAPSE_CHAT_ABSORB_MS`). The timer pauses while the pointer is over the overlay. (Changed from the earlier 3-second mobile-only rule at the user's explicit request.)
- **Concise Lab Manual**: The `[❓ Help / Lab Guide]` button sits right next to the top-left `LIVE BIO-FEED` badge (replacing redundant viewer counters) and opens a clean, 6-point summary modal that returns directly to the active experiment state when closed.
