/**
 * Unit: /api/generate-image (server-side HuggingFace token). Upstream fetch is mocked; HF is never called.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HF_IMAGE_DAILY_CAP,
  HF_IMAGE_URL,
  IMAGE_NEGATIVE_PROMPT,
  MAX_IMAGE_PROMPT_CHARS,
  MAX_NEGATIVE_EXTRA_CHARS,
  hfImageRequestBody,
  sanitizeNegativeExtra,
} from "../utils/hfImage";

const TOKEN = "hf_test_secret_token_123";
function mockRes() {
  const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as any };
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  return res;
}
let ipN = 0;
const freshIp = () => `203.0.113.${(++ipN % 250) + 1}`;
const post = (body: unknown, ip = freshIp()) => ({
  method: "POST",
  body,
  headers: { "x-vercel-forwarded-for": ip },
  socket: { remoteAddress: "127.0.0.1" },
});
const png = () => new Response(new Uint8Array([137, 80, 78, 71, 1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } });
async function load() {
  vi.resetModules();
  return (await import("../../api/generate-image")).default;
}

beforeEach(() => {
  process.env.HF_TOKEN = TOKEN;
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.HF_TOKEN;
});

describe("/api/generate-image", () => {
  it("rejects non-POST and missing prompts", async () => {
    const h = await load();
    const r1 = mockRes();
    await h({ method: "GET", headers: {} }, r1);
    expect(r1.statusCode).toBe(405);
    const r2 = mockRes();
    await h(post({ prompt: "  " }), r2);
    expect(r2.statusCode).toBe(400);
    const r3 = mockRes();
    await h(post({ prompt: "x".repeat(MAX_IMAGE_PROMPT_CHARS + 1) }), r3);
    expect(r3.statusCode).toBe(400);
  });

  it("answers 503 NO_KEY without HF_TOKEN, so the browser falls back", async () => {
    delete process.env.HF_TOKEN;
    const h = await load();
    const spy = vi.spyOn(globalThis, "fetch");
    const res = mockRes();
    await h(post({ prompt: "a dragon", seed: 1 }), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("NO_KEY");
    expect(spy).not.toHaveBeenCalled();
  });

  it("calls HF with the server token and the negative prompt, and returns a data URL", async () => {
    const h = await load();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(png());
    const res = mockRes();
    await h(post({ prompt: "a dragon", seed: 42 }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.imageDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(HF_IMAGE_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(init.body)).parameters.negative_prompt).toBe(IMAGE_NEGATIVE_PROMPT);
    expect(JSON.stringify(res.body)).not.toContain(TOKEN);
  });

  it("never echoes upstream error bodies", async () => {
    const h = await load();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("account mrsecret has no credits", { status: 402 }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = mockRes();
    await h(post({ prompt: "a dragon" }), res);
    expect(res.statusCode).toBe(402);
    expect(JSON.stringify(res.body)).not.toContain("mrsecret");
  });

  it("caps images per IP per UTC day, resets the next day, and refunds", async () => {
    vi.resetModules();
    const mod = await import("../../api/generate-image");
    const day1 = Date.UTC(2026, 10, 18, 12);
    for (let i = 0; i < HF_IMAGE_DAILY_CAP; i++) expect(mod.takeDailySlot("ip-a", day1)).toBe(true);
    expect(mod.takeDailySlot("ip-a", day1)).toBe(false);
    expect(mod.takeDailySlot("ip-b", day1)).toBe(true); // per IP
    mod.refundDailySlot("ip-a");
    expect(mod.takeDailySlot("ip-a", day1)).toBe(true);
    expect(mod.takeDailySlot("ip-a", day1 + 24 * 3600_000)).toBe(true); // next UTC day
  });

  it("refunds the daily slot when HF fails with a server error", async () => {
    const h = await load();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../api/generate-image");
    const ip = "198.18.0.9";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x", { status: 503 }));
    const res = mockRes();
    await h(post({ prompt: "p" }, ip), res);
    expect(res.statusCode).toBe(502);
    // all slots still free for this IP
    for (let i = 0; i < HF_IMAGE_DAILY_CAP; i++) expect(mod.takeDailySlot(ip)).toBe(true);
    expect(mod.takeDailySlot(ip)).toBe(false);
  });
});

describe("per-preset negative prompt", () => {
  it("is appended to the base list, sanitised and bounded", () => {
    const b = JSON.parse(hfImageRequestBody("x", 1, "dragon, wings"));
    expect(b.parameters.negative_prompt).toBe(`${IMAGE_NEGATIVE_PROMPT}, dragon, wings`);
    expect(sanitizeNegativeExtra("용 dragon\n\twings")).toBe("dragon wings");
    expect(sanitizeNegativeExtra(42)).toBe("");
    expect(sanitizeNegativeExtra("a, ".repeat(400)).length).toBeLessThanOrEqual(MAX_NEGATIVE_EXTRA_CHARS);
    expect(JSON.parse(hfImageRequestBody("x", 1, "")).parameters.negative_prompt).toBe(IMAGE_NEGATIVE_PROMPT);
  });

  it("the route passes it to HF and rejects a non-string", async () => {
    const h = await load();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(png());
    const ok = mockRes();
    await h(post({ prompt: "a beast", seed: 2, negative: "legs, feet" }), ok);
    expect(ok.statusCode).toBe(200);
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).parameters.negative_prompt).toBe(`${IMAGE_NEGATIVE_PROMPT}, legs, feet`);
    const bad = mockRes();
    await h(post({ prompt: "a beast", negative: ["legs"] }), bad);
    expect(bad.statusCode).toBe(400);
  });
});

describe("hfImageRequestBody", () => {
  it("sends a square 1024 image, the seed and the negative prompt", () => {
    const b = JSON.parse(hfImageRequestBody("a kraken", 7.9));
    expect(b).toEqual({ inputs: "a kraken", parameters: { seed: 7, width: 1024, height: 1024, negative_prompt: IMAGE_NEGATIVE_PROMPT } });
    expect(JSON.parse(hfImageRequestBody("x", Number.NaN)).parameters.seed).toBe(0);
    expect(JSON.parse(hfImageRequestBody("x", -5)).parameters.seed).toBe(5);
  });
  it("the HF model is the one still served (FLUX.1-schnell answers 410)", () => {
    expect(HF_IMAGE_URL).toBe("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers");
  });
});
