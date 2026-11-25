/**
 * Dedicated "Sources & Scientific References" Portal (/sources/)
 * 8-Section Open Botanical Infrastructure Reference explaining how 400,000+ Global Taxa
 * and 50 Local Curated 15-Chapter Monographs are indexed, validated, and cited.
 */

import { buildImageElement, createEl } from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { applyPageSeo } from "../utils/seo.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const HERO_IMAGE_URL =
  "https://inaturalist-open-data.s3.amazonaws.com/photos/605494677/original.jpg";
const OG_IMAGE_URL =
  "https://inaturalist-open-data.s3.amazonaws.com/photos/605680884/original.jpg";
const TWITTER_IMAGE_URL =
  "https://inaturalist-open-data.s3.amazonaws.com/photos/616184116/original.jpg";

const SECTION_IMAGES = {
  pipeline: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/608838217/original.jpg",
    alt: "Ficus elastica broad foliage plate representing Plantipedia's multi-source botanical data pipeline",
    caption: "Fig. 01.1 — Living conservatory biodiversity synthesized through Plantipedia's zero-key global flora pipeline.",
  },
  gbif: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/605908559/original.jpg",
    alt: "Magnolia grandiflora specimen representing GBIF Backbone Taxonomy",
    caption: "Fig. 02.1 — Diagnostic Magnolia specimen cross-checked against GBIF Backbone usageKeys and synonym hierarchies.",
  },
  prose: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/619063351/original.jpg",
    alt: "Equisetum arvense articulated stem plate illustrating structured morphological extraction",
    caption: "Fig. 03.1 — Deep section parsing preserves clear boundaries across evolutionary phylogeny and vascular anatomy.",
  },
  wikidata: {
    url: "https://static.inaturalist.org/photos/155902482/large.jpg",
    alt: "Piper nigrum fruiting spike representing multilingual semantic taxon graphs",
    caption: "Fig. 04.1 — Piper nigrum culinary vine anchored via persistent Wikidata P225 nodes and EN / বাংলা cross-links.",
  },
  inaturalist: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/485122324/original.jpeg",
    alt: "Phalaenopsis aphrodite floral plate illustrating iNaturalist research-grade observations",
    caption: "Fig. 05.1 — Epiphytic Phalaenopsis blossom exemplifying research-grade phenology and community verification.",
  },
  kewWfo: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/607291348/original.jpg",
    alt: "Cycas revoluta frond symmetry aligned with APG IV and Kew/WFO botanical standards",
    caption: "Fig. 06.1 — Ancient cycad lineage mapped alongside APG IV angiosperm orders verified via POWO and World Flora Online.",
  },
  biomes: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/23160840/large.jpg",
    alt: "Ferocactus xerophyte ridges illustrating calibrated biome and soil pH envelopes",
    caption: "Fig. 07.1 — Arid-adapted Ferocactus trait profile calibrated by EOL TraitBank ecological guilds.",
  },
  integrity: {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/326787967/large.jpg",
    alt: "Sequoia sempervirens canopy timber plate illustrating verified archival rigor",
    caption: "Fig. 08.1 — Biome-calibrated habitat envelopes and peer-verified monograph curation across local and global flora.",
  },
};

