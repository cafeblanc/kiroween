// Makes the home-screen Ghost Heart clip with LTX-2.5 through the production API (/api/generate-video).
// First frame: the white decellularised heart (ghost_heart_bioreactor.jpg). Last frame: the same heart filled with
// blood (ghost_heart_perfused.jpg, scripts/make-heart-last-frame.ps1). LTX interpolates between them, so blood
// visibly flows in; the prompt asks for a strong heartbeat once it is red.
// 8 s at 1080p ltx-2-5-fast costs about $1.04. Saves public/videos/experiments/ghost_heart_beat.mp4.
// Usage: node scripts/gen-heart-clip.mjs   (progress: scripts/gen-heart-clip.log)
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://asura.cafeblanc.kr/api/generate-video";
const LOG = join(ROOT, "scripts", "gen-heart-clip.log");
const OUT = join(ROOT, "public", "videos", "experiments", "ghost_heart_beat.mp4");
const PROMPT =
  "A pale white decellularised human heart floats in a glass bioreactor full of clear fluid. " +
  "Dark red blood starts pumping in through the clear tubes at the top and surges down into the heart, " +
  "spreading through every artery and vein until the whole heart turns deep blood red. " +
  "Then the heart comes alive and starts beating strongly: it contracts hard and relaxes in a steady powerful rhythm, " +
  "the vessels pulsing with each beat, bubbles rising around it. " +
  "Static camera, photorealistic medical laboratory, smooth continuous motion, no text, no letters.";
const DURATION = 8;

const log = (m) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${m}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUri = (file) => `data:image/jpeg;base64,${readFileSync(join(ROOT, "public", "images", file)).toString("base64")}`;

writeFileSync(LOG, `start ${new Date().toISOString()}\n`);
if (existsSync(OUT) && statSync(OUT).size > 100_000) {
  log("ghost_heart_beat.mp4 already exists, nothing to do (delete it to make a new one)");
  process.exit(0);
}
const body = {
  prompt: PROMPT,
  provider: "ltx",
  aspect: "16:9",
  duration: DURATION,
  image: dataUri("ghost_heart_bioreactor.jpg"),
  lastImage: dataUri("ghost_heart_perfused.jpg"),
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
while (Date.now() - started < 6 * 60_000) {
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
log(`saved ghost_heart_beat.mp4 ${Math.round(start / 1024)} KB in ${Math.round((Date.now() - started) / 1000)} s`);
log("done");
