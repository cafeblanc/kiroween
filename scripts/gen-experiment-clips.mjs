// Makes the six home-screen experiment clips with LTX-2.5 image-to-video through the production API
// (/api/generate-video, server-side LTX key). The first frame is each experiment's photo.
// Saves public/videos/experiments/<id>.mp4. Costs about $0.78 per clip (6 s, 1080p, ltx-2-5-fast).
// Usage: node scripts/gen-experiment-clips.mjs [first=1] [last=6]   (progress: scripts/gen-experiment-clips.log)
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://asura.cafeblanc.kr/api/generate-video";
const LOG = join(ROOT, "scripts", "gen-experiment-clips.log");
const OUT_DIR = join(ROOT, "public", "videos", "experiments");
const STYLE = "photorealistic, static camera, smooth natural continuous motion, ultra detailed, no text, no letters";
const CLIPS = [
  {
    id: "xenocortication",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Human_Cerebral_Organoids_%2853728295930%29.jpg/1280px-Human_Cerebral_Organoids_%2853728295930%29.jpg",
    motion: "the human brain organoids slowly pulse and swell as if alive, tiny neurons flicker with sparks of electrical signals and fine blood vessels creep into the tissue",
  },
  {
    id: "ghost_heart",
    photo: "ghost_heart_bioreactor.jpg",
    motion: "the translucent heart inside the bioreactor starts beating rhythmically, contracting and relaxing in a steady heartbeat while nutrient fluid flows through its vessels",
  },
  {
    id: "brainex",
    photo: "yale_brainex_perfusion_lab.jpg",
    motion: "red artificial blood pumps through the tubes into the brain, the vessels on the brain surface fill and pulse with flowing blood in a gentle rhythmic perfusion",
  },
  {
    id: "human_pig_chimera",
    photo: "human_pig_chimera_embryo.jpg",
    motion: "the glowing cells inside the embryo jiggle, wobble and slowly divide, fluorescent cells shimmer and drift gently",
  },
  {
    id: "chimeric_monkey",
    photo: "fluorescent_chimeric_monkey.jpg",
    motion: "the fluorescent green baby monkey moves naturally, blinks, slowly turns its head and grasps with its small hands",
  },
  {
    id: "axolotl",
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/AxolotlBE.jpg/1280px-AxolotlBE.jpg",
    motion: "the axolotl swims slowly forward, its feathery pink gills wave and its tail sways gently in the clear water",
  },
];

const log = (msg) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function photoDataUri(photo) {
  if (!photo.startsWith("https://")) {
    return `data:image/jpeg;base64,${readFileSync(join(ROOT, "public", "images", photo)).toString("base64")}`;
  }
  const r = await fetch(photo, { headers: { "User-Agent": "prometheus-ipsc-clipgen/1.0 (https://asura.cafeblanc.kr)" } });
  if (!r.ok) throw new Error(`photo download HTTP ${r.status}`);
  const type = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
  return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}

async function makeClip(clip) {
  const out = join(OUT_DIR, `${clip.id}.mp4`);
  if (existsSync(out) && statSync(out).size > 100_000) {
    log(`${clip.id}: already exists, skipped`);
    return true;
  }
  const body = { prompt: `${clip.motion}, ${STYLE}`, provider: "ltx", aspect: "16:9", duration: 6, image: await photoDataUri(clip.photo) };
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const created = await res.json().catch(() => ({}));
  if (!res.ok || typeof created.jobId !== "string") {
    log(`${clip.id}: create failed HTTP ${res.status} ${JSON.stringify(created).slice(0, 200)}`);
    return false;
  }
  log(`${clip.id}: job ${created.jobId} created`);
  const started = Date.now();
  let videoUrl = null;
  while (Date.now() - started < 6 * 60_000) {
    await sleep(6000);
    const p = await fetch(`${API}?provider=ltx&kind=image&id=${encodeURIComponent(created.jobId)}`);
    const s = await p.json().catch(() => ({}));
    if (s.status === "completed" && s.videoUrl) { videoUrl = s.videoUrl; break; }
    if (s.status === "failed" || (!p.ok && p.status !== 429 && p.status < 500)) {
      log(`${clip.id}: job error ${p.status} ${JSON.stringify(s).slice(0, 200)}`);
      return false;
    }
  }
  if (!videoUrl) { log(`${clip.id}: timed out`); return false; }
  // Download through the chunked same-origin proxy (the LTX bucket has no CORS and Vercel caps responses at ~4.5 MB).
  const parts = [];
  let start = 0;
  let total = Infinity;
  while (start < total) {
    const end = start + 3_000_000 - 1;
    const d = await fetch(`${API}?provider=ltx&action=download&start=${start}&end=${end}&url=${encodeURIComponent(videoUrl)}`);
    if (!d.ok) { log(`${clip.id}: download HTTP ${d.status}`); return false; }
    total = Number(d.headers.get("x-total-length"));
    const buf = Buffer.from(await d.arrayBuffer());
    if (!buf.length || !Number.isFinite(total)) { log(`${clip.id}: bad download chunk`); return false; }
    parts.push(buf);
    start += buf.length;
  }
  writeFileSync(out, Buffer.concat(parts));
  log(`${clip.id}: saved ${Math.round(start / 1024)} KB in ${Math.round((Date.now() - started) / 1000)} s`);
  return true;
}

const first = Number(process.argv[2] ?? 1);
const last = Number(process.argv[3] ?? CLIPS.length);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(LOG, `start ${new Date().toISOString()} clips ${first}..${last}\n`);
let ok = 0;
for (let i = first; i <= last; i++) {
  try {
    if (await makeClip(CLIPS[i - 1])) ok++;
  } catch (e) {
    log(`${CLIPS[i - 1].id}: error ${e?.message ?? e}`);
  }
}
log(`done: ${ok}/${last - first + 1} clips`);
