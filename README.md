# israel-dryer.com

Personal site. Eleventy v3, Nunjucks templates, YAML content. No client framework.

```bash
npm install
npm run images     # pull the screenshots down from the docs sites (once)
npm start          # dev server at localhost:8080, live reload
npm run build      # writes _site/
npm run pdf        # re-render the résumé PDF (needs playwright, see below)
npm run og         # re-render the link-preview image
```

`npm start` works before `npm run images` — figures fall back to the remote URLs
until the local files exist.

---

## Where things live

```
src/
  _data/
    site.yaml        domain, meta description, og tags
    profile.yaml     name, role, contact rail, thesis, intro, "before software"
    projects.yaml    every project — the file you will edit most
    work.yaml        employers and role history — shared by both pages
    resume.yaml      everything the résumé needs that the homepage does not
    themes.yaml      which theme buttons appear in the bootstyle preview
  _includes/
    layouts/base.njk        the HTML document
    macros.njk              panelBar, stats, tags, caseStudy, tenure, contactRail
    partials/
      project-card.njk      renders anything in `also` or `web`
      theme-demo.njk        the live bootstyle preview
    sections/
      ttkbootstrap.njk      bespoke — case study, code comparison, demo
      mediq.njk             bespoke — case study, SQL block
  assets/css/style.css
  assets/js/main.js         theme preview + screenshot theme-swap
  images/                   local screenshots (gitignored except books-*)
  static/                   dropped at the site root as-is — put og-image.png here
```

## Adding a project

Append to `also` or `web` in `projects.yaml`. Nothing else to touch — the card
partial reads `name, href, right, figures, body, grid, gridClass, tags, stats`,
and every one of those is optional.

A project that deserves a case study gets its own `_includes/sections/<id>.njk`
plus an entry under `featured:`, then one `{% include %}` line in `index.njk`.
That split is deliberate: repeated shapes are data-driven, one-off arguments are
templates. Forcing the ttkbootstrap section into the card schema would mean
inventing config keys for a code comparison that appears exactly once.

## The résumé

`/resume/` and `src/static/israel-dryer-resume.pdf` are the same document. Employment
history comes from `work.yaml` — the *same* entries the homepage renders — so the two
pages cannot drift:

- the homepage reads each employer's `body` prose and skips any marked `home: false`
- the résumé reads the `bullets` under each role and shows everything

Everything else the résumé needs — summary, skills, education, the open-source and
project write-ups — lives in `resume.yaml`.

Both pages carry a button row under the contact rail — Résumé on the homepage, and
Download PDF / Print / Portfolio on the résumé. It is a separate element rather than an
extra item in the contact rail, because navigation and contact details are different
kinds of fact and a rail that mixes them reads as two lists.

Section order is Experience first, then open source and projects — the reverse of the
homepage. A résumé is scanned for employers and dates, and ATS parsers weight the first
section heaviest; the portfolio leads with the work because that is its argument. To
reorder, move the `<section class="r-sec">` blocks in `resume.njk`.

The PDF is produced from the page's own `@media print` block, so there is one source
and one result. Two ways to get it:

