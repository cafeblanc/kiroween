/**
 * Shared (server + browser) helpers for the LTX video API.
 * Docs: https://docs.ltx.io/async-jobs.md (job ids / result URLs), https://docs.ltx.io/input-formats.md.
 */

/** Strict job-id format. Upstream ids are hex strings; this also blocks path traversal / query injection. */
export const LTX_JOB_ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidLtxJobId(id: unknown): id is string {
  return typeof id === "string" && LTX_JOB_ID_REGEX.test(id);
}

/**
 * Hosts a finished LTX job may point `result.video_url` at.
 * The docs' example result is https://storage.googleapis.com/... (Google Cloud Storage presigned URL);
 * *.ltx.io is allowed in case LTX serves results from its own domain.
 */
export function isTrustedLtxVideoUrl(input: unknown): input is string {
  if (typeof input !== "string") return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f-\u009f\\]/.test(input)) return false;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase();
  return (
    host === "storage.googleapis.com" ||
    host.endsWith(".storage.googleapis.com") ||
    host === "ltx.io" ||
    host.endsWith(".ltx.io")
  );
}
