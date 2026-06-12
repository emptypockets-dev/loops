/**
 * Tiny test runner for the pure-logic libraries: bundles each tests/*.test.mjs
 * with esbuild (so they can import .ts modules) and runs it under node.
 * No test framework needed — files use node:assert and throw on failure.
 *
 * Run: npm test
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const esbuild = join(root, "node_modules", ".bin", "esbuild");
const testDir = join(root, "tests");
const outDir = mkdtempSync(join(tmpdir(), "loops-tests-"));

const files = readdirSync(testDir).filter((f) => f.endsWith(".test.mjs"));
if (files.length === 0) {
  console.error("No test files found in tests/");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const outfile = join(outDir, file);
  try {
    execFileSync(
      esbuild,
      [join(testDir, file), "--bundle", "--format=esm", "--platform=node", `--outfile=${outfile}`, "--log-level=error"],
      { stdio: "inherit" }
    );
    execFileSync("node", [outfile], { stdio: "inherit" });
    console.log(`✓ ${file}`);
  } catch {
    console.error(`✗ ${file} FAILED`);
    failed++;
  }
}

rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} test file(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} test file(s) passed.`);