- **Print button on /resume/** — the browser's Save as PDF, always current, no tooling
- **`npm run pdf`** — writes `src/static/israel-dryer-resume.pdf` so you can link a real
  file. Needs playwright, which is deliberately *not* a dependency because it downloads
  a browser: `npm i -D playwright && npx playwright install chromium`

Run `npm run build` after `npm run pdf` to copy the file into `_site/`.

The page carries `noindex, nofollow`. Keep it that way — a public résumé page is scraped
within days, and the phone number is what attracts the worst of it. If you would rather
the number not be in the HTML at all, delete that entry from `profile.yaml`; it comes out
of the masthead, the footer, and the PDF together.

Spacing and type both come from variables declared once on `:root` in `resume.css`, and
redeclared in the print block:

- **spacing** — `--s-section`, `--s-label`, `--s-entry`, `--s-row`
- **type** — `--t-base`, and `--t-sec` / `--t-org` / `--t-item` / `--t-sub` / `--t-role`
  / `--t-meta`, each a `calc()` ratio of the base

Change a gap or a size *there*, not on an element. Two reasons this matters. Margins
stacking against each other is what made every section keep its own rhythm. And picking
print sizes in points independently of the screen sizes in pixels is what made the
hierarchy look different on paper — the levels had been re-chosen rather than rescaled.
Print now sets `--t-base` and nothing else, so every step between levels holds.

They live on `:root` rather than `.resume` deliberately: `body` sets its font size from
`--t-base`, and `body` is an *ancestor* of `.resume`, so it cannot read a variable
declared there. That failure is silent — the declaration is simply dropped.

Hierarchy is carried by *contrast between levels*, not by size alone:

- section headings — mono, uppercase, letterspaced, closed by a full rule
- employer names — display face, largest, closed by a hairline
- role titles and skill-row labels — body face, sentence case, a size down

Two levels that share a treatment read as one level. That is what went wrong twice here:
employer and role were both bold a half-point apart, and the skills rows were labelled in
the same mono uppercase as the section heading above them.

Two more things to know if you edit it:

- **Length is tuned to two pages.** The side projects are compressed into one `also:` line
  in `resume.yaml` for that reason. Adding a paragraph anywhere will likely push a third
  page — re-run `npm run pdf` and check.
- **`break-after: avoid` is only on headings.** Putting it on a long run of siblings makes
  the whole run unbreakable and shunts entire sections onto the next page. That is what
  produced a third page holding four lines of education.

## The link-preview image

`src/static/og-image.png` is what Slack, LinkedIn, iMessage and most application portals
show when someone pastes your URL — often the first thing a hiring reader sees. It is
built from `scripts/og-image.html`, which uses the site's own palette and faces so the
card and the page look like one thing. Edit that file, run `npm run og`, commit the PNG.

Same optional playwright dependency as `npm run pdf`. The script waits on
`document.fonts.ready` before capturing — without that it shoots the fallback stack and
the card comes out in the wrong typeface.

## Screenshots

Figures name a `base`, and the shortcode resolves `<base>-light.png` and
`<base>-dark.png`. That convention already matches how your docs sites export
them, so nothing needs renaming.

```yaml
- base: bootstack-home-hero
  alt: A bootstack analytics dashboard…
  caption: A dashboard built with bootstack.
  remote:
    light: https://bootstack.org/_images/home-hero-light.png
    dark:  https://bootstack.org/_images/home-hero-dark.png
```

`npm run images` reads those `remote` blocks straight out of the YAML and
downloads each one to the right filename — add a project, rerun it, done. Use
`npm run images -- --force` to re-pull after a docs rebuild.

Once local, eleventy-img generates 640/1000/1600/original widths in webp plus the
original format, hashes the filenames, and writes `srcset` + `sizes`. Single
images (no light/dark pair) use `file:` instead of `base:`.

A figure whose file is missing *and* has no `remote` emits an HTML comment rather
than a broken image. One that fails to load in the browser is replaced by a
labelled frame — that is what you are seeing if a screenshot shows a dashed box.

## Two things that will bite

**Async shortcodes do not work inside Nunjucks `{% include %}` or `{% macro %}`.**
They render to nothing, silently, while still doing the work. That is why image
optimisation happens in `addGlobalData("images", …)` and `{% figure %}` itself is
synchronous, reading from a cache the data stage filled. If you add another
image-processing tag, follow the same shape.

**YAML needs quoting more often than you expect.** `sizes: (min-width: 700px) …`
breaks on the inner `": "`; `{ n: 61,000+ }` breaks on the comma inside a flow mapping;
and `CPA License #12612` silently loses the number, because an unquoted ` #` starts a
comment. All three are quoted already — the third one is the dangerous kind, since it
fails by quietly dropping content rather than by erroring.

**Entities in data need `| safe` at the template.** A label like `Education &amp;
Certifications` renders as `&AMP;` if the template escapes it again.

## Before it goes live

- point apex `israeldryer.com` at `www` — the canonical URL is the www form, and if both
  resolve, search engines split the ranking between two identical sites
- decide whether `(704) 379-2454` belongs on a public page (delete that entry in
  `profile.yaml` to drop it from the masthead, the footer, and the résumé together)
- `REPLACE-WITH-YOUR-DOMAIN` also prints in the résumé's contact line

## Deploying

`_site/` is a plain static directory. Netlify, Cloudflare Pages, GitHub Pages,
S3 — build command `npm run build`, publish directory `_site`.
