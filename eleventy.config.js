const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");
const Image = require("@11ty/eleventy-img");

const IMAGE_DIR = path.join(__dirname, "src", "images");

/**
 * Filled once, before any template renders, by the `images` global data below.
 * Templates then read it through a SYNCHRONOUS shortcode.
 *
 * Why: Nunjucks renders {% include %} and {% macro %} synchronously, so an async
 * shortcode called inside either one resolves too late and emits nothing — the
 * image gets processed, the tag silently disappears. Doing the await at the data
 * stage keeps the template layer sync, which is what lets figures work anywhere.
 */
const CACHE = {};

async function optimise(file) {
  const abs = path.join(IMAGE_DIR, file);
  if (!fs.existsSync(abs)) return null;

  const metadata = await Image(abs, {
    widths: [640, 1000, 1600, null],
    formats: ["webp", "auto"],
    outputDir: "./_site/img/",
    urlPath: "/img/",
  });

  const fallbackFormat = Object.keys(metadata).find((f) => f !== "webp") || "webp";
  const entries = metadata[fallbackFormat];
  const fallback = entries[entries.length - 1];

  return {
    src: fallback.url,
    srcset: (metadata.webp || entries).map((e) => `${e.url} ${e.width}w`).join(", "),
    width: fallback.width,
    height: fallback.height,
  };
}

function esc(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addDataExtension("yaml,yml", (contents) => yaml.load(contents));

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/static": "." });
  eleventyConfig.addWatchTarget("src/assets/");

  // Optimise every local screenshot once, up front.
  eleventyConfig.addGlobalData("images", async () => {
    if (!fs.existsSync(IMAGE_DIR)) return CACHE;
    const files = fs.readdirSync(IMAGE_DIR).filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));
    for (const file of files) {
      CACHE[file] = await optimise(file);
    }
    return CACHE;
  });

  /**
   * {% figure fig %}
   *
   *   base:    "ttkbootstrap-home-hero"   -> <base>-light.png / <base>-dark.png
   *   file:    "books-reader.png"         -> a single image, no theme pair
   *   remote:  {light: url, dark: url}    -> used until the local files exist
   *   ext:     "png" (default) | "webp" | "jpg"
   *   alt / caption / sizes / eager
   *
   * Local files win. Missing ones fall back to `remote`, so the site builds and
   * looks right before `npm run images` has ever been run.
   */
  eleventyConfig.addShortcode("figure", function (fig) {
    if (!fig) return "";

    const ext = fig.ext || "png";
    const lightFile = fig.file || (fig.base ? `${fig.base}-light.${ext}` : null);
    const darkFile = fig.file ? null : fig.base ? `${fig.base}-dark.${ext}` : null;

    const light = lightFile ? CACHE[lightFile] : null;
    const dark = darkFile ? CACHE[darkFile] : null;

    const attrs = ['class="shot"'];
    attrs.push(fig.eager ? 'decoding="async"' : 'loading="lazy" decoding="async"');
    attrs.push(`alt="${esc(fig.alt)}"`);

    if (light) {
      attrs.push(`src="${light.src}"`);
      attrs.push(`srcset="${light.srcset}"`);
      attrs.push(`sizes="${fig.sizes || "(min-width: 880px) 840px, 100vw"}"`);
      attrs.push(`width="${light.width}" height="${light.height}"`);
      attrs.push(`data-light-src="${light.src}" data-light-srcset="${light.srcset}"`);
      if (dark) attrs.push(`data-dark-src="${dark.src}" data-dark-srcset="${dark.srcset}"`);
    } else if (fig.remote && fig.remote.light) {
      attrs.push(`src="${fig.remote.light}"`);
      attrs.push(`data-light-src="${fig.remote.light}"`);
      if (fig.remote.dark) attrs.push(`data-dark-src="${fig.remote.dark}"`);
    } else {
      return `<!-- figure: no local file and no remote fallback for ${esc(fig.base || fig.file)} -->`;
    }

    const caption = fig.caption ? `\n    <figcaption>${fig.caption}</figcaption>` : "";
    return `<figure>\n    <img ${attrs.join(" ")}>${caption}\n  </figure>`;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
