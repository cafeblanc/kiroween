// Design exploration only (no app changes): HuggingFace SD3 candidates for proposed monster designs, using the same
// prompt layout and base negative prompt as the app. HF_TOKEN from .env.local (never printed).
// Saves scripts/image-check/design/<id>_<n>.jpg and <id>.txt. Usage: npx vite-node scripts/gen-design-candidates.ts [ids] [count]
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { HF_IMAGE_URL, IMAGE_NEGATIVE_PROMPT } from "../src/utils/hfImage";

const OUT = join(process.cwd(), "scripts", "image-check", "design");
const LOG = join(OUT, "design.log");
const HEAD = "Full-body shot of a single colossal ferocious";
const STANCE = "in a powerful aggressive battle stance, its whole body visible from head to toe inside the frame, side three-quarter view facing right";
const SCENE =
  "bright cinematic key light showing its true colours and details clearly, dark sci-fi arena background, sharp focus, highly detailed fantasy creature concept art, no text, no letters";

interface Design {
  id: string;
  name: string;
  /** Replaces the standing STANCE (it turned every body into an upright humanoid). */
  plan?: string;
  body: string;
  negative: string;
}

// Round 1 came out as robots (white plastic mecha, crystal golem robot): living, grown bodies and no machine parts.
const NOT_A_MACHINE =
  "robot, mecha, machine, mechanical joints, bolts, screws, panels, armor suit, android, cyborg, humanoid, two legs, standing upright, hands, shoulders";

const DESIGNS: Design[] = [
  // Round 3: no animal names (they were copied literally: rhinoceros, jellyfish, centipede); the shape is described.
  {
    id: "silokrax",
    name: "Silokrax, a silicon-based alien war beast built for overwhelming attack power",
    plan: "a huge jagged crystal boulder of a body carried on four thick crystal pillars, no head and no neck, the whole front of the body a bristling cluster of long crystal lances around a glowing furnace mouth, lunging forward to strike, its whole body visible inside the frame, side three-quarter view facing right",
    body:
      "translucent quartz and silicate crystal grown in sharp faceted clusters over a glowing white-hot inner lattice, molten glass spraying from the furnace mouth, crystal lances as long as its body, a long segmented crystal tail ending in a quartz blade, violent piezoelectric lightning arcing between the crystals, sand and shards exploding from the ground",
    negative: `flesh, skin, fur, feathers, organic tissue, blood, veins, dragon, wings, face, eyes, ears, horn, rhinoceros, mammal, animal head, ${NOT_A_MACHINE}`,
  },
  {
    id: "bornyx",
    name: "Bornyx, a boron-nitride alien predator built for overwhelming attack power, a living creature",
    plan: "a low flat predator crouched to pounce on six long scythe-shaped blade legs, its whole body visible inside the frame, side three-quarter view facing right",
    body:
      "its body of interlocking white and pale blue hexagonal mineral plates like a honeycomb shell, six blade legs of ultra-hard cubic boron nitride sharp enough to cut steel, a wedge-shaped head split open into four huge blade mandibles, four burning ultraviolet eyes, a long whip tail of stacked hexagon segments ending in a spear, blue nitrogen plasma blazing between its plates",
    negative: `flesh, skin, fur, feathers, scales, blood, veins, dragon, wings, insect wings, human face, insect, bug, woodlouse, centipede, larva, worm, ${NOT_A_MACHINE}`,
  },
  {
    id: "prometheus",
    name: "Homo Prometheus, a tall sleek enhanced human warrior, powerful and agile",
    plan: "caught mid spinning roundhouse kick, one leg high in the air, its whole body visible from head to toe inside the frame, side three-quarter view facing right",
    body:
      "a lean athletic build with long powerful legs and defined muscles, tough dark graphite-grey skin with a fine hexagonal texture like armour grown into the skin, glowing emerald energy lines running along the muscles, a glowing artificial heart visible through the chest, a bald head with glowing emerald eyes and a fierce face, gold metal knuckles on the fists",
    negative: "bulky, fat, hulking, bodybuilder, armor suit, robot, mecha, helmet, cape, clothes, weapon, sword, gun, two people, multiple people",
  },
  // Round 4: Prometheus without a precise human pose (that came out as a photo of a person kicking), and the
  // redesigned Frankenstein.
  {
    id: "prometheus2",
    name: "Homo Prometheus, a tall sleek enhanced human war-monster, powerful and agile",
    plan: "in a low agile fighting stance ready to strike, long legs clearly visible, its whole body visible from head to toe inside the frame, side three-quarter view facing right",
    body:
      "long lean powerful muscles, tough dark graphite-grey armoured skin with a fine hexagonal texture grown into it, short curved bone blades growing from the elbows and shins, a fierce monstrous face with bared sharp fangs and glowing emerald eyes, a bald head, glowing emerald energy lines running along the muscles, a glowing artificial heart visible through the chest, gold metal knuckles grown into the fists",
    negative:
      "photo of a person, athlete, dancer, sportswear, leggings, tights, shirt, clothes, bulky, fat, bodybuilder, armor suit, robot, mecha, helmet, cape, weapon, sword, gun, multiple people",
  },
  {
    id: "frankenstein",
    name: "Modern Bio-Frankenstein, a giant reanimated man built for brute power and endless regeneration",
    body:
      "a square flat-topped head with a heavy square jaw and a mouth of gleaming titanium teeth, neat precise surgical seams like fine silver lines across the body, translucent pale green skin glowing softly from within with faint muscles visible beneath, enormous oversized fists and huge heavy feet, wounds on its arm closing as glowing green tissue knits itself together with rising steam, black torn trousers",
    negative:
      "crude stitches, staples, rough sutures, rotten, decay, zombie, blood, gore, bolts, robot, armor suit, helmet, weapon, multiple people",
  },
  // Round 5: Prometheus with an elastic body and laser eyes (lean but not frail); Frankenstein without green
  // (bright green giant = the Hulk) and with a photoreal look.
  {
    id: "prometheus3",
    name: "Homo Prometheus, an enhanced human warrior with an elastic stretching body and laser eyes",
    plan: "attacking: one arm stretched impossibly long like a living steel cable to smash a distant target, while twin searing emerald laser beams blast from its eyes, its whole body visible from head to toe inside the frame, side three-quarter view facing right",
    body:
      "a tall athletic build with broad shoulders and dense sinewy muscle, not bulky, the stretched arm showing taut muscle fibres pulled long like woven cables, tough dark graphite-grey armoured skin with a fine hexagonal texture grown into it, a fierce face with bared fangs, a bald head, glowing emerald energy lines along the muscles, a glowing artificial heart in the chest, gold metal knuckles grown into the fists",
    negative:
      "cartoon, comic, rubber toy, plastic, superhero costume, cape, mask, bulky, fat, bodybuilder, armor suit, robot, helmet, clothes, weapon, gun, multiple people, photo of a person",
  },
  {
    id: "frankenstein2",
    name: "Modern Bio-Frankenstein, a giant reanimated man built for brute power and endless regeneration",
    body:
      "a square flat-topped head with a heavy square jaw and a mouth of gleaming titanium teeth, translucent milky-white skin glowing softly cyan from within with veins and muscles faintly visible beneath, neat precise surgical seams like fine silver lines across the chest and arms, enormous oversized fists and huge heavy feet, a wound on its arm closing as glowing cyan tissue knits itself together with rising steam, black torn trousers, photorealistic film creature",
    negative:
      "green skin, hulk, cartoon, comic, toy, plastic, crude stitches, staples, rotten, decay, zombie, blood, gore, robot, armor suit, helmet, weapon, multiple people",
  },
  {
    id: "silicon_titan",
    name: "silicon-based alien crystal beast, a living animal grown from rock crystal",
    plan: "a massive four-legged beast like a rhinoceros, low and heavy on four thick crystal-pillar legs, its whole body visible inside the frame, side three-quarter view facing right",
    body:
      "its body of translucent quartz and silicate crystal grown in natural faceted clusters over a glowing inner lattice, a wedge-shaped crystal head with a glowing furnace mouth dripping molten glass, rows of jagged crystal spines along its back, a long segmented crystal tail ending in a quartz blade, piezoelectric sparks crackling between the crystals, sand pouring from its joints",
    negative: `flesh, skin, fur, feathers, organic tissue, blood, veins, dragon, wings, human face, ${NOT_A_MACHINE}`,
  },
  {
    id: "boron_nitride",
    name: "boron-nitride alien predator, a living creature that is not a machine",
    plan: "a long low centipede-like predator crawling close to the ground on many legs, its whole long body visible inside the frame, side three-quarter view facing right",
    body:
      "its segmented body covered in naturally grown white and pale blue hexagonal mineral scutes like a honeycomb, dozens of curved razor legs of ultra-hard cubic boron nitride, a split four-part mandible head with four glowing ultraviolet eyes, a long whip tail of stacked hexagon segments, blue nitrogen plasma glowing between its plates",
    negative: `flesh, skin, fur, feathers, scales, blood, veins, dragon, wings, insect wings, human face, ${NOT_A_MACHINE}`,
  },
];

