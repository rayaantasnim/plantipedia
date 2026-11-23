<div align="center">

# 🌺 Plantipedia — Digital Botanical Encyclopedia & Flora Archive

**Curating the botanical world with scientific precision — exploring Earth's diverse flora, one species at a time.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Plantipedia-10b981?style=for-the-badge&logo=githubpages&logoColor=white)](https://rayaantasnim.github.io/plantipedia/)
[![Architecture](https://img.shields.io/badge/Architecture-3_Pages_%2B_JSON_Engine-065f46?style=for-the-badge)](https://github.com/rayaantasnim/plantipedia)

<br/>

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![Vanilla JS ES6+](https://img.shields.io/badge/Vanilla_JS-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=000000)
![JSON-Driven](https://img.shields.io/badge/Data-JSON_Driven-059669?style=flat-square&logo=json&logoColor=white)
![200+ Species](https://img.shields.io/badge/Flora_Catalog-200%2B_Species-34d399?style=flat-square)
![Schema.org SEO](https://img.shields.io/badge/SEO-Schema.org_JSON--LD-fbbf24?style=flat-square)
![Responsive UI](https://img.shields.io/badge/UI-Responsive_%26_Accessible-047857?style=flat-square)

[**Explore Live Archive**](https://rayaantasnim.github.io/plantipedia/) · [**Browse Species Atlas**](https://rayaantasnim.github.io/plantipedia/species.html) · [**Report an Issue**](https://github.com/rayaantasnim/plantipedia/issues)

</div>

---

## 📖 Executive Overview

**Plantipedia** is a modern, scholarly botanical encyclopedia and digital flora archive built to make plant science accessible, visual, and rigorously organized. Originally conceived as a static multi-page collection of hand-coded species articles, the platform has evolved into a **blazing-fast, 3-page + JSON-driven web architecture** engineered to scale effortlessly across **200+ plant species**.

With deep botanical representation of **South Asian and Bangladeshi flora** alongside iconic global species, every species entry is compiled dynamically into an **8-chapter academic monograph** covering taxonomy, anatomical morphology, natural habitats, pollinator ecology, economic & cultural heritage, phytochemistry & traditional medicine, and practical cultivation protocols.

---

## ✨ Key Architectural & UI/UX Highlights

- 🧩 **Scalable 3-Page + JSON Engine:** Zero redundant static plant HTML files (`mango.html`, `rose.html`, etc.). The entire encyclopedia runs cleanly across three modular templates—`index.html` (Editorial Home Gateway), `species.html` (200+ Species Atlas with A–Z, Category, Sort, Batch Pagination, and Live Search filtering), and `plant.html` (Dynamic Monograph Compiler)—hydrated at runtime from a unified `plants.json` database.
- 🌿 **Dark Botanical Luxury & Glassmorphism UI:** Crafted with layered deep-forest surfaces (`#04140c` / `#071f13`), frosted glass cards (`backdrop-filter`), a custom vector SVG hibiscus/lotus emblem and favicon, refined editorial typography (**Playfair Display**, **Plus Jakarta Sans**, and **JetBrains Mono**), and GPU-accelerated scroll-reveal micro-interactions.
- 🧭 **Dual Navigation & Overlay Section Map:** Features a full-width desktop glassmorphism navbar with an inline instant autocomplete search bar, a luxury full-screen mobile overlay menu (`<= 768px`) with quick-try species chips, and a floating pill-shaped **Section Map** overlay (`00`–`07`) on detail pages for seamless chapter jumping.
- 📸 **Rich Visuals & Technical SEO:** Pairs contextual high-resolution **Pexels Cloud** photography (with resilient vector fallback plates) alongside dynamic per-species **Open Graph** and **Twitter Card** meta injection, semantic `BreadcrumbList` navigation, and automated **Schema.org JSON-LD** (`WebSite`, `CollectionPage`, `Taxon`, `Article`, and `BreadcrumbList`).

---

## 📚 Monograph Chapter Architecture (`00` – `07`)

Every species rendered via `plant.html?species=<slug>` follows a standardized 8-part botanical structure:

| Chapter | Title | Scope |
| :--- | :--- | :--- |
| **00** | **Botanical Overview & Classification** | Hero photographic specimen plate and taxonomic rank summary (`Plant Group`, `Family`, `Genus`, `Species`, `Growth Form`, `Native Origin`, `Uses`). |
| **01** | **Morphological Description** | Detailed anatomical subblocks covering stems/bark, leaf venation, floral architecture, fruits/seeds, and root systems. |
| **02** | **Taxonomy & Botanical Classification** | Linnaean placement, phylogenetic lineage, and diagnostic family characteristics. |
| **03** | **Natural Habitat & Global Distribution** | Native ecological zones, climatic preferences, and global/South Asian distribution. |
| **04** | **Ecological Role & Pollinator Interactions** | Pollinator guilds, nectar rewards, seed dispersal vectors, and trophic relationships. |
| **05** | **Economic, Culinary & Cultural Importance** | Agricultural commerce, gastronomy, timber/fiber craft, and heritage symbolism. |
| **06** | **Traditional & Scientific Medicinal Properties** | Key phytochemicals, ethnobotanical history, and evidence-based safety precautions. |
| **07** | **Comprehensive Cultivation & Care Guide** | Sunlight, soil pH, propagation methods, irrigation cycles, pruning, and pest management. |

---

## 📂 Project Directory Structure

```text
plantipedia/
├── index.html      # Editorial Home Gateway (Hero Search, About, Top 10 Featured, Taxonomic Domains, Spotlight, Field Notes)
├── species.html    # Dedicated 200+ Species Atlas (A–Z Index, 7 Category Filters, Live Search, Sorting, Load-More Batching)
├── plant.html      # Dynamic Monograph Detail Template (8-Chapter Compiler, Breadcrumbs, Section Map Overlay, Prev/Next Pager)
├── style.css       # Dark Botanical Luxury Design System, Glassmorphism Tokens, Responsive Rules & GPU Animations
├── app.js          # Modular Vanilla JS Engine (Routing, Filtering, Monograph Compilation, Dynamic SEO/JSON-LD, Overlay Controls)
├── plants.json     # Unified Structured Botanical Database (Monographs, Taxonomy, Sections 00–07, Verified Photography)
└── README.md       # Project Documentation, Architecture Overview & Deployment Guide
```

---

## 🚀 Local Setup & Deployment Guide

> **Why a Local Server Is Required:** Modern browsers block `fetch('plants.json')` requests over the `file://` protocol due to CORS security policies. Always serve Plantipedia over HTTP during local development.

### 1. Clone the Repository

```bash
git clone https://github.com/rayaantasnim/plantipedia.git
cd plantipedia
```

### 2. Run Locally

Choose any lightweight static HTTP server:

- **Option A — VS Code Live Server:**
  1. Open the `plantipedia/` folder in **Visual Studio Code**.
  2. Install the **Live Server** extension (`ritwickdey.LiveServer`).
  3. Right-click `index.html` and select **"Open with Live Server"**.

- **Option B — Python Built-in HTTP Server:**
  ```bash
  # Python 3
  python3 -m http.server 3000
  ```
  Then open [`http://localhost:3000`](http://localhost:3000) in your browser.

### 3. Deploy to GitHub Pages

1. Push your repository changes to the `main` branch on GitHub.
2. Open your repository **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Select the `main` branch and `/ (root)` directory, then click **Save**.
5. Your live archive will publish automatically at:
   `https://rayaantasnim.github.io/plantipedia/`

---

## 🤝 Authorization, Collaboration & Ecosystem Credits

| Role | Attribution |
| :--- | :--- |
| **Chief Patron & Authorization** | **Jalees Habib** |
| **Lead Architecture, UI & UX Collaboration** | **Rayaan Tasnim** |
| **Ecosystem & Platform Credits** | Special Thanks to **IDAI Universe** \| Powered by **Olympiad Edge** |

---

## ⚖️ License & Educational Disclaimer

Plantipedia is an educational botanical archive created for scientific learning, horticultural reference, and digital flora preservation. All original interface architecture, design tokens, custom vector branding, and source code remain the intellectual property of the project creators. Botanical classifications, scientific literature summaries, and third-party photographs sourced via Pexels Cloud remain the property of their respective photographers and owners and are presented strictly for non-commercial educational purposes. Clinical or medicinal mentions are provided for academic reference only and do not constitute medical advice.

<div align="center">

<br/>

🌺 **Plantipedia** — *Exploring the fascinating world of plants, one species at a time.*

**© 2026 Plantipedia. All rights reserved.**

</div>