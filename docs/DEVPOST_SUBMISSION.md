# Devpost submission text / Devpost 제출 문구

Copy the English text into the Devpost form. The Korean is for your reference only.
영어 문구를 Devpost 양식에 복사하세요. 한국어는 참고용 번역입니다.

## Fields / 기본 칸

- **Project name / 프로젝트 이름:** PROMETHEUS-iPSC: The Modern Bio-Frankenstein Lab
- **Tagline / 한 줄 소개:** Six real stem-cell "Frankenstein" experiments, and a lab where you stitch, grow and battle your own chimera.
  (실제 줄기세포 "프랑켄슈타인" 실험 6편, 그리고 나만의 키메라를 꿰매고 키우고 싸우게 하는 연구실.)
- **Category / 부문:** Frankenstein
- **App URL:** https://asura.cafeblanc.kr
- **Repository:** https://github.com/cafeblanc/kiroween
- **Video:** (your YouTube link / 직접 올린 YouTube 링크)
- **Built with / 사용 기술:** React, TypeScript, Vite, Tailwind CSS, Vercel Functions, LTX Video API, HuggingFace Inference (Stable Diffusion 3), Europe PMC API, Wikipedia API, WebAudio, IndexedDB, Vitest, fast-check, Kiro

## About the project (English, paste this)

### Inspiration
In 1818 Victor Frankenstein stitched the dead together with thread and lightning. Today regenerative biology does
things that sound just as strange: decellularised "ghost hearts" re-seeded with cells until they beat, pig brains
whose circulation is restored hours after death, human cortical organoids wired into rat brains, neurons on a chip
that learn Pong. We wanted an app that makes people ask: has science already crossed Frankenstein's threshold?

### What it does
- **Experiment archive.** Six real, peer-reviewed cases. Each card shows the journal, year and PubMed ID, footage, and a narrator.
- **Cross-verifier.** Ask any question; the lab queries Europe PMC and Wikipedia live and shows the sources.
- **Design Room.** Stitch your own chimera from species and traits. A free AI image previews the design before any video is made. Stats share a 450-point budget, and no stat or win chance is ever 0% or 100%.
- **Bioreactor.** The embryo grows through six stages while a synthesized heartbeat speeds up, then breaks the glass and roars.
- **Arena.** Two monsters fight in a 16-second AI video written from their stats. Each has a signature finisher and defence, and the winner wins with its finisher. A free demo battle plays without spending credits.
- **Monster Manager.** Rename, export as ZIP, delete, and clean up duplicates.

### How we built it (the chimera)
The app stitches together technologies that were never meant to meet:
peer-reviewed science APIs (Europe PMC, Wikipedia), generative video (LTX-2.5 through a Vercel serverless proxy that
keeps the key on the server), generative images (Stable Diffusion 3 on HuggingFace, with a free fallback), procedural
WebAudio sound (heartbeat, bubbles and roars synthesized in code), and IndexedDB to keep your monsters and videos in the browser.

### How we used Kiro
- **Specs:** every feature started as requirements, design and tasks in `.kiro/specs/` (experiment archive, six-stage growth engine, arena, LTX pipeline, a hidden-bugs audit, and more).
- **Steering:** `.kiro/steering/product.md` and `tech.md`, plus `AGENTS.md`, hold the product vision, palette, API rules and working rules for the agent (retry limits, one dev server, private strategy docs never committed).
- **Agent hooks:** `.kiro/hooks/prometheus-lab.json` runs the related tests when the agent saves a file, scans saved files for leaked tokens, checks that strategy documents are gitignored, and asks the agent to re-verify citations in Europe PMC whenever the experiment archive changes.
- **Property-based testing:** 21 test files use fast-check (stage timing, heartbeat progression, stat budget, battle odds, video fallbacks). 387 tests pass.
- **Sub-agents:** used for parallel audits, documentation lookups and independent verification of changes.

### Challenges
Getting two AI-generated monsters to actually fight each other instead of posing for the camera: we compose one shared
first frame with both bodies already in contact, mirror the right fighter, and write a single-take prompt where every
blow names the attacker, the body part it hits, and the reaction.

### Accomplishments
A 16-second, full-contact battle (fists, claws, tail, spinning kicks, head-butt, bite, flame cannon, laser-eye finisher)
generated from game stats, and an archive where every scientific claim links to its paper.

### What we learned
Real biology is stranger than fiction, and video models need very concrete direction to stay in one continuous fight.

### What's next
More real experiments, user-written battle stories, and tournaments between saved monsters.

---

## 프로젝트 소개 (한국어 참고 번역)

### 영감
1818년 프랑켄슈타인은 실과 번개로 죽은 조직을 꿰맸습니다. 오늘날 재생 생물학은 그만큼 기묘한 일을 해냅니다.
세포를 씻어낸 "유령 심장"에 세포를 다시 심어 뛰게 하고, 죽은 지 몇 시간 된 돼지 뇌의 혈류를 되살리고, 인간 대뇌
오가노이드를 쥐의 뇌에 연결하고, 칩 위의 신경세포가 퐁 게임을 배웁니다. "과학은 이미 프랑켄슈타인의 문턱을 넘었을까?"를
묻게 만드는 앱을 만들고 싶었습니다.

### 기능
- **실험 보관소:** 실제 논문 6편. 학술지, 연도, PubMed 번호, 영상, 내레이션.
- **교차 검증기:** 질문하면 Europe PMC와 위키백과를 실시간 조회해 출처를 보여 줍니다.
- **괴수 설계실:** 종과 특성을 골라 키메라를 설계하고 무료 AI 이미지로 먼저 확인합니다. 능력치 합계 450점, 0%·100% 확률 없음.
- **바이오리액터:** 심장 박동이 빨라지며 6단계로 자라고, 유리를 깨고 포효합니다.
- **결투장:** 능력치로 쓴 16초 AI 전투 영상. 괴수마다 필살기와 방어 특기가 있고, 승자는 필살기로 이깁니다. 무료 데모 전투 제공.
- **괴수 관리:** 이름 변경, ZIP 내보내기, 삭제, 중복 정리.

### 제작 방식 (키메라)
과학 논문 API, 생성형 영상(LTX-2.5, 키는 서버에만 보관), 생성형 이미지(HuggingFace SD3), 코드로 합성한 WebAudio 소리,
브라우저 저장소 IndexedDB를 하나의 앱으로 꿰맸습니다.

### Kiro 활용
- **Spec:** 모든 기능을 `.kiro/specs/`의 요구사항, 설계, 작업 문서로 시작했습니다.
- **Steering:** `product.md`, `tech.md`, `AGENTS.md`에 제품 방향, 색상, API 규칙, 에이전트 작업 규칙을 담았습니다.
- **에이전트 훅:** 파일 저장 시 관련 테스트 실행, 토큰 유출 검사, 전략 문서 gitignore 확인, 논문 인용 재검증.
- **속성 기반 테스트:** fast-check를 쓴 테스트 파일 21개, 전체 387개 테스트 통과.
- **서브 에이전트:** 병렬 점검, 문서 조회, 변경 사항 독립 검증.

### 어려웠던 점
AI가 만든 두 괴수가 카메라를 향해 포즈를 잡지 않고 서로 싸우게 만드는 것. 두 몸이 이미 맞닿은 첫 프레임을 만들고,
오른쪽 괴수를 좌우 반전하고, 공격마다 누가 어디를 치고 어떻게 밀려나는지 적은 한 컷짜리 프롬프트로 해결했습니다.

### 다음 계획
실험 사례 추가, 사용자가 쓰는 전투 서사, 저장된 괴수끼리의 토너먼트.
