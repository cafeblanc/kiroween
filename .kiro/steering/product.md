# Product Steering: PROMETHEUS-iPSC (The Modern Bio-Frankenstein Lab)

## 1. Vision & Kiroween Track Alignment
- **Hackathon Track**: **Frankenstein** ("Stitch together a chimera of incompatible technologies into a single, unexpectedly powerful app")
- **Core Premise**: In 1818, Victor Frankenstein used crude surgical thread and lightning to stitch dead tissues together. In 2026, modern regenerative biology uses **Induced Pluripotent Stem Cells (iPSCs)**—guided by Yamanaka transcription factors (`OCT4`, `SOX2`, `KLF4`, `c-MYC`)—as the ultimate living bio-glue capable of differentiating into any cell type (neurons, cardiomyocytes, vascular endothelium) to fuse incompatible biological hosts and synthetic systems.
- **User Experience Goal**: Create an eerie, hyper-realistic scientific archive and interactive bio-stitching simulator backed 100% by real peer-reviewed breakthroughs (*Nature*, *Cell*, *Neuron*, PubMed, EuropePMC, and Wikimedia Commons microscopy footage), making users wonder: *"Has modern science already crossed the threshold of Frankenstein?"*

## 2. Featured Real-World Bio-Frankenstein Cases
1. **Stanford Xenocortication (92% Human-Brain Mouse Chimera)**: Transplanting human stem-cell cortical organoids into genetically depleted mouse brains, replacing 92% of the cortex, extending axons to the spinal cord, developing human-specific von Economo neurons, and driving host behavior (*Nature*, Sergiu Pașca Lab).
2. **Ghost Heart Recellularization**: Stripping a dead porcine/human heart down to a translucent white extracellular matrix (ECM) ghost scaffold and re-seeding it with iPSC-derived cardiomyocytes until it beats autonomously (*Nature Medicine*, Doris Taylor Lab).
3. **Yale BrainEx Post-Mortem Revival**: Restoring cellular metabolism, microvascular circulation, and synaptic activity in decapitated pig brains 4 hours after death (*Nature*, Nenad Sestan Lab).
4. **DishBrain Sentient Silicon-Neuron Hybrid**: Fusing human iPSC-derived cortical neurons onto high-density multi-electrode silicon arrays that self-organize and learn to play *Pong* in 5 minutes (*Neuron*, Cortical Labs).
5. **Anthrobots & Xenobots**: Self-assembling living biological robots built from adult human somatic/stem progenitor cells that swim across damaged human neural tissue and stitch wounds closed (*Advanced Science*, Michael Levin Lab).
6. **Salk Institute Human-Pig Blastocyst Chimera**: Injecting human pluripotent stem cells into CRISPR-edited pig embryos to grow humanized organs inside livestock hosts (*Cell*, Izpisua Belmonte Lab).

## 3. Core Architectural Blocks (The 4 Stitched Modules)
- **Block 1: Bio-Microscopy & Archival Video Viewport**: Full-screen loop of real scientific/microscopy footage and authentic experimental photography with a concise 6-card `[❓ Lab Manual]` modal.
- **Block 2: WebAudio Neural Bio-Narrator**: `<video>` remains strictly muted to prevent browser caption intrusion, while the WebAudio API synthesizes Dr. Victor Kiro's 60s Chief Bioengineer voice narration and lab bio-monitor acoustics.
- **Block 3: 3-Second Auto-Absorbing Synapse Chat**: Floating neural telemetry chat that slides up over the video viewport on mobile/desktop and automatically absorbs (slides upward and vanishes) 3 seconds after the last message.
- **Block 4: iPSC Stem-Cell Bio-Stitcher & Live PubMed/Wikipedia Cross-Verifier**: Interactive surgical overlay that lets users inject pluripotent stem cells between incompatible tissues and query live peer-reviewed papers (EuropePMC/PubMed REST API) and encyclopedic records (Wikipedia REST API) in real time.