const SOURCES_SECTIONS = [
  {
    id: "source-01",
    num: "01",
    theme: "emerald",
    icon: "🌐",
    eyebrow: "SECTION 01 · UNIFIED QUERY ROUTING",
    title: "Architecture of the 400,000+ Global Flora Pipeline",
    subtitle: "Zero-Key Multi-Endpoint Botanical Resolution",
    desc: "How Plantipedia transforms any English, Latin, or Bengali search into a verified 15-chapter dossier.",
    paragraphs: [
      "Plantipedia Version 3.1 bridges two complementary botanical knowledge tiers: fifty deeply authored, bilingual local monographs stored as deterministic JSON schemas alongside a real-time Global Botanical Server capable of resolving over 400,000 worldwide vascular plant and tree taxa. Rather than depending on brittle, rate-limited API keys or pre-cached static stubs, the client executes direct, CORS-enabled browser queries against open scientific registries and normalizes incoming records into an identical 15-chapter scholarly template.",
      "Every live lookup passes through a multi-stage verification funnel before reaching the viewport. Search candidates undergo Kingdom Plantae validation, disambiguation guard checks, taxonomic rank disaggregation from infobox and backbone graphs, strict 80-character prose deduplication, and ecological guild calibration so desert xerophytes, carnivorous bog herbs, epiphytes, and aquatic macrophytes never receive generic temperate garden defaults.",
    ],
    specs: [
      { label: "Query Ingress", value: "EN, Linnaean Binomial, or বাংলা Unicode Script" },
      { label: "Retry Resilience", value: "Exponential Backoff + 5.0s AbortController Guard" },
      { label: "Output Schema", value: "Chapters 00–14 + Biome-Aware Telemetry Matrix" },
      { label: "Zero-Key Model", value: "100% Client-Side CORS Open Science Endpoints" },
    ],
    pipelineSteps: [
      { step: "1. Parse Query", detail: "Normalize EN / Latin / বাংলা input" },
      { step: "2. Taxon Gate", detail: "Confirm Kingdom Plantae & reject homonyms" },
      { step: "3. Deep Sections", detail: "Extract HTML headings & clean chemical notation" },
      { step: "4. Biome Calibrate", detail: "Map Family → -ales order, cm/m & 3.5–9.0 pH" },
      { step: "5. Multi-Plate", detail: "Harvest 6–12 unique botanical photographs" },
    ],
    figure: SECTION_IMAGES.pipeline,
    actions: [
      { label: "🌐 Query Global Botanical Server", href: "./plant/live/", variant: "secondary" },
      { label: "◫ Jump via Map Matrix", action: "open-matrix", variant: "secondary" },
    ],
  },
  {
    id: "source-02",
    num: "02",
    theme: "cyan",
    icon: "🧬",
    eyebrow: "SECTION 02 · AUTHORITATIVE NOMENCLATURE",
    title: "Global Biodiversity Information Facility (GBIF)",
    subtitle: "api.gbif.org Backbone Taxonomy",
    desc: "Canonical species keys, synonym reconciliation, and global occurrence density.",
    paragraphs: [
      "The Global Biodiversity Information Facility serves as the primary international clearinghouse for accepted botanical binomials, taxonomic authorship strings, and occurrence coordinates. Through the public GBIF Species Match and Backbone Taxonomy endpoints, botanical names are cross-checked against current International Code of Nomenclature standards so historical synonyms cleanly resolve to accepted species keys.",
      "Within Plantipedia's architectural roadmap and live reconciliation pipeline, GBIF taxon keys anchor Kingdom, Phylum, Class, Order, Family, and Genus lineages while flagging ambiguous homonyms—ensuring a query for a flower name never collides with a zoological genus or geographic municipality.",
    ],
    specs: [
      { label: "Primary Endpoint", value: "https://api.gbif.org/v1/species/match" },
      { label: "Backbone Coverage", value: "400,000+ Vascular & Non-Vascular Plant Taxa" },
      { label: "Core Signals", value: "usageKey, acceptedUsageKey, rank, status, authorship" },
      { label: "License Standard", value: "CC0 / CC-BY Open Biodiversity Data" },
    ],
    figure: SECTION_IMAGES.gbif,
    actions: [
      { label: "GBIF Species API Docs", href: "https://www.gbif.org/developer/species", external: true },
    ],
  },
  {
    id: "source-03",
    num: "03",
    theme: "violet",
    icon: "🏛️",
    eyebrow: "SECTION 03 · DEEP PROSE & SPECIMEN PLATES",
    title: "Global Flora Index & Open Herbarium Specimen Graph",
    subtitle: "Structured Taxobox Parsing & Specimen Gateways",
    desc: "Full-section morphological parsing, taxobox extraction, and verified botanical bitmap curation.",
    paragraphs: [
      "Detailed morphological descriptions, evolutionary narratives, and ethnobotanical histories are harvested through structured REST & DOM botanical gateways alongside open taxonomic knowledge graphs. Unlike flat summary excerpts that scramble unrelated topics, parsing the structured DOM heading tree preserves true section boundaries—keeping evolutionary phylogeny distinct from trapping biomechanics or horticultural care.",
      "High-resolution photographic plates are curated asynchronously across open botanical image archives with strict JPEG/PNG/WebP MIME checks, minimum 400×300 pixel resolution, aspect-ratio bounds, and exclusion filters against range maps, SVG cladograms, icons, and vector badges.",
    ],
    specs: [
      { label: "Section Engine", value: "Structured DOM Taxobox & Morphological Section Extractor" },
      { label: "Specimen Media", value: "Open Botanical Bitmap Gateways (Filtered 400×300+ Plates)" },
      { label: "Chemistry Cleanup", value: "DOM <sup>/<sub> & ion normalization (CO₂, H⁺)" },
      { label: "Image Quota", value: "6–12 distinct photographs · Strict Max 1 per page" },
    ],
    figure: SECTION_IMAGES.prose,
    actions: [
      { label: "GBIF Specimen Media Search", href: "https://www.gbif.org/occurrence/search?media_type=StillImage", external: true },
    ],
  },
  {
    id: "source-04",
    num: "04",
    theme: "amber",
    icon: "🔗",
    eyebrow: "SECTION 04 · MULTILINGUAL SEMANTIC GRAPH",
    title: "Wikidata Structured Botanical Knowledge Graph",
    subtitle: "query.wikidata.org SPARQL & P225 Taxon Links",
    desc: "Machine-readable Q-items linking Latin binomials with English and বাংলা vernaculars.",
    paragraphs: [
      "Wikidata binds botanical taxonomy to a multilingual semantic graph where each accepted taxon occupies a persistent Q-identifier governed by property P225 (taxon name), P105 (taxon rank), and P171 (parent taxon). Cross-lingual sitelinks automatically bridge English botanical entries with Bengali (`bn`) records so vernacular terms such as আম, শাপলা, পদ্ম, or তুলসী map deterministically to their scientific counterparts.",
      "Structured statements inside Wikidata also store IUCN Red List conservation statuses (P141), native range entities, and external identifiers connecting GBIF, IPNI, Tropicos, and Plants of the World Online under one interoperable graph.",
    ],
    specs: [
      { label: "Graph Endpoint", value: "https://query.wikidata.org/sparql · wbgetentities" },
      { label: "Taxon Properties", value: "P225 (binomial), P171 (parent taxon), P141 (IUCN)" },
      { label: "Script Alignment", value: "Synchronized English, Linnaean & বাংলা labels" },
      { label: "Data License", value: "CC0 1.0 Universal Public Domain Dedication" },
    ],
    figure: SECTION_IMAGES.wikidata,
    actions: [
      { label: "Wikidata Query Service", href: "https://query.wikidata.org/", external: true },
    ],
  },
  {
    id: "source-05",
    num: "05",
    theme: "magenta",
    icon: "📷",
    eyebrow: "SECTION 05 · FIELD OBSERVATIONS & PHENOLOGY",
    title: "iNaturalist Global Observation & Taxon Imagery Network",
    subtitle: "api.inaturalist.org Research-Grade Flora",
    desc: "Community-verified field photography, seasonal bloom histograms, and regional presence.",
    paragraphs: [
      "The iNaturalist observation network aggregates tens of millions of georeferenced plant sightings reviewed through multi-observer taxonomic consensus. Research-grade flora observations capture live seasonal phenology—documenting when tropical deciduous trees drop leaves in Grishmo or when Bengal wetland macrophytes peak in Shorot.",
      "Complementing archival herbarium photography, iNaturalist taxon records inform visual morphology comparisons across flower structure, leaf venation, and bark texture while upholding clear photographer attribution and open Creative Commons licensing.",
    ],
    specs: [
      { label: "Observation API", value: "https://api.inaturalist.org/v1/taxa & observations" },
      { label: "Verification Tier", value: "Research-Grade community taxonomic consensus" },
      { label: "Phenology Signals", value: "Monthly flowering, fruiting & leafing seasonality" },
      { label: "Attribution Policy", value: "Creator & CC-BY / CC-BY-NC provenance preserved" },
    ],
    figure: SECTION_IMAGES.inaturalist,
    actions: [
      { label: "iNaturalist v1 Taxa API", href: "https://api.inaturalist.org/v1/docs/", external: true },
    ],
  },
  {
    id: "source-06",
    num: "06",
    theme: "sapphire",
    icon: "👑",
    eyebrow: "SECTION 06 · KEW APG IV & WFO ALIGNMENT",
    title: "Plants of the World Online (POWO / Kew) & World Flora Online",
    subtitle: "APG IV Classification & Biogeographic Ranges",
    desc: "Authoritative angiosperm order assignments and native-versus-introduced distribution clarity.",
    paragraphs: [
      "Modern plant systematics follows the Angiosperm Phylogeny Group IV (APG IV) consensus maintained across Royal Botanic Gardens, Kew (POWO) and World Flora Online (WFO). Relying on outdated clade labels such as treating Angiospermae or Gymnospermae as a botanical Order obscures genuine evolutionary relationships.",
      "Plantipedia aligns its Taxonomic Order resolver with POWO and WFO family-to-order mappings—translating roughly eighty major plant families directly to canonical '-ales' orders (such as Droseraceae → Caryophyllales, Welwitschiaceae → Welwitschiales, and Arecaceae → Arecales) while separating native geographic origins from cultivated regions.",
    ],
    specs: [
      { label: "Classification Standard", value: "APG IV Angiosperm & Pteridophyte Consensus" },
      { label: "Authoritative Portals", value: "powo.science.kew.org · worldfloraonline.org" },
      { label: "Order Mapping", value: "80+ Family → Canonical -ales Order Lookup Table" },
      { label: "Biogeography", value: "TDWG Native Origin vs. Naturalized Belt Distinction" },
    ],
    figure: SECTION_IMAGES.kewWfo,
    actions: [
      { label: "Kew Plants of the World Online", href: "https://powo.science.kew.org/", external: true },
      { label: "World Flora Online", href: "https://www.worldfloraonline.org/", external: true },
    ],
  },
  {
    id: "source-07",
    num: "07",
    theme: "teal",
    icon: "🌳",
    eyebrow: "SECTION 07 · PHYLOGENY & TRAIT ECOLOGY",
    title: "Encyclopedia of Life (EOL) & Open Tree of Life Phylogeny",
    subtitle: "Ecological Guilds, Evolutionary Trees & Conservation",
    desc: "Structured trait ontologies connecting evolutionary clades with soil, light, and biome tolerances.",
    paragraphs: [
      "The Encyclopedia of Life TraitBank and the Open Tree of Life synthetic phylogeny organize species beyond static names—linking evolutionary divergence nodes with measurable functional traits including growth habit, photosynthetic pathway, mycorrhizal symbioses, and habitat salinity or acidity.",
      "Informed by these ecological trait ontologies, Plantipedia classifies live botanical specimens into calibrated ecological guilds—assigning acidic bog pH envelopes (3.5–5.0) to carnivorous Drosera and Nepenthes, alkaline desert envelopes (6.5–8.0) to xerophytes like Welwitschia mirabilis, wetland silt envelopes to aquatic flora, and aerated bark substrates to epiphytic orchids.",
    ],
    specs: [
      { label: "Trait & Tree Sources", value: "eol.org TraitBank · tree.opentreeoflife.org" },
      { label: "Ecological Guilds", value: "Carnivorous Bog, Arid Xerophyte, Aquatic, Epiphyte, Mesic" },
      { label: "Soil pH Calibration", value: "Expanded 3.5 – 9.0 Spectrum Meter Precision" },
      { label: "Phylogenetic Scope", value: "Bryophytes, Pteridophytes, Gymnosperms & Angiosperms" },
    ],
    figure: SECTION_IMAGES.biomes,
    actions: [
      { label: "Encyclopedia of Life", href: "https://eol.org/", external: true },
      { label: "Open Tree of Life", href: "https://tree.opentreeoflife.org/", external: true },
    ],
  },
  {
    id: "source-08",
    num: "08",
    theme: "lime",
    icon: "✅",
    eyebrow: "SECTION 08 · VERIFICATION & SCHOLARLY RIGOR",
    title: "Data Verification, Citation Integrity & Local Curated Standards",
    subtitle: "Deduplication, Biome Telemetry & Academic Exports",
    desc: "Internal quality gates governing Plantipedia's 50 curated dossiers and live global records.",
    paragraphs: [
      "Every monograph rendered inside Plantipedia passes deterministic integrity checks at build and runtime. Lead summaries are claimed once against an 80-character normalized key and sentence-level fingerprint registry so no paragraph or statistic echoes redundantly across hero cards or numbered chapters. Unit-aware stature extractors preserve centimetre (`cm`) versus metre (`m`) scale accurately without conflating rosette herbs with canopy trees.",
      "Visual assets enforce a strict uniqueness quota (`Max 1` occurrence per image URL on any page and `Max 4` across the entire archive), while all textual references inside monograph reading views refer consistently to the Global Botanical Server and Global Flora Index. Built-in APA 7th, MLA 9th, and BibTeX generators produce reproducible canonical URLs anchored to the live Workers production origin.",
    ],
    specs: [
      { label: "Prose Deduplication", value: "80-Char Normalized Key + Sentence Fingerprint Registry" },
      { label: "Metric Calibration", value: "Unit-Aware cm / m Stature & 3.5–9.0 Soil pH Scale" },
      { label: "Citation Engine", value: "One-Click APA 7th, MLA 9th, BibTeX & Binomial Copy" },
      { label: "Curated Benchmark", value: "50 Bilingual EN / বাংলা Heritage & Tropical Monographs" },
    ],
    figure: SECTION_IMAGES.integrity,
    actions: [
      { label: "📚 Browse 50 Curated Species", href: "./species/" },
      { label: "⚖️ Open Split Comparator", href: "./compare/" },
    ],
  },
];

