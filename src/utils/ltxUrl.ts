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
 * Accepts a finished LTX job's `result.video_url`.
 * The URL comes from the authenticated LTX API response (fetched server-side with our key), and the docs only show
 * an example host (https://docs.ltx.io/async-jobs.md "Result format"). A fixed host allowlist rejected real results,
 * so any plain https URL is accepted; credentials, non-default ports and control characters are still rejected.
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
  return u.hostname.length > 0;
}
