// Kiro hook helper: warns when a saved file contains something that looks like a secret.
// Usage: node scripts/hooks/scan-secrets.mjs <file>   (Kiro passes {{filePath}})
// Exit 0 = clean, exit 1 = possible secret found (reported on stderr, value masked).
import { readFileSync, existsSync, statSync } from "node:fs";

const file = process.argv[2];
if (!file || !existsSync(file) || statSync(file).size > 2_000_000) process.exit(0);
if (/(^|[\\/])\.env(\.[\w-]+)?$/.test(file) && !file.endsWith(".env.example")) process.exit(0); // gitignored env files may hold keys

const PATTERNS = [
  ["HuggingFace token", /\bhf_[A-Za-z0-9]{30,}\b/],
  ["AWS access key id", /\b(AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["AWS secret key assignment", /aws_secret_access_key\s*[=:]\s*["']?[A-Za-z0-9/+]{40}/i],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9_-]{32,}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

const text = readFileSync(file, "utf8");
const hits = [];
text.split(/\r?\n/).forEach((line, i) => {
  for (const [label, re] of PATTERNS) {
    const m = re.exec(line);
    if (m) hits.push(`${file}:${i + 1} ${label} (${m[0].slice(0, 6)}...)`);
  }
});

if (hits.length) {
  console.error("Possible secret in a saved file. Move it to .env.local / Vercel env and never commit it:");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
