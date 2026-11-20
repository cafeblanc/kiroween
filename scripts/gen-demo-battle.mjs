// Makes the free 16 s demo battle (Homo Prometheus vs Fire Dragon) with LTX-2.5 through the production API.
// First frame: scripts/demo-battle-frame.jpg (scripts/make-demo-battle-frame.ps1, same layout as the app).
// One continuous take of close combat that uses every weapon: fists, claws, knees, spinning kick, head-butt, bite,
// elastic arm, spiked tail, wings, the dragon's flame cannon and Prometheus' laser-eye finisher.
// 16 s at 1080p ltx-2-5-fast costs about $2.08 and counts toward the daily cap of 5.
// Saves public/videos/battles/demo_battle.mp4 and src/data/demoBattle.json.
// Usage: node scripts/gen-demo-battle.mjs   (progress: scripts/gen-demo-battle.log)
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://asura.cafeblanc.kr/api/generate-video";
const LOG = join(ROOT, "scripts", "gen-demo-battle.log");
const FRAME = join(ROOT, "scripts", "demo-battle-frame.jpg");
const OUT = join(ROOT, "public", "videos", "battles", "demo_battle.mp4");
const JSON_OUT = join(ROOT, "src", "data", "demoBattle.json");
const DURATION = 16;

const PROMPT = [
  "One continuous take, no cuts: a wide side view of a dark sci-fi arena.",
  "Two completely different creatures locked in brutal close combat at the centre from the first frame, their bodies always touching.",
  "Left, facing right: a tall bald emerald-green humanoid warrior with fish-scale skin, glowing green eyes and burning fists.",
  "Right, facing left: a black-scaled fire dragon with red bat wings, curved horns, a glowing molten orange belly, clawed arms and a long spiked tail.",
  "Each keeps its own shape and colours all clip long; they never merge, swap or face the camera; every hit lands sideways on the other's body and visibly shoves it back.",
  "Full speed, no slow motion, a different body part every beat:",
  "the humanoid smashes a burning right hook into the dragon's jaw;",
  "the dragon rakes its claws across the humanoid's chest;",
  "the humanoid grabs a horn and drives his knee into the dragon's belly;",
  "the dragon whips its spiked tail into the humanoid's ribs and knocks him sideways;",
  "the humanoid spins a full turn and slams a roundhouse kick into the dragon's head;",
  "the dragon head-butts him with its horns and bites into his shoulder;",
  "the humanoid stretches his arm like an elastic cable, wraps it around the dragon's neck and yanks it into an uppercut;",
  "the dragon beats its wings, rears up and blasts a roaring flame cannon from its jaws that engulfs the humanoid for a full second;",
  "his body stretches and bends around the flames and snaps back;",
  "then the biggest moment, held for two full seconds: his eyes blaze and twin searing emerald laser beams shoot from them straight into the dragon's chest, sparks and molten scales flying, hurling the dragon onto its back;",
  "the humanoid plants a foot on its chest and roars.",
  "Handheld side-on camera, motion blur, sparks and embers, photorealistic, no text, no subtitles, no logos.",
].join(" ");

const STORY_KO = [
  "🔵 합성 인간 호모 프로메테우스 (에메랄드 비늘 피부 · 불타는 주먹 · 레이저 눈) VS 🔴 화염룡 드래곤 (검은 비늘 · 붉은 날개 · 가시 꼬리) — 첫 프레임부터 몸이 맞붙는다.",
  "⚡ 선공: 프로메테우스가 불타는 오른손 훅을 드래곤의 턱에 꽂는다! 드래곤은 발톱으로 그의 가슴을 할퀸다.",
  "↩ 반격: 프로메테우스가 뿔을 붙잡고 무릎으로 배를 찍자, 드래곤이 가시 꼬리로 갈비뼈를 후려쳐 그를 옆으로 날린다.",
  "🌀 프로메테우스의 회전 돌려차기가 드래곤의 머리에 작렬! 드래곤은 뿔로 박치기하고 어깨를 물어뜯는다.",
  "🧬 프로메테우스가 팔을 케이블처럼 늘려 드래곤의 목을 감고 끌어당겨 어퍼컷을 날린다.",
  "🔥 드래곤이 날개를 펄럭이며 일어서 입에서 화염포를 1초간 뿜는다 — 🛡 탄성 신체! 프로메테우스의 몸이 휘어지며 불길을 피하고 튕겨 돌아온다.",
  "💀 필살기 에메랄드 레이저 게이즈! 두 눈에서 쏟아진 쌍레이저가 드래곤의 가슴을 꿰뚫어 바닥에 쓰러뜨린다 — K.O.!",
  "🏆 프로메테우스가 쓰러진 드래곤의 가슴을 밟고 포효한다!",
].join("\n");

