# Devpost submission text / Devpost 제출 문구

Copy the English text into the Devpost form. The Korean is for your reference only.
영어 문구를 Devpost 양식에 복사하세요. 한국어는 참고용 번역입니다.

## Fields / 기본 칸

- **Project name / 프로젝트 이름:** PROMETHEUS-iPSC: Bio-Frankenstein Stem-Cell Lab
- **Elevator pitch / 한 줄 소개 (195 chars):** What if Victor Frankenstein used pluripotent stem cells (iPSCs) instead of thread? Explore 6 real bio-chimera experiments, query live PubMed, then grow your own monster and battle it in AI video.
- **Thumbnail / 썸네일:** `docs/devpost-thumbnail.jpg` (1500x1000, 3:2)
- **Category / 부문:** Frankenstein
- **App URL:** https://asura.cafeblanc.kr
- **Repository:** https://github.com/cafeblanc/kiroween
- **Video:** (your YouTube link / 직접 올린 YouTube 링크)
- **Built with / 사용 기술:** React, TypeScript, Vite, Tailwind CSS, Vercel Functions, LTX Video API, HuggingFace Inference (Stable Diffusion 3), Europe PMC API, Wikipedia API, WebAudio, Web Speech API, IndexedDB, Vitest, fast-check, Kiro

## About the project (English, paste everything below this line into Devpost)

## Inspiration

In 1818, Mary Shelley imagined **Victor Frankenstein** stitching together lifeless tissue and waking it with a spark of electricity. Two centuries later, regenerative biology has crossed thresholds that sound just as Gothic:

- **Xenocortication** (*Nature*, Pașca lab): human cortical organoids transplanted into newborn rat brains mature, wire into the rat's circuits and respond to its senses.
- **Ghost Hearts** (*Nature Medicine*, Taylor and Ott labs): a heart is washed with detergent until only a translucent white collagen "ghost" remains, then re-seeded with cells until it beats again.
- **BrainEx** (*Nature*, 2019, Sestan lab): circulation and cellular functions restored in pig brains four hours after death.
- **A chimeric monkey** (*Cell*, 2023): a live-born macaque built partly from embryonic stem cells that glow green in its own skin.

We asked: **what if Victor Frankenstein's laboratory existed in 2026?** For Kiroween's **Frankenstein track** we stitched together technologies that were never meant to meet, so that peer-reviewed stem-cell science and a monster lab live in one app.

## What it does

**PROMETHEUS-iPSC** is a dark, bilingual (English and Korean, plus machine translation into other languages) biotech laboratory with two connected wings.

### 1. The experiment archive
- **Six real, peer-reviewed cases:** human brain organoids in rats, the beating Ghost Heart, Yale BrainEx, human-pig chimera embryos (*Cell*, 2017), the green-fluorescent chimeric monkey, and axolotl limb regeneration. Every card shows the journal, year and PubMed ID.
- **Microscopy viewport:** each case plays its own clip over CC-licensed Wikimedia microscopy and a photo, with a spoken narrator and a procedural WebAudio heartbeat.
- **Live, key-free cross-verifier:** ask any question and the lab queries **Europe PMC (PubMed)** and the **Wikipedia REST API** in real time, then shows the answer with its sources (PMID, year).

### 2. The monster lab
- **Design Room:** pick a base species (mythic, alien, Frankenstein, human) and its head, arms, legs, tail and traits. A **free AI image** (Stable Diffusion 3 on HuggingFace) previews the design before anything costs money. Alien monsters are non-carbon life (silicon, boron nitride).
- **Balanced stats:** every monster shares a 450-point stat budget, and no stat or win chance is ever 0% or 100%. Each monster has one signature finisher and one defence move, for example Prometheus' emerald laser gaze and elastic body, or Frankenstein's titanium hammer punch and hyper-regeneration.
- **Bioreactor:** the embryo grows through six stages while its synthesized heartbeat speeds up, then it cracks the glass and roars.
- **Arena:** two monsters fight in a **16-second AI battle video (LTX-2.5)** written from their stats. It is one continuous take of close combat: fists, claws, tail whips, spinning kicks, head-butts, bites, a flame cannon, and the winner's finisher. A 3-act battle story is written alongside it.
- **Free demo battles:** judges can open **🎬 Free demo battle ▾** in the arena and watch pre-made battles at no cost, starting with the 16-second showcase.
- **Monster Manager:** rename monsters, export them as a ZIP, delete them, and clean up duplicates. Everything is stored in the browser (IndexedDB).

## How we built it