function createSourcesActionButton({
  label,
  arrow = "→",
  variant = "secondary",
  size = "md",
  href = null,
  external = false,
  onClick = null,
}) {
  const sizeClass = size === "sm" ? " sources-btn--sm" : "";
  const cls = `sources-btn sources-btn--${variant}${sizeClass}`;
  const isLink = typeof href === "string" && href.length > 0;
  const el = createEl(isLink ? "a" : "button", cls);

  if (isLink) {
    el.href = external ? href : resolveRootPath(href);
    if (external) {
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    }
  } else {
    el.type = "button";
    if (typeof onClick === "function") {
      el.addEventListener("click", onClick);
    }
  }

  el.appendChild(createEl("span", "sources-btn-label", label));
  const resolvedArrow = external && arrow === "→" ? "↗" : arrow;
  if (resolvedArrow) {
    const arrowEl = createEl("span", "sources-btn-arrow", resolvedArrow);
    arrowEl.setAttribute("aria-hidden", "true");
    el.appendChild(arrowEl);
  }

  return el;
}

function createMatrixGridSvgIcon() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "services-map-matrix-icon");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");

  [
    [4.5, 4.5],
    [11.5, 4.5],
    [4.5, 11.5],
    [11.5, 11.5],
  ].forEach(([cx, cy]) => {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "2.1");
    svg.appendChild(dot);
  });

  return svg;
}

