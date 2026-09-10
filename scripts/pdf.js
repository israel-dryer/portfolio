#!/usr/bin/env node
/**
 * Render the built /resume/ page to src/static/israel-dryer-resume.pdf, using the
 * same @media print rules the browser's own "Save as PDF" uses. One source, one
 * result — the file and the page cannot drift.
 *
 *   npm run build && npm run pdf
 *
 * Playwright is not a dependency of this project (it downloads a browser). Install
 * it only if you want the generated file:
 *
 *   npm i -D playwright && npx playwright install chromium
 *
 * Without it, the Print button on /resume/ still produces the same PDF by hand.
 */

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const SITE = path.join(__dirname, "..", "_site");
const OUT = path.join(__dirname, "..", "src", "static", "israel-dryer-resume.pdf");
const PORT = 8123;

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error(
    "\n  playwright is not installed, so no PDF was generated.\n\n" +
      "    npm i -D playwright && npx playwright install chromium\n\n" +
      "  Or open /resume/ and use the Print button — same output.\n"
  );
  process.exit(1);
}

if (!fs.existsSync(path.join(SITE, "resume", "index.html"))) {
  console.error("\n  _site/resume/index.html not found. Run `npm run build` first.\n");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(SITE, p);
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/resume/`, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.pdf({
      path: OUT,
      format: "Letter",
      printBackground: false,
      margin: { top: "0.55in", bottom: "0.55in", left: "0.55in", right: "0.55in" },
    });
    const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
    console.log(`\n  wrote src/static/israel-dryer-resume.pdf  (${kb} KB)`);
    console.log("  run `npm run build` again to copy it into _site/\n");
  } finally {
    await browser.close();
    server.close();
  }
});
