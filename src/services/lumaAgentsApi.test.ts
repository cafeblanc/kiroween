import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockRes() {
  const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown };
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.send = (b: unknown) => ((res.body = b), res);
  return res;
}

let n = 0;
const ip = () => `198.51.100.${(++n % 250) + 1}`;
const post = (body: any) => ({
  method: "POST",
  body,
  headers: { "x-vercel-forwarded-for": ip() },
  socket: { remoteAddress: "10.0.0.1" },
});
const poll = (id: string, headers: Record<string, string> = {}) => ({
  method: "GET",
  query: { provider: "luma", id },
  headers: { "x-vercel-forwarded-for": ip(), ...headers },
  socket: { remoteAddress: "10.0.0.1" },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const GEN_ID = "d290f1ee-6c54-4b01-90e6-d701748f0851";

describe("Luma Agents API mapping (api/generate-video.ts)", () => {
  let handler: (req: any, res: any) => Promise<any>;
  const saved = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    for (const k of ["HF_TOKEN", "HUGGINGFACE_TOKEN", "LUMA_API_KEY", "LUMA_AGENTS_API_KEY"]) delete process.env[k];
    handler = (await import("../../api/generate-video")).default;
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("POST sends the Agents API body to agents.lumalabs.ai and returns {jobId,status}", async () => {
    const f = vi.fn(async () => json({ id: GEN_ID, state: "queued" }, 201));
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(post({ prompt: "a cell", provider: "luma", apiKey: "k_user" }), res);
    const [url, init] = f.mock.calls[0] as unknown as [string, any];
    expect(url).toBe("https://agents.lumalabs.ai/v1/generations");
    expect(init.headers.Authorization).toBe("Bearer k_user");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: "ray-3.2",
      type: "video",
      prompt: "a cell",
      aspect_ratio: "16:9",
      video: { resolution: "720p", duration: "5s" },
    });
    expect(res.body).toEqual({ jobId: GEN_ID, status: "queued" });
  });

  it("accepts LUMA_AGENTS_API_KEY and the LUMA_API_KEY alias from the environment", async () => {
    const f = vi.fn(async () => json({ id: GEN_ID, state: "queued" }, 201));
    vi.stubGlobal("fetch", f);
    process.env.LUMA_API_KEY = "alias_key";
    await handler(post({ prompt: "p", provider: "luma" }), mockRes());
    expect((f.mock.calls[0] as any)[1].headers.Authorization).toBe("Bearer alias_key");
    process.env.LUMA_AGENTS_API_KEY = "agents_key";
    await handler(post({ prompt: "p", provider: "luma" }), mockRes());
    expect((f.mock.calls[1] as any)[1].headers.Authorization).toBe("Bearer agents_key");
  });

  it("missing key error names both env vars", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = mockRes();
    await handler(post({ prompt: "p", provider: "luma" }), res);
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.body)).toContain("LUMA_AGENTS_API_KEY");
    expect(JSON.stringify(res.body)).toContain("LUMA_API_KEY");
  });

  it.each([
    ["queued", "queued"],
    ["processing", "processing"],
    ["something-new", "processing"],
  ])("poll maps state %s -> %s with no videoUrl", async (state, expected) => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ id: GEN_ID, state, output: [] })));
    const res = mockRes();
    await handler(poll(GEN_ID, { "x-luma-api-key": "k" }), res);
    expect(res.body).toEqual({ jobId: GEN_ID, status: expected, videoUrl: null });
  });

  it("poll completed returns output video url and calls the Agents GET endpoint", async () => {
    const f = vi.fn(async () =>
      json({ id: GEN_ID, state: "completed", output: [{ type: "video", url: "https://s.example/o.mp4?X=1" }] }),
    );
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(poll(GEN_ID, { "x-luma-api-key": "k" }), res);
    expect((f.mock.calls[0] as any)[0]).toBe(`https://agents.lumalabs.ai/v1/generations/${GEN_ID}`);
    expect(res.body).toEqual({ jobId: GEN_ID, status: "completed", videoUrl: "https://s.example/o.mp4?X=1" });
  });

  it("poll failed reports failure_code and no videoUrl", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ id: GEN_ID, state: "failed", failure_code: "content_moderated", failure_reason: "x" })),
    );
    const res = mockRes();
    await handler(poll(GEN_ID, { "x-luma-api-key": "k" }), res);
    expect(res.body).toMatchObject({ status: "failed", videoUrl: null, error: "content_moderated" });
  });

  it.each([401, 402, 403, 422, 429])("maps upstream %i without leaking the key", async (code) => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "nope" }, code)));
    const res = mockRes();
    await handler(poll(GEN_ID, { "x-luma-api-key": "SECRET_KEY_123" }), res);
    expect(res.statusCode).toBe(code);
    expect(JSON.stringify(res.body)).not.toContain("SECRET_KEY_123");
    expect((res.body as any).error).toBeTruthy();
  });

  it("rejects ids outside the allowed charset before calling upstream", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(poll("../etc/passwd", { "x-luma-api-key": "k" }), res);
    expect(res.statusCode).toBe(405);
    expect(f).not.toHaveBeenCalled();
  });
});
