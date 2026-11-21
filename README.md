# PROMETHEUS-iPSC: The Modern Bio-Frankenstein Lab

Kiroween 2026 submission, **Frankenstein** track. Live app: https://asura.cafeblanc.kr

In 1818 Victor Frankenstein stitched dead tissue together with thread and lightning. In 2026 regenerative biology
does it with induced pluripotent stem cells (iPSCs), reprogrammed by the Yamanaka factors `OCT4`, `SOX2`, `KLF4`
and `c-MYC`. PROMETHEUS-iPSC is a dark lab archive of six real, peer-reviewed "Frankenstein" experiments, plus a
monster lab where you design a chimera, grow it in a bioreactor and send it into a video battle arena.

## The chimera

The app stitches technologies that were never meant to work together into one browser experience:

- **Peer-reviewed science.** Europe PMC (PubMed) and Wikipedia REST APIs, queried live, no key needed.
- **Generative video.** The LTX-2.5 video API, called through a Vercel serverless proxy that holds the key.
- **Generative images.** Stable Diffusion 3 on HuggingFace, with Pollinations as a free fallback.
- **Procedural sound.** WebAudio heartbeat, bubbling and roars, all synthesized in code.
- **Local persistence.** IndexedDB stores your monsters and their videos in the browser.

## What you can do

1. **Experiment archive.** Six real cases, each with the paper's journal, year and PMID/DOI, footage and a narrator:
   - Stanford xenocortication: human cortical organoids in rat brains (Pașca lab, *Nature*).
   - Ghost Heart: decellularised hearts re-seeded with cardiac cells (Taylor and Ott labs, *Nature Medicine*).
   - Yale BrainEx: circulation and cell function restored in pig brains hours after death (Sestan lab, *Nature*).
   - Human-pig chimera embryos (Izpisua Belmonte lab, *Cell*).
   - A live-born chimeric monkey whose stem-cell-derived cells glow green (Liu and Sun labs, *Cell*).
   - Axolotl limb regeneration (Tanaka and Whited labs).
2. **Cross-verifier.** Ask about any case. The lab queries Europe PMC and Wikipedia live and shows the sources.
3. **Design Room.** Pick a base species and traits. A free HuggingFace image previews the design before you spend
   anything on video. Stats share a 450-point budget, and no stat or win chance ever reaches 0% or 100%.
4. **Bioreactor.** The embryo grows through six stages with a rising heartbeat, then breaks the glass and roars.
5. **Arena.** Two monsters fight in a 16-second LTX battle video written from their stats. Each monster has one
   finisher and one defence move, and the winner wins with its finisher.
6. **Monster manager.** Rename, export as ZIP, or delete your monsters and clear duplicates.

### Direct links

Each of these opens one screen directly (add `&lang=en` for English):

| Link | Opens |
|---|---|
| https://asura.cafeblanc.kr/?lang=en&case=ghost-heart | The Ghost Heart case. Other cases: `xenocortication`, `brainex`, `human-pig`, `monkey`, `axolotl` |
| https://asura.cafeblanc.kr/?lang=en&open=design | The Design Room |
| https://asura.cafeblanc.kr/?lang=en&open=arena&menu=demo | The arena with the free demo battle menu open |
| https://asura.cafeblanc.kr/?lang=en&open=demo | The 16 s showcase battle, full screen (`&demo=2`, `&demo=3` for the others) |
| https://asura.cafeblanc.kr/?lang=en&open=kiro&tab=hooks | The "Built with Kiro" panel (tabs: `specs`, `steering`, `hooks`, `tests`) |
| https://asura.cafeblanc.kr/?lang=en&open=help | The user guide |

### Cost note for judges

The archive, the cross-verifier, the Design Room images and the bioreactor growth of the six sample monsters are
free. Only new LTX videos (custom growth clips and arena battles) cost money, about $0.13 per second. The server
caps them at 5 per day and answers 429 after that.

## Run it locally

```bash
npm install
cp .env.example .env.local   # LTXV_API_KEY and HF_TOKEN; both optional for the free features
npx vercel dev               # serves the Vite app and the api/ functions together
# or, frontend only:
npm run dev
```

Checks: `npx tsc --noEmit`, `npx tsc -p api --noEmit`, `npm test` (vitest, 41 files, 404 tests), `npm run build`.

## How Kiro was used

- **Specs** (`.kiro/specs/`). Each feature was built from requirements, design and tasks documents:
  - `stem-cell-bio-stitcher`: the experiment archive.
  - `kiroween-rearchitecture`: the six-stage growth engine.
  - `video-arena-bioreactor-overhaul`: the arena.
  - `ltx-custom-studio-arena`: the LTX pipeline and custom monsters.
  - `hidden-bugs-audit`: a bug-condition and preservation audit.
  - `arena-engagement-loop` and `sample-monster-fix`: plans for the arena loop and the sample monsters.
- **Steering** (`.kiro/steering/product.md`, `tech.md`, plus `AGENTS.md`). These hold the product vision, palette,
  API rules and working rules for the agent: a retry limit, a single dev server, and private strategy docs that stay
  out of git.
- **Hooks** (`.kiro/hooks/prometheus-lab.json`):
  - `related-tests-on-save` runs the vitest suites that import a saved file.
  - `secret-scan-on-save` warns about HF, AWS, OpenAI or GitHub tokens in a saved file.
  - `private-strategy-doc-guard` checks that a new strategy document is gitignored.
  - `peer-review-citation-check` asks the agent to re-verify citations in Europe PMC and to update `CREDITS.md`.
- **Property-based testing.** 21 test files use `fast-check`, covering stage timing, BPM progression, stat budget,
  battle odds, video fallbacks and more.
- **Sub-agents.** Used for parallel audits, documentation lookups and independent verification of changes.

## Credits and license

Media sources and licenses are listed in [CREDITS.md](./CREDITS.md). Code is MIT licensed ([LICENSE](./LICENSE)).