let activeSourcesMatrixCleanup = null;

function renderSourcesMapMatrix(portal) {
  if (!portal) return;

  if (typeof activeSourcesMatrixCleanup === "function") {
    activeSourcesMatrixCleanup();
    activeSourcesMatrixCleanup = null;
  }

  document.getElementById("sources-map-matrix-btn")?.remove();
  document.getElementById("sources-matrix-overlay")?.remove();
  document.body.style.overflow = "";

  const totalStr = String(SOURCES_SECTIONS.length).padStart(2, "0");
  const abortController = new AbortController();
  const { signal } = abortController;

  const triggerBtn = createEl("button", "services-map-matrix-btn sources-map-matrix-btn");
  triggerBtn.id = "sources-map-matrix-btn";
  triggerBtn.type = "button";
  triggerBtn.setAttribute("aria-haspopup", "dialog");
  triggerBtn.setAttribute("aria-expanded", "false");
  triggerBtn.setAttribute("aria-controls", "sources-matrix-overlay");
  triggerBtn.setAttribute(
    "aria-label",
    `Open Sources & References Map Matrix (${SOURCES_SECTIONS.length} sections)`,
  );

  triggerBtn.appendChild(createMatrixGridSvgIcon());
  triggerBtn.appendChild(createEl("span", "services-map-matrix-label", "Map Matrix"));
  const sep = createEl("span", "services-map-matrix-sep", "·");
  sep.setAttribute("aria-hidden", "true");
  triggerBtn.appendChild(sep);
  const badgeEl = createEl("span", "services-map-matrix-badge", `01/${totalStr}`);
  triggerBtn.appendChild(badgeEl);

  const overlay = createEl("div", "services-matrix-overlay sources-matrix-overlay");
  overlay.id = "sources-matrix-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sourcesMatrixTitle");
  overlay.hidden = true;

  const dialogShell = createEl("div", "services-matrix-dialog");
  const header = createEl("header", "services-matrix-header");
  const titleWrap = createEl("div", "services-matrix-title-wrap");
  const titleEl = createEl(
    "h2",
    "services-matrix-title",
    `Sources & Scientific References · Map Matrix (${SOURCES_SECTIONS.length} Sections)`,
  );
  titleEl.id = "sourcesMatrixTitle";
  const subtitleEl = createEl(
    "p",
    "services-matrix-subtitle",
    "Jump directly to any data authority, API protocol, or verification standard",
  );
  titleWrap.appendChild(titleEl);
  titleWrap.appendChild(subtitleEl);

  const closeBtn = createEl("button", "services-matrix-close-btn", "✕ Close");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close Sources Map Matrix overlay");
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const grid = createEl("div", "services-matrix-grid");
  const cardEntries = [];

  const setActiveSection = (sectionId) => {
    const idx = SOURCES_SECTIONS.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    badgeEl.textContent = `${String(idx + 1).padStart(2, "0")}/${totalStr}`;
    cardEntries.forEach(({ item, card, statusPill }) => {
      const isCurrent = item.id === sectionId;
      card.classList.toggle("is-active", isCurrent);
      card.setAttribute("aria-current", isCurrent ? "location" : "false");
      statusPill.textContent = isCurrent ? "● In View" : "Jump →";
    });
  };

  const openMatrix = () => {
    overlay.hidden = false;
    triggerBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus({ preventScroll: true });
  };

  const closeMatrix = ({ restoreFocus = true } = {}) => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    triggerBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) triggerBtn.focus({ preventScroll: true });
  };

  SOURCES_SECTIONS.forEach((item, idx) => {
    const card = createEl(
      "button",
      `services-matrix-card botanical-theme--${item.theme}${idx === 0 ? " is-active" : ""}`,
    );
    card.type = "button";
    card.setAttribute("data-section-target", item.id);
    card.setAttribute("aria-current", idx === 0 ? "location" : "false");

    const topRow = createEl("div", "services-matrix-card-top");
    topRow.appendChild(createEl("span", "services-matrix-num-badge", item.num));
    const statusPill = createEl(
      "span",
      "services-matrix-status-pill",
      idx === 0 ? "● In View" : "Jump →",
    );
    topRow.appendChild(statusPill);

    card.appendChild(topRow);
    card.appendChild(
      createEl("h3", "services-matrix-card-title", `${item.num}. ${item.title}`),
    );
    card.appendChild(createEl("p", "services-matrix-card-desc", item.desc));

    card.addEventListener(
      "click",
      () => {
        setActiveSection(item.id);
        closeMatrix({ restoreFocus: false });
        document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      { signal },
    );

    grid.appendChild(card);
    cardEntries.push({ item, card, statusPill });
  });

  dialogShell.appendChild(header);
  dialogShell.appendChild(grid);
  overlay.appendChild(dialogShell);

  triggerBtn.addEventListener("click", openMatrix, { signal });
  closeBtn.addEventListener("click", () => closeMatrix({ restoreFocus: true }), { signal });
  overlay.addEventListener(
    "click",
    (e) => {
      if (e.target === overlay || e.target === dialogShell) {
        closeMatrix({ restoreFocus: true });
      }
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && !overlay.hidden) {
        e.preventDefault();
        closeMatrix({ restoreFocus: true });
      }
    },
    { signal },
  );

  let observer = null;
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-22% 0px -52% 0px", threshold: [0.08, 0.25, 0.5] },
    );
    SOURCES_SECTIONS.forEach(({ id }) => {
      const sec = portal.querySelector(`#${id}`);
      if (sec) observer.observe(sec);
    });
  }

  document.body.appendChild(triggerBtn);
  document.body.appendChild(overlay);

  activeSourcesMatrixCleanup = () => {
    abortController.abort();
    if (observer) observer.disconnect();
    document.body.style.overflow = "";
    triggerBtn.remove();
    overlay.remove();
  };
}

