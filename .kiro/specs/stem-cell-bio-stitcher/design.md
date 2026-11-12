# System Design: PROMETHEUS-iPSC (Frankenstein Track)

## 1. High-Level Chimera Architecture

```mermaid
flowchart TD
    subgraph UI["PROMETHEUS-iPSC Bio-Stitching Viewport"]
        B1["Block 1: Microscopy & Archival Video Viewport\n(6 Verified Cases + Concise [❓ Help] Modal)"]
        B2["Block 2: WebAudio Neural Narrator & ECG Synthesizer\n(Dr. Victor Kiro Voice + Heartbeat/Synapse Audio)"]
        B3["Block 3: 3s Auto-Absorbing Synapse Chat\n(Slides up over video -> vanishes upward after 3s)"]
        B4["Block 4: iPSC Stem-Cell Bio-Stitcher Overlay\n(Yamanaka Factor Differentiation & Tissue Fusion)"]
    end

    subgraph APIs["Real-Time Scientific Knowledge Stitcher"]
        PM["EuropePMC / PubMed REST API\n(Peer-Reviewed Papers & PMIDs)"]
        WK["Wikipedia REST API\n(Historical & Anatomical Context)"]
        WC["Wikimedia Commons Media\n(Microscopy Videos & Confocal Photos)"]
    end

    B1 <--> WC
    B3 <--> PM
    B4 <--> PM
    B4 <--> WK
    B1 --> B2
```

## 2. Pluripotent Stem-Cell (iPSC) Differentiation State Machine

```mermaid
stateDiagram-v2
    [*] --> SomaticCell: Harvest Adult Somatic / Fibroblast Cell
    SomaticCell --> iPSC_Cluster: Apply Yamanaka Factors (OCT4, SOX2, KLF4, c-MYC)
    iPSC_Cluster --> NeuralLineage:Wnt/BMP Inhibition (Xenocortication / DishBrain)
    iPSC_Cluster --> CardiacLineage:Activin A + BMP4 (Ghost Heart Recellularization)
    iPSC_Cluster --> ChimericBlastocyst:Microinjection (Human-Pig Organogenesis)
    NeuralLineage --> FunctionalChimera: 92% Cortical Integration & Synaptic Firing
    CardiacLineage --> FunctionalChimera: Autonomous 72 BPM Perfusion Contraction
    ChimericBlastocyst --> FunctionalChimera: Vascularized Interspecies Organ Scaffold
```

## 3. Component Breakdown
1. `src/data/bioExperiments.ts`: Curated dataset of the 6 real-world modern Frankenstein experiments with verified PubMed PMIDs, DOIs, Wikimedia Commons microscopy video/image URLs, and iPSC differentiation protocols.
2. `src/services/scienceStitchService.ts`: Real-time asynchronous client that queries EuropePMC (`ebi.ac.uk/europepmc/webservices/rest/search`) and Wikipedia REST APIs (`en.wikipedia.org/api/rest_v1/page/summary/`) and stitches them into a unified Chimera Research Dossier.
3. `src/components/BioStitchLabView.tsx`: Main responsive laboratory interface integrating the 4 core blocks, real-time ECG/synapse canvas visualizer, 3-second auto-dismissing mobile floating chat, and the `[❓ Help]` modal.
