<div align="center">

# 🌿 Plantipedia — Digital Botanical Archive & Worldwide Flora Gateway

**An open-access, bilingual botanical encyclopedia documenting 50 curated plant species alongside a live Worldwide Botanical Server Gateway across 390,000+ flora taxa.**

[**Explore Live Archive →**](https://rayaantasnim.github.io/plantipedia/)

![50 Curated Species](https://img.shields.io/badge/Monographs-50%20Curated%20Species-34d399?style=flat-square)
![Global Botanical Server](https://img.shields.io/badge/Gateway-Global%20Botanical%20Server-22d3ee?style=flat-square)
![Bilingual EN / বাংলা](https://img.shields.io/badge/Bilingual-EN%20%2F%20%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE-fbbf24?style=flat-square)
![Zero-Build Static Web](https://img.shields.io/badge/Architecture-Zero--Build%20Static%20Web-2dd4bf?style=flat-square)

[**Home**](https://rayaantasnim.github.io/plantipedia/) · [**Species Atlas**](https://rayaantasnim.github.io/plantipedia/species/) · [**Live Reader**](https://rayaantasnim.github.io/plantipedia/plant/live/) · [**Taxonomy**](https://rayaantasnim.github.io/plantipedia/taxonomy/) · [**6-Season Calendar**](https://rayaantasnim.github.io/plantipedia/seasons/) · [**Compare**](https://rayaantasnim.github.io/plantipedia/compare/) · [**Services**](https://rayaantasnim.github.io/plantipedia/services/)

</div>

---

## ✨ Core Platform Highlights

| Capability | Description |
| :--- | :--- |
| **50 Curated Botanical Monographs** | Each curated plant features **8 standardized scientific chapters (`00–07`)**, verified Pexels specimen plates, jewel-tone card palettes, **GSAP ScrollTrigger telemetry stats** (height, soil pH, thermal tolerance, lifespan), and print-ready A4 PDF field sheets (`@media print`). |
| **Worldwide Botanical Server Gateway (`/plant/live/`)** | Dedicated home-page gateway console (`#worldwide-gateway`) and Live Reader providing zero-key global flora synthesis with 5 expedition chips, randomized 5-second telemetry loader, manual **Abort** control, retry recovery, and smart `404.html` diagnostics. |
| **Split Specimen Comparator (`/compare/` & `/compare/result/`)** | Custom glassmorphism selectors with sticky **`Fetch from Global Server →`** dropdown footers, one-click floating **`Compare`** handoff from plant pages, and a distraction-free, **footer-free** split comparison matrix at `/compare/result/`. |
| **10-Section Interactive Services Hub (`/services/`)** | Sticky 10-section scroll-spy index, filterable architecture benchmark, live SVG taxonomy & 6-season charts, **Global Server Architecture** breakdown, clickable **4-Step Synthesis Pipeline** inspector, **Screen vs. Print Field-Sheet Studio** toggle, and APA/MLA/BibTeX citation & bilingual glossary sandbox. |
| **Taxonomic Explorer & 6-Season Calendar** | Inspect **34 botanical families** (`/taxonomy/`) and track active blooms, fruiting, and harvests across Bangladesh's six *Shororitu* seasons (`/seasons/` — *গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত*). |
| **Bilingual Search & Smart `404.html`** | Instant `EN / বাংলা / Latin` search in the navbar, hero, and `/species/` atlas with automatic Global Botanical Server fallback and a `404.html` recovery workspace with a 30s cancellable auto-redirect timer. |

---

## 🌱 Curated Flora Domains (50 Species · 34 Families)

- **Trees & Palms:** *Sal, Arjun, Mahogany, Date Palm, Banyan, Coconut, Kadamba, Krishnochura, Palmyra Palm, Shimul, Bamboo*
- **Fruit Trees:** *Mango, Jackfruit, Guava, Lychee, Jamun, Bael, Pomegranate, Starfruit*
- **Flowers & Ornamentals:** *Rose, Sunflower, Hibiscus, Jasmine, Marigold, Ixora, Orchid, Bougainvillea, Shiuli, Periwinkle, Aparajita, Frangipani, Champa, Kamini*
- **Medicinal Plants:** *Tulsi, Neem, Aloe Vera, Ashwagandha, Turmeric, Tea Plant, Amla, Ginger, Kalmegh, Brahmi*
- **Aquatic & Wetland Flora:** *Water Lily, Sacred Lotus, Water Hyacinth, Sundari, Golpata, Water Chestnut, Hogla*

---

## 📂 Repository Structure

```text
plantipedia/
├── index.html          # Home gateway, bilingual search, telemetry & Worldwide Server console
├── species/            # 50-species atlas with A–Z, category, family & pagination filters
├── plant/              # 8-chapter monograph view (?species=<slug>) + floating Compare button
│   └── live/           # Zero-key Global Botanical Server live monograph reader (?q=<query>)
├── taxonomy/           # 34 botanical families & Linnaean diagnostic traits explorer
├── seasons/            # 6-season Bengali phenology calendar (Shororitu)
├── compare/            # Custom dual-specimen selector with Global Server fetch integration
│   └── result/         # Dedicated, footer-free split comparison matrix (?a=...&b=...)
├── services/           # 10-section interactive botanical research suite & pipeline studio
├── 404.html            # Smart error recovery, live catalog search & cancellable 30s redirect
├── data/
│   ├── species/        # 50 individual scientific plant monograph JSON files
│   ├── catalog/        # species-index.json, glossary.json, taxonomy.json, trivia.json
│   ├── pages/          # Page configuration, copy & Schema.org JSON-LD payloads
│   └── config/         # Navbar, home-only contributor footer & shell definitions
├── js/                 # Modular ES6+ views, Global Server engine, SEO & animation controllers
├── styles/             # Design tokens, glassmorphism components & @media print field sheets
└── tools/              # Catalog integrity validator & sitemap.xml generator
```

---

## 🚀 Running Locally

Plantipedia requires zero compilation or bundlers—simply serve the root directory over HTTP:

```bash
# Node.js static server (serves on port 3000)
npm install && npm run dev

# Or Python static server
python3 -m http.server 3000
```

Validate catalog integrity and regenerate `sitemap.xml`:

```bash
node tools/build-catalog.mjs
```

---

## 🤝 Credits & Disclaimer

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Architecture, UI & UX Collaboration:** **Rayaan Tasnim**
- **Ecosystem Partners:** Special Thanks to **IDAI Universe** · Powered by **Olympiad Edge**

*Educational & Botanical Disclaimer: All monographs, taxonomic notes, phytochemical summaries, Global Botanical Server records, and curated photography are provided strictly for non-commercial educational and botanical reference purposes and do not constitute clinical or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
**© 2026 Plantipedia. All rights reserved.**

</div>