function buildSourcesHero(speciesCount) {
  const hero = createEl("section", "sources-hero");
  hero.setAttribute("aria-labelledby", "sourcesHeroHeading");

  const inner = createEl("div", "section-container sources-hero-inner");
  const grid = createEl("div", "sources-hero-grid");

  const copyCol = createEl("div", "sources-hero-copy");
  copyCol.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      "OPEN BOTANICAL INFRASTRUCTURE · 400,000+ INDEXED TAXA",
    ),
  );

  const h1 = createEl("h1", "sources-hero-title", "Sources & Scientific References");
  h1.id = "sourcesHeroHeading";
  copyCol.appendChild(h1);

  copyCol.appendChild(
    createEl(
      "p",
      "sources-hero-subcopy",
      `Plantipedia Version 3.1 unites ${speciesCount || 50} deeply authored bilingual EN / বাংলা monographs with a live open-science flora pipeline covering more than 400,000 vascular plant and tree species. This technical dossier documents the taxonomic registries, phylogenetic frameworks, photographic repositories, and deterministic verification protocols powering every citation and field sheet.`,
    ),
  );

  const metricsRow = createEl("div", "sources-hero-metrics");
  [
    { val: "400,000+", label: "GLOBAL VASCULAR TAXA" },
    { val: "08", label: "OPEN DATA PILLARS" },
    { val: String(speciesCount || 50), label: "CURATED MONOGRAPHS" },
    { val: "3", label: "CITATION FORMATS" },
  ].forEach((m) => {
    const stat = createEl("div", "sources-metric-pill");
    stat.appendChild(createEl("span", "sources-metric-val", m.val));
    stat.appendChild(createEl("span", "sources-metric-lbl", m.label));
    metricsRow.appendChild(stat);
  });
  copyCol.appendChild(metricsRow);

  const actions = createEl("div", "sources-hero-actions");
  actions.appendChild(
    createSourcesActionButton({
      label: "🌐 Query Global Botanical Server",
      arrow: "→",
      variant: "primary",
      href: "./plant/live/",
    }),
  );
  actions.appendChild(
    createSourcesActionButton({
      label: "📚 Browse 50 Curated Species",
      arrow: "→",
      variant: "secondary",
      href: "./species/",
    }),
  );
  actions.appendChild(
    createSourcesActionButton({
      label: "🧭 Capabilities Suite",
      arrow: "→",
      variant: "secondary",
      href: "./services/",
    }),
  );
  actions.appendChild(
    createSourcesActionButton({
      label: "◫ Section Map (08)",
      arrow: "⌄",
      variant: "secondary",
      onClick: () => document.getElementById("sources-map-matrix-btn")?.click(),
    }),
  );
  copyCol.appendChild(actions);

  const figure = createEl("figure", "sources-hero-figure");
  const media = createEl("div", "sources-hero-media");
  media.appendChild(
    buildImageElement(
      HERO_IMAGE_URL,
      "Sunlit botanical conservatory foliage illustrating open global plant taxonomy",
      "Plantipedia Open Botanical Infrastructure",
      { eager: true },
    ),
  );
  figure.appendChild(media);
  figure.appendChild(
    createEl(
      "figcaption",
      "sources-hero-caption",
      "Archival & Live Conservatory Reference · Verified multi-registry botanical synthesis across 400,000+ taxa.",
    ),
  );

  grid.appendChild(copyCol);
  grid.appendChild(figure);
  inner.appendChild(grid);
  hero.appendChild(inner);
  return hero;
}

