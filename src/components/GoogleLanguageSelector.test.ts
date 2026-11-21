import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isGoogleTranslateWidget } from "./GoogleLanguageSelector";

const el = (tagName: string, id = "", className = "") => ({ tagName, id, className });

describe("Google Translate floating logo / banner is hidden", () => {
  it("matches the widgets Google injects under <body>", () => {
    expect(isGoogleTranslateWidget(el("DIV", "", "skiptranslate"))).toBe(true);
    expect(isGoogleTranslateWidget(el("DIV", "", "VIpgJd-ZVi9od-aZ2wEe-wOHMyf"))).toBe(true);
    expect(isGoogleTranslateWidget(el("DIV", "", "foo VIpgJd-yAWNEb-L7lbkb skiptranslate"))).toBe(true);
    expect(isGoogleTranslateWidget(el("DIV", "goog-gt-tt"))).toBe(true);
    expect(isGoogleTranslateWidget(el("IFRAME", ":1.container"))).toBe(true);
    expect(isGoogleTranslateWidget(el("IFRAME", "", "goog-te-banner-frame"))).toBe(true);
  });
  it("never matches the app root or ordinary elements", () => {
    expect(isGoogleTranslateWidget(el("DIV", "root"))).toBe(false);
    expect(isGoogleTranslateWidget(el("DIV", "", "fixed inset-0 z-50"))).toBe(false);
    expect(isGoogleTranslateWidget(el("DIV", ":r1:"))).toBe(false);
    expect(isGoogleTranslateWidget({ tagName: "svg", id: "", className: { baseVal: "x" } })).toBe(false);
  });
  it("CSS hides top-level widgets by pattern and the component watches <body> for new ones", () => {
    const css = readFileSync(resolve(__dirname, "..", "index.css"), "utf8");
    expect(css).toMatch(/body > \[class\^="VIpgJd-"\]/);
    expect(css).toMatch(/body > \.skiptranslate/);
    const src = readFileSync(resolve(__dirname, "GoogleLanguageSelector.tsx"), "utf8");
    expect(src).toMatch(/new MutationObserver\(hideInjected\)/);
    expect(src).toMatch(/observer\.disconnect\(\)/);
  });
});
