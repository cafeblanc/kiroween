/**
 * Unit: /api/generate-video LTX handler. Upstream fetch is mocked; the real LTX API is never called.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const KEY = "ltx_secret_key_123456";
const OK_URL = "https://storage.googleapis.com/ltx-out/abc.mp4";

function mockRes() {
  const res: any = { statusCode: 200, headers: {} as Record<string, string>, body: undefined as any };
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res);
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.send = (b: unknown) => ((res.body = b), res);
  return res;
}

let ipN = 0;
const freshIp = () => `198.51.100.${(++ipN % 250) + 1}`;
const req = (method: string, over: any = {}) => ({
  method,
  body: undefined,
  query: {},
  headers: { "x-vercel-forwarded-for": over.ip ?? freshIp() },
  socket: { remoteAddress: "127.0.0.1" },
  ...over,
});
const up = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

async function load() {
  vi.resetModules();
  return (await import("../../api/generate-video")).default;
}

beforeEach(() => {
  delete process.env.LTX_API_KEY;
  delete process.env.HF_TOKEN;
  process.env.LTXV_API_KEY = KEY;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.LTXV_API_KEY;
  delete process.env.LTX_API_KEY;
});

describe("POST create", () => {
  it("creates a text-to-video job with the fixed LTX 2.5 fast settings", async () => {
    const handler = await load();
    const f = vi.fn(async () => up({ id: "abcdef1234567890", created_at: "now" }, 202));
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(req("POST", { body: { prompt: " a cell " } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ jobId: "abcdef1234567890", status: "queued", kind: "text" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.ltx.io/v2/text-to-video");
    expect((init.headers as any).Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(init.body))).toEqual({
      prompt: "a cell",
      model: "ltx-2-5-fast",
      duration: 6,
      resolution: "1920x1080",
      fps: 24,
      generate_audio: false,
    });
  });

  it("uses image-to-video when an image data URI is given", async () => {
    const handler = await load();
    const f = vi.fn(async () => up({ id: "abcdef1234567890" }, 202));
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    const image = "data:image/jpeg;base64,/9j/AAAA";
    await handler(req("POST", { body: { prompt: "p", image, aspect: "9:16" } }), res);
    expect(res.body).toMatchObject({ kind: "image" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.ltx.io/v2/image-to-video");
    const sent = JSON.parse(String(init.body));
    expect(sent.image_uri).toBe(image);
    expect(sent.resolution).toBe("1080x1920");
  });

  it("rejects bad images, bad aspect, empty prompt, no key, and unsupported providers without calling upstream", async () => {
    const handler = await load();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const run = async (body: any) => {
      const res = mockRes();
      await handler(req("POST", { body }), res);
      return res;
    };
    expect((await run({ prompt: "p", image: "http://evil/x.jpg" })).statusCode).toBe(400);
    expect((await run({ prompt: "p", aspect: "4:3" })).statusCode).toBe(400);
    expect((await run({ prompt: "  " })).statusCode).toBe(400);
    for (const provider of ["luma", "huggingface_wan2"]) {
      const r = await run({ prompt: "p", provider });
      expect(r.statusCode).toBe(400);
      expect(JSON.stringify(r.body)).toMatch(/unsupported provider/i);
    }
    expect((await run({ prompt: "p", image: "data:image/jpeg;base64," + "A".repeat(3_600_000) })).statusCode).toBe(413);
    delete process.env.LTXV_API_KEY;
    const noKey = await run({ prompt: "p", apiKey: "browser-key", provider: "ltx" });
    expect(noKey.statusCode).toBe(400);
    expect(JSON.stringify(noKey.body)).toMatch(/LTXV_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });

  it("reads LTX_API_KEY when LTXV_API_KEY is missing, and ignores the browser key and HF_TOKEN", async () => {
    const handler = await load();
    delete process.env.LTXV_API_KEY;
    process.env.LTX_API_KEY = "ltx_alt_key_abcdef";
    process.env.HF_TOKEN = "hf_should_not_be_used";
    const f = vi.fn(async () => up({ id: "abcdef1234567890" }, 202));
    vi.stubGlobal("fetch", f);
    await handler(req("POST", { body: { prompt: "p", apiKey: "browser-key" } }), mockRes());
    expect(((f.mock.calls[0] as any)[1].headers as any).Authorization).toBe("Bearer ltx_alt_key_abcdef");
  });

  it("maps upstream errors and never leaks the key", async () => {
    const cases: Array<[number, number, RegExp]> = [
      [401, 401, /rejected/i],
      [402, 402, /credits/i],
      [413, 413, /too large/i],
      [422, 422, /rejected the request/i],
      [429, 429, /queue limit/i],
      [500, 502, /service error/i],
      [503, 502, /service error/i],
    ];
    for (const [upstream, expected, re] of cases) {
      const handler = await load();
      vi.stubGlobal("fetch", vi.fn(async () => up({ error: { message: `bad key ${KEY}` } }, upstream, { "retry-after": "7" })));
      const res = mockRes();
      await handler(req("POST", { body: { prompt: "p" } }), res);
      expect(res.statusCode).toBe(expected);
      expect(res.body.error).toMatch(re);
      expect(JSON.stringify(res.body)).not.toContain(KEY);
    }
    // 422 detail is redacted too.
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ error: { message: `invalid ${KEY} prompt` } }, 422)));
    const res = mockRes();
    await handler(req("POST", { body: { prompt: "p" } }), res);
    expect(res.body.error).toContain("[redacted]");
    expect(res.body.error).not.toContain(KEY);
  });

  it("returns 502 when upstream gives an invalid job id", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ id: "../x" }, 202)));
    const res = mockRes();
    await handler(req("POST", { body: { prompt: "p" } }), res);
    expect(res.statusCode).toBe(502);
  });

  it("limits creates to 10 per minute per IP", async () => {
    const handler = await load();
    // Failing upstream refunds the daily slot, so only the per-minute limiter can trip.
    vi.stubGlobal("fetch", vi.fn(async () => up({}, 500)));
    const ip = "203.0.113.200";
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = mockRes();
      await handler(req("POST", { ip, body: { prompt: "p" } }), res);
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });

  it("caps creates at 5 per day per IP", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ id: "abcdef1234567890" }, 202)));
    const ip = "203.0.113.201";
    const codes: number[] = [];
    let msg = "";
    for (let i = 0; i < 6; i++) {
      const res = mockRes();
      await handler(req("POST", { ip, body: { prompt: "p" } }), res);
      codes.push(res.statusCode);
      msg = res.body?.error ?? msg;
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
    expect(msg).toMatch(/daily/i);
  });
});

describe("GET poll", () => {
  const poll = (query: any, ip?: string) => req("GET", { query, ip });

  it("still returns 405 without a valid provider=ltx&id", async () => {
    const handler = await load();
    for (const query of [{}, { provider: "ltx" }, { id: "abcdef1234567890" }, { provider: "luma", id: "abcdef1234567890" }, { provider: "ltx", id: "../../etc/passwd" }, { provider: "ltx", id: "short" }]) {
      const res = mockRes();
      await handler(poll(query), res);
      expect(res.statusCode).toBe(405);
    }
  });

  it("maps pending/processing/completed with the right endpoint per kind", async () => {
    const handler = await load();
    const f = vi
      .fn()
      .mockResolvedValueOnce(up({ status: "pending" }))
      .mockResolvedValueOnce(up({ status: "processing" }))
      .mockResolvedValueOnce(up({ status: "completed", result: { video_url: OK_URL } }));
    vi.stubGlobal("fetch", f);
    const ip = freshIp();
    const out: any[] = [];
    for (const kind of ["text", "image", "image"]) {
      const res = mockRes();
      await handler(poll({ provider: "ltx", id: "abcdef1234567890", kind }, ip), res);
      out.push(res);
    }
    expect(out.map((r) => r.body.status)).toEqual(["queued", "processing", "completed"]);
    expect(out[2].body.videoUrl).toBe(OK_URL);
    expect(f.mock.calls.map((c) => c[0])).toEqual([
      "https://api.ltx.io/v2/text-to-video/abcdef1234567890",
      "https://api.ltx.io/v2/image-to-video/abcdef1234567890",
      "https://api.ltx.io/v2/image-to-video/abcdef1234567890",
    ]);
  });

  it("maps failed jobs with a safe message", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ status: "failed", error: { type: "content_filtered_error", message: "x" } })));
    const res = mockRes();
    await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res);
    expect(res.body).toMatchObject({ status: "failed", videoUrl: null });
    expect(res.body.error).toMatch(/content filter/i);
  });

  it("refuses non-https or credentialed result URLs but accepts any https host", async () => {
    const handler = await load();
    for (const url of ["http://storage.googleapis.com/v.mp4", "https://user:pw@cdn.example/v.mp4", "https://cdn.example:8443/v.mp4", "javascript:alert(1)", undefined]) {
      vi.stubGlobal("fetch", vi.fn(async () => up({ status: "completed", result: { video_url: url } })));
      const res = mockRes();
      await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res);
      expect(res.body.status).toBe("failed");
      expect(res.body.videoUrl).toBeNull();
    }
    for (const url of ["https://foo.storage.googleapis.com/v.mp4", "https://cdn.ltx.io/v.mp4", "https://d1abc.cloudfront.net/out/v.mp4"]) {
      vi.stubGlobal("fetch", vi.fn(async () => up({ status: "completed", result: { video_url: url } })));
      const res = mockRes();
      await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res);
      expect(res.body.status).toBe("completed");
    }
  });

  it("maps upstream poll errors (401 / 404) and redacts the key", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ error: { message: KEY } }, 404)));
    const res = mockRes();
    await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain(KEY);
    vi.stubGlobal("fetch", vi.fn(async () => up({}, 401)));
    const res2 = mockRes();
    await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res2);
    expect(res2.statusCode).toBe(401);
  });

  it("returns 400 when no key is configured", async () => {
    const handler = await load();
    delete process.env.LTXV_API_KEY;
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(poll({ provider: "ltx", id: "abcdef1234567890" }), res);
    expect(res.statusCode).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it("limits polls to 60 per minute per IP", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => up({ status: "processing" })));
    const ip = "203.0.113.202";
    let last = 0;
    for (let i = 0; i < 61; i++) {
      const res = mockRes();
      await handler(poll({ provider: "ltx", id: "abcdef1234567890" }, ip), res);
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});

describe("GET chunked result download", () => {
  const RESULT = "https://storage.googleapis.com/ltxv-api-ephemeral-prd/model-serving/outputs/default/ABC/video.mp4?X-Goog-Signature=sig";
  const dl = (q: any, ip?: string) => req("GET", { query: { provider: "ltx", action: "download", ...q }, ip });
  const bytes = (n: number, status = 206, headers: Record<string, string> = {}) =>
    new Response(new Uint8Array(n), { status, headers });

  it("proxies a byte range with the total length and no LTX key", async () => {
    const handler = await load();
    const f = vi.fn(async () => bytes(3_000_000, 206, { "content-range": "bytes 0-2999999/5273017" }));
    vi.stubGlobal("fetch", f);
    const res = mockRes();
    await handler(dl({ url: RESULT, start: "0", end: "2999999" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["X-Total-Length"]).toBe("5273017");
    expect(res.headers["Content-Type"]).toBe("application/octet-stream");
    expect((res.body as Buffer).length).toBe(3_000_000);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESULT);
    expect((init.headers as any).Range).toBe("bytes=0-2999999");
    expect((init.headers as any).Authorization).toBeUndefined();
    expect(init.redirect).toBe("error");
  });

  it("uses the body length as total when the bucket ignores the range (200)", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => bytes(1234, 200)));
    const res = mockRes();
    await handler(dl({ url: RESULT, start: "0", end: "2999999" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["X-Total-Length"]).toBe("1234");
  });

  it("rejects URLs outside the LTX result bucket without fetching", async () => {
    const handler = await load();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const url of [
      "https://storage.googleapis.com/other-bucket/x.mp4",
      "https://storage.googleapis.com/ltxv-api-ephemeral-prd/../other/x.mp4",
      "https://storage.googleapis.com/ltxv-api-ephemeral-prd%2F..%2Fother/x.mp4",
      "https://storage.googleapis.com.evil.com/ltxv-api-ephemeral-prd/x.mp4",
      "http://storage.googleapis.com/ltxv-api-ephemeral-prd/x.mp4",
      "https://storage.googleapis.com:8443/ltxv-api-ephemeral-prd/x.mp4",
      "https://169.254.169.254/latest/meta-data",
      undefined,
    ]) {
      const res = mockRes();
      await handler(dl({ url, start: "0", end: "10" }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects bad or oversized ranges", async () => {
    const handler = await load();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const [start, end] of [["-1", "5"], ["10", "5"], ["0", "3000000"], ["a", "5"], [undefined, "5"]]) {
      const res = mockRes();
      await handler(dl({ url: RESULT, start, end }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("maps an expired signed URL to 410 and a range past the end to 416", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => bytes(0, 403)));
    let res = mockRes();
    await handler(dl({ url: RESULT, start: "0", end: "10" }), res);
    expect(res.statusCode).toBe(410);
    vi.stubGlobal("fetch", vi.fn(async () => bytes(0, 416)));
    res = mockRes();
    await handler(dl({ url: RESULT, start: "9000000", end: "9000010" }), res);
    expect(res.statusCode).toBe(416);
  });

  it("returns 502 when a 206 has no total length", async () => {
    const handler = await load();
    vi.stubGlobal("fetch", vi.fn(async () => bytes(10, 206)));
    const res = mockRes();
    await handler(dl({ url: RESULT, start: "0", end: "9" }), res);
    expect(res.statusCode).toBe(502);
  });

  it("still returns 405 for a GET that is neither a poll nor a download", async () => {
    const handler = await load();
    const res = mockRes();
    await handler(req("GET", { query: { provider: "ltx", action: "other" } }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe("POST duration", () => {
  it("accepts 6 to 16 s in steps of 2 and sends it to LTX", async () => {
    for (const duration of [6, 8, 10, 12, 14, 16]) {
      const handler = await load();
      const f = vi.fn(async () => up({ id: "abcdef1234567890", created_at: "now" }, 202));
      vi.stubGlobal("fetch", f);
      const res = mockRes();
      await handler(req("POST", { body: { prompt: "battle", duration } }), res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).duration).toBe(duration);
    }
  });

  it("rejects other durations without calling LTX", async () => {
    const handler = await load();
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const duration of [5, 7, 18, 20, 0, -6, "12", null]) {
      const res = mockRes();
      await handler(req("POST", { body: { prompt: "battle", duration } }), res);
      expect(res.statusCode).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });
});

describe("other methods", () => {
  it.each(["PUT", "DELETE", "PATCH"])("returns 405 for %s", async (m) => {
    const handler = await load();
    const res = mockRes();
    await handler(req(m), res);
    expect(res.statusCode).toBe(405);
  });
});
