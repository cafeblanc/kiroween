/**
 * Direct links that open one screen of the app (for judges, screenshots and the demo video), e.g.
 *   /?lang=en&case=ghost-heart        a case in the experiment archive, in English
 *   /?open=arena&menu=demo            the arena with the free demo battle menu open
 *   /?open=demo&demo=2                plays the 2nd free demo battle full screen
 *   /?open=kiro&tab=hooks             the "Built with Kiro" panel on its hooks tab
 * Unknown or malformed values are ignored, so a bad link just opens the home screen.
 */
export type DeepLinkScreen = "help" | "kiro" | "design" | "arena" | "demo";
export type DeepLinkKiroTab = "specs" | "steering" | "hooks" | "tests";

export interface DeepLink {
  open?: DeepLinkScreen;
  /** Experiment case id from bioExperiments.ts (resolved from a short alias or the full id). */
  caseId?: string;
  lang?: "en" | "ko";
  kiroTab?: DeepLinkKiroTab;
  /** 0-based index into DEMO_BATTLES (the link uses 1-based demo=1..n). */
  demoIndex?: number;
  /** Open the free demo battle menu in the arena. */
  demoMenu?: boolean;
}

/** Short aliases for the six cases, so links stay readable. */
export const CASE_ALIASES: Readonly<Record<string, string>> = {
  xenocortication: "case-01-xenocortication",
  "ghost-heart": "case-02-ghost-heart",
  brainex: "case-03-yale-brainex",
  "human-pig": "case-06-human-pig-chimera",
  monkey: "case-08-chimeric-monkey",
  axolotl: "case-10-axolotl-blastema",
};

const SCREENS: readonly DeepLinkScreen[] = ["help", "kiro", "design", "arena", "demo"];
const KIRO_TABS: readonly DeepLinkKiroTab[] = ["specs", "steering", "hooks", "tests"];

export function parseDeepLink(search: string, knownCaseIds: readonly string[], demoCount: number): DeepLink {
  const q = new URLSearchParams(search);
  const get = (k: string) => (q.get(k) ?? "").trim().toLowerCase();
  const link: DeepLink = {};

  const open = get("open");
  if ((SCREENS as readonly string[]).includes(open)) link.open = open as DeepLinkScreen;

  const c = get("case");
  const caseId = CASE_ALIASES[c] ?? c;
  if (c && knownCaseIds.includes(caseId)) link.caseId = caseId;

  const lang = get("lang");
  if (lang === "en" || lang === "ko") link.lang = lang;

  const tab = get("tab");
  if (link.open === "kiro" && (KIRO_TABS as readonly string[]).includes(tab)) link.kiroTab = tab as DeepLinkKiroTab;

  const demo = get("demo");
  if (/^\d{1,2}$/.test(demo)) {
    const n = Number(demo);
    if (n >= 1 && n <= demoCount) link.demoIndex = n - 1;
  }
  if (link.open === "demo" && link.demoIndex === undefined && demoCount > 0) link.demoIndex = 0;

  if (link.open === "arena" && get("menu") === "demo") link.demoMenu = true;
  return link;
}
