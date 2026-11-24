<div align="center">

# 🌿 Plantipedia — Digital Botanical Archive & Interactive Flora Ecosystem

**An open-access, bilingual botanical encyclopedia documenting 50 curated plant species across 34 botanical families in South Asian and global flora.**

[**Explore Live Archive →**](https://rayaantasnim.github.io/plantipedia/)

![50 Curated Species](https://img.shields.io/badge/Monographs-50%20Curated%20Species-34d399?style=flat-square)
![Bilingual EN / বাংলা](https://img.shields.io/badge/Bilingual-EN%20%2F%20%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE-fbbf24?style=flat-square)
![Zero-Build Static Web](https://img.shields.io/badge/Architecture-Zero--Build%20Static%20Web-2dd4bf?style=flat-square)
![Live on GitHub Pages](https://img.shields.io/badge/Hosting-Live%20on%20GitHub%20Pages-10b981?style=flat-square)

[**Home**](https://rayaantasnim.github.io/plantipedia/) · [**Species Atlas**](https://rayaantasnim.github.io/plantipedia/species/) · [**Taxonomy**](https://rayaantasnim.github.io/plantipedia/taxonomy/) · [**6-Season Calendar**](https://rayaantasnim.github.io/plantipedia/seasons/) · [**Compare**](https://rayaantasnim.github.io/plantipedia/compare/) · [**Services**](https://rayaantasnim.github.io/plantipedia/services/)

</div>

---

## ✨ Core Platform Highlights

| Capability | Description |
| :--- | :--- |
| **50 Curated Botanical Monographs** | Every species is documented across **8 standardized scientific chapters (`00–07`)** with verified Pexels field photography, Schema.org `Taxon` metadata, and plant-specific **GSAP ScrollTrigger telemetry stats** (canopy height, soil pH, thermal tolerance, and lifespan). |
| **Jewel-Tone Multi-Color Botanical UI** | Distinct, high-contrast color palettes across species cards, taxonomic domains, and glassmorphism panels, paired with a global **Focus Mode**, floating **Compare** handoff pills, and bottom-left **Scroll-Triggered Back-to-Top** navigation. |
| **Bilingual Instant Search (`EN / বাংলা`)** | Sub-50ms client-side search across English common names, Bengali script (`বাংলা`), Latin binomials, and plant families. |
| **Interactive Services Hub (`/services/`)** | Live JSON-driven taxonomic distribution bar charts, a 6-season phenology curve, a filterable architecture matrix, and an in-page **APA 7th / MLA 9th / BibTeX Citation & Bilingual Glossary Sandbox**. |
| **Side-by-Side Split Comparator (`/compare/`)** | Compare taxonomy, morphology, soil pH, and ecology between any two of the 50 species simultaneously—with direct one-click handoff (`?left=<slug>`) from any monograph page. |
| **6-Season Bengali Phenology (`/seasons/`)** | Track active blooms, fruiting, and harvests across Bangladesh's *Shororitu* (*গ্রীষ্ম, বর্ষা, শরৎ, হেমন্ত, শীত, বসন্ত*). |
| **Smart `404.html` Gateway & Print Sheets** | Missing paths offer live bilingual search, quick specimen chips, and a 30s auto-redirect timer; `@media print` formats clean monochrome A4 herbarium field sheets. |

---

## 🌱 Curated Flora Domains (50 Species · 34 Families)

- **Trees & Palms:** *Sal, Arjun, Mahogany, Date Palm, Banyan, Coconut, Kadamba, Krishnochura, Palmyra Palm, Shimul, Bamboo*
- **Fruit Trees:** *Mango, Jackfruit, Guava, Lychee, Jamun, Bael, Pomegranate, Starfruit*
- **Flowers & Ornamentals:** *Rose, Sunflower, Hibiscus, Jasmine, Marigold, Ixora, Orchid, Bougainvillea, Shiuli, Periwinkle, Aparajita, Frangipani, Champa, Kamini*
- **Medicinal Plants:** *Tulsi, Neem, Aloe Vera, Ashwagandha, Turmeric, Tea Plant, Amla, Ginger, Kalmegh, Brahmi*
- **Aquatic & Wetland Flora:** *Water Lily, Sacred Lotus, Water Hyacinth, Sundari, Golpata, Water Chestnut, Hogla*

---

## 📂 Repository Overview

```text
plantipedia/
├── index.html          # Home gateway, bilingual search, telemetry & featured flora
├── species/            # 50-species atlas with A–Z, category, family & pagination filters
├── plant/              # 8-chapter monograph view (?species=<slug>) + floating Compare pill
├── taxonomy/           # 34 botanical families & Linnaean diagnostic traits explorer
├── seasons/            # 6-season Bengali phenology calendar (Shororitu)
├── compare/            # Dual-pane side-by-side species comparator (?left=<slug>)
├── services/           # Live archive charts, comparison matrix & citation/glossary sandbox
├── 404.html            # Bilingual specimen search & cancellable 30s auto-redirect
├── data/
│   ├── species/        # 50 individual scientific plant monograph JSON files
│   ├── catalog/        # species-index.json, glossary.json, taxonomy.json, trivia.json
│   ├── pages/          # Page configuration & SEO payloads
│   └── config/         # Navbar, footer & global shell definitions
├── js/                 # Modular ES6+ views, services, telemetry & animation controllers
├── styles/             # Design tokens, glassmorphism components & A4 print stylesheet
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

Validate species catalog integrity and regenerate `sitemap.xml`:

```bash
node tools/build-catalog.mjs
```

---

## 🤝 Credits & Disclaimer

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Design & UX Collaboration:** **Rayaan Tasnim**
- **Ecosystem Partners:** Special Thanks to **IDAI Universe** · Powered by **Olympiad Edge**

*Educational & Botanical Disclaimer: All monographs, taxonomic notes, phytochemical summaries, and curated Pexels photography are provided strictly for non-commercial educational and botanical reference purposes and do not constitute clinical or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
**© 2026 Plantipedia. All rights reserved.**

</div>
