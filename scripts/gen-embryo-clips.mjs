// Makes the five embryo transition clips (frame k -> frame k+1) with LTX-2.5 image-to-video through the production
// API (/api/generate-video, server-side LTX key), using `lastImage` so LTX interpolates between the two frames.
// Saves public/videos/incubation/embryo_<k>_<k+1>.mp4. Costs about $0.78 per clip (6 s, 1080p, ltx-2-5-fast).
// Usage: node scripts/gen-embryo-clips.mjs [first=1] [last=5]   (progress: scripts/gen-embryo-clips.log)
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://asura.cafeblanc.kr/api/generate-video";
const LOG = join(ROOT, "scripts", "gen-embryo-clips.log");
const OUT_DIR = join(ROOT, "public", "videos", "incubation");
const FRAMES = [
  "stage1_stem_cell",
  "stage2_division",
  "stage3_morula",
  "stage4_blastocyst",
  "stage5_early_embryo",
  "stage6_late_embryo",
];
const STYLE =
  "photorealistic microscope time-lapse inside a glowing bioreactor filled with nutrient fluid, soft cyan bioluminescent light, " +
  "static camera, smooth continuous organic motion, ultra detailed, no text, no letters";
const MOTION = [
  "the single round stem cell slowly pinches in the middle and divides into two daughter cells",
  "the two cells keep dividing into four, eight and sixteen cells that pack tightly together into a raspberry-like morula",
  "the packed cell cluster hollows out into a fluid-filled blastocyst sphere with an inner cell mass on one side",
  "the inner cell mass grows and folds into a small curled early embryo with a head bulge, back segments and tiny limb buds",
  "the curled embryo grows larger, its spine and paddle-shaped limbs lengthen and fine blood vessels spread, still no recognizable species",
];

const log = (msg) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${msg}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUri = (name) => `data:image/jpeg;base64,${readFileSync(join(ROOT, "public", "images", "incubation", `${name}.jpg`)).toString("base64")}`;

async function makeClip(k) {
  const out = join(OUT_DIR, `embryo_${k}_${k + 1}.mp4`);
  if (existsSync(out) && statSync(out).size > 100_000) {
    log(`clip ${k}->${k + 1}: already exists, skipped`);
    return true;
  }
  const body = { prompt: `${MOTION[k - 1]}, ${STYLE}`, provider: "ltx", aspect: "16:9", duration: 6, image: dataUri(FRAMES[k - 1]), lastImage: dataUri(FRAMES[k]) };
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const created = await res.json().catch(() => ({}));
  if (!res.ok || typeof created.jobId !== "string") {
    log(`clip ${k}->${k + 1}: create failed HTTP ${res.status} ${JSON.stringify(created).slice(0, 200)}`);
    return false;
  }
  log(`clip ${k}->${k + 1}: job ${created.jobId} created`);
  const started = Date.now();
  let videoUrl = null;
  while (Date.now() - started < 6 * 60_000) {
    await sleep(6000);
    const p = await fetch(`${API}?provider=ltx&kind=image&id=${encodeURIComponent(created.jobId)}`);
    const s = await p.json().catch(() => ({}));
    if (s.status === "completed" && s.videoUrl) { videoUrl = s.videoUrl; break; }
    if (s.status === "failed" || (!p.ok && p.status !== 429 && p.status < 500)) {
      log(`clip ${k}->${k + 1}: failed ${p.status} ${JSON.stringify(s).slice(0, 200)}`);
      return false;
    }
  }
  if (!videoUrl) { log(`clip ${k}->${k + 1}: timed out`); return false; }
  // Download through the chunked same-origin proxy (the LTX bucket has no CORS and Vercel caps responses at ~4.5 MB).
  const parts = [];
  let start = 0;
  let total = Infinity;
  while (start < total) {
    const end = start + 3_000_000 - 1;
    const d = await fetch(`${API}?provider=ltx&action=download&start=${start}&end=${end}&url=${encodeURIComponent(videoUrl)}`);
    if (!d.ok) { log(`clip ${k}->${k + 1}: download failed HTTP ${d.status}`); return false; }
    total = Number(d.headers.get("x-total-length"));
    const buf = Buffer.from(await d.arrayBuffer());
    if (!buf.length || !Number.isFinite(total)) { log(`clip ${k}->${k + 1}: bad download chunk`); return false; }
    parts.push(buf);
    start += buf.length;
  }
  writeFileSync(out, Buffer.concat(parts));
  log(`clip ${k}->${k + 1}: saved ${Math.round(start / 1024)} KB in ${Math.round((Date.now() - started) / 1000)} s`);
  return true;
}

const first = Number(process.argv[2] ?? 1);
const last = Number(process.argv[3] ?? 5);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(LOG, `start ${new Date().toISOString()} clips ${first}..${last}\n`);
let ok = 0;
for (let k = first; k <= last; k++) {
  try {
    if (await makeClip(k)) ok++;
  } catch (e) {
    log(`clip ${k}->${k + 1}: error ${e?.message ?? e}`);
  }
}
log(`done: ${ok}/${last - first + 1} clips`);