function buildSourceSectionCard(sec) {
  const card = createEl("article", `sources-section-card botanical-theme--${sec.theme}`);
  card.id = sec.id;

  const header = createEl("header", "sources-card-header");
  const titleGroup = createEl("div", "sources-card-title-group");
  titleGroup.appendChild(createEl("span", "sources-num-badge", sec.num));
  const iconSpan = createEl("span", "sources-card-icon", sec.icon);
  iconSpan.setAttribute("aria-hidden", "true");
  titleGroup.appendChild(iconSpan);

  const titleStack = createEl("div", "sources-card-title-stack");
  titleStack.appendChild(createEl("span", "section-eyebrow", sec.eyebrow));
  titleStack.appendChild(createEl("h2", "sources-card-title", sec.title));
  titleGroup.appendChild(titleStack);

  header.appendChild(titleGroup);
  header.appendChild(createEl("span", "sources-card-subtitle", sec.subtitle));
  card.appendChild(header);

  const body = createEl("div", "sources-card-body");

  if (sec.figure) {
    const split = createEl("div", "sources-split-grid");
    const proseCol = createEl("div", "sources-prose-col");
    sec.paragraphs.forEach((p) => proseCol.appendChild(createEl("p", "sources-prose", p)));

    const fig = createEl("figure", "sources-figure");
    const figMedia = createEl("div", "sources-figure-media");
    figMedia.appendChild(
      buildImageElement(sec.figure.url, sec.figure.alt, sec.title),
    );
    fig.appendChild(figMedia);
    fig.appendChild(createEl("figcaption", "sources-figure-caption", sec.figure.caption));

    split.appendChild(proseCol);
    split.appendChild(fig);
    body.appendChild(split);
  } else {
    const proseCol = createEl("div", "sources-prose-col");
    sec.paragraphs.forEach((p) => proseCol.appendChild(createEl("p", "sources-prose", p)));
    body.appendChild(proseCol);
  }

  if (Array.isArray(sec.pipelineSteps) && sec.pipelineSteps.length > 0) {
    const strip = createEl("div", "sources-pipeline-strip");
    sec.pipelineSteps.forEach((st) => {
      const node = createEl("div", "sources-pipeline-node");
      node.appendChild(createEl("span", "sources-pipeline-step", st.step));
      node.appendChild(createEl("span", "sources-pipeline-detail", st.detail));
      strip.appendChild(node);
    });
    body.appendChild(strip);
  }

  if (Array.isArray(sec.specs) && sec.specs.length > 0) {
    const specsGrid = createEl("div", "sources-specs-grid");
    sec.specs.forEach((sp) => {
      const box = createEl("div", "sources-endpoint-card");
      box.appendChild(createEl("span", "sources-spec-label", sp.label));
      box.appendChild(createEl("span", "sources-spec-value", sp.value));
      specsGrid.appendChild(box);
    });
    body.appendChild(specsGrid);
  }

  if (Array.isArray(sec.actions) && sec.actions.length > 0) {
    const cardActions = createEl("div", "sources-card-actions");
    sec.actions.forEach((act) => {
      cardActions.appendChild(
        createSourcesActionButton({
          label: act.label,
          arrow: act.external ? "↗" : "→",
          variant: act.variant || "secondary",
          size: "sm",
          href: act.href || null,
          external: Boolean(act.external),
          onClick:
            act.action === "open-matrix"
              ? () => document.getElementById("sources-map-matrix-btn")?.click()
              : null,
        }),
      );
    });
    body.appendChild(cardActions);
  }

  card.appendChild(body);
  return card;
}

