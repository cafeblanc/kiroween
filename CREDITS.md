# Credits and media sources

PROMETHEUS-iPSC uses only media that is either licensed for reuse, generated for this project, or synthesized in code.
No third-party logos or trademarks are intended to appear; if you spot one, please open an issue.

## Wikimedia Commons (streamed at runtime from upload.wikimedia.org)

Used in `src/data/bioExperiments.ts` as microscopy footage and photos. License and author data come from the
Commons API (`prop=imageinfo&iiprop=extmetadata`), checked on 2026-11-20.

| File | Author | License |
|---|---|---|
| [Mitosis 480*360.theora.ogv](https://commons.wikimedia.org/wiki/File:Mitosis_480*360.theora.ogv) | Cookatoo.ergo.ZooM | CC BY-SA 3.0 |
| [MTS mitosis project.theora.ogv](https://commons.wikimedia.org/wiki/File:MTS_mitosis_project.theora.ogv) | Cookatoo.ergo.ZooM | CC BY-SA 3.0 |
| [Human Cerebral Organoids (53728295930).jpg](https://commons.wikimedia.org/wiki/File:Human_Cerebral_Organoids_(53728295930).jpg) | NIAID | CC BY 2.0 |
| [Human Brain Organoid.jpg](https://commons.wikimedia.org/wiki/File:Human_Brain_Organoid.jpg) | Nreis1 | CC BY 4.0 |
| [HDAC1 cardiomyocyte differentiation, pone.0045046.s001.ogv](https://commons.wikimedia.org/wiki/File:Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s001.ogv) | Hoxha E, Lambers E, Wasserstrom J, Mackie A, Ramirez V, Abramova T, Verma S, Krishnamurthy P, Kishore R | CC BY 2.5 |
| [HDAC1 cardiomyocyte differentiation, pone.0045046.s003.ogv](https://commons.wikimedia.org/wiki/File:Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s003.ogv) | Hoxha E et al. (as above) | CC BY 2.5 |
| [HDAC1 cardiomyocyte differentiation, pone.0045046.s004.ogv](https://commons.wikimedia.org/wiki/File:Elucidation-of-a-Novel-Pathway-through-Which-HDAC1-Controls-Cardiomyocyte-Differentiation-through-pone.0045046.s004.ogv) | Hoxha E et al. (as above) | CC BY 2.5 |
| [Proteolysis regulates cardiomyocyte maturation, ncomms14495-s3.ogv](https://commons.wikimedia.org/wiki/File:Proteolysis-regulates-cardiomyocyte-maturation-and-tissue-integration-ncomms14495-s3.ogv) | Fukuda R, Gunawan F, Beisaw A, Jimenez-Amilburu V, Maischein H, Kostin S, Kawakami K, Stainier D | CC BY 4.0 |
| [Mitosis drosophila larva.ogv](https://commons.wikimedia.org/wiki/File:Mitosis_drosophila_larva.ogv) | Denysbondar | CC BY-SA 3.0 |
| [AxolotlBE.jpg](https://commons.wikimedia.org/wiki/File:AxolotlBE.jpg) | th1098 | CC BY-SA 3.0 |

The files are streamed unmodified from Wikimedia; the CC BY-SA terms apply to those files only, not to this repository's code.

## Generated for this project

| Media | Tool |
|---|---|
| Experiment clips in `public/videos/experiments/`, growth and battle videos made in the app | [LTX Video API](https://ltx.video) (`ltx-2-5-fast`), scripts `scripts/gen-experiment-clips.mjs`, `scripts/gen-heart-clip.mjs` |
| Sample monster images in `public/images/samples/`, Design Room images | Stable Diffusion 3 Medium via the HuggingFace Inference API (`api/generate-image.ts`, `scripts/gen-design-candidates.ts`); fallback [Pollinations](https://pollinations.ai) |
| Lab and experiment illustrations in `public/images/` | AI image generation for this project. They are illustrations, not photographs from the cited labs. |
| Roars and heartbeat in `public/sounds/` | Synthesized in code (`scripts/generate12Roars.cjs`, `scripts/generateRoarSound.cjs`, `scripts/generateHeartbeatWav.cjs`) |

## Live data

- [Europe PMC REST API](https://europepmc.org/RestfulWebService) for peer-reviewed paper lookups.
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) for encyclopedic summaries (CC BY-SA 4.0 text).

## Cited research

Each experiment card cites its paper (journal, year, PMID/DOI) in `src/data/bioExperiments.ts`. The app summarizes
the findings for a general audience; the papers are the authority.
