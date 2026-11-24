<div align="center">

# 🌺 Plantipedia — Digital Botanical Encyclopedia & Flora Archive

**Curating the botanical world with scientific precision — exploring Earth's diverse flora, one species at a time.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_Plantipedia-10b981?style=for-the-badge&logo=githubpages&logoColor=white)](https://rayaantasnim.github.io/plantipedia/)
[![Architecture](https://img.shields.io/badge/Architecture-Decoupled_JSON_Engine-065f46?style=for-the-badge)](https://github.com/rayaantasnim/plantipedia)

<br/>

![HTML5](https://img.shields.io/badge/HTML5-Thin_Shells-E34F26?style=flat-square&logo=html5&logoColor=white)
![Tailwind Play CDN](https://img.shields.io/badge/Tailwind_CSS-Zero--Build_CDN-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Modular_Cascade-1572B6?style=flat-square&logo=css3&logoColor=white)
![ES6 Modules](https://img.shields.io/badge/Vanilla_JS-ES6%2B_Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=000000)
![JSON-Driven](https://img.shields.io/badge/Data-100%25_JSON_Driven-059669?style=flat-square&logo=json&logoColor=white)
![20 Curated Species](https://img.shields.io/badge/Flora_Catalog-20_Curated_Species-34d399?style=flat-square)
![Schema.org SEO](https://img.shields.io/badge/SEO-Schema.org_JSON--LD-fbbf24?style=flat-square)

[**Explore Live Archive**](https://rayaantasnim.github.io/plantipedia/) · [**Browse Species Atlas**](https://rayaantasnim.github.io/plantipedia/species.html) · [**Report an Issue**](https://github.com/rayaantasnim/plantipedia/issues)

</div>

---

## 📖 Overview

**Plantipedia** is a scholarly, zero-build botanical encyclopedia documenting **20 curated plant species**—with deep coverage of South Asian and Bangladeshi flora alongside iconic global taxa. Built on a **100% JSON-driven, thin-HTML modular architecture** with zero build tools or backend requirements, it runs identically on **GitHub Pages** and local HTTP servers.

Key architectural capabilities:

- **Decoupled Global Shell Compilers:** Independent `/data/navbar.json` + `/js/navbar-compiler.js` and `/data/footer.json` + `/js/footer-compiler.js` pairs hydrate `<header id="global-navbar">` and `<footer id="global-footer">` across every HTML shell—enabling one-click site-wide updates without editing HTML.
- **Scalable Per-Species Data Split:** A lightweight `./data/species-index.json` powers instant search, autocomplete, A–Z indexing, and featured highlights (`sessionStorage` + memory cached), while individual `./data/species/<slug>.json` files load full 8-chapter (`00`–`07`) monographs on demand.
- **2-Column Sticky-Paginated Atlas (`species.html`):** Balanced 2-column botanical card grid (`16:10` plates) collapsing cleanly to 1 column at `<= 768px`, paired with a sticky frosted-glass pagination bar (10 cards per page, `← Prev`, numbered pills, `Next →`, and live result counter).
- **Zero-Build Tailwind CSS + Modular Cascade:** Browser-native Tailwind Play CDN configured via `/css/tailwind/tailwind.config.js` (`preflight: false`) and 6 topic-specific `@layer components` files (`/css/tailwind/tw-*.css`), layered cleanly alongside the 6 core CSS stylesheets.
- **Editorial Justification Polish:** Consistent `text-align: justify` across desktop, tablet, and mobile viewports with `text-justify: inter-word`, `hyphens: auto`, `-webkit-hyphens: auto`, and `overflow-wrap: break-word` to prevent word rivers.
- **XSS-Safe & Resilient Media:** Programmatic DOM creation (`document.createElement`, `DocumentFragment`, `textContent`, URL protocol validation) and a global capture-phase image error fallback to `./assets/images/placeholder-botanical.svg`.

---

## 📂 Directory Structure

```text
plantipedia/
├── index.html                          # Thin receiver shell for Home Gateway (6 section mounts)
├── species.html                        # Thin receiver shell for 20-Species Atlas (banner + explorer)
├── plant.html                          # Thin receiver shell for Dynamic Monograph & Section Map
├── server.js                           # Lightweight Express static server (port 3000)
├── package.json                        # Project scripts (dev, start, build, lint)
├── assets/
│   └── images/
│       ├── brand-flower.svg            # Custom vector hibiscus/lotus emblem
│       └── placeholder-botanical.svg   # Offline/broken-image botanical plate fallback
├── css/                                # 6-layer modular CSS cascade + zero-build Tailwind layer
│   ├── variables.css                   # Dark botanical palette, glass tokens, typography & easing
│   ├── base.css                        # Reset, radial backdrop, justified prose & reveal fallback
│   ├── layout.css                      # Scroll progress bar, fixed glass navbar, hero & centered footer
│   ├── sections.css                    # Home about, featured species, taxonomy, trivia, highlights & 2-col grid
│   ├── components.css                  # Anti-CLS min-heights, skeletons, retry cards, tabs & modals
│   ├── pages-responsive.css            # Sticky pagination, 8-chapter monograph, related species & breakpoints
│   └── tailwind/                       # Zero-build Tailwind Play CDN theme & component abstractions
│       ├── tailwind.config.js          # Unified Dark Botanical Luxury theme tokens (preflight: false)
│       ├── load-tailwind-layers.js     # Browser-native <style type="text/tailwindcss"> loader
│       ├── tw-navbar.css               # Navbar glassmorphism, autocomplete & mobile drawer utilities
│       ├── tw-footer.css               # Compact centered footer component utilities
│       ├── tw-hero-sections.css        # Hero spotlight, mission stats & taxonomic realm utilities
│       ├── tw-grids-cards.css          # 2-column & 3-column responsive card grid utilities
│       ├── tw-pagination-controls.css  # Sticky pagination bar, category pills & A–Z index bar
│       └── tw-monograph-modals.css     # Monograph chapters, classification table & Section Map modal
├── data/                               # 100% JSON-driven content & configuration layer
│   ├── navbar.json                     # Standalone global navbar, dropdowns, search & mobile drawer config
│   ├── footer.json                     # Standalone compact centered footer (credits, disclaimer, copyright)
│   ├── species-index.json              # Lightweight 20-species master index (search, atlas & featured)
│   ├── species/                        # 20 individual per-species 8-chapter monographs + Schema.org JSON-LD
│   │   ├── mango.json                  # Mangifera indica monograph
│   │   ├── rose.json                   # Rosa monograph
│   │   ├── sunflower.json              # Helianthus annuus monograph
│   │   ├── ...                         # (17 additional lowercase kebab-case <slug>.json files)
│   │   └── tea-plant.json              # Camellia sinensis monograph
│   ├── featured-species.json           # Top 3 flagship species showcase configuration
│   ├── taxonomy.json                   # 4 taxonomic flora realms cards
│   ├── trivia.json                     # 5 physiological & evolutionary curiosities ("Did You Know?")
│   ├── highlights.json                 # 3 field notes & stewardship principle cards
│   └── pages/
│       ├── home.json                   # Home SEO, JSON-LD, hero copy & mission stats
│       ├── species.json                # Directory SEO, banner stats, 10-per-page pagination & filters
│       └── plant.json                  # Monograph SEO, table labels & Section Map descriptions
├── js/                                 # ES6+ modular client engine
│   ├── navbar-compiler.js              # Standalone global navbar & autocomplete compiler (#global-navbar)
│   ├── footer-compiler.js              # Standalone compact centered footer compiler (#global-footer)
│   ├── app.js                          # Page orchestrator boot & retry delegation
│   ├── api.js                          # Dataset endpoints, kebab-slug validator, sessionStorage cache & fetchers
│   ├── registry.js                     # Concurrent [data-section] mount orchestrator (Promise.allSettled)
│   ├── state.js                        # Lightweight client state for speciesIndex & activeMonograph
│   ├── templates.js                    # XSS-safe DOM builders, cards, skeletons & error fallbacks
│   ├── navigation.js                   # Home hero autocomplete delegating navbar search to navbar-compiler.js
│   ├── animations.js                   # GSAP 3 + ScrollTrigger choreography & IntersectionObserver fallback
│   └── modules/
│       ├── seo.js                      # Dynamic meta, OpenGraph, Twitter Card & Schema.org JSON-LD
│       ├── species-directory.js        # 2-col directory, sticky 10-card pagination, A–Z, category & sort
│       └── plant-monograph.js          # On-demand 8-chapter monograph, Related Species, Pager & Section Map
└── README.md                           # Architecture, schemas, local server & deployment guide
```

---

## 🧩 Decoupled Global Navbar & Footer Architecture

Every HTML receiver shell (`index.html`, `species.html`, `plant.html`) mounts only empty semantic landmarks:

```html
<header id="global-navbar" class="global-navbar"></header>
<!-- Page-specific <main> mounts -->
<footer id="global-footer" class="site-footer site-footer--compact" data-footer-variant="compact"></footer>
```

### 1. Independent Navbar (`/data/navbar.json` + `/js/navbar-compiler.js`)
- Concurrently fetches `./data/navbar.json` and `./data/species-index.json` via `Promise.allSettled()`.
- Compiles the fixed glassmorphism header, dropdown menu, active `aria-current="page"` link state, inline autocomplete search bar, and full-screen mobile overlay drawer.

```json
{
  "brand": { "title": "Plantipedia", "logo": "./assets/images/brand-flower.svg", "homeHref": "./index.html" },
  "links": [
    { "id": "nav-home", "label": "Home", "href": "./index.html" },
    { "id": "nav-species", "label": "Available Species", "href": "./species.html", "children": [] }
  ],
  "search": { "placeholder": "Search 20 species...", "minQueryLength": 1, "indexSource": "./data/species-index.json" }
}
```

### 2. Independent Compact Centered Footer (`/data/footer.json` + `/js/footer-compiler.js`)
- Fetches `./data/footer.json` independently and compiles the **compact centered single-column footer** (emblem, tagline, summary, attribution credits, ecosystem partners, educational disclaimer, auto-updating copyright year, and smooth Back-to-Top button—with no 3-column link grid).

```json
{
  "brand": { "title": "Plantipedia", "logo": "./assets/images/brand-flower.svg", "homeHref": "./index.html" },
  "tagline": "Exploring the fascinating world of plants, one species at a time.",
  "credits": [
    { "role": "Chief Patron & Authorization", "name": "JALEES HABIB" },
    { "role": "Lead Architecture, UI & UX Collaboration", "name": "RAYAAN TASNIM" }
  ],
  "partners": [
    { "prefix": "Special Thanks to", "name": "IDAI Universe" },
    { "prefix": "Powered by", "name": "Olympiad Edge" }
  ],
  "copyright": { "autoYear": true, "owner": "Plantipedia", "template": "© {year} Plantipedia. All rights reserved." },
  "backToTopLabel": "Back to Top ↑"
}
```

---

## 🌿 Modular Per-Species Architecture & Adding a 21st+ Species

Instead of downloading every botanical monograph up front, Plantipedia separates **discovery metadata** from **deep monographs**:

- **`./data/species-index.json`** — Lightweight summary records (`slug`, `commonName`, `scientificName`, `localName`, `family`, `plantGroup`, `taxonomicDomain`, `category`, `categories`, `shortSummary`, `thumbnailUrl`, `imageAlt`, `featuredRank`). Cached in `sessionStorage` + memory for instant autocomplete, A–Z filtering, and directory pagination.
- **`./data/species/<slug>.json`** — Full 8-chapter (`00`–`07`) monograph, morphology/cultivation blocks, safety notice, and Schema.org metadata loaded on demand via `plant.html?species=<slug>`.

### 2-Step Workflow to Add a New Species

1. **Create the monograph file** at `/data/species/<lowercase-kebab-slug>.json` (e.g., `/data/species/royal-poinciana.json`) copying the `01`–`07` chapters, `overview`, and `schemaOrg` structure from an existing file such as `/data/species/mango.json`.
2. **Register its summary entry** in `/data/species-index.json` inside the `species[]` array (and increment `"totalSpecies"`):
   ```json
   {
     "slug": "royal-poinciana",
     "commonName": "Royal Poinciana",
     "scientificName": "Delonix regia",
     "localName": "Krishnochura (কৃষ্ণচূড়া)",
     "family": "Fabaceae",
     "plantGroup": "Angiosperm (Eudicot)",
     "taxonomicDomain": "Tropical Canopy & Ornamentals",
     "category": "Trees & Palms",
     "categories": ["Trees & Palms", "Flowers"],
     "shortSummary": "Flamboyant tropical canopy tree famed for fiery scarlet-orange racemes and feathery bipinnate foliage.",
     "thumbnailUrl": "https://images.pexels.com/photos/...?auto=compress&cs=tinysrgb&w=800",
     "imageAlt": "Scarlet blossoms of Delonix regia in summer bloom",
     "featuredRank": null
   }
   ```
   Search, A–Z indexing, category filtering, pagination count, Related Species suggestions, and `plant.html?species=royal-poinciana` will work automatically with zero code edits.

---

## 🎨 Zero-Build Tailwind CSS & Modular Cascade (`/css/`)

Styles load in deterministic cascade order without Node.js compilation:

1. **`variables.css` → `pages-responsive.css`** — Base Dark Botanical Luxury tokens (`#04140c` canvas, `#071f13` surface, `#10b981` emerald accents, `Playfair Display` / `Plus Jakarta Sans` / `JetBrains Mono`), anti-CLS `min-height` reservations, 2-column `.species-grid--directory` (`<= 768px` 1-column collapse), sticky pagination bar, and mobile-safe justified prose (`hyphens: auto; text-justify: inter-word; overflow-wrap: break-word;`).
2. **Tailwind CSS Play CDN + `/css/tailwind/`**:
   - `tailwind.config.js` configures custom `botanical-*` palette tokens, font families, blurs, and shadows with `corePlugins: { preflight: false }` so custom CSS resets stay intact.
   - `load-tailwind-layers.js` loads the 6 modular `@layer components` sheets (`tw-navbar.css`, `tw-footer.css`, `tw-hero-sections.css`, `tw-grids-cards.css`, `tw-pagination-controls.css`, `tw-monograph-modals.css`) into browser-compiled `<style type="text/tailwindcss">` blocks.

---

## 🚀 Local Setup & Zero-Config GitHub Pages Deployment

> **HTTP Server Required:** Browsers block ES module imports and `fetch("./data/...")` calls over `file://` due to CORS restrictions. Always serve over HTTP locally.

### Run Locally

- **Option A — VS Code Live Server:** Open `plantipedia/`, right-click `index.html`, and choose **Open with Live Server**.
- **Option B — Python HTTP Server:**
  ```bash
  python3 -m http.server 3000
  ```
  Visit `http://localhost:3000`.
- **Option C — Node.js / Express Server (with syntax & JSON validation):**
  ```bash
  npm install
  npm run lint
  npm run dev
  ```
  Visit `http://localhost:3000`.

### Zero-Config GitHub Pages Deployment

Because all module imports, JSON datasets, Tailwind layer loaders, and assets use relative `./` paths with zero build steps:

1. Push the repository to the `main` branch on GitHub.
2. Open **Settings → Pages** in your repository.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch** (`main`, `/ (root)`), then click **Save**.
4. Your site goes live directly at `https://<username>.github.io/plantipedia/`.

---

## 🤝 Credits & Disclaimer

| Role | Attribution |
| :--- | :--- |
| **Chief Patron & Authorization** | **Jalees Habib** |
| **Lead Architecture, UI & UX Collaboration** | **Rayaan Tasnim** |
| **Ecosystem Credits** | Special Thanks to **IDAI Universe** \| Powered by **Olympiad Edge** |

Plantipedia is curated strictly for non-commercial educational study. Botanical references and Pexels photography remain the property of their respective owners; medicinal notes do not constitute clinical or medical advice.

<div align="center">

🌺 **Plantipedia** — _Exploring the fascinating world of plants, one species at a time._  
**© 2026 Plantipedia. All rights reserved.**

</div>