The chimera of technologies:
1. **Peer-reviewed science APIs:** Europe PMC and Wikipedia, called from the browser with no API key.
2. **Generative video:** LTX-2.5 through a Vercel serverless proxy that keeps the key on the server, with a daily cap. The first frame of each battle is composed in a canvas: both monsters on one shared arena, bodies already touching, the right fighter mirrored.
3. **Generative images:** Stable Diffusion 3 through a server route with a HuggingFace token, falling back to Pollinations, then to bundled samples.
4. **Procedural sound:** WebAudio heartbeat, bubbles and roars synthesized in code, plus a Web Speech narrator.
5. **Local persistence:** IndexedDB for monsters, videos and battle chronicles.

Stack: React 18, TypeScript, Vite, Tailwind CSS, Vercel Functions.

### How Kiro powered development
Everything Kiro used is checked into **`/.kiro`** in the repository.
- **Specs** (`.kiro/specs/`): each feature started as requirements, design and tasks. They cover the stem-cell bio-stitcher, the six-stage growth engine, the video arena and bioreactor overhaul, the LTX custom studio and arena, a hidden-bugs audit with bug-condition and preservation tests, the arena engagement loop, and the sample monster fixes.
- **Steering** (`.kiro/steering/product.md`, `tech.md`, plus `AGENTS.md`): the product vision, palette and API rules. It also holds working rules for the agent: at most two retries, a single dev server, OpenAI not used, and private strategy documents never committed.
- **Agent hooks** (`.kiro/hooks/prometheus-lab.json`):
  - `related-tests-on-save` runs the vitest suites that import a file the agent saves.
  - `secret-scan-on-save` warns about HuggingFace, AWS, OpenAI or GitHub tokens and private keys.
  - `private-strategy-doc-guard` checks that new strategy documents are gitignored.
  - `peer-review-citation-check` asks the agent to re-verify citations in Europe PMC and update `CREDITS.md` whenever the experiment data changes.
- **Property-based testing:** 21 test files use **fast-check** (stage timing, heartbeat progression, the 450-point stat budget, battle odds, video fallbacks). 404 tests pass.
- **Sub-agents:** used for parallel audits, documentation lookups and independent verification of changes.

## Challenges we ran into

1. **Making two AI monsters actually fight.** Early videos showed creatures posing for the camera, breathing fire toward the viewer, or dancing separately with a wall between them. We solved it with a shared first frame where the bodies already touch, a mirrored right fighter, and a single-take prompt in which every blow names the attacker, the body part it hits and the reaction.
2. **Keeping real biology real.** The green in the chimeric monkey is a protein made by its own cells, not coloured light. We regenerated the clip with the same photo as its first and last frame, so the fluorescent patches stay on the same skin while it moves.
3. **Spending carefully.** Video costs real money, so the lab previews designs with free images, caps paid videos per day, and ships free demo battles for judges.

## Accomplishments that we're proud of

- A 16-second, full-contact battle generated from game stats, ending in the winner's own finisher.
- An archive where every scientific claim links to its paper, verified live against Europe PMC.
- A Kiro workflow that is visible both in the repository and inside the running app: the **📐 Built with Kiro** button in the top bar shows our specs, steering rules, the four real agent hooks and the test suite.
- The citation hook caught a real mistake: our first experiment card claimed a "92%" human-brain mouse that the paper (*Nature*, 2022, rats) never reported, and we corrected it.

## What we learned

- Real biology is stranger than fiction, and it deserves accurate details: who did the experiment, in which animal, and what was actually shown.
- Video models need very concrete direction to stay in one continuous fight, and spec-driven development kept a fast-moving hackathon project from collapsing under its own features.

## What's next for PROMETHEUS-iPSC

- More real experiments, imported from any PubMed ID.
- Tournaments between saved monsters, and user-written battle stories.
- A 3D viewer for the Yamanaka factors (OCT4, SOX2, KLF4, c-MYC).

---

## 한국어 참고 번역 (요약)

- **영감:** 1818년 프랑켄슈타인의 상상이 2026년 재생 생물학에서 현실이 되었습니다. 쥐 뇌에 이식된 인간 대뇌 오가노이드, 다시 뛰는 유령 심장, 사후 4시간 뒤 되살린 돼지 뇌, 녹색으로 빛나는 키메라 원숭이가 그 예입니다.
- **기능:** 실제 논문 6편 보관소와 실시간 PubMed·위키백과 검증, 그리고 괴수 설계실, 바이오리액터, 16초 AI 전투 결투장, 무료 데모 전투, 괴수 관리를 갖췄습니다.
- **제작:** 과학 API, LTX 영상, HuggingFace 이미지, WebAudio 소리, IndexedDB를 한 앱에 꿰맸습니다.
- **Kiro:** spec, steering, 실제 에이전트 훅 4개, fast-check 속성 테스트(404개 통과), 서브 에이전트를 썼습니다.
- **어려웠던 점:** 두 괴수가 실제로 맞붙게 만들기, 형광 원숭이를 과학적으로 정확하게 표현하기, 비용 관리.
