# Plantipedia Data Schema Guide (v3.2)

This reference documents the JSON data contracts powering Plantipedia's configuration layer (`config/`), index datasets (`data/index/`), individual 15-chapter monographs (`data/monographs/`), and seasonal phenology records (`data/phenology/`).

---

## 1. Configuration Manifests (`config/`)

### Environment Configuration
Defines platform metadata (`application.name`, `application.version`, `datasetCacheBust`), archive counts (`curatedMonographsCount: 50`, `documentedFamiliesCount: 34`, `monographChapters: 15`, `phenologicalSeasons: 6`), Global Botanical Server flags, and project credits.

### Route Registry
Declares every public route (`id`, `path`, `dataPage`, `rootDepth`) alongside its required dataset keys (`datasets`) consumed by `src/core/bootstrap/registry.js`.

### Palette Tokens
Mirrors the 8 jewel-tone botanical card themes defined in `styles/base/variables.css`:
- `emerald`, `magenta`, `amber`, `violet`, `cyan`, `crimson`, `lime`, `sapphire`.

### Shell, Navbar & Footer Configs
Control navigation links, grouped dropdown sections (`Explore Flora`, `Botanical Tools`, `Services & App`), bilingual search settings (`./data/index/species-index.json`), mobile drawer cards, and footer attribution blocks.

---

## 2. Master Species Index (`data/index/`)

Top-level object in `species-index.json`:
- `schemaVersion`: `"1.2.0"`
- `totalSpecies`: `50`
- `species`: Array of 50 summary records:
  - `slug`: Lowercase kebab-case identifier matching a monograph inside `data/monographs/`.
  - `commonName`, `commonNameBn`, `scientificName`, `localName`: Bilingual display and search fields.
  - `family`, `familyBn`, `plantGroup`, `taxonomicDomain`: Linnaean lineage metadata.
  - `category`, `categories`: Primary and secondary directory classifications.
  - `seasons`, `seasonalPhenology`: Array of Bengali season IDs (`grishmo`, `borsha`, `shorot`, `hemonto`, `sheet`, `boshonto`) paired with season-specific ecological notes.
  - `shortSummary`, `thumbnailUrl`, `imageAlt`, `featuredRank`: Atlas card presentation fields.

---

## 3. Individual Plant Monographs (`data/monographs/`)

Every curated species file adheres to the validated 15-chapter monograph schema:
- **Identifiers & Media (`00` Overview):** `slug`, `commonName`, `scientificName`, `localName`, `category`, `categories`, `taxonomicDomain`, `shortSummary`, `leadOverview`, `heroImage` (`{ url, alt, caption }`).
- **`overview` Object:**
  - `plantGroup`, `family`, `genus`, `species`, `growthForm`, `nativeOrigin`, `commonUses`.
- **`sections` Array (Chapters `01–14`, following `00` Overview):**
  Each section entry contains:
  - `number` (`"01"` – `"14"`), `title`, `subtitle`, `summary`
  - `paragraphs`: Array of scholarly prose paragraphs
  - Optional `subblocks`: Array of `{ heading, text }` diagnostic breakdowns
  - Optional `images`: Array of `{ url, alt, caption }` verified, deduplicated botanical plates

---

## 4. Phenology Calendar (`data/phenology/`)

- `seo`, `banner`, `ui`: Localized page metadata and copy.
- `seasons`: Array of 6 *Shororitu* records (`grishmo`, `borsha`, `shorot`, `hemonto`, `sheet`, `boshonto`), each containing:
  - `number`, `nameEn`, `nameBn`, `transliteration`, `bengaliMonths`, `gregorianRange`, `monthWindows`
  - `climateSummary`, `phenologyHighlight`, `ecologicalNotes`

---

## 5. Integrity & Image-Quota Validation

Run the catalog generator, archive/image-quota audit, and syntax linter after adding or modifying any monograph or route:

```bash
npm run audit
node tools/build-catalog.mjs
npm run lint
```
