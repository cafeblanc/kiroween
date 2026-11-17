/**
 * Unit: LTX job client (create -> poll -> download). fetch is mocked; no real API calls, no real waits.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { generateLtxVideo, pickAspect } from "./ltxJobClient";

const noSleep = async () => {};
const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const OK_URL = "https://storage.googleapis.com/ltx-out/job_00000001.mp4";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("generateLtxVideo", () => {
  it("creates a job, polls until completed and returns the trusted URL (toBlob off)", async () => {
    const statuses: string[] = [];
    const f = vi.fn(async (_u: string, init?: RequestInit) => {
      if (init?.method === "POST") return json({ jobId: "job_00000001", status: "queued", kind: "text" });
      return f.mock.calls.length < 4
        ? json({ status: "processing", videoUrl: null })
        : json({ status: "completed", videoUrl: OK_URL });
    });
    vi.stubGlobal("fetch", f);
    const out = await generateLtxVideo({ prompt: "a cell", toBlob: false, sleep: noSleep, onStatus: (s) => statuses.push(s) });
    expect(out).toMatchObject({ success: true, videoUrl: OK_URL, isBlob: false });
    expect(statuses).toEqual(["queued", "processing", "processing", "completed"]);
    const body = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({ prompt: "a cell", provider: "ltx", aspect: "16:9" });
    expect(String(f.mock.calls[1][0])).toBe("/api/generate-video?provider=ltx&kind=text&id=job_00000001");
  });

  it("sends the image and polls with kind=image for image-to-video jobs", async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ jobId: "job_00000002", status: "queued", kind: "image" })
        : json({ status: "completed", videoUrl: OK_URL }),
    );
    vi.stubGlobal("fetch", f);
    await generateLtxVideo({ prompt: "p", image: "data:image/jpeg;base64,AAAA", toBlob: false, sleep: noSleep });
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body)).image).toBe("data:image/jpeg;base64,AAAA");
    expect(String(f.mock.calls[1][0])).toContain("kind=image");
  });

  it("downloads the result into a blob URL when possible", async () => {
    const createUrl = vi.fn(() => "blob:mock-1");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: createUrl }));
    const f = vi.fn(async (u: string, init?: RequestInit) => {
      if (init?.method === "POST") return json({ jobId: "job_00000003", kind: "text" });
      if (String(u).startsWith("https://storage.googleapis.com/")) {
        return { ok: true, status: 200, blob: async () => new Blob(["x"]) } as unknown as Response;
      }
      return json({ status: "completed", videoUrl: OK_URL });
    });
    vi.stubGlobal("fetch", f);
    const out = await generateLtxVideo({ prompt: "p", sleep: noSleep });
    expect(out).toMatchObject({ success: true, videoUrl: "blob:mock-1", remoteUrl: OK_URL, isBlob: true });
  });

  it("falls back to the remote URL when the download fails (CORS / expired)", async () => {
    const f = vi.fn(async (u: string, init?: RequestInit) => {
      if (init?.method === "POST") return json({ jobId: "job_00000004", kind: "text" });
      if (String(u).startsWith("https://storage.googleapis.com/")) throw new TypeError("CORS");
      return json({ status: "completed", videoUrl: OK_URL });
    });
    vi.stubGlobal("fetch", f);
    const out = await generateLtxVideo({ prompt: "p", sleep: noSleep });
    expect(out).toMatchObject({ success: true, videoUrl: OK_URL, isBlob: false });
  });

  it("rejects non-https or credentialed result URLs", async () => {
    for (const bad of ["http://storage.googleapis.com/x.mp4", "https://user:pw@evil.example/x.mp4", "javascript:alert(1)", null]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_u: string, init?: RequestInit) =>
          init?.method === "POST" ? json({ jobId: "job_00000005", kind: "text" }) : json({ status: "completed", videoUrl: bad }),
        ),
      );
      const out = await generateLtxVideo({ prompt: "p", toBlob: false, sleep: noSleep });
      expect(out.success).toBe(false);
    }
  });

  it("reports a failed job", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) =>
        init?.method === "POST" ? json({ jobId: "job_00000006", kind: "text" }) : json({ status: "failed", error: "filtered" }),
      ),
    );
    const out = await generateLtxVideo({ prompt: "p", sleep: noSleep });
    expect(out).toMatchObject({ success: false, error: "filtered", code: "FAILED" });
  });

  it("maps create errors to codes", async () => {
    const cases: Array<[number, string, string]> = [
      [400, "No LTX API key configured (LTXV_API_KEY (or LTX_API_KEY)).", "NO_API_KEY"],
      [429, "Daily LTX video limit reached", "DAILY_LIMIT"],
      [429, "Rate limit exceeded", "RATE_LIMITED"],
      [402, "LTX account has insufficient credits.", "INSUFFICIENT_CREDITS"],
    ];
    for (const [status, error, code] of cases) {
      vi.stubGlobal("fetch", vi.fn(async () => json({ error }, status)));
      expect(await generateLtxVideo({ prompt: "p", sleep: noSleep })).toMatchObject({ success: false, code });
    }
  });

  it("rejects an invalid job id from the server", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ jobId: "../etc", kind: "text" })));
    expect((await generateLtxVideo({ prompt: "p", sleep: noSleep })).success).toBe(false);
  });

  it("times out when the job never finishes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) =>
        init?.method === "POST" ? json({ jobId: "job_00000007", kind: "text" }) : json({ status: "processing" }),
      ),
    );
    const out = await generateLtxVideo({ prompt: "p", sleep: noSleep, maxWaitMs: 30 });
    expect(out).toMatchObject({ success: false, code: "TIMEOUT" });
  });

  it("tolerates transient poll errors but gives up after three in a row", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) =>
        init?.method === "POST" ? json({ jobId: "job_00000008", kind: "text" }) : json({ error: "x" }, 502),
      ),
    );
    expect((await generateLtxVideo({ prompt: "p", sleep: noSleep })).success).toBe(false);
  });

  it("stops on abort", async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_u: string, init?: RequestInit) =>
        init?.method === "POST" ? json({ jobId: "job_00000009", kind: "text" }) : json({ status: "processing" }),
      ),
    );
    const sleep = async () => {
      ctrl.abort();
      throw new DOMException("Aborted", "AbortError");
    };
    expect(await generateLtxVideo({ prompt: "p", signal: ctrl.signal, sleep })).toMatchObject({ success: false, code: "ABORTED" });
  });
});

describe("pickAspect", () => {
  it("buckets by ratio", () => {
    expect(pickAspect(1920, 1080)).toBe("16:9");
    expect(pickAspect(1080, 1920)).toBe("9:16");
    expect(pickAspect(1000, 1000)).toBe("1:1");
  });
});
