// Kiro hook helper: a newly created strategy/business document must be gitignored (AGENTS.md rule 5).
// Usage: node scripts/hooks/check-private-doc.mjs <file>   (Kiro passes {{filePath}})
// Exit 0 = ignored or not a strategy doc, exit 1 = it would be published.
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const file = process.argv[2];
if (!file) process.exit(0);
if (!/(BLUEPRINT|ARCHITECTURE|STRATEGY|BUSINESS|COMMERCIAL|ROADMAP)/i.test(basename(file))) process.exit(0);

try {
  execFileSync("git", ["check-ignore", "-q", "--", file], { stdio: "ignore" });
  process.exit(0); // ignored: stays local
} catch {
  console.error(`${file} is a private strategy document but is NOT gitignored. Add a pattern to .gitignore before committing.`);
  process.exit(1);
}
