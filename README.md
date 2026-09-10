# israeldryer.com

Personal site and résumé. Eleventy v3, Nunjucks templates, YAML content, no client
framework.

```bash
npm install
npm run images     # pull the project screenshots down from the docs sites (once)
npm start          # dev server at localhost:8080, live reload
npm run build      # writes _site/
npm run pdf        # re-render the résumé PDF
npm run og         # re-render the link-preview image
```

`npm start` works before `npm run images` — figures fall back to their remote URLs until
the local files exist.

`npm run pdf` and `npm run og` need playwright, which is deliberately not a dependency
because it downloads a browser:

```bash
npm i -D playwright && npx playwright install chromium
```

## Layout

```
src/
  _data/
    site.yaml        domain, meta description, og tags
    profile.yaml     name, role, contact rail, thesis, intro, "before software"
    projects.yaml    every project — the file edited most
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
      ttkbootstrap.njk      case study, code comparison, theme demo
      mediq.njk             case study, SQL block
  index.njk                 the homepage
  resume.njk                the résumé at /resume/
  assets/css/style.css      shared, including the .btn / .actions row
  assets/css/resume.css     résumé screen styles + the @media print rules
  assets/js/main.js         theme preview + screenshot theme-swap
  images/                   local screenshots (gitignored except books-*)
  static/                   copied to the site root as-is
scripts/
  pdf.js                    renders /resume/ to src/static/israel-dryer-resume.pdf
  og-image.{html,js}        renders src/static/og-image.png at 1200×630
fetch-images.js             downloads every `remote:` figure named in the data
```

## Adding a project

Append to `also` or `web` in `projects.yaml`. Nothing else to touch — the card partial
reads `name, href, right, figures, body, grid, gridClass, tags, stats`, all optional.

A project that warrants a case study gets its own `_includes/sections/<id>.njk`, an entry
under `featured:`, and one `{% include %}` line in `index.njk`. Repeated shapes are
data-driven; one-off arguments are templates.

## Screenshots

A figure names a `base`, and the shortcode resolves `<base>-light.png` and
`<base>-dark.png`, swapping them to match the page theme:

```yaml
- base: bootstack-home-hero
  alt: A bootstack analytics dashboard…
  caption: A dashboard built with bootstack.
  remote:
    light: https://bootstack.org/_images/home-hero-light.png
    dark:  https://bootstack.org/_images/home-hero-dark.png
```

`npm run images` reads those `remote:` blocks straight out of the YAML and downloads each
to the right filename; `npm run images -- --force` re-pulls after a docs rebuild. Once
local, eleventy-img generates 640/1000/1600/original widths in webp plus the original
format, hashes the filenames, and writes `srcset` and `sizes`.

Single images with no light/dark pair use `file:` instead of `base:`. A figure with
neither a local file nor a `remote` emits an HTML comment; one that fails to load in the
browser is replaced by a labelled frame.

## The résumé

`/resume/` and `src/static/israel-dryer-resume.pdf` are the same document, and the PDF is
rendered from the page's own `@media print` block. The Print button on the page produces
identical output by hand.

Employment history comes from `work.yaml` — the same entries the homepage renders, so the
two cannot drift:

- the homepage reads each employer's `body` prose and skips any marked `home: false`
- the résumé reads the `bullets` under each role and shows everything

Everything else the résumé needs lives in `resume.yaml`. Section order is Experience
first, the reverse of the homepage: a résumé is scanned for employers and dates and ATS
parsers weight the first section heaviest, while the portfolio leads with the work
because that is its argument.

Run `npm run build` after `npm run pdf` to copy the file into `_site/`.

### Editing it

**Spacing and type come from variables** on `:root` in `resume.css`, redeclared in the
print block: `--s-section`, `--s-label`, `--s-entry`, `--s-row` for spacing, and
`--t-base` plus `--t-sec` / `--t-org` / `--t-item` / `--t-sub` / `--t-role` / `--t-meta`,
each a `calc()` ratio of the base. Change a gap or a size there, never on an element —
print sets `--t-base` and nothing else, which is what keeps screen and print in the same
proportions.

They sit on `:root` rather than `.resume` because `body` reads `--t-base`, and `body` is
an ancestor of `.resume`. A custom property declared on a descendant is invisible to it,
and the declaration is dropped without an error.

**Hierarchy comes from contrast between levels,** not size alone:

- section headings — mono, uppercase, letterspaced, closed by a full rule
- employer names — display face, largest, closed by a hairline
- role titles and skill-row labels — body face, sentence case, a size down

Two levels sharing a treatment read as one level, however far apart their sizes are.

**Length is tuned to two pages.** The side projects are compressed into a single `also:`
line in `resume.yaml` for that reason; adding a paragraph anywhere will likely push a
third page. Re-run `npm run pdf` and check.

**`break-after: avoid` belongs only on headings.** On a run of siblings it makes the whole
run unbreakable and shunts entire sections to the next page.

The page carries `noindex, nofollow` and `robots.txt` disallows it. Keep both — a public
résumé page is scraped quickly. Deleting the phone entry from `profile.yaml` removes it
from the masthead, the footer and the PDF together.

## The link-preview image

`src/static/og-image.png` is what Slack, LinkedIn and most application portals show when
someone pastes the URL. It is built from `scripts/og-image.html` in the site's own palette
and faces. Edit that file, run `npm run og`, commit the PNG.

The script waits on `document.fonts.ready` before capturing; without it the card renders
in the fallback stack.

## Gotchas

**Async shortcodes do not work inside Nunjucks `{% include %}` or `{% macro %}`.** They
render to nothing, silently, while still doing the work. Image optimisation therefore
happens in `addGlobalData("images", …)` and `{% figure %}` is synchronous, reading from
the cache that fills. Any other image-processing tag should follow the same shape.

**YAML needs quoting more often than expected.** `sizes: (min-width: 700px) …` breaks on
the inner `": "`; `{ n: 61,000+ }` breaks on the comma inside a flow mapping; and
`CPA License #12612` silently loses the number, since an unquoted ` #` starts a comment.
The last kind fails by dropping content rather than erroring.

**Entities in data need `| safe` at the template,** or `Education &amp; Certifications`
renders as `&AMP;`.

## Deploying

`_site/` is a plain static directory — build command `npm run build`, publish directory
`_site`. Point the apex domain at `www`; the canonical URL is the www form, and if both
resolve they are treated as duplicate sites.