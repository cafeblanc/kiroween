import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const lab = readFileSync(resolve(__dirname, "BioStitchLabView.tsx"), "utf8");

describe("Built with Kiro panel", () => {
  it("can be opened from the header", () => {
    const header = lab.slice(lab.indexOf("<header"), lab.indexOf("</header>"));
    expect(header).toMatch(/setIsKiroSpecModalOpen\(true\)/);
    expect(header).toMatch(/Built with Kiro/);
  });
  it("lists only spec folders that exist in .kiro/specs", () => {
    const dirs = [...lab.matchAll(/\{ dir: "([\w-]+)"/g)].map((m) => m[1]);
    expect(dirs.length).toBe(7);
    for (const d of dirs) expect(existsSync(resolve(ROOT, ".kiro", "specs", d)), d).toBe(true);
  });
  it("shows the real hook file and steering files", () => {
    expect(existsSync(resolve(ROOT, ".kiro", "hooks", "prometheus-lab.json"))).toBe(true);
    for (const f of [".kiro/steering/product.md", ".kiro/steering/tech.md", "AGENTS.md"]) {
      expect(lab).toContain(`file: "${f}"`);
      expect(existsSync(resolve(ROOT, f)), f).toBe(true);
    }
    const hooks = JSON.parse(readFileSync(resolve(ROOT, ".kiro", "hooks", "prometheus-lab.json"), "utf8")).hooks as { name: string }[];
    for (const h of hooks) expect(lab).toContain(`<code>${h.name}</code>`);
  });
  it("no longer shows the removed hook, the old 10-case list or the 92% claim", () => {
    const panel = lab.slice(lab.indexOf("{isKiroSpecModalOpen && ("), lab.indexOf("{/* FULLSCREEN MONSTER 3D"));
    expect(panel).not.toMatch(/pubmed-citation-verifier|10대|DishBrain|디시브레인|Live Spec Code Generator/);
  });
});
