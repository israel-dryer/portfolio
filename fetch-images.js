#!/usr/bin/env node
/**
 * Pull every screenshot referenced by a `remote:` block in the data files down
 * into src/images/, named the way the {% figure %} shortcode expects.
 *
 *   npm run images            # download anything missing
 *   npm run images -- --force # re-download everything
 *
 * Once a file is local, eleventy-img takes over: responsive widths, webp, and
 * hashed filenames. The remote URL stays in the YAML as the source of record,
 * so re-running this picks up any screenshot the docs sites have refreshed.
 */

const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const DATA_DIR = path.join(__dirname, "src", "_data");
const IMAGE_DIR = path.join(__dirname, "src", "images");
const FORCE = process.argv.includes("--force");

/** Walk any nested structure and collect every {remote, base|file} figure. */
function collect(node, found = []) {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, found));
  } else if (node && typeof node === "object") {
    if (node.remote && (node.base || node.file)) found.push(node);
    Object.values(node).forEach((v) => collect(v, found));
  }
  return found;
}

/** Figure -> [{url, filename}] */
function targets(fig) {
  const ext = fig.ext || "png";
  if (fig.file) {
    return fig.remote.light ? [{ url: fig.remote.light, filename: fig.file }] : [];
  }
  const out = [];
  if (fig.remote.light) out.push({ url: fig.remote.light, filename: `${fig.base}-light.${ext}` });
  if (fig.remote.dark) out.push({ url: fig.remote.dark, filename: `${fig.base}-dark.${ext}` });
  return out;
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error(`suspiciously small (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async function main() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const figures = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => collect(yaml.load(fs.readFileSync(path.join(DATA_DIR, f), "utf8"))));

  const jobs = figures.flatMap(targets);
  const seen = new Set();
  let got = 0,
    skipped = 0,
    failed = 0;

  for (const job of jobs) {
    if (seen.has(job.filename)) continue;
    seen.add(job.filename);

    const dest = path.join(IMAGE_DIR, job.filename);
    if (fs.existsSync(dest) && !FORCE) {
      skipped++;
      continue;
    }

    try {
      const bytes = await download(job.url, dest);
      console.log(`  ✓ ${job.filename}  (${(bytes / 1024).toFixed(0)} KB)`);
      got++;
    } catch (err) {
      console.error(`  ✗ ${job.filename}  ${err.message}\n      ${job.url}`);
      failed++;
    }
  }

  console.log(
    `\n${got} downloaded, ${skipped} already present, ${failed} failed` +
      (skipped && !FORCE ? "  —  use --force to refresh" : "")
  );
  if (failed) process.exitCode = 1;
})();
