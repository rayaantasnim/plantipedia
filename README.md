<p align="center">
  <a href="./">
    <img
      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJv6NpfC3s6wxxbvtd2vvSuxe4oumEyhdWJV1VN0f0Fw&s=10"
      alt="Plantipedia Botanical Banner — Lush Canopy Foliage and Vascular Flora Specimen"
      width="100%"
    />
  </a>
</p>

<div align="center">

# 🌿 Plantipedia — Digital Botanical Encyclopedia & Worldwide Flora Archive

**A bilingual (`EN / বাংলা`) botanical knowledge platform uniting 50 deeply curated 15-chapter monographs with a 6-source federated, zero-key Global Botanical Server connecting 1,600,000+ (1.6M+) worldwide vascular plant and tree taxa.**

[![Architecture](https://img.shields.io/badge/Architecture-Zero--Bundler%20ES6%2B-10b981?style=flat-square)](./docs/ARCHITECTURE.md)
[![Curated Monographs](https://img.shields.io/badge/Curated%20Monographs-50%20Species%20%C2%B7%2015%20Chapters-22d3ee?style=flat-square)](./species/)
[![Global Flora](https://img.shields.io/badge/Global%20Flora-1%2C600%2C000%2B%20(1.6M%2B)%20Taxa-2dd4bf?style=flat-square)](./plant/live/)
[![PWA Build](https://img.shields.io/badge/PWA-Offline%20Ready%20SW-34d399?style=flat-square)](./install/)
[![License](https://img.shields.io/badge/License-Open%20Access%20MIT-fbbf24?style=flat-square)](./sources/)

</div>

---

## Executive Overview & Key Capabilities

Plantipedia bridges regional South Asian ethnobotanical scholarship with real-time global biodiversity registries in a museum-grade, offline-capable static web architecture:

- **50 Curated 15-Chapter Bilingual (`EN / বাংলা`) Monographs ([`./species/`](./species/) & [`./plant/`](./plant/)):** Structured scientific dossiers spanning Chapters `00–14` (taxonomic lineage, morphology, foliar architecture, floral biology, fruit ecology, biogeography, phylogeny, phenology, phytochemistry, ethnobotany, cultivation telemetry, pathology, and field identification keys) with APA/MLA/BibTeX citations and interactive glossary tooltips.
- **Federated Global Botanical Server ([`./plant/live/`](./plant/live/)):** Parallel zero-key 6-database synthesis across **1,600,000+ (`1.6M+`) worldwide vascular plant and tree taxa** resolving bilingual (`EN / বাংলা / Latin`) queries into full 15-chapter comparative dossiers with verified field photography and mandatory 3-tier translation fallback.
- **Split Specimen Comparator ([`./compare/`](./compare/) & [`./compare/result/`](./compare/result/)):** Side-by-side 15-chapter botanical comparison matrix aligning curated local monographs and live Global Botanical Server taxa with cross-script bilingual headers, numerical telemetry bars, and inline error recovery.
- **6-Season *Shororitu* Phenology Calendar ([`./seasons/`](./seasons/)):** Ecological flowering and fruiting cycles mapped across Bengal's six botanical seasons (*গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত*) with paginated specimen views.
- **Taxonomic Lineage Explorer ([`./taxonomy/`](./taxonomy/)):** Clade-filterable phylogenetic hierarchy charting 34 documented plant families in descending specimen density.
- **Sources & Scientific References ([`./sources/`](./sources/)):** Transparent attribution of authoritative biodiversity databases, primary botanical literature, image provenance, and editorial curation protocols.
- **11-Section Capabilities Suite ([`./services/`](./services/)):** Interactive Map Matrix overlay, capability filters, telemetry visualizations, and A4 field-sheet print previews.

---

## Comprehensive Technology Stack

| Layer | Technology & Implementation |
| :--- | :--- |
| **Semantic Structure** | HTML5 Semantic Markup (`<header>`, `<main>`, `<article>`, `<figure>`, `<aside>`, `<footer>`) with clean extensionless directory routes and ARIA landmark accessibility |
| **Styling & Print Media** | Modular CSS3 (`styles/base/`, `styles/components/`, `styles/pages/`) with `text-align: justify;` monograph prose, Tailwind token utilities, and A4 Print Media Queries (`styles/print/`) |
| **Application Runtime** | Vanilla ES6+ JavaScript Modules with zero build-step bundler overhead and `import.meta.url`-anchored subpath safety (`/` and `/plantipedia/`) |
| **Motion & Telemetry** | GSAP 3 + ScrollTrigger scroll choreography, biome-aware soil pH & thermal meters, reading progress indicator, and IntersectionObserver offline fallback |
| **Federated Botanical APIs** | Zero-key parallel client synthesizing **GBIF Backbone**, **MediaWiki**, **Wikidata**, **iNaturalist**, **EOL**, and **Open Tree of Life** via `Promise.allSettled` |
| **SEO & Structured Data** | Dynamic Schema.org `Taxon`, `ScholarlyArticle`, `CollectionPage`, `Dataset`, `WebSite`, and `BreadcrumbList` JSON-LD graphs |
| **Offline PWA Layer** | Network-first Service Worker (`sw.js`) & W3C Web App Manifest (`manifest.webmanifest`) precaching core shells, modules, styles, and datasets |

---

## Architectural Evolution (`v1.0 → v4.3`)

| Version | Milestone | Summary |
| :--- | :--- | :--- |
| **`v1.0`** | **Foundational Herbarium** | 6 static HTML plant sheets establishing Plantipedia's emerald-obsidian editorial typography and Linnaean reference tables. |
| **`v2.0`** | **JSON Engine & Bilingual Search** | 30 curated monographs decoupled into JSON datasets with instant `EN / বাংলা / Latin` fuzzy search. |
| **`v3.0`** | **Global Server & Comparator** | Expanded to 50 local monographs, zero-key Global Botanical Server uplink, and Split Specimen Comparator. |
| **`v3.1`** | **15-Chapter Archive & Visual Suite** | Upgraded all 50 monographs to 15 structured chapters (`00–14`), unified 4-group navbar, paginated Taxonomy/Seasons, and 11-Section Services & Sources portals. |
| **`v3.2`** *(Current)* | **6-Source Federated Engine & Bilingual Lock** | Concurrent `GBIF Backbone + MediaWiki + Wikidata + iNaturalist + EOL + Open Tree of Life` synthesis across **1.6M+** (`1,600,000+`) taxa, mandatory 3-tier auto-translation, 10s Split Comparator with per-slot language lock, and 3-tier Botanical Image Guard. |
| **`v4.0`** *(Scheduled)* | **Installable Offline PWA App** | Dedicated Offline Monograph Vault, silent background sync, and guided desktop/Android/iOS install flow ([`./install/`](./install/)). |
| **`v4.1`** *(Scheduled)* | **Garden QR Tag Studio** | Printable waterproof botanical nameplates and QR arboretum plaques ([`./qr-studio/`](./qr-studio/)). |
| **`v4.2`** *(Scheduled)* | **Botanical Akinator** | 20-question dichotomous taxonomic key with live confidence scoring ([`./identify/`](./identify/)). |
| **`v4.3`** *(Scheduled)* | **Ecosystem & Telemetry Polish** | Cross-biome analytics, portable herbarium study exports, and WCAG AAA accessibility refinement ([`./roadmap/`](./roadmap/)). |

---

## Repository Directory Architecture

```text
plantipedia/
├── assets/                     # Static visual assets and vector emblems
│   └── images/                 # Brand floral emblem and botanical fallback plates
├── compare/                    # Split Specimen Comparator entry route
│   └── result/                 # 15-chapter side-by-side comparison matrix route
├── config/                     # Navigation schemas, palette tokens, routes, and flags
├── data/                       # Three-tier botanical JSON data lake
│   ├── index/                  # Master species index, glossary, taxonomy, and trivia
│   │   └── pages/              # Route-specific copy, telemetry, and SEO payloads
│   ├── monographs/             # 50 curated 15-chapter botanical monograph datasets
│   └── phenology/              # Bengali 6-season (Shororitu) ecological mappings
├── docs/                       # System architecture notes and JSON schema guides
├── identify/                   # Botanical Akinator dichotomous key preview (v4.2)
├── install/                    # Offline PWA Vault installation guide (v4.0)
├── plant/                      # Curated 15-chapter specimen monograph route
│   └── live/                   # Federated Global Botanical Server live gateway route
├── qr-studio/                  # Garden QR Tag Studio plaque generator preview (v4.1)
├── roadmap/                    # Release progression timeline and milestone tracker
├── seasons/                    # 6-Season Shororitu phenological calendar route
├── services/                   # 11-Section Capabilities & Map Matrix route
├── sources/                    # Scientific references, APIs, and provenance route
├── species/                    # Filterable 50-species bilingual directory atlas route
├── src/                        # Modular Vanilla ES6+ application runtime
│   ├── core/                   # Foundational bootstrap, UI compilers, and telemetry
│   │   ├── bootstrap/          # Page initialization, state store, and route hydration
│   │   ├── compilers/          # Shared navbar, footer, shell, and 404 recovery UI
│   │   └── telemetry/          # Biome-aware stat parsers, meters, and GSAP motion
│   ├── engines/                # Specialized botanical and scholarly processing engines
│   │   ├── citation/           # APA/MLA/BibTeX generator and glossary auto-tooltips
│   │   ├── comparator/         # 3-stage comparison synthesis pipeline and overlay
│   │   ├── global-server/      # Multi-source federated client, parser, and cache
│   │   └── search/             # Bilingual instant autocomplete and navigation search
│   └── modules/                # Route controllers and reusable presentation helpers
│       ├── pages/              # Dedicated per-route ES6+ page view controllers
│       └── utils/              # DOM builders, herbarium storage, and Schema.org SEO
├── styles/                     # Layered modular CSS3 and print stylesheets
│   ├── base/                   # Design tokens, resets, justified typography, grid canvas
│   ├── components/             # Navbar, glassmorphic buttons, cards, overlays, footer
│   ├── pages/                  # Route-specific layouts and responsive media rules
│   ├── print/                  # High-contrast A4 academic field-sheet print styles
│   └── tailwind/               # Runtime Tailwind utility tokens and layer loaders
├── taxonomy/                   # Interactive 34-family phylogenetic lineage explorer
└── tools/                      # Catalog integrity, sitemap, and image-quota audits
```

---

## Verification & Local Development

Run static syntax, JSON schema, relative-path, and image-quota verification locally:

```bash
npm run lint
npm run audit
npm run dev
```

---

## Credits & Attribution

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Architecture, UI & UX Collaboration:** **Rayaan Tasnim**
- **Special Thanks:** **IDAI Universe**
- **Powered by:** **Olympiad Edge**

*Educational & Open-Access Disclaimer: All monographs, taxonomic classifications, phytochemical summaries, Global Botanical Server records, and curated photography in Plantipedia are provided strictly for non-commercial educational and botanical reference purposes and do not constitute clinical, agricultural, or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
[Home](./) · [Species Atlas](./species/) · [Global Botanical Server](./plant/live/) · [Comparator](./compare/) · [Architecture Docs](./docs/ARCHITECTURE.md)

</div>