const token = (/^\s*HF_TOKEN\s*=\s*(.*)$/m.exec(readFileSync(join(process.cwd(), ".env.local"), "utf8"))?.[1] ?? "")
  .trim()
  .replace(/^["']|["']$/g, "");
const only = (process.argv[2] ?? "all") === "all" ? [] : (process.argv[2] ?? "").split(",");
const count = Math.max(1, Math.min(4, Number(process.argv[3] ?? 3) || 3));
// Round label in the file names so earlier rounds stay for comparison (round 1 files have no label).
const round = process.argv[4] ?? "r2";
mkdirSync(OUT, { recursive: true });
writeFileSync(LOG, `start ${new Date().toISOString()}\n`);
const log = (m: string) => appendFileSync(LOG, `${new Date().toTimeString().slice(0, 8)} ${m}\n`);

for (const d of DESIGNS.filter((x) => only.length === 0 || only.includes(x.id))) {
  const prompt = `${HEAD} ${d.name}: ${d.plan ?? STANCE}; ${d.body}; ${SCENE}`;
  writeFileSync(join(OUT, `${d.id}.txt`), `${prompt}\n\nNEGATIVE: ${IMAGE_NEGATIVE_PROMPT}, ${d.negative}\n`);
  for (let c = 0; c < count; c++) {
    const seed = 12000 + DESIGNS.indexOf(d) * 10 + c;
    const file = join(OUT, `${d.id}_${round}_${c + 1}.jpg`);
    try {
      const res = await fetch(HF_IMAGE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/jpeg" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { seed, width: 1024, height: 1024, negative_prompt: `${IMAGE_NEGATIVE_PROMPT}, ${d.negative}` },
        }),
      });
      if (!res.ok) {
        log(`${d.id} #${c + 1}: HTTP ${res.status}`);
        continue;
      }
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      log(`${d.id} #${c + 1}: saved (seed ${seed})`);
    } catch (e) {
      log(`${d.id} #${c + 1}: error ${(e as Error).message}`);
    }
  }
}
log("done");
