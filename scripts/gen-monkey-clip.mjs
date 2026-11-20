// Remakes the Case #08 chimeric-monkey clip with LTX-2.5 through the production API (/api/generate-video).
// The green is GFP made by the monkey's own cells, so it must stay on the same skin patches (face, hands, feet)
// while the monkey moves; it is not coloured light. First AND last frame are the same photo, so LTX has to end
// on the exact fluorescent pattern it started with, and the prompt describes the glow as part of the skin.
// 6 s at 1080p ltx-2-5-fast costs about $0.78. Saves public/videos/experiments/chimeric_monkey.mp4
// (the previous clip is moved to scripts/chimeric_monkey.prev.mp4 first).
// Usage: node scripts/gen-monkey-clip.mjs   (progress: scripts/gen-monkey-clip.log)
import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://asura.cafeblanc.kr/api/generate-video";
const LOG = join(ROOT, "scripts", "gen-monkey-clip.log");
const OUT = join(ROOT, "public", "videos", "experiments", "chimeric_monkey.mp4");
const PREV = join(ROOT, "scripts", "chimeric_monkey.prev.mp4");
const PHOTO = join(ROOT, "public", "images", "fluorescent_chimeric_monkey.jpg");
const DURATION = 6;
const PROMPT = [
  "A baby macaque monkey lies on a soft blue blanket inside a clear incubator and moves gently:",
  "it breathes, blinks, slowly lifts and turns its head and flexes its small fingers and toes.",
  "The bright green fluorescence is inside its own skin, not light shining on it: fixed glowing green patches on its face",
  "around the eyes and muzzle, on its fingers, palms and toes.",
  "Each green patch stays on exactly the same spot of skin and moves with the body part it belongs to;",
  "the patches never fade, never spread, never jump, and never appear on the fur, the blanket or the background.",
  "The scene lighting stays steady and neutral; no moving lights, no green light beams, no flicker.",
  "Static camera, photorealistic, smooth natural motion, no text, no letters.",
].join(" ");

const log = (m) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${m}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

writeFileSync(LOG, `start ${new Date().toISOString()}\n`);
if (existsSync(PREV)) {
  log("scripts/chimeric_monkey.prev.mp4 exists, so the clip was already remade; delete it to make another");
  process.exit(0);
}
const photo = `data:image/jpeg;base64,${readFileSync(PHOTO).toString("base64")}`;
log(`prompt ${PROMPT.length} chars, ${DURATION} s, about $${(DURATION * 0.13).toFixed(2)}`);
const res = await fetch(API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: PROMPT, provider: "ltx", aspect: "16:9", duration: DURATION, image: photo, lastImage: photo }),
});
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
if (existsSync(OUT)) renameSync(OUT, PREV);
writeFileSync(OUT, Buffer.concat(parts));
log(`saved chimeric_monkey.mp4 ${Math.round(start / 1024)} KB in ${Math.round((Date.now() - started) / 1000)} s`);
log("done");