export function renderSourcesPortal(mountEl, { speciesIndex = [] } = {}) {
  if (!mountEl) return;

  try {
    applyPageSeo({
      title: "Sources & Scientific References — Open Botanical Infrastructure | Plantipedia v3.1",
      description:
        "Explore the 8 scientific registries, open-data endpoints, APG IV taxonomic frameworks, and verification standards powering Plantipedia's 400,000+ global flora index and 50 curated 15-chapter monographs.",
      keywords:
        "Plantipedia sources, botanical APIs, GBIF backbone taxonomy, POWO Kew, World Flora Online, Wikidata P225, iNaturalist flora, Encyclopedia of Life, APG IV",
      canonicalFile: "sources/",
      ogType: "website",
      ogTitle: "Sources & Scientific References — Open Botanical Infrastructure | Plantipedia v3.1",
      ogDescription:
        "How Plantipedia indexes 400,000+ vascular plants across GBIF, Global Flora Index, Wikidata, iNaturalist, POWO/Kew, WFO, and EOL with zero-key resilience.",
      ogImage: OG_IMAGE_URL,
      ogImageAlt: "Plantipedia Open Botanical Infrastructure and Scientific Sources",
      twitterImage: TWITTER_IMAGE_URL,
      twitterImageAlt: "Plantipedia Scientific Botanical References",
    });
  } catch {
    // Non-blocking SEO metadata updates
  }

  const speciesCount = Array.isArray(speciesIndex) && speciesIndex.length > 0 ? speciesIndex.length : 50;
  const portal = createEl("div", "sources-portal");
  portal.appendChild(buildSourcesHero(speciesCount));

  const mainSection = createEl("section", "sources-sections-wrap");
  const container = createEl("div", "section-container sources-cards-stack");
  SOURCES_SECTIONS.forEach((sec) => {
    container.appendChild(buildSourceSectionCard(sec));
  });

  // Closing Cross-Navigation Card
  const ctaBanner = createEl("aside", "sources-cta-banner");
  ctaBanner.appendChild(
    createEl(
      "span",
      "section-eyebrow",
      "VERIFY LIVE · EXPLORE ARCHIVE",
    ),
  );
  ctaBanner.appendChild(
    createEl(
      "h2",
      "sources-cta-title",
      "Inspect Live Synthesized Monographs Across Any Worldwide Taxon",
    ),
  );
  ctaBanner.appendChild(
    createEl(
      "p",
      "sources-prose",
      "Every pipeline rule documented above runs live inside your browser. Search any genus, cultivar, rare desert gymnosperm, or South Asian medicinal herb to verify real-time chapter assembly, biome telemetry, and instant APA/MLA/BibTeX citation export.",
    ),
  );
  const ctaActions = createEl("div", "sources-hero-actions");
  ctaActions.appendChild(
    createSourcesActionButton({
      label: "🌐 Launch Live Botanical Server",
      arrow: "→",
      variant: "primary",
      href: "./plant/live/",
    }),
  );
  ctaActions.appendChild(
    createSourcesActionButton({
      label: "⚖️ Open Split Comparator",
      arrow: "→",
      variant: "secondary",
      href: "./compare/",
    }),
  );
  ctaBanner.appendChild(ctaActions);
  container.appendChild(ctaBanner);

  mainSection.appendChild(container);
  portal.appendChild(mainSection);

  mountEl.replaceChildren(portal);
  renderSourcesMapMatrix(portal);
}
