# Implementation Tasks: PROMETHEUS-iPSC

- [x] **Task 1: Initialize Kiro Spec-Driven Architecture (`/.kiro`)**
  - [x] 1.1 Create `.kiro/steering/product.md` and `.kiro/steering/tech.md`
  - [x] 1.2 Author EARS-compliant `.kiro/specs/stem-cell-bio-stitcher/requirements.md`
  - [x] 1.3 Author Mermaid architecture & state diagrams in `.kiro/specs/stem-cell-bio-stitcher/design.md`
  - [x] 1.4 Configure `.kiro/hooks/pubmed-citation-verifier.hook.json`

- [x] **Task 2: Curate Verified Real-World Bio-Frankenstein Dataset (`src/data/bioExperiments.ts`)**
  - [x] 2.1 Add Case #01: Stanford *Xenocortication* (92% Human-Mouse Brain Chimera, Sergiu Pașca Lab, *Nature*)
  - [x] 2.2 Add Case #02: *Ghost Heart* Decellularized ECM Scaffold + iPSC Cardiomyocytes (*Nature Medicine*)
  - [x] 2.3 Add Case #03: Yale *BrainEx* Post-Mortem Pig Brain Revival (Nenad Sestan Lab, *Nature*)
  - [x] 2.4 Add Case #04: *DishBrain* Living Human Neurons Playing Pong (*Neuron*)
  - [x] 2.5 Add Case #05: *Anthrobots & Xenobots* Self-Assembling Neural Wound Stitchers (*Advanced Science*)
  - [x] 2.6 Add Case #06: Salk Institute *Human-Pig Chimera* Embryo (*Cell*)

- [x] **Task 3: Build Real-Time Scientific Stitcher Service (`src/services/scienceStitchService.ts`)**
  - [x] 3.1 Implement live EuropePMC / PubMed REST API search for peer-reviewed stem-cell papers
  - [x] 3.2 Implement live Wikipedia REST API summary fetcher for historical/anatomical context
  - [x] 3.3 Combine results into a structured `StitchedScientificVerdict`

- [x] **Task 4: Assemble the 4 Core UI Blocks (`src/components/BioStitchLabView.tsx`)**
  - [x] 4.1 Block 1: Fullscreen Microscopy Video + Interactive Bio-Canvas + `[❓ Help]` 6-card concise guide modal
  - [x] 4.2 Block 2: WebAudio API Neural Narrator + Live ECG/Synapse acoustic pulse generator
  - [x] 4.3 Block 3: Mobile & Desktop Floating Synapse Chat with 3-second upward auto-absorption timer
  - [x] 4.4 Block 4: `[🧬 Inject iPSC & Bio-Stitch]` Interactive Surgical Overlay & Live PubMed Research Explorer

- [x] **Task 5: Production Build & Verification**
  - [x] 5.1 Verify TypeScript compilation and Vite production bundle