const STORY_EN = [
  "🔵 Homo Prometheus (emerald scale skin · burning fists · laser eyes) VS 🔴 Fire Dragon (black scales · red wings · spiked tail) — locked together from the first frame.",
  "⚡ First strike: Prometheus smashes a burning right hook into the dragon's jaw! The dragon rakes its claws across his chest.",
  "↩ Counter: Prometheus grabs a horn and knees its belly; the dragon's spiked tail cracks into his ribs and knocks him sideways.",
  "🌀 Prometheus lands a spinning roundhouse kick on the dragon's head! The dragon head-butts him and bites his shoulder.",
  "🧬 Prometheus stretches his arm like a cable, wraps the dragon's neck and yanks it into an uppercut.",
  "🔥 The dragon rears up on beating wings and blasts a flame cannon for a full second — 🛡 Elastic Body! He bends around the fire and snaps back.",
  "💀 Finisher, Emerald Laser Gaze! Twin lasers from his eyes pierce the dragon's chest and hurl it onto its back — K.O.!",
  "🏆 Prometheus plants a foot on the fallen dragon and roars!",
].join("\n");

const log = (m) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${m}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

writeFileSync(LOG, `start ${new Date().toISOString()}\n`);
if (existsSync(JSON_OUT) && JSON.parse(readFileSync(JSON_OUT, "utf8")).source === "gen-demo-battle") {
  log("the 16 s demo battle already exists (src/data/demoBattle.json source=gen-demo-battle); nothing to do");
  process.exit(0);
}
if (!existsSync(FRAME)) {
  log("missing scripts/demo-battle-frame.jpg: run powershell -File scripts/make-demo-battle-frame.ps1 first");
  process.exit(1);
}
if (PROMPT.length > 2000) {
  log(`prompt too long (${PROMPT.length} > 2000)`);
  process.exit(1);
}
log(`prompt ${PROMPT.length} chars, ${DURATION} s, about $${(DURATION * 0.13).toFixed(2)}`);
const body = {
  prompt: PROMPT,
  provider: "ltx",
  aspect: "16:9",
  duration: DURATION,
  image: `data:image/jpeg;base64,${readFileSync(FRAME).toString("base64")}`,
};
const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const created = await res.json().catch(() => ({}));
if (!res.ok || typeof created.jobId !== "string") {
  log(`create failed HTTP ${res.status} ${JSON.stringify(created).slice(0, 200)}`);
  process.exit(1);
}
log(`job ${created.jobId} created`);
const started = Date.now();
let videoUrl = null;
while (Date.now() - started < 8 * 60_000) {
  await sleep(6000);
  const p = await fetch(`${API}?provider=ltx&kind=image&id=${encodeURIComponent(created.jobId)}`);
  const s = await p.json().catch(() => ({}));
  if (s.status === "completed" && s.videoUrl) {
    videoUrl = s.videoUrl;
    break;
  }
  if (s.status === "failed" || (!p.ok && p.status !== 429 && p.status < 500)) {
    log(`job error ${p.status} ${JSON.stringify(s).slice(0, 200)}`);
    process.exit(1);
  }
}
if (!videoUrl) {
  log("timed out");
  process.exit(1);
}
// Chunked same-origin download (the LTX bucket has no CORS; Vercel caps responses at ~4.5 MB)
const parts = [];
let start = 0;
let total = Infinity;
while (start < total) {
  const d = await fetch(`${API}?provider=ltx&action=download&start=${start}&end=${start + 3_000_000 - 1}&url=${encodeURIComponent(videoUrl)}`);
  if (!d.ok) {
    log(`download HTTP ${d.status}`);
    process.exit(1);
  }
  total = Number(d.headers.get("x-total-length"));
  const buf = Buffer.from(await d.arrayBuffer());
  if (!buf.length || !Number.isFinite(total)) {
    log("bad download chunk");
    process.exit(1);
  }
  parts.push(buf);
  start += buf.length;
}
writeFileSync(OUT, Buffer.concat(parts));
const meta = {
  titleKo: "호모 프로메테우스 vs 화염룡 드래곤",
  titleEn: "Homo Prometheus vs Fire Dragon",
  fighter1: "human_prometheus",
  fighter2: "myth_dragon",
  winner: "human_prometheus",
  date: new Date().toISOString(),
  storyKo: STORY_KO,
  storyEn: STORY_EN,
  source: "gen-demo-battle",
};
writeFileSync(JSON_OUT, JSON.stringify(meta, null, 2) + "\n");
log(`saved demo_battle.mp4 ${Math.round(start / 1024)} KB in ${Math.round((Date.now() - started) / 1000)} s`);
log("done");
