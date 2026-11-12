# Spec Requirements: iPSC Stem-Cell Bio-Stitching Laboratory

## Introduction
This specification defines the functional and technical requirements for **PROMETHEUS-iPSC**, built for the **Kiroween 2026 Frankenstein Track** using Kiro's spec-driven development methodology.

---

## Requirements (EARS Notation)

### REQ-1: Real-World Bio-Frankenstein Case Switcher & Viewport
- **WHEN** the user selects any of the 6 verified bio-experiment chips (e.g., *Stanford 92% Human-Mouse Brain*, *Ghost Heart*, *Yale BrainEx*, *DishBrain*, *Anthrobots*, *Human-Pig Chimera*),
- **THE SYSTEM SHALL** immediately load the corresponding microscopy video/photographic evidence, PubMed citation metadata (PMID/DOI, journal, institution), and stem-cell differentiation profile into the main viewport without page reload.

### REQ-2: Pluripotent Stem-Cell (iPSC) Bio-Stitching Simulator
- **WHEN** the user clicks the `[🧬 Inject iPSC & Bio-Stitch]` action button,
- **THE SYSTEM SHALL** open the interactive **Stem-Cell Synapse Junction Overlay** displaying:
  1. **Host Tissue A (Biological / Historical Substrate)**
  2. **The iPSC Pluripotent Bridge** (Yamanaka Factors `OCT4`, `SOX2`, `KLF4`, `c-MYC` + differentiation lineage: Cortical Neurons, Cardiomyocytes, or Vascular Endothelium)
  3. **Donor / Synthetic Tissue B (Human Organoid / Silicon Array)**
  4. **Live Peer-Reviewed Literature Verification** fetched dynamically from EuropePMC/PubMed and Wikipedia REST APIs.

### REQ-3: 3-Second Auto-Absorbing Floating Synapse Chat
- **WHEN** a user submits a question or keyword in the chat input (or selects a specimen on mobile),
- **THE SYSTEM SHALL** push the message and the AI Chief Bioengineer's response upward onto the lower video viewport, AND
- **WHEN** 3.0 seconds have elapsed since the final message without new input,
- **THE SYSTEM SHALL** smoothly animate all floating chat bubbles upward (`-translate-y-full opacity-0`) and clear the overlay so the microscopy viewport remains unobstructed.

### REQ-4: Concise 6-Card `[❓ Help]` Lab Manual Modal
- **WHEN** the user clicks the `[❓ Help]` button located beside the top-left `LIVE LAB` badge inside the video viewport,
- **THE SYSTEM SHALL** display a concise 6-card quick-reference manual (Specimen Selection, iPSC Bio-Stitching, 3s Synapse Chat, Stem-Cell Viability Index, WebAudio Voice Control, and Lab Archive Search) and restore the exact live viewport state upon closing.

### REQ-5: Live Scientific Search Stitcher (PubMed + Wikipedia Chimera Query)
- **WHEN** the user searches any biological phenomenon, organoid experiment, or historical anomaly in the Live Research Stitcher,
- **THE SYSTEM SHALL** concurrently query the EuropePMC/PubMed REST API and Wikipedia REST API, stitching historical context with peer-reviewed scientific citations in real time.
