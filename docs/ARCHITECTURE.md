# Plantipedia System Architecture (v3.2)

Plantipedia is a zero-bundler, multi-page ES6+ static web platform engineered with clean separation across configuration, botanical datasets, core runtime compilers, domain engines, page controllers, and modular stylesheets.

---

## 1. Layered Directory Architecture

- **`config/`** — Declarative platform manifests for environment flags, routes, jewel-tone card tokens, navbar dropdown trees, and footer credits without modifying application code.
- **`data/`** — Three-tier static botanical data lake:
  - `data/index/` — Master 50-species bilingual search index, interactive glossary, featured flora, taxonomy highlights, trivia, and route-specific page payloads (`data/index/pages/`).
  - `data/monographs/` — 50 individual 15-chapter (`00` Overview + `01–14` scholarly chapters) scientific monographs, loaded strictly on demand.
  - `data/phenology/` — Six-season Bengali *Shororitu* ecological phenology dataset.
- **`src/core/`** — Foundational runtime infrastructure:
  - `src/core/bootstrap/` — Page hydration entry point, section mount registry, subpath-safe path/route resolver, and reactive in-memory state.
  - `src/core/compilers/` — Autonomous navbar, bilingual search, mobile drawer, compact/full footer compiler, layout shell hydrator, and smart 404 recovery controller.
  - `src/core/telemetry/` — GSAP + ScrollTrigger scroll choreography, numerical biome-aware telemetry extraction, and cultivation gauge meters.
- **`src/engines/`** — Domain-specific processing engines:
  - `src/engines/search/` — Bilingual (`EN / বাংলা / Latin`) instant autocomplete and navigation handlers.
  - `src/engines/global-server/` — Centralized validated dataset fetcher and the zero-key parallel **Global Botanical Server** client (`GBIF Backbone + MediaWiki + Wikidata + iNaturalist + EOL + Open Tree of Life`) featuring automated cross-script taxon alignment, mandatory 3-tier translation fallback, junk-section filtering, 3-tier Botanical Image Guard, retry resilience, and manual abort support across 1,600,000+ (`1.6M+`) flora taxa.
  - `src/engines/comparator/` — 10-second 4-stage Comparison Synthesis pipeline and progress telemetry overlay with strict per-slot input-language locking.
  - `src/engines/citation/` — APA / MLA / BibTeX citation generator and interactive botanical glossary auto-tooltip engine.
- **`src/modules/`** — Dedicated route controllers (`src/modules/pages/`) and shared helpers (`src/modules/utils/`).
- **`styles/`** — Layered CSS design system split into `base/`, `components/`, `pages/`, `print/`, and `tailwind/` runtime utilities.
- **`tools/`** — Automated catalog integrity, sitemap generation, relative-link validation, and image-quota audit scripts.

---

## 2. Routing & Subpath Resolution

All public routes use clean extensionless directory entry points (`./`, `./species/`, `./plant/`, `./plant/live/`, `./taxonomy/`, `./seasons/`, `./compare/`, `./compare/result/`, `./services/`, `./sources/`, `./roadmap/`, `./identify/`, `./qr-studio/`, `./install/`, `./404.html`). Every relative asset, stylesheet, ES module import, and `fetch()` endpoint resolves via `import.meta.url` and `resolveRootPath()` so the application operates identically from both root `/` deployments and nested `/plantipedia/` subpath mounts.

---

## 3. Data Fetching & Caching Lifecycle

1. **Navbar & Shell Bootstrap:** The navbar and footer compilers load `./config/navbar.json`, `./config/footer.json`, and `./data/index/species-index.json` concurrently with `sessionStorage` caching and inline structural fallbacks.
2. **On-Demand Monograph Streaming:** Individual plant views download only the active specimen JSON from `./data/monographs/`, keeping initial page payloads lightweight.
3. **Federated Global Botanical Server Pipeline:** Queries outside the 50 curated monographs invoke the parallel 6-database Global Botanical Server (`GBIF Backbone + MediaWiki + Wikidata + iNaturalist + EOL + Open Tree of Life`), synthesizing bilingual names, taxonomic ranks, ecological telemetry, and deduplicated photographs into Plantipedia's unified 15-chapter monograph format.
4. **Offline PWA Cache:** `sw.js` and `manifest.webmanifest` cache core shells, modular stylesheets, ES6+ modules, and configuration manifests using network-first strategies for dynamic data and cache-first strategies for static media.

---

## 4. SEO, Structured Metadata & Academic Print Sheets

- **Dynamic JSON-LD:** `src/modules/utils/seo.js` injects Schema.org `EducationalOrganization`, `WebSite`, `CollectionPage`, `Dataset`, `ScholarlyArticle`, `Taxon`, and `BreadcrumbList` graphs tailored to the active species, taxonomic family, season, or comparison pair.
- **Academic Field Sheets:** `styles/print/` strips navigation chrome, converts glassmorphic surfaces to high-contrast ink on A4 paper, enforces page-break avoidance, and preserves telemetry charts and taxonomic tables for print/PDF export.
