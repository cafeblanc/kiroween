// Makes the six sample monsters' representative images with the app's own pipeline: the preset's default parts ->
// labels stripped -> Google gtx translation per line -> composeEnglishMonsterPrompt (with stats) -> Pollinations FLUX.
// So the picture shows exactly what the Design Room's default description asks for.
// Saves scripts/image-check/<id>.raw.jpg and <id>.txt (prompt). scripts/crop-sample-images.ps1 then writes
// public/images/samples/<id>.jpg without the watermark strip.
// Free tier: about 1 image per 45 s per IP, so it waits 70 s between images.
// Usage: npx vite-node scripts/gen-sample-images.ts [ids comma-separated] [seedBase=7100]
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import {
  MONSTER_STUDIO_PRESETS,
  composeDescriptionFromParts,
  composeEnglishMonsterPrompt,
  computeMonsterBioStats,
  pollinationsImageUrl,
  stripPartLabels,
} from "../src/services/customMonsterMediaService";

const OUT = join(process.cwd(), "scripts", "image-check");
const LOG = join(OUT, "gen-samples.log");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (m: string) => {
  const line = `${new Date().toTimeString().slice(0, 8)} ${m}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
};

async function translateLine(line: string): Promise<string> {
  const t = line.trim();
  if (!t) return "";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(t)}`;
  const res = await fetch(url);
  if (!res.ok) return line;
  const data = (await res.json()) as unknown[];
  const segs = Array.isArray(data?.[0]) ? (data[0] as unknown[]) : [];
  return segs.map((s) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : "")).join("").trim() || line;
}

const only = (process.argv[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const seedBase = Number(process.argv[3] ?? 7100);
const presets = MONSTER_STUDIO_PRESETS.filter((p) => only.length === 0 || only.includes(p.id));
mkdirSync(OUT, { recursive: true });
writeFileSync(LOG, `start ${new Date().toISOString()} ${presets.map((p) => p.id).join(",")} seedBase=${seedBase}\n`);
for (let i = 0; i < presets.length; i++) {
  const p = presets[i];
  try {
    const description = composeDescriptionFromParts(p, p.defaultParts);
    const translated = (await Promise.all(stripPartLabels(description).split("\n").map(translateLine))).join("\n");
    const prompt = composeEnglishMonsterPrompt(p.nameEn, translated, computeMonsterBioStats(description));
    writeFileSync(join(OUT, `${p.id}.txt`), prompt + "\n");
    const seed = seedBase + MONSTER_STUDIO_PRESETS.indexOf(p);
    let saved = false;
    for (let attempt = 0; attempt < 2 && !saved; attempt++) {
      const res = await fetch(pollinationsImageUrl(prompt, seed));
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.startsWith("image/")) {
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(join(OUT, `${p.id}.raw.jpg`), buf);
        log(`${p.id}: saved ${Math.round(buf.length / 1024)} KB seed ${seed}`);
        saved = true;
      } else {
        log(`${p.id}: HTTP ${res.status} ${type} (attempt ${attempt + 1})`);
        if (attempt === 0) await sleep(60_000);
      }
    }
  } catch (e) {
    log(`${p.id}: error ${(e as Error).message}`);
  }
  if (i < presets.length - 1) await sleep(70_000);
}
log("done");
