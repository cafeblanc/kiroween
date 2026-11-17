import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  EMPTY_SLOTS,
  hasOwnEntranceVideo,
  placeEntrant,
  pruneSlots,
  selectSlot,
  type ArenaSlots,
} from "./arenaRoster";

const idArb = fc.constantFrom("custom_a", "custom_b", "custom_c", "custom_d");
const slotArb: fc.Arbitrary<ArenaSlots> = fc.record({ left: fc.option(idArb, { nil: null }), right: fc.option(idArb, { nil: null }) });

describe("arena slots", () => {
  it("placeEntrant: first monster goes left, the second goes right, a repeat stays put", () => {
    const one = placeEntrant(EMPTY_SLOTS, "custom_a");
    expect(one).toEqual({ left: "custom_a", right: null });
    const two = placeEntrant(one, "custom_b");
    expect(two).toEqual({ left: "custom_a", right: "custom_b" });
    expect(placeEntrant(two, "custom_a")).toBe(two);
    expect(placeEntrant(two, "custom_b")).toBe(two);
  });
  it("placeEntrant: a third monster replaces the right half only", () => {
    expect(placeEntrant({ left: "custom_a", right: "custom_b" }, "custom_c")).toEqual({ left: "custom_a", right: "custom_c" });
  });
  it("selectSlot: sets a side, clears the other side when it held the same monster, and can empty a side", () => {
    expect(selectSlot({ left: "custom_a", right: "custom_b" }, "right", "custom_c")).toEqual({ left: "custom_a", right: "custom_c" });
    expect(selectSlot({ left: "custom_a", right: "custom_b" }, "left", "custom_b")).toEqual({ left: "custom_b", right: null });
    expect(selectSlot({ left: "custom_a", right: "custom_b" }, "right", null)).toEqual({ left: "custom_a", right: null });
  });
  it("pruneSlots: drops ids that left the roster and keeps the same object when nothing changes", () => {
    const s = { left: "custom_a", right: "custom_b" };
    expect(pruneSlots(s, new Set(["custom_a", "custom_b"]))).toBe(s);
    expect(pruneSlots(s, new Set(["custom_b"]))).toEqual({ left: null, right: "custom_b" });
    expect(pruneSlots(s, new Set())).toEqual({ left: null, right: null });
  });
  it("property: never the same id on both sides and ids always come from the roster", () => {
    const op = fc.oneof(
      fc.record({ k: fc.constant("place" as const), id: idArb }),
      fc.record({ k: fc.constant("select" as const), side: fc.constantFrom("left" as const, "right" as const), id: fc.option(idArb, { nil: null }) }),
      fc.record({ k: fc.constant("prune" as const), roster: fc.subarray(["custom_a", "custom_b", "custom_c", "custom_d"]) }),
    );
    fc.assert(
      fc.property(fc.array(op, { maxLength: 30 }), (ops) => {
        let s: ArenaSlots = EMPTY_SLOTS;
        let roster = new Set(["custom_a", "custom_b", "custom_c", "custom_d"]);
        for (const o of ops) {
          if (o.k === "place") {
            roster.add(o.id);
            s = placeEntrant(s, o.id);
          } else if (o.k === "select") {
            if (o.id) roster.add(o.id);
            s = selectSlot(s, o.side, o.id);
          } else {
            roster = new Set(o.roster);
            s = pruneSlots(s, roster);
            for (const id of [s.left, s.right]) if (id) expect(roster.has(id)).toBe(true);
          }
          if (s.left && s.right) expect(s.left).not.toBe(s.right);
        }
      }),
    );
  });
  it("property: pruneSlots only returns ids that are in the roster", () => {
    fc.assert(
      fc.property(slotArb, fc.subarray(["custom_a", "custom_b", "custom_c", "custom_d"]), (s, roster) => {
        const r = pruneSlots(s, new Set(roster));
        for (const id of [r.left, r.right]) if (id) expect(roster).toContain(id);
      }),
    );
  });
});

describe("hasOwnEntranceVideo", () => {
  it("is false for the static placeholder clip and empty values, true for generated clips", () => {
    expect(hasOwnEntranceVideo("/videos/chimera_growth_dragon_24s.mp4")).toBe(false);
    expect(hasOwnEntranceVideo("")).toBe(false);
    expect(hasOwnEntranceVideo(null)).toBe(false);
    expect(hasOwnEntranceVideo(undefined)).toBe(false);
    expect(hasOwnEntranceVideo("blob:http://localhost/abc")).toBe(true);
    expect(hasOwnEntranceVideo("https://example.com/v.mp4")).toBe(true);
  });
});