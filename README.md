<div align="center">

# 🌿 Plantipedia — Digital Botanical Archive

**An open-access, bilingual botanical encyclopedia documenting 30 curated plant species across South Asian and global flora.**

[**Explore Live Archive →**](https://rayaantasnim.github.io/plantipedia/)

![30 Curated Species](https://img.shields.io/badge/Monographs-30%20Curated%20Species-34d399?style=flat-square)
![24 Plant Families](https://img.shields.io/badge/Taxonomy-24%20Plant%20Families-2dd4bf?style=flat-square)
![Bilingual EN / বাংলা](https://img.shields.io/badge/Search-EN%20%2F%20%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE-fbbf24?style=flat-square)
![Zero-Build GitHub Pages](https://img.shields.io/badge/Hosting-GitHub%20Pages%20Ready-10b981?style=flat-square)

[**Home**](https://rayaantasnim.github.io/plantipedia/) · [**Species Atlas**](https://rayaantasnim.github.io/plantipedia/species/) · [**Taxonomy**](https://rayaantasnim.github.io/plantipedia/taxonomy/) · [**6-Season Calendar**](https://rayaantasnim.github.io/plantipedia/seasons/) · [**Compare**](https://rayaantasnim.github.io/plantipedia/compare/) · [**Services**](https://rayaantasnim.github.io/plantipedia/services/)

</div>

---

## ✨ What Is Inside

- **30 Curated Plant Monographs:** Detailed eight-chapter botanical entries spanning *Trees & Palms*, *Fruit Trees*, *Medicinal Plants*, *Flowers*, *Shrubs & Herbs*, and *Aquatic Flora*, complete with verified photography and cultivation telemetry gauges.
- **Bilingual Search (EN / বাংলা):** Instant search across English names, Bengali script (such as *আম*, *শাপলা*, *কৃষ্ণচূড়া*, *কদম*, *শিউলি*), Latin binomials, and plant families.
- **Side-by-Side Split Comparator:** Inspect any two plant monographs together (`/compare/`) in dual-pane Split View or single-pane Focus Mode.
- **6-Season Bengali Calendar (ষড়ঋতু):** Track seasonal flowering, fruiting, and ecological changes across *গ্রীষ্ম (Summer)*, *বর্ষা (Monsoon)*, *শরৎ (Autumn)*, *হেমন্ত (Late Autumn)*, *শীত (Winter)*, and *বসন্ত (Spring)*.
- **Taxonomic Explorer & Botanical Services:** Browse **24 documented plant families** (`/taxonomy/`), inspect live distribution charts, generate APA / MLA / BibTeX citations, preview bilingual glossary tooltips, and export print-ready herbarium field sheets (`/services/`).
- **Personal Herbarium:** Save favorite species directly in your browser with zero sign-up required.

---

## 📂 Project Overview

```text
plantipedia/
├── index.html          # Home gateway, bilingual search & featured flora
├── species/            # 30-species directory with A–Z, category & family filters
├── plant/              # Dynamic 8-chapter monograph view (?species=<slug>)
├── taxonomy/           # 24 botanical families & Linnaean diagnostic traits
├── seasons/            # 6-season Bengali ecological calendar (Shororitu)
├── compare/            # Dual-pane side-by-side species comparator
├── services/           # Live archive charts, citation engine & glossary sandbox
├── 404.html            # Bilingual specimen search & 30s auto-redirect fallback
├── data/               # JSON catalogs, page configs & 30 species monographs
├── styles/             # Core tokens, responsive modules & botanical themes
└── assets/             # Vector brand emblem & fallback specimen plate
```

---

## 🚀 Running Locally & Deployment

Plantipedia runs natively on **GitHub Pages** with zero build steps—simply serve the root folder over any local HTTP server:

```bash
# Using Node.js (runs on port 3000)
npm install && npm run dev

# Or using Python
python3 -m http.server 3000
```

> **Tip:** To regenerate `sitemap.xml` after adding or updating species records, run `node tools/build-catalog.mjs`.

---

## 🤝 Credits & Educational Disclaimer

- **Chief Patron & Authorization:** **Jalees Habib**
- **Lead Design & UX Collaboration:** **Rayaan Tasnim**
- **Ecosystem Partners:** Special Thanks to **IDAI Universe** · Powered by **Olympiad Edge**

*Educational & Botanical Disclaimer: Monographs, taxonomic notes, and Pexels photography are curated strictly for non-commercial academic reference and do not constitute clinical or medical advice.*

<div align="center">

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*  
**© 2026 Plantipedia. All rights reserved.**

</div>
