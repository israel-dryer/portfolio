#!/usr/bin/env node
/**
 * Render scripts/og-image.html to src/static/og-image.png at 1200x630 — the card
 * Slack, LinkedIn, iMessage and most application portals show when someone pastes
 * your URL. Edit the HTML, run this, commit the PNG.
 *
 *   npm run og
 *
 * Needs playwright, the same optional dependency `npm run pdf` uses:
 *   npm i -D playwright && npx playwright install chromium
 */

const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "og-image.html");

// Two cards from one source, because they are shown in different places:
//   site   — og:image for israeldryer.com, served from the site root
//   github — the repo's Social preview, uploaded in repo Settings > General
const TARGETS = [
  { name: "site",   width: 1200, height: 630,
    out: path.join(__dirname, "..", "src", "static", "og-image.png") },
  { name: "github", width: 1280, height: 640,
    out: path.join(__dirname, "..", "social-preview.png") },
];

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "\n  playwright is not installed, so no image was generated.\n\n" +
      "    npm i -D playwright && npx playwright install chromium\n"
  );
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  try {
    console.log("");
    for (const t of TARGETS) {
      const page = await browser.newPage({
        viewport: { width: t.width, height: t.height },
        deviceScaleFactor: 1,
      });
      // the card sizes itself to the viewport, so each target composes properly
      await page.addStyleTag({ content: `body { width:${t.width}px; height:${t.height}px; }` }).catch(() => {});
      await page.goto("file://" + SRC, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: `body { width:${t.width}px; height:${t.height}px; }` });
      // webfonts must be in before the shot, or it captures the fallback stack
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      fs.mkdirSync(path.dirname(t.out), { recursive: true });
      await page.screenshot({
        path: t.out,
        clip: { x: 0, y: 0, width: t.width, height: t.height },
      });
      const kb = (fs.statSync(t.out).size / 1024).toFixed(0);
      const rel = path.relative(path.join(__dirname, ".."), t.out);
      console.log(`  ${t.name.padEnd(7)} ${rel}  (${t.width}x${t.height}, ${kb} KB)`);
      await page.close();
    }
    console.log("\n  site   → run `npm run build` to copy it into _site/");
    console.log("  github → upload in repo Settings > General > Social preview\n");
  } finally {
    await browser.close();
  }
})();
