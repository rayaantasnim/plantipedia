<p align="center">
  <a href="https://plantipedia.rayaantasnim.workers.dev/">
    <img
      src="https://images.pexels.com/photos/16987747/pexels-photo-16987747.jpeg?auto=compress&cs=tinysrgb&w=1200"
      alt="Plantipedia — Digital Botanical Encyclopedia & Worldwide Flora Archive"
      width="100%"
    />
  </a>
</p>

<div align="center">

# 🌿 Plantipedia — Digital Botanical Encyclopedia & Worldwide Flora Archive

**Plantipedia Version 3.1** unites **50 deeply curated 15-chapter local monographs** across **34 botanical families** with a live zero-key **Global Botanical Server** uplink connecting **400,000+ worldwide vascular plants and tree species**, bilingual (`EN / বাংলা`) telemetry, dynamic taxonomic lineage, and print-ready field sheets.

[![Live Production](https://img.shields.io/badge/Live%20Site-workers.dev-10b981?style=flat-square)](https://plantipedia.rayaantasnim.workers.dev/)
[![Release v3.1.0](https://img.shields.io/badge/Version-3.1.0-34d399?style=flat-square)](https://plantipedia.rayaantasnim.workers.dev/roadmap/)
[![Curated Monographs](https://img.shields.io/badge/Local%20Monographs-50%2B%20Curated%20Species-22d3ee?style=flat-square)](https://plantipedia.rayaantasnim.workers.dev/species/)
[![Global Flora Server](https://img.shields.io/badge/Global%20Flora-400%2C000%2B%20Species-2dd4bf?style=flat-square)](https://plantipedia.rayaantasnim.workers.dev/plant/live/)
[![Open Access](https://img.shields.io/badge/License-Open%20Access%20MIT-fbbf24?style=flat-square)](https://plantipedia.rayaantasnim.workers.dev/services/)

</div>

---

## Core Architecture & Features

- **50 Curated 15-Chapter Local Monographs (`/plant/`):** Peer-verified scientific entries spanning morphology, taxonomy, native habitat, ecology, ethnobotany, phytochemistry, cultivation telemetry, GSAP soil pH & thermal meters, interactive glossary tooltips, and APA/MLA/BibTeX citations.
- **Zero-Key Global Botanical Server (`/plant/live/`):** Real-time worldwide flora gateway connecting **400,000+ worldwide vascular plants and trees** with automated plant validation, English and বাংলা cross-referencing, and print-ready field sheets.
- **Taxonomic Lineage & 6-Season *Shororitu* Calendar (`/taxonomy/` & `/seasons/`):** Interactive phylogenetic clade filtering, descending family species distribution, paginated 10-per-page family cards, and Bengal's six botanical seasons (*গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত*) with 5-per-page specimen pagination.
- **Split Specimen Comparator (`/compare/` & `/compare/result/`):** Edge-to-edge dual-pane specimen comparison supporting both curated local monographs and live Global Botanical Server fetches with a 3-stage synthesis pipeline.
- **11-Section Services & Capabilities Suite (`/services/`):** Full-screen Map Matrix navigation overlay, capability filter grid, interactive taxonomy & seasonal charts, screen-vs-print field sheet preview, and Section 11 Worldwide Botanical Scale showcase.

---

## Tech Stack

| Layer | Technology & Implementation |
| :--- | :--- |
| **Frontend Architecture** | Vanilla ES6+ JavaScript Modules (Zero-Bundler Clean-URL Static Architecture) |
| **Styling & Design System** | Custom Botanical Luxury CSS3 + Tailwind Layer Tokens (`variables.css`, `components.css`, `services.css`) |
| **Motion & Telemetry** | GSAP 3 + ScrollTrigger Scroll Choreography & Offline IntersectionObserver Fallback |
| **Live Global Uplink** | Zero-Key Global Botanical Server Engine & Global Flora Index Resolver |
| **SEO & Structured Data** | Dynamic Schema.org `WebSite`, `Taxon`, `CollectionPage`, `ScholarlyArticle` JSON-LD & `sitemap.xml` |
| **Offline & PWA Layer** | Web App Manifest (`manifest.json`) & Network-First Service Worker (`sw.js`) |
| **Production Hosting** | Cloudflare Workers Edge Deployment (`https://plantipedia.rayaantasnim.workers.dev/`) |

---

## Release Evolution: `v1.0` → `v4.3`

| Version | Milestone | Summary |
| :--- | :--- | :--- |
| **`v1.0`** | **Foundational Herbarium** | 6 static plant sheets introducing Plantipedia's emerald visual language and Linnaean tables. |
| **`v2.0`** | **JSON Engine & Bilingual Search** | 30 curated species migrated into centralized JSON pipelines with instant `EN / বাংলা` search. |
| **`v3.0`** | **Global Server & Comparator** | 50 local monographs, zero-key Global Botanical Server uplink, and Split Specimen Comparator. |
| **`v3.1`** *(Current)* | **15-Chapter Upgrade & Workers Edge** | Unified 4-item emoji navbar, `3×2` telemetry grid, Next Milestone v3.2 spotlight, clade-filtered & paginated Taxonomy/Seasons, 11-Section Services suite, and `plantipedia.rayaantasnim.workers.dev` migration. |
| **`v3.2`** *(Next)* | **Parallel Multi-Source Engine** | Concurrent `GBIF + Global Flora Index + Wikidata + iNaturalist` resolution, multi-angle specimen carousel, typo-tolerant fuzzy search, and global `/` keyboard shortcut. |
| **`v4.0`** | **Installable Offline PWA App** | Dedicated Offline Monograph Vault, background sync, and guided desktop/Android/iOS install flow (`/install/`). |
| **`v4.1`** | **Garden QR Tag Studio** | Printable SVG/PDF waterproof botanical nameplates and QR arboretum plaques (`/qr-studio/`). |
| **`v4.2`** | **Botanical Akinator** | 20-question dichotomous taxonomic key with live confidence scoring (`/identify/`). |
| **`v4.3`** | **Ecosystem & Telemetry Polish** | Cross-biome telemetry analytics, portable herbarium study exports, and WCAG AAA refinement. |

---

## Directory Structure

```text
plantipedia/
├── assets/
│   └── images/
├── compare/
│   └── result/
├── config/
├── data/
│   ├── index/
│   │   └── pages/
│   ├── monographs/
│   └── phenology/
├── docs/
├── identify/
├── install/
├── plant/
│   └── live/
├── qr-studio/
├── roadmap/
├── seasons/
├── services/
├── species/
├── src/
│   ├── core/
│   │   ├── bootstrap/
│   │   ├── compilers/
│   │   └── telemetry/
│   ├── engines/
│   │   ├── citation/
│   │   ├── comparator/
│   │   ├── global-server/
│   │   └── search/
│   └── modules/
│       ├── pages/
│       └── utils/
├── styles/
│   ├── base/
│   ├── components/
│   ├── pages/
│   ├── print/
│   └── tailwind/
├── taxonomy/
└── tools/
```

---

## Credits & Educational Disclaimer

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Architecture, UI & UX Collaboration:** **Rayaan Tasnim**
- **Special Thanks:** **IDAI Universe**
- **Powered by:** **Olympiad Edge**

*Educational & Botanical Disclaimer: All monographs, taxonomic classifications, phytochemical summaries, Global Botanical Server records, and curated photography on Plantipedia are provided strictly for non-commercial educational and botanical reference purposes and do not constitute clinical, agricultural, or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
**© 2026 Plantipedia · Hosted at [plantipedia.rayaantasnim.workers.dev](https://plantipedia.rayaantasnim.workers.dev/)**

</div>
