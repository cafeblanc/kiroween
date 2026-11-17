/**
 * Preservation tests for the hidden-bugs-audit spec (Property 7, requirements 3.1-3.8).
 *
 * Written BEFORE any fix and observed to PASS on the unfixed code. They must keep
 * passing after every fix batch. No DOM environment (jsdom) is installed, so the
 * UI and Realtime behaviors (3.1, 3.2, 3.3, and the curated-answer branch of 3.4)
 * are pinned by static source assertions; the service, API handler, and URL
 * helpers (3.4 intent, 3.5, 3.6, 3.7) run dynamically.
 *
 * 3.8 (bioreactor sequence, BattleMatrix, AwakeningRoar, cardiac thump, tsc, vite build)
 * is covered by the existing 104 tests plus the tsc/vite build checks.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import {
  API_ALLOWLIST,
  assertAllowedApiEndpoint,
  isAllowedApiEndpoint,
  sanitizeVideoUrl,
} from "../utils/security";
import { detectQuestionIntent, scienceStitchService } from "../services/scienceStitchService";
import { VERIFIED_BIO_EXPERIMENTS } from "../data/bioExperiments";
import handler from "../../api/generate-video";

const ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// 3.1 Realtime happy path (useGptLiveVoice)
// ---------------------------------------------------------------------------
describe("3.1 Realtime happy path in useGptLiveVoice (static)", () => {
  const src = read("src/modules/voice/useGptLiveVoice.ts");

  it("requests client_secrets before posting the SDP to /realtime/calls", () => {
    const secretIdx = src.indexOf("/realtime/client_secrets'");
    const callsIdx = src.indexOf("/realtime/calls'");
    expect(secretIdx).toBeGreaterThan(-1);
    expect(callsIdx).toBeGreaterThan(secretIdx);
  });

  it("client_secrets body is only { session: { type: 'realtime', model } }", () => {
    const start = src.indexOf("/realtime/client_secrets'");
    const bodyStart = src.indexOf("body: JSON.stringify(", start);
    const body = src.slice(bodyStart, src.indexOf("});", bodyStart));
    expect(body).toMatch(/session:\s*{\s*type:\s*'realtime',\s*model:\s*primaryModel\s*}/);
    expect(body).not.toMatch(/voice|instructions|input_audio_transcription|tools/);
  });

  it("sends the raw SDP with the ephemeral token as application/sdp", () => {
    expect(src).toMatch(/if \(usedEphemeral\)[\s\S]*?'Content-Type': 'application\/sdp'[\s\S]*?body: offer\.sdp/);
    expect(src).toMatch(/Authorization: `Bearer \$\{activeBearer\}`/);
  });

  it("master-key fallback posts multipart with only sdp and a minimal session", () => {
    const start = src.indexOf("// Direct master key call");
    const end = src.indexOf("body: formData", start);
    const block = src.slice(start, end);
    expect(block).toContain("formData.append('sdp'");
    expect(block).toMatch(/type: 'realtime',\s*model: primaryModel/);
    expect(block).not.toMatch(/voice|instructions|input_audio_transcription/);
  });

  it("keeps the gpt-realtime / gpt-4o-realtime-preview model fallback", () => {
    expect(src).toContain("'gpt-realtime'");
    expect(src).toContain("'gpt-4o-realtime-preview'");
  });

  it("sends voice, instructions, tools and transcription via session.update on dc.onopen", () => {
    const cfgStart = src.indexOf("const sessionConfig = {");
    const cfg = src.slice(cfgStart, src.indexOf("dc.send(JSON.stringify(sessionConfig))", cfgStart));
    expect(cfg).toContain("type: 'session.update'");
    expect(cfg).toMatch(/instructions:/);
    expect(cfg).toMatch(/voice:/);
    expect(cfg).toMatch(/tools:/);
    expect(cfg).toMatch(/input_audio_transcription:/);
    expect(src).toContain("dc.send(JSON.stringify(sessionConfig))");
  });
});

// ---------------------------------------------------------------------------
// 3.2 / 3.3 / 3.4 BioStitchLabView (static; no DOM environment available)
// ---------------------------------------------------------------------------
describe("3.2 mobile synapse chat absorption (static)", () => {
  const src = read("src/components/BioStitchLabView.tsx");

  it("moves to the exiting phase 3000 ms after the last message", () => {
    expect(src).toMatch(/setTimeout\(\(\)\s*=>\s*{\s*setMobileChatPhase\("exiting"\);\s*},\s*3000\)/);
  });

  it("applies -translate-y-full opacity-0 only in the exiting phase", () => {
    expect(src).toMatch(
      /mobileChatPhase === "exiting"\s*\?\s*"-translate-y-full opacity-0"\s*:\s*"translate-y-0 opacity-100"/,
    );
  });

  it("hides the chat after the exit transition", () => {
    expect(src).toMatch(/setMobileChatPhase\("hidden"\)/);
  });
});

describe("3.3 muted video layered over the confocal photo (static + data)", () => {
  const src = read("src/components/BioStitchLabView.tsx");
  const photoIdx = src.indexOf("src={activeExp.microscopyPhotoUrl}");
  const videoSrcIdx = src.indexOf("src={activeExp.videoUrl}");

  it("renders the photo before the video so the video is layered on top", () => {
    expect(photoIdx).toBeGreaterThan(-1);
    expect(videoSrcIdx).toBeGreaterThan(photoIdx);
  });

  it("keeps the background video muted, looping, inline, and absolutely positioned", () => {
    const tagStart = src.lastIndexOf("<video", videoSrcIdx);
    const tagEnd = src.indexOf("/>", videoSrcIdx);
    const tag = src.slice(tagStart, tagEnd);
    expect(tag).toMatch(/\bmuted\b/);
    expect(tag).toMatch(/\bautoPlay\b/);
    expect(tag).toMatch(/\bloop\b/);
    expect(tag).toMatch(/\bplaysInline\b/);
    expect(tag).toContain("absolute inset-0");
  });

  it("every curated experiment pairs a video with a confocal photo", () => {
    expect(VERIFIED_BIO_EXPERIMENTS.length).toBeGreaterThan(0);
    for (const exp of VERIFIED_BIO_EXPERIMENTS) {
      expect(exp.videoUrl).toMatch(/^(https?:\/\/|\/)/);
      expect(exp.microscopyPhotoUrl).toMatch(/^(https?:\/\/|\/)/);
    }
  });
});

describe("3.4 curated questions answered locally (static + intent detection)", () => {
  const src = read("src/components/BioStitchLabView.tsx");

  it("answers curated/contextual questions before any live lookup and returns", () => {
    const curated = src.indexOf("if (targetCase) {");
    const live = src.indexOf("scienceStitchService.stitchLiveQuery(");
    expect(curated).toBeGreaterThan(-1);
    expect(live).toBeGreaterThan(curated);
    const block = src.slice(curated, live);
    expect(block).toMatch(/await appendTranslatedAiReply\(replyMsg\);\s*return;/);
    expect(block).not.toMatch(/\bfetch\(|stitchLiveQuery|translateTextToLanguage/);
  });

  it("answers the app-usage intent locally and returns", () => {
    const usage = src.indexOf('if (intent === "app_usage") {');
    const curated = src.indexOf("if (targetCase) {");
    expect(usage).toBeGreaterThan(-1);
    const block = src.slice(usage, curated);
    expect(block).toContain("return;");
    expect(block).not.toMatch(/\bfetch\(|stitchLiveQuery/);
  });

  it.each([
    ["이 실험은 어떻게 사용하나요 버튼", "app_usage"],
    ["who wrote the paper", "paper_source"],
    ["is it ethical or risky", "ethics_reality"],
    ["which genes and cells", "genes_cells"],
    ["how does it work", "mechanism"],
    ["hello", "definition"],
  ])("detects intent for %s", (q, intent) => {
    expect(detectQuestionIntent(q)).toBe(intent);
  });

  it("intent detection is pure, total, and returns a known intent", () => {
    const known = ["app_usage", "mechanism", "genes_cells", "paper_source", "ethics_reality", "definition"];
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (q) => {
        const a = detectQuestionIntent(q);
        expect(known).toContain(a);
        expect(detectQuestionIntent(q)).toBe(a);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// 3.5 Stitched dossier with fast EuropePMC + Wikipedia responses
// ---------------------------------------------------------------------------
describe("3.5 stitched dossier when APIs answer in time", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  const jsonRes = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

  it("builds PMID, related paper, and Wikipedia summary (property over generated metadata)", async () => {
    const word = fc.stringMatching(/^[A-Za-z]{4,10}$/);
    await fc.assert(
      fc.asyncProperty(
        word,
        fc.integer({ min: 1000000, max: 99999999 }),
        fc.integer({ min: 1990, max: 2026 }),
        word,
        async (journal, pmid, year, wikiWord) => {
          const calls: string[] = [];
          globalThis.fetch = (async (input: any) => {
            const url = String(input);
            calls.push(url);
            if (url.includes("ebi.ac.uk")) {
              return jsonRes({
                resultList: {
                  result: [
                    {
                      id: String(pmid),
                      pmid: String(pmid),
                      title: "Paper about organoids",
                      authorString: "Doe J",
                      journalTitle: journal,
                      pubYear: String(year),
                      abstractText: "Organoid grafts integrate.",
                    },
                  ],
                },
              });
            }
            if (url.includes("wikipedia.org/api/rest_v1/page/summary")) {
              return jsonRes({
                type: "standard",
                title: "Organoid",
                extract: `An organoid ${wikiWord} is a miniature organ.`,
                content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Organoid" } },
              });
            }
            return jsonRes({});
          }) as typeof fetch;

          const dossier = await scienceStitchService.stitchLiveQuery("organoid", "en");
          expect(dossier.papers[0].pmid).toBe(String(pmid));
          expect(dossier.wiki?.title).toBe("Organoid");
          expect(dossier.stemCellSynthesisEn).toContain("[Organoid]");
          expect(dossier.stemCellSynthesisEn).toContain(`Related Study (${journal}, ${year})`);
          expect(dossier.stemCellSynthesisKo).toContain("[Organoid]");
          expect(calls.some((u) => u.includes("ebi.ac.uk"))).toBe(true);
        },
      ),
      { numRuns: 15 },
    );
  });

  it("falls back to the 'could not find' message when both APIs return nothing", async () => {
    globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response) as typeof fetch;
    const dossier = await scienceStitchService.stitchLiveQuery("zzqqxx", "en");
    expect(dossier.papers).toEqual([]);
    expect(dossier.wiki).toBeNull();
    expect(dossier.stemCellSynthesisEn).toContain("Could not find a direct match");
  });
});

// ---------------------------------------------------------------------------
// 3.6 /api/generate-video status codes
// ---------------------------------------------------------------------------
describe("3.6 generate-video 405 / 400 / 400", () => {
  const saved = { ...process.env };
  let n = 0;

  beforeEach(() => {
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  function call(method: string, body: unknown) {
    // Unique IP per call, set on every candidate header, so rate limiting never interferes.
    const ip = `203.0.113.${(++n % 250) + 1}`;
    const out: { status?: number; json?: any; headers: Record<string, string> } = { headers: {} };
    const res: any = {
      status(code: number) {
        out.status = code;
        return res;
      },
      json(payload: unknown) {
        out.json = payload;
        return res;
      },
      send(payload: unknown) {
        out.json = payload;
        return res;
      },
      setHeader(k: string, v: string) {
        out.headers[k] = v;
      },
    };
    const req: any = {
      method,
      body,
      query: {},
      headers: { "x-forwarded-for": ip, "x-vercel-forwarded-for": ip, "x-real-ip": ip },
      socket: { remoteAddress: ip },
    };
    return handler(req, res).then(() => out);
  }

  it.each(["GET", "PUT", "DELETE", "PATCH"])("returns 405 for %s", async (method) => {
    const out = await call(method, undefined);
    expect(out.status).toBe(405);
  });

  it("returns 400 for an empty prompt", async () => {
    expect((await call("POST", { prompt: "" })).status).toBe(400);
    expect((await call("POST", {})).status).toBe(400);
    expect((await call("POST", undefined)).status).toBe(400);
  });

  it("returns 400 when no provider token is configured", async () => {
    const out = await call("POST", { prompt: "a cell", provider: "huggingface_wan2" });
    expect(out.status).toBe(400);
    expect(JSON.stringify(out.json)).toMatch(/token|HF_TOKEN/i);
  });
});

// ---------------------------------------------------------------------------
// 3.7 URL sanitization and API allowlist (property-based)
// ---------------------------------------------------------------------------
describe("3.7 sanitizeVideoUrl / assertAllowedApiEndpoint acceptance rules", () => {
  const seg = fc.stringMatching(/^[a-z0-9_-]{1,12}$/);
  const hostArb = fc
    .tuple(seg, fc.constantFrom("com", "org", "net"))
    .map(([h, tld]) => `${h}.${tld}`);

  it("accepts http(s) URLs and relative paths unchanged", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("https", "http"),
        hostArb,
        fc.array(seg, { maxLength: 3 }),
        (scheme, host, path) => {
          const url = `${scheme}://${host}/${path.join("/")}`;
          expect(sanitizeVideoUrl(url)).toBe(url);
        },
      ),
    );
    fc.assert(
      fc.property(fc.array(seg, { minLength: 1, maxLength: 3 }), (path) => {
        expect(sanitizeVideoUrl("/" + path.join("/") + ".mp4")).toBe("/" + path.join("/") + ".mp4");
        expect(sanitizeVideoUrl(path.join("/") + ".mp4")).toBe(path.join("/") + ".mp4");
      }),
    );
  });

  it("rejects dangerous schemes, even with mixed case and hidden control chars", () => {
    const scheme = fc.constantFrom("javascript", "data", "vbscript", "file", "ftp");
    const caseMix = (s: string, mask: boolean[]) =>
      [...s].map((c, i) => (mask[i % mask.length] ? c.toUpperCase() : c)).join("");
    fc.assert(
      fc.property(
        scheme,
        fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
        fc.constantFrom("", " ", "\t", "\n"),
        seg,
        (s, mask, pad, rest) => {
          expect(sanitizeVideoUrl(`${pad}${caseMix(s, mask)}:${rest}`)).toBeNull();
        },
      ),
    );
    expect(sanitizeVideoUrl("java\tscript:alert(1)")).toBeNull();
    expect(sanitizeVideoUrl("java\nscript:alert(1)")).toBeNull();
  });

  it("rejects protocol-relative, backslash, non-string, and blank input", () => {
    fc.assert(
      fc.property(hostArb, seg, (host, rest) => {
        expect(sanitizeVideoUrl(`//${host}/${rest}`)).toBeNull();
        expect(sanitizeVideoUrl(`/\\${host}/${rest}`)).toBeNull();
        expect(sanitizeVideoUrl(`https://${host}\\${rest}`)).toBeNull();
      }),
    );
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)), (v) => {
        expect(sanitizeVideoUrl(v)).toBeNull();
      }),
    );
    expect(sanitizeVideoUrl("")).toBeNull();
    expect(sanitizeVideoUrl("   ")).toBeNull();
  });

  it("allows every allowlisted host/prefix over https and same-origin paths", () => {
    const entries = Object.entries(API_ALLOWLIST).flatMap(([host, prefixes]) =>
      prefixes.map((p) => [host, p] as const),
    );
    fc.assert(
      fc.property(fc.constantFrom(...entries), seg, ([host, prefix], tail) => {
        const path = prefix.endsWith("/") ? `${prefix}${tail}` : prefix;
        const url = host ? `https://${host}${path}` : path;
        expect(isAllowedApiEndpoint(url)).toBe(true);
        expect(assertAllowedApiEndpoint(url)).toBe(url);
      }),
    );
  });

  it("rejects http, non-allowlisted hosts, credentials, traversal, and non-strings", () => {
    fc.assert(
      fc.property(hostArb, seg, (host, tail) => {
        fc.pre(!(host in API_ALLOWLIST));
        expect(isAllowedApiEndpoint(`https://${host}/api/generate-video/${tail}`)).toBe(false);
        expect(() => assertAllowedApiEndpoint(`https://${host}/${tail}`)).toThrow();
      }),
    );
    fc.assert(
      fc.property(seg, (tail) => {
        expect(isAllowedApiEndpoint(`http://www.ebi.ac.uk/europepmc/webservices/rest/${tail}`)).toBe(false);
        expect(isAllowedApiEndpoint(`https://user:pw@www.ebi.ac.uk/europepmc/webservices/rest/${tail}`)).toBe(false);
        expect(isAllowedApiEndpoint(`//www.ebi.ac.uk/europepmc/webservices/rest/${tail}`)).toBe(false);
        expect(isAllowedApiEndpoint(`/api/generate-video/../../${tail}`)).toBe(false);
        expect(isAllowedApiEndpoint(`/api/${tail}x`)).toBe(false);
      }),
    );
    fc.assert(
      fc.property(fc.oneof(fc.integer(), fc.constant(null), fc.constant(undefined), fc.constant("")), (v) => {
        expect(isAllowedApiEndpoint(v)).toBe(false);
      }),
    );
    expect(isAllowedApiEndpoint("javascript:alert(1)")).toBe(false);
    expect(isAllowedApiEndpoint("data:text/html,x")).toBe(false);
  });

  it("assertAllowedApiEndpoint throws exactly when isAllowedApiEndpoint is false", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (s) => {
        if (isAllowedApiEndpoint(s)) expect(assertAllowedApiEndpoint(s)).toBe(s);
        else expect(() => assertAllowedApiEndpoint(s)).toThrow();
      }),
      { numRuns: 300 },
    );
  });
});
