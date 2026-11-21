import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CASE_ALIASES, parseDeepLink } from "./deepLink";
import { VERIFIED_BIO_EXPERIMENTS } from "../data/bioExperiments";
import { DEMO_BATTLES } from "../data/demoBattle";

const IDS = VERIFIED_BIO_EXPERIMENTS.map((e) => e.id);
const parse = (s: string) => parseDeepLink(s, IDS, DEMO_BATTLES.length);

describe("parseDeepLink", () => {
  it("every case alias points at a real case", () => {
    expect(Object.keys(CASE_ALIASES).length).toBe(IDS.length);
    for (const id of Object.values(CASE_ALIASES)) expect(IDS).toContain(id);
  });
  it("opens a case by alias or full id, in English", () => {
    expect(parse("?lang=en&case=ghost-heart")).toEqual({ lang: "en", caseId: "case-02-ghost-heart" });
    expect(parse("?case=case-08-chimeric-monkey").caseId).toBe("case-08-chimeric-monkey");
    expect(parse("?case=MONKEY").caseId).toBe("case-08-chimeric-monkey");
  });
  it("opens screens, the Kiro tab, the demo menu and a chosen demo", () => {
    expect(parse("?open=kiro&tab=hooks")).toEqual({ open: "kiro", kiroTab: "hooks" });
    expect(parse("?open=arena&menu=demo")).toEqual({ open: "arena", demoMenu: true });
    expect(parse("?open=demo")).toEqual({ open: "demo", demoIndex: 0 });
    expect(parse(`?open=demo&demo=${DEMO_BATTLES.length}`).demoIndex).toBe(DEMO_BATTLES.length - 1);
    expect(parse("?open=design")).toEqual({ open: "design" });
  });
  it("ignores unknown or out-of-range values", () => {
    expect(parse("?open=admin&case=nope&lang=fr&tab=x")).toEqual({});
    expect(parse("?open=kiro&tab=../../etc")).toEqual({ open: "kiro" });
    expect(parse("?open=demo&demo=0").demoIndex).toBe(0);
    expect(parse(`?demo=${DEMO_BATTLES.length + 1}`)).toEqual({});
    expect(parse("?menu=demo")).toEqual({});
  });
  it("never throws and only returns allowed values for any query string", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const l = parse(s);
        if (l.open) expect(["help", "kiro", "design", "arena", "demo"]).toContain(l.open);
        if (l.caseId) expect(IDS).toContain(l.caseId);
        if (l.lang) expect(["en", "ko"]).toContain(l.lang);
        if (l.demoIndex !== undefined) expect(l.demoIndex).toBeGreaterThanOrEqual(0);
        if (l.demoIndex !== undefined) expect(l.demoIndex).toBeLessThan(DEMO_BATTLES.length);
      }),
    );
  });
  it("the lab view applies the link once on load", () => {
    const lab = readFileSync(resolve(__dirname, "..", "components", "BioStitchLabView.tsx"), "utf8");
    expect(lab).toMatch(/parseDeepLink\(window\.location\.search/);
  });
});
