import { describe, expect, it } from "vitest";
import {
  collisionSkill,
  fighterMotionClasses,
  isFighterHit,
  stageShakeClass,
  strikingSide,
  type ArenaMotionEvent,
} from "./arenaMotion";
import { createSeededRng, resolveBattle } from "./arenaBattle";

const ev = (o: Partial<ArenaMotionEvent> = {}): ArenaMotionEvent => ({
  attacker: 1,
  skill: null,
  evaded: false,
  seq: 1,
  ...o,
});

describe("arenaMotion", () => {
  it("f1 strike: left fighter lunges right with zoom, right fighter is pushed back", () => {
    const left = fighterMotionClasses("f1_strike", ev(), 1, null);
    expect(left).toContain("scale-125");
    expect(left).toContain("translate-x-16");
    expect(left).toContain("z-30");
    expect(left).toContain("brightness-125");
    const right = fighterMotionClasses("f1_strike", ev(), 2, null);
    expect(right).toContain("arena-shake");
    expect(right).not.toContain("scale-125");
    expect(isFighterHit("f1_strike", ev(), 2)).toBe(true);
    expect(isFighterHit("f1_strike", ev(), 1)).toBe(false);
  });

  it("f2 strike: right fighter lunges left (-translate-x-16)", () => {
    const right = fighterMotionClasses("f2_strike", ev({ attacker: 2 }), 2, null);
    expect(right).toContain("-translate-x-16");
    expect(right).toContain("scale-125");
    expect(fighterMotionClasses("f2_strike", ev({ attacker: 2 }), 1, null)).toContain("arena-shake");
  });

  it("the attacker field wins over the phase name", () => {
    expect(strikingSide("f1_strike", ev({ attacker: 2 }))).toBe(2);
    expect(strikingSide("f2_strike", ev({ attacker: 1 }))).toBe(1);
    expect(strikingSide("f2_strike", null)).toBe(2);
    expect(strikingSide("clash", ev({ attacker: null }))).toBeNull();
  });

  it("a dodged strike dodges instead of being pushed back, with no hit and no stage shake", () => {
    const e = ev({ evaded: true });
    expect(fighterMotionClasses("f1_strike", e, 2, null)).toContain("-translate-y-3");
    expect(fighterMotionClasses("f1_strike", e, 2, null)).not.toContain("arena-shake");
    expect(isFighterHit("f1_strike", e, 2)).toBe(false);
    expect(stageShakeClass("f1_strike", e)).toBe("");
  });

  it("clash: both lunge toward the center and the stage shakes", () => {
    const e = ev({ attacker: null });
    expect(fighterMotionClasses("clash", e, 1, null)).toContain("translate-x-16");
    expect(fighterMotionClasses("clash", e, 2, null)).toContain("-translate-x-16");
    expect(stageShakeClass("clash", e)).toMatch(/^arena-stage-shake-[ab]$/);
  });

  it("stage shake alternates the class by round so consecutive hits restart the animation", () => {
    const a = stageShakeClass("f1_strike", ev({ seq: 1 }));
    const b = stageShakeClass("f2_strike", ev({ attacker: 2, seq: 2 }));
    expect(a).not.toBe("");
    expect(b).not.toBe("");
    expect(a).not.toBe(b);
    expect(stageShakeClass("idle", null)).toBe("");
  });

  it("KO: winner zooms to a close-up, loser fades out", () => {
    const e = ev({ attacker: null });
    expect(fighterMotionClasses("ko", e, 2, 2)).toContain("scale-[1.3]");
    expect(fighterMotionClasses("ko", e, 1, 2)).toContain("opacity-0");
  });

  it("idle has no motion", () => {
    expect(fighterMotionClasses("idle", null, 1, null)).toBe("");
    expect(fighterMotionClasses("idle", null, 2, null)).toBe("");
  });

  it("every transform class set has a motion-reduce override", () => {
    const sets = [
      fighterMotionClasses("f1_strike", ev(), 1, null),
      fighterMotionClasses("f1_strike", ev(), 2, null),
      fighterMotionClasses("f1_strike", ev({ evaded: true }), 2, null),
      fighterMotionClasses("ko", ev({ attacker: null }), 1, 1),
    ];
    for (const s of sets) expect(s).toContain("motion-reduce:scale-100");
  });

  it("skill pops up at the collision for landed strikes and clashes, never when dodged", () => {
    expect(collisionSkill("f1_strike", ev({ skill: "🌋 초고온 마그마 일격" }))).toBe("🌋 초고온 마그마 일격");
    expect(collisionSkill("clash", ev({ attacker: null, skill: "⚡ 고전압 스파크 반격" }))).toBe("⚡ 고전압 스파크 반격");
    expect(collisionSkill("f1_strike", ev({ skill: "x", evaded: true }))).toBeNull();
    expect(collisionSkill("ko", ev({ skill: "x" }))).toBeNull();
    expect(collisionSkill("f1_strike", null)).toBeNull();
  });

  it("works for every event of resolved battles whichever side strikes first", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = resolveBattle({ nameKo: "A" }, { nameKo: "B" }, createSeededRng(seed));
      const winner = r.winner;
      for (const e of r.events) {
        const m: ArenaMotionEvent = { attacker: e.attacker, skill: e.skill, evaded: e.evaded, seq: e.round };
        const striker = strikingSide(e.phase, m);
        expect(striker).toBe(e.attacker);
        const w = e.phase === "ko" ? winner : null;
        expect(fighterMotionClasses(e.phase, m, 1, w)).toEqual(expect.any(String));
        if (striker) {
          expect(fighterMotionClasses(e.phase, m, striker, null)).toContain("scale-125");
        }
      }
    }
  });
});
