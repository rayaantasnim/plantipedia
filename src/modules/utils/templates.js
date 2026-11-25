/**
 * Programmatic XSS-safe DOM Templating Engine.
 * Builds all sections, cards, skeletons, and error panels using DocumentFragment & textContent.
 * Zero inline HTML templates or innerHTML interpolation.
 */

import { createBookmarkButton } from "./herbarium.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import {
  buildHomeTelemetryStats,
  createTelemetryStatsGrid,
} from "../../core/telemetry/telemetry-stats.js";

const SAFE_PROTOCOL_RE = /^(https?:|\.{0,2}\/|#)/i;
const SVG_NS = "http://www.w3.org/2000/svg";

export const BOTANICAL_THEMES = [
  "emerald",
  "magenta",
  "amber",
  "violet",
  "cyan",
  "crimson",
  "lime",
  "sapphire",
];

export const SPECIES_THEME_MAP = {
  "aloe-vera": "emerald",
  bamboo: "lime",
  banyan: "amber",
  bougainvillea: "magenta",
  lotus: "violet",
  "water-lily": "cyan",
  hibiscus: "crimson",
  mango: "amber",
  rose: "magenta",
  sunflower: "lime",
  periwinkle: "violet",
  marigold: "magenta",
  ixora: "emerald",
  neem: "emerald",
  tulsi: "violet",
  jasmine: "sapphire",
  jackfruit: "cyan",
  coconut: "sapphire",
  orchid: "amber",
  "tea-plant": "crimson",
  ashwagandha: "violet",
  guava: "lime",
  kadamba: "crimson",
  krishnochura: "cyan",
  lychee: "magenta",
  "palmyra-palm": "cyan",
  shimul: "sapphire",
  shiuli: "lime",
  turmeric: "emerald",
  "water-hyacinth": "crimson",
  sal: "amber",
  arjun: "sapphire",
  mahogany: "crimson",
  "date-palm": "lime",
  jamun: "violet",
  bael: "amber",
  pomegranate: "crimson",
  starfruit: "lime",
  aparajita: "sapphire",
  frangipani: "magenta",
  champa: "amber",
  kamini: "emerald",
  amla: "lime",
  ginger: "amber",
  kalmegh: "emerald",
  brahmi: "cyan",
  sundari: "emerald",
  golpata: "sapphire",
  "water-chestnut": "cyan",
  hogla: "violet",
};

export function resolveBotanicalTheme(plantOrTheme, fallbackIdx = 0) {
  if (typeof plantOrTheme === "string" && BOTANICAL_THEMES.includes(plantOrTheme)) {
    return plantOrTheme;
  }
  if (plantOrTheme && typeof plantOrTheme === "object") {
    if (plantOrTheme.themeColor && BOTANICAL_THEMES.includes(plantOrTheme.themeColor)) {
      return plantOrTheme.themeColor;
    }
    const slug = String(plantOrTheme.slug || plantOrTheme.id || "").toLowerCase();
    if (slug && SPECIES_THEME_MAP[slug]) {
      return SPECIES_THEME_MAP[slug];
    }
    if (slug) {
      let hash = 0;
      for (let i = 0; i < slug.length; i += 1) {
        hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
      }
      return BOTANICAL_THEMES[hash % BOTANICAL_THEMES.length];
    }
  }
  return BOTANICAL_THEMES[Math.abs(Number(fallbackIdx) || 0) % BOTANICAL_THEMES.length];
}

export function sanitizeUrl(rawUrl, fallback = "./") {
  const safeFallback =
    fallback && !/^https?:/i.test(fallback) && !fallback.startsWith("#")
      ? resolveRootPath(fallback, "./")
      : fallback;

  if (typeof rawUrl !== "string") return safeFallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return safeFallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed)) {
    return safeFallback;
  }
  if (/^https?:/i.test(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  if (
    SAFE_PROTOCOL_RE.test(trimmed) ||
    /^[a-z0-9_/-]+(?:\.html)?(?:\?[^#]*)?(?:#.*)?$/i.test(trimmed)
  ) {
    return resolveRootPath(trimmed, safeFallback);
  }
  return safeFallback;
}

export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  }
  return el;
}

export function createSearchIconSvg(size = 20, className = "home-search-icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", "11");
  circle.setAttribute("cy", "11");
  circle.setAttribute("r", "8");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "m21 21-4.3-4.3");

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

export function createCloseIconSvg(size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const l1 = document.createElementNS(SVG_NS, "line");
  l1.setAttribute("x1", "18");
  l1.setAttribute("y1", "6");
  l1.setAttribute("x2", "6");
  l1.setAttribute("y2", "18");

  const l2 = document.createElementNS(SVG_NS, "line");
  l2.setAttribute("x1", "6");
  l2.setAttribute("y1", "6");
  l2.setAttribute("x2", "18");
  l2.setAttribute("y2", "18");

  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

export function buildImageElement(
  rawUrl,
  altText,
  fallbackLabel,
  { eager = false } = {},
) {
  const safeSrc = sanitizeUrl(
    rawUrl,
    "./assets/images/placeholder-botanical.svg",
  );
  const img = document.createElement("img");
  img.src = safeSrc;
  img.alt = altText ?? "";
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (eager) {
    img.setAttribute("fetchpriority", "high");
  }
  img.setAttribute("referrerpolicy", "no-referrer");
  if (fallbackLabel) {
    img.setAttribute("data-fallback-label", fallbackLabel);
  }
  return img;
}

export function createSpeciesCardElement(plant, ctaLabel = "Explore Monograph") {
  const slug = plant.slug || plant.id || "";
  const fallbackHref = `./plant/?species=${encodeURIComponent(slug)}`;
  const safeHref = sanitizeUrl(plant.href || fallbackHref, fallbackHref);
  const theme = resolveBotanicalTheme(plant);

  const card = createEl("a", `species-card botanical-theme--${theme}`);
  card.href = safeHref;
  card.setAttribute("aria-label", `Read monograph for ${plant.commonName}`);
  card.setAttribute("data-species-id", plant.id || slug);

  const mediaBox = createEl("div", "species-card-media");
  const imgConfig = plant.image || plant.heroImage || {};
  const rawImgUrl =
    plant.thumbnailUrl || imgConfig.imageUrl || imgConfig.url;
  const imgAlt =
    plant.imageAlt ||
    imgConfig.imageAlt ||
    imgConfig.alt ||
    `${plant.commonName} — ${plant.scientificName}`;
  if (imgConfig.aspectRatio) {
    mediaBox.style.aspectRatio = imgConfig.aspectRatio;
  }

  const img = buildImageElement(
    rawImgUrl,
    imgAlt,
    imgConfig.fallbackLabel || `${plant.commonName} — ${plant.scientificName}`,
  );
  if (imgConfig.photographer) {
    img.setAttribute("data-photographer", imgConfig.photographer);
  }
  mediaBox.appendChild(img);
  mediaBox.appendChild(createBookmarkButton({ ...plant, slug }, "card"));

  const body = createEl("div", "species-card-body");

  const meta = createEl("div", "species-card-meta");
  meta.appendChild(createEl("span", "", plant.category || ""));
  const sep = createEl("span", "meta-sep", "·");
  sep.setAttribute("aria-hidden", "true");
  meta.appendChild(sep);
  meta.appendChild(
    createEl("span", "", plant.family || plant.overview?.family || ""),
  );

  const title = createEl("h3", "species-card-title", plant.commonName);
  const bnSuffix = plant.localName
    ? plant.localName
    : plant.commonNameBn || "";
  const sciText = bnSuffix
    ? `${plant.scientificName} · ${bnSuffix}`
    : plant.scientificName;
  const sci = createEl("p", "species-card-sci", sciText);
  const excerpt = createEl("p", "species-card-excerpt", plant.shortSummary || "");

  const cta = createEl("div", "species-card-cta");
  cta.appendChild(createEl("span", "", plant.ctaLabel || ctaLabel));
  const arrow = createEl("span", "species-card-cta-arrow", "→");
  arrow.setAttribute("aria-hidden", "true");
  cta.appendChild(arrow);

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(sci);
  body.appendChild(excerpt);
  body.appendChild(cta);

  card.appendChild(mediaBox);
  card.appendChild(body);
  return card;
}

/**
 * Lightweight mount-level skeleton loaders rendered immediately during async JSON hydration.
 */
export function renderMountSkeleton(mountEl, sectionKey) {
  if (!mountEl) return;
  const fragment = document.createDocumentFragment();

  if (sectionKey === "hero") {
    const heroShell = createEl("div", "skeleton-hero-shell");
    heroShell.setAttribute("aria-hidden", "true");
    ["skeleton-line--xs", "skeleton-line--lg", "skeleton-line--md", "skeleton-line--sm"].forEach(
      (cls) => heroShell.appendChild(createEl("div", `skeleton-line ${cls} skeleton-shimmer`)),
    );
    heroShell.appendChild(createEl("div", "skeleton-hero-bar skeleton-shimmer"));
    fragment.appendChild(heroShell);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "home-telemetry") {
    const band = createEl("div", "home-telemetry-section");
    band.setAttribute("aria-hidden", "true");
    const container = createEl("div", "section-container");
    const bar = createEl("div", "skeleton-hero-bar skeleton-shimmer");
    bar.style.maxWidth = "100%";
    bar.style.height = "128px";
    bar.style.borderRadius = "18px";
    container.appendChild(bar);
    band.appendChild(container);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "directory-banner" || sectionKey === "page-banner") {
    const band = createEl("div", "skeleton-section-band");
    band.setAttribute("aria-hidden", "true");
    const stack = createEl("div", "skeleton-header-stack");
    ["skeleton-line--xs", "skeleton-line--lg", "skeleton-line--md"].forEach(
      (cls) => stack.appendChild(createEl("div", `skeleton-line ${cls} skeleton-shimmer`)),
    );
    band.appendChild(stack);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "global-gateway" || sectionKey === "next-milestone") {
    const band = createEl("div", "skeleton-section-band");
    band.setAttribute("aria-hidden", "true");
    const card = createEl("div", "skeleton-card skeleton-card--panel");
    ["skeleton-line--xs", "skeleton-line--lg", "skeleton-line--md", "skeleton-hero-bar"].forEach(
      (cls) => card.appendChild(createEl("div", `${cls.startsWith("skeleton-hero") ? cls : `skeleton-line ${cls}`} skeleton-shimmer`)),
    );
    band.appendChild(card);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  const band = createEl("div", "skeleton-section-band");
  band.setAttribute("aria-hidden", "true");

  const headerStack = createEl("div", "skeleton-header-stack");
  headerStack.appendChild(createEl("div", "skeleton-line skeleton-line--xs skeleton-shimmer"));
  headerStack.appendChild(createEl("div", "skeleton-line skeleton-line--sm skeleton-shimmer"));
  band.appendChild(headerStack);

  if (sectionKey === "plant-monograph") {
    const media = createEl("div", "skeleton-media skeleton-shimmer");
    media.style.borderRadius = "20px";
    media.style.marginBottom = "24px";
    band.appendChild(media);
    ["skeleton-line--lg", "skeleton-line--md", "skeleton-line--md", "skeleton-line--sm"].forEach(
      (cls) => {
        const line = createEl("div", `skeleton-line ${cls} skeleton-shimmer`);
        line.style.marginBottom = "12px";
        band.appendChild(line);
      },
    );
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  if (sectionKey === "trivia") {
    const stack = createEl("div", "skeleton-stack");
    for (let i = 0; i < 4; i += 1) {
      const card = createEl("div", "skeleton-card skeleton-card--strip");
      card.appendChild(createEl("div", "skeleton-pill skeleton-shimmer"));
      const body = createEl("div", "skeleton-body");
      ["skeleton-line--lg", "skeleton-line--md", "skeleton-line--md"].forEach(
        (cls) => body.appendChild(createEl("div", `skeleton-line ${cls} skeleton-shimmer`)),
      );
      card.appendChild(body);
      card.appendChild(createEl("div", "skeleton-thumb skeleton-shimmer"));
      stack.appendChild(card);
    }
    band.appendChild(stack);
    fragment.appendChild(band);
    mountEl.replaceChildren(fragment);
    return;
  }

  const useTwoCol =
    sectionKey === "taxonomy" ||
    sectionKey === "about" ||
    sectionKey === "directory-explorer" ||
    sectionKey === "taxonomy-explorer" ||
    sectionKey === "compare-workspace" ||
    sectionKey === "services-portal";
  const count =
    sectionKey === "featured-species" ||
    sectionKey === "highlights" ||
    sectionKey === "seasons-calendar"
      ? 3
      : sectionKey === "compare-workspace"
        ? 2
        : 4;
  const grid = createEl("div", useTwoCol ? "skeleton-grid-2" : "skeleton-grid-3");

  for (let i = 0; i < count; i += 1) {
    if (sectionKey === "featured-species" || sectionKey === "directory-explorer") {
      const card = createEl("div", "skeleton-card skeleton-card--species");
      card.appendChild(createEl("div", "skeleton-media skeleton-shimmer"));
      const body = createEl("div", "skeleton-body");
      ["skeleton-line--xs", "skeleton-line--lg", "skeleton-line--sm", "skeleton-line--md"].forEach(
        (cls) => body.appendChild(createEl("div", `skeleton-line ${cls} skeleton-shimmer`)),
      );
      card.appendChild(body);
      grid.appendChild(card);
    } else {
      const card = createEl("div", "skeleton-card skeleton-card--panel");
      card.appendChild(createEl("div", "skeleton-media skeleton-media--panel skeleton-shimmer"));
      card.appendChild(createEl("div", "skeleton-pill skeleton-shimmer"));
      card.appendChild(createEl("div", "skeleton-line skeleton-line--lg skeleton-shimmer"));
      card.appendChild(createEl("div", "skeleton-line skeleton-line--md skeleton-shimmer"));
      card.appendChild(createEl("div", "skeleton-line skeleton-line--sm skeleton-shimmer"));
      grid.appendChild(card);
    }
  }

  band.appendChild(grid);
  fragment.appendChild(band);
  mountEl.replaceChildren(fragment);
}

/**
 * Renders section error fallback UI with retry action trigger.
 */
export function renderMountError(mountEl, sectionKey, errorMessage) {
  if (!mountEl) return;
  const band = createEl("div", "skeleton-section-band");
  const card = createEl("div", "section-error-card");
  card.setAttribute("role", "alert");

  card.appendChild(createEl("span", "section-error-badge", "Archive Notice"));
  card.appendChild(createEl("h3", "section-error-title", "Unable to Load Section Data"));
  card.appendChild(
    createEl(
      "p",
      "section-error-message",
      errorMessage || "An unexpected error occurred while loading this botanical dataset.",
    ),
  );

  const retryBtn = createEl("button", "section-retry-btn", "Retry Loading");
  retryBtn.type = "button";
  retryBtn.setAttribute("data-action", "retry-section");
  retryBtn.setAttribute("data-section-key", sectionKey);
  card.appendChild(retryBtn);

  band.appendChild(card);
  mountEl.replaceChildren(band);
}

/**
 * 1. Home Hero Banner Section (./data/pages/home.json)
 */
export function renderHeroSection(mountEl, { pageData }) {
  const hero = pageData?.hero;
  if (!mountEl || !hero) return;

  const wrapper = createEl("div", "home-hero");
  wrapper.id = hero.anchorId || "hero-search";

  if (hero.backdropImage?.imageUrl) {
    const backdrop = createEl("div", "hero-backdrop-media");
    backdrop.setAttribute("aria-hidden", "true");
    const bgImg = buildImageElement(
      hero.backdropImage.imageUrl,
      hero.backdropImage.imageAlt || "",
      "Plantipedia Botanical Canopy Backdrop",
      { eager: true },
    );
    bgImg.className = "hero-backdrop-img";
    backdrop.appendChild(bgImg);
    backdrop.appendChild(createEl("div", "hero-backdrop-scrim"));
    wrapper.appendChild(backdrop);
  }

  const inner = createEl("div", "home-hero-inner");
  inner.appendChild(createEl("span", "hero-kicker", hero.kicker));
  inner.appendChild(createEl("h1", "hero-headline", hero.headline));
  inner.appendChild(createEl("p", "hero-subcopy", hero.subcopy));

  const searchCfg = hero.search || {};
  const searchShell = createEl("div", "home-search-shell");
  const form = createEl("form", "home-search-form");
  form.id = "homeSearchForm";
  form.setAttribute("role", "search");
  form.appendChild(createSearchIconSvg(20, "home-search-icon"));

  const input = document.createElement("input");
  input.type = "search";
  input.id = "homeSearchInput";
  input.placeholder =
    searchCfg.placeholder || "Search species by common name, scientific name, or family...";
  input.autocomplete = "off";
  input.setAttribute("aria-label", searchCfg.ariaLabel || "Search botanical species");

  const clearBtn = createEl("button", "home-search-clear", searchCfg.clearLabel || "Clear");
  clearBtn.type = "button";
  clearBtn.id = "homeSearchClear";
  clearBtn.hidden = true;

  const submitBtn = createEl("button", "home-search-submit", searchCfg.submitLabel || "Search");
  submitBtn.type = "submit";

  form.appendChild(input);
  form.appendChild(clearBtn);
  form.appendChild(submitBtn);

  const suggestions = createEl("div", "home-suggestions");
  suggestions.id = "homeSuggestions";
  suggestions.setAttribute("role", "listbox");
  suggestions.setAttribute(
    "aria-label",
    searchCfg.suggestionsLabel || "Matching plant species",
  );
  suggestions.hidden = true;

  searchShell.appendChild(form);
  searchShell.appendChild(suggestions);
  inner.appendChild(searchShell);

  if (Array.isArray(hero.summaryBadges) && hero.summaryBadges.length > 0) {
    const strip = createEl("div", "hero-summary-strip");
    hero.summaryBadges.forEach((badge, idx) => {
      if (idx > 0) {
        const sep = createEl("span", "hero-summary-sep", "•");
        sep.setAttribute("aria-hidden", "true");
        strip.appendChild(sep);
      }
      strip.appendChild(createEl("span", "", badge));
    });
    inner.appendChild(strip);
  }

  wrapper.appendChild(inner);
  mountEl.replaceChildren(wrapper);
}

/**
 * 1b. Home Archive Telemetry Stats Grid (GSAP + ScrollTrigger)
 */
export function renderHomeTelemetrySection(mountEl, { catalog }) {
  if (!mountEl) return;
  const wrapper = createEl("div", "home-telemetry-section");
  const container = createEl("div", "section-container");
  container.appendChild(
    createTelemetryStatsGrid(buildHomeTelemetryStats(catalog), {
      ariaLabel: "Plantipedia archive telemetry metrics",
      sectionId: "homeTelemetryGrid",
    }),
  );
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 2. Home About / Botanical Mission Section (./data/pages/home.json + ./data/catalog/species-index.json)
 */
export function renderAboutSection(mountEl, { pageData, catalog }) {
  const about = pageData?.about;
  if (!mountEl || !about) return;

  const wrapper = createEl("div", "overview-section");
  wrapper.id = about.anchorId || "about-plantipedia";

  const container = createEl("div", "section-container");
  const grid = createEl("div", "mission-grid");

  const copyCol = createEl("div", "mission-copy-col");
  copyCol.appendChild(createEl("span", "section-eyebrow", about.eyebrow));
  copyCol.appendChild(createEl("h2", "section-heading", about.heading));
  (about.paragraphs || []).forEach((text) => {
    copyCol.appendChild(createEl("p", "justified-prose", text));
  });

  const statsCol = createEl("div", "mission-stats-col");
  const catalogCount = Array.isArray(catalog) ? catalog.length : 0;

  const missionThemes = ["emerald", "amber", "cyan", "violet"];
  (about.stats || []).forEach((stat, idx) => {
    const theme = resolveBotanicalTheme(
      stat.themeColor || missionThemes[idx % missionThemes.length],
      idx,
    );
    const card = createEl("article", `mission-stat-card botanical-theme--${theme}`);
    const displayVal =
      stat.dynamicCatalogCount && catalogCount > 0 ? String(catalogCount) : stat.value;
    const numEl = createEl("span", "mission-stat-number", displayVal);
    if (stat.id) numEl.id = stat.id;

    const textWrap = document.createElement("div");
    textWrap.appendChild(createEl("h3", "mission-stat-title", stat.title));
    textWrap.appendChild(createEl("p", "mission-stat-desc", stat.description));

    card.appendChild(numEl);
    card.appendChild(textWrap);
    statsCol.appendChild(card);
  });

  grid.appendChild(copyCol);
  grid.appendChild(statsCol);
  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 3. Top 3 Curated Featured Species Section (./data/catalog/featured-species.json)
 */
export function renderFeaturedSpeciesSection(mountEl, { sectionData, catalog }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};
  const totalCatalogCount = Array.isArray(catalog) ? catalog.length : 0;
  const indexedTotal =
    totalCatalogCount > 0 ? totalCatalogCount : meta.totalIndexedSpecies || items.length;

  const wrapper = createEl("div", "explorer-section");
  wrapper.id = meta.id || "featured-species";

  const container = createEl("div", "section-container");
  const header = createEl("div", "showcase-header");
  const headerText = document.createElement("div");
  headerText.appendChild(
    createEl("span", "section-eyebrow", meta.eyebrow || "02. Flagship Archive Selection"),
  );
  headerText.appendChild(
    createEl("h2", "section-heading", meta.heading || "Top 3 Curated Featured Species"),
  );

  const countEl = createEl(
    "p",
    "explorer-count",
    `Showing ${items.length} flagship monographs of ${indexedTotal} indexed species`,
  );
  countEl.id = "featuredCount";

  header.appendChild(headerText);
  header.appendChild(countEl);
  container.appendChild(header);

  const grid = createEl("div", "species-grid");
  grid.id = "featuredSpeciesGrid";
  grid.setAttribute("aria-live", "polite");
  items.forEach((plant) => {
    grid.appendChild(createSpeciesCardElement(plant, "Explore Monograph"));
  });
  container.appendChild(grid);

  if (meta.archiveCta) {
    const ctaWrap = createEl("div", "featured-cta-wrap");
    const ctaLink = createEl("a", "cta-glow-button");
    ctaLink.href = sanitizeUrl(meta.archiveCta.href, "./species/");
    ctaLink.appendChild(
      createEl("span", "", meta.archiveCta.label || "Explore All Available Species"),
    );
    const arrow = createEl("span", "cta-glow-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    ctaLink.appendChild(arrow);
    ctaWrap.appendChild(ctaLink);
    container.appendChild(ctaWrap);
  }

  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 4. Botanical Taxonomic Domains Section (./data/catalog/taxonomy.json)
 */
export function renderTaxonomySection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "domains-section");
  wrapper.id = "botanical-domains";

  const container = createEl("div", "section-container");
  const header = createEl("div", "domains-header");
  header.appendChild(
    createEl("span", "section-eyebrow", meta.eyebrow || "03. Taxonomic Flora Realms"),
  );
  header.appendChild(
    createEl("h2", "section-heading", meta.heading || "Botanical Taxonomic Domains"),
  );
  if (meta.description) {
    header.appendChild(createEl("p", "justified-prose domains-intro", meta.description));
  }
  container.appendChild(header);

  const grid = createEl("div", "domains-grid");
  grid.id = "botanicalDomainsGrid";
  grid.setAttribute("aria-live", "polite");

  const domainThemes = ["magenta", "amber", "emerald", "cyan"];
  items.forEach((domain, idx) => {
    const fallbackHref = domain.category
      ? `./species/?category=${encodeURIComponent(domain.category)}`
      : "./species/";
    const theme = resolveBotanicalTheme(
      domain.themeColor || domainThemes[idx % domainThemes.length],
      idx,
    );
    const cardLink = createEl("a", `domain-card botanical-theme--${theme}`);
    cardLink.href = sanitizeUrl(domain.href, fallbackHref);
    cardLink.setAttribute("data-domain-id", domain.id || "");

    if (domain.image?.imageUrl || domain.image?.url) {
      const mediaBox = createEl("div", "domain-card-media");
      mediaBox.style.aspectRatio = domain.image.aspectRatio || "16 / 9";
      const img = buildImageElement(
        domain.image.imageUrl || domain.image.url,
        domain.image.imageAlt || domain.image.alt || domain.title,
        domain.image.fallbackLabel || domain.title,
      );
      if (domain.image.photographer) {
        img.setAttribute("data-photographer", domain.image.photographer);
      }
      mediaBox.appendChild(img);
      cardLink.appendChild(mediaBox);
    }

    const content = createEl("div", "domain-card-content");
    content.appendChild(createEl("span", "highlight-index", String(idx + 1).padStart(2, "0")));
    content.appendChild(createEl("h3", "domain-card-title", domain.title));
    content.appendChild(createEl("p", "domain-card-desc", domain.description));

    const cta = createEl("span", "domain-card-cta");
    cta.appendChild(createEl("span", "", domain.ctaLabel || "Browse Domain"));
    const arrow = createEl("span", "", "→");
    arrow.setAttribute("aria-hidden", "true");
    cta.appendChild(arrow);
    content.appendChild(cta);

    cardLink.appendChild(content);
    grid.appendChild(cardLink);
  });

  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 4b. Worldwide Botanical Server Gateway Section (./data/pages/home.json)
 * 2-Column Architectural Split: Left federated backbones + lookup console; Right 16/10 plate + Quick-Launch + Dual CTAs.
 */
export function renderGlobalGatewaySection(mountEl, { pageData } = {}) {
  if (!mountEl) return;
  const gateway = pageData?.globalGateway || {};
  const searchCfg = gateway.search || {};
  const backbones = Array.isArray(gateway.backbones) && gateway.backbones.length > 0
    ? gateway.backbones
    : [
        {
          id: "gbif",
          label: "GBIF Backbone",
          detail: "Resolves accepted Kingdom Plantae binomials, synonym keys, and authoritative global occurrence hierarchies.",
        },
        {
          id: "global-flora-index",
          label: "Global Flora Index",
          detail: "Synthesizes structured 15-chapter morphological, ecological, and ethnobotanical prose across worldwide taxa.",
        },
        {
          id: "wikidata",
          label: "Wikidata Graph",
          detail: "Bridges persistent P225 taxonomic nodes with bilingual EN / বাংলা nomenclature and IUCN Red List statuses.",
        },
        {
          id: "inaturalist",
          label: "iNaturalist Taxa",
          detail: "Supplies research-grade field specimen plates covering floral structures, foliage, bark, and natural habitats.",
        },
        {
          id: "kew-powo",
          label: "Kew POWO",
          detail: "Cross-verifies APG IV family placements, native biogeographic distributions, and botanical synonymy.",
        },
      ];
  const expeditions = Array.isArray(gateway.expeditions) && gateway.expeditions.length > 0
    ? gateway.expeditions
    : ["Welwitschia mirabilis", "Dionaea muscipula", "Adansonia digitata", "Ginkgo biloba", "Rafflesia arnoldii"];
  const paragraphs = Array.isArray(gateway.paragraphs) && gateway.paragraphs.length > 0
    ? gateway.paragraphs
    : [
        "While Plantipedia's core archive curates 50 deeply authored 15-chapter botanical monographs, the living plant kingdom encompasses more than 400,000 vascular plant and tree taxa worldwide. This federated lookup console links directly to the Global Botanical Server so every search resolves accepted Linnaean binomials, hierarchical classifications, and verified field photography on demand.",
        "Every query bypasses the local 50-species index without API keys or paywalls—aggregating multi-source taxonomic graphs, cross-script English and বাংলা vernacular matching, and biome-calibrated cultivation telemetry ready for full-page reading or split-screen comparison.",
      ];
  const imgCfg = gateway.image || {
    url: "https://inaturalist-open-data.s3.amazonaws.com/photos/625322666/original.jpg",
    alt: "Welwitschia mirabilis field specimen representing the 400,000+ Worldwide Flora Registry",
    caption: "Fig. GW-01 — Endemic arid gymnosperm Welwitschia mirabilis indexed on demand through the 400K+ Global Botanical Server.",
  };
  const ctas = Array.isArray(gateway.ctas) && gateway.ctas.length > 0
    ? gateway.ctas
    : [
        { label: "🌐 Open Global Botanical Server", href: "./plant/live/", variant: "primary" },
        { label: "📖 Explore Sources & References", href: "./sources/", variant: "secondary" },
      ];

  const wrapper = createEl("div", "global-gateway-section");
  wrapper.id = gateway.anchorId || "worldwide-gateway";

  const container = createEl("div", "section-container");
  const card = createEl("div", "global-gateway-card");
  const split = createEl("div", "global-gateway-split");

  // Left Architectural Column
  const leftCol = createEl("div", "global-gateway-left");
  const topMeta = createEl("div", "global-gateway-meta-row");
  topMeta.appendChild(
    createEl(
      "span",
      "global-gateway-eyebrow",
      gateway.eyebrow || "WORLDWIDE FLORA REGISTRY · 400K+ INDEXED TAXA",
    ),
  );
  topMeta.appendChild(
    createEl(
      "span",
      "global-gateway-status-tag",
      gateway.statusTag || "ZERO-KEY LIVE UPLINK · STRICT LOCAL BYPASS",
    ),
  );
  leftCol.appendChild(topMeta);

  leftCol.appendChild(
    createEl(
      "h2",
      "section-heading global-gateway-heading",
      gateway.heading || "Global Botanical Server Gateway",
    ),
  );

  const proseWrap = createEl("div", "global-gateway-prose");
  paragraphs.forEach((pText) => {
    proseWrap.appendChild(createEl("p", "justified-prose global-gateway-p", pText));
  });
  leftCol.appendChild(proseWrap);

  const backboneBlock = createEl("div", "global-backbone-block");
  backboneBlock.appendChild(
    createEl(
      "span",
      "global-backbone-label",
      gateway.backboneLabel || "Federated Botanical Backbone",
    ),
  );
  const backbonePills = createEl("div", "global-backbone-pills");
  backbonePills.setAttribute("role", "tablist");
  backbonePills.setAttribute("aria-label", "Federated botanical sources");

  const backboneCaption = createEl(
    "p",
    "global-backbone-caption",
    backbones[0]?.detail || "",
  );
  backboneCaption.setAttribute("aria-live", "polite");

  backbones.forEach((bb, idx) => {
    const pill = createEl(
      "button",
      `global-backbone-pill${idx === 0 ? " is-active" : ""}`,
      bb.label,
    );
    pill.type = "button";
    pill.setAttribute("role", "tab");
    pill.setAttribute("aria-selected", idx === 0 ? "true" : "false");
    pill.addEventListener("click", () => {
      backbonePills.querySelectorAll(".global-backbone-pill").forEach((el) => {
        el.classList.remove("is-active");
        el.setAttribute("aria-selected", "false");
      });
      pill.classList.add("is-active");
      pill.setAttribute("aria-selected", "true");
      backboneCaption.textContent = bb.detail || "";
    });
    backbonePills.appendChild(pill);
  });
  backboneBlock.appendChild(backbonePills);
  backboneBlock.appendChild(backboneCaption);
  leftCol.appendChild(backboneBlock);

  const form = createEl("form", "global-gateway-form");
  form.id = "globalGatewayForm";
  form.setAttribute("role", "search");
  form.setAttribute("novalidate", "novalidate");

  const inputWrap = createEl("div", "global-gateway-input-wrap");
  const globeSvg = document.createElementNS(SVG_NS, "svg");
  globeSvg.setAttribute("class", "global-gateway-icon");
  globeSvg.setAttribute("viewBox", "0 0 24 24");
  globeSvg.setAttribute("width", "20");
  globeSvg.setAttribute("height", "20");
  globeSvg.setAttribute("fill", "none");
  globeSvg.setAttribute("stroke", "currentColor");
  globeSvg.setAttribute("stroke-width", "1.9");
  globeSvg.setAttribute("stroke-linecap", "round");
  globeSvg.setAttribute("stroke-linejoin", "round");
  globeSvg.setAttribute("aria-hidden", "true");
  const c1 = document.createElementNS(SVG_NS, "circle");
  c1.setAttribute("cx", "12");
  c1.setAttribute("cy", "12");
  c1.setAttribute("r", "10");
  const p1 = document.createElementNS(SVG_NS, "path");
  p1.setAttribute("d", "M2 12h20");
  const p2 = document.createElementNS(SVG_NS, "path");
  p2.setAttribute("d", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z");
  globeSvg.appendChild(c1);
  globeSvg.appendChild(p1);
  globeSvg.appendChild(p2);

  const input = document.createElement("input");
  input.type = "search";
  input.id = "global-gateway-input";
  input.className = "global-gateway-input";
  input.placeholder =
    searchCfg.placeholder ||
    "Query any worldwide species (e.g., Welwitschia mirabilis, Adansonia digitata, Ginkgo biloba)...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute(
    "aria-label",
    searchCfg.ariaLabel || "Query Global Botanical Server by plant name",
  );

  const submitBtn = createEl(
    "button",
    "global-gateway-submit",
    searchCfg.submitLabel || "Query Global Server →",
  );
  submitBtn.type = "submit";

  inputWrap.appendChild(globeSvg);
  inputWrap.appendChild(input);
  form.appendChild(inputWrap);
  form.appendChild(submitBtn);

  const hintEl = createEl("p", "global-gateway-validation");
  hintEl.setAttribute("aria-live", "polite");
  hintEl.hidden = true;

  const launchGatewayQuery = (rawValue) => {
    const clean = String(rawValue || "").trim().replace(/\s+/g, " ");
    if (clean.length < 2) {
      hintEl.textContent =
        searchCfg.validationHint ||
        "Enter at least 2 characters of a common or Latin botanical name to query the Global Botanical Server.";
      hintEl.hidden = false;
      input.focus();
      return;
    }
    hintEl.hidden = true;
    const targetUrl = resolveRootPath(
      `./plant/live/?q=${encodeURIComponent(clean)}&source=gateway`,
    );
    window.location.href = targetUrl;
  };

  input.addEventListener("input", () => {
    if (!hintEl.hidden && String(input.value || "").trim().length >= 2) {
      hintEl.hidden = true;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    launchGatewayQuery(input.value);
  });

  leftCol.appendChild(form);
  leftCol.appendChild(hintEl);

  // Right Architectural Column (16/10 specimen figure + Quick-Launch Chips + Dual CTAs)
  const rightCol = createEl("div", "global-gateway-right");

  const fig = createEl("figure", "global-gateway-figure");
  const mediaBox = createEl("div", "global-gateway-media-box");
  const plateImg = buildImageElement(
    imgCfg.url,
    imgCfg.alt || "Worldwide botanical specimen",
    "Worldwide Flora Registry Specimen",
  );
  mediaBox.appendChild(plateImg);
  fig.appendChild(mediaBox);
  if (imgCfg.caption) {
    fig.appendChild(createEl("figcaption", "global-gateway-figcaption", imgCfg.caption));
  }
  rightCol.appendChild(fig);

  const quickPanel = createEl("div", "global-quicklaunch-panel");
  const quickHead = createEl("div", "global-quicklaunch-head");
  quickHead.appendChild(
    createEl(
      "span",
      "global-quicklaunch-title",
      gateway.expeditionsLabel || "Instant Global Taxon Quick-Launch",
    ),
  );
  quickHead.appendChild(createEl("span", "global-quicklaunch-badge", "LIVE MONOGRAPH →"));
  quickPanel.appendChild(quickHead);

  const chipsWrap = createEl("div", "global-expedition-chips");
  expeditions.forEach((speciesName) => {
    const chipBtn = createEl("button", "global-expedition-chip", speciesName);
    chipBtn.type = "button";
    chipBtn.setAttribute(
      "aria-label",
      `Query Global Botanical Server for ${speciesName}`,
    );
    chipBtn.addEventListener("click", () => {
      input.value = speciesName;
      launchGatewayQuery(speciesName);
    });
    chipsWrap.appendChild(chipBtn);
  });
  quickPanel.appendChild(chipsWrap);
  rightCol.appendChild(quickPanel);

  const ctaRow = createEl("div", "global-gateway-cta-row");
  ctas.forEach((cta) => {
    const link = createEl(
      "a",
      `global-gateway-cta-btn global-gateway-cta-btn--${cta.variant === "primary" ? "primary" : "secondary"}`,
      cta.label,
    );
    link.href = sanitizeUrl(cta.href, "./plant/live/");
    ctaRow.appendChild(link);
  });
  rightCol.appendChild(ctaRow);

  split.appendChild(leftCol);
  split.appendChild(rightCol);
  card.appendChild(split);
  container.appendChild(card);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 4c. Home "Next Milestone" Spotlight Section (Strictly Version 3.2 preview + Readiness Bar + Dual CTAs)
 */
export function renderNextMilestoneSection(mountEl, { pageData } = {}) {
  if (!mountEl) return;
  const milestone = pageData?.nextMilestone || {};
  const readiness = milestone.readiness || {
    label: "Version 3.2 Core Architecture Readiness",
    percent: 72,
    statusText: "72% Spec Locked · Next After v3.1",
  };

  const pillars =
    Array.isArray(milestone.pillars) && milestone.pillars.length > 0
      ? milestone.pillars
      : [
          {
            number: "1",
            kicker: "CONCURRENT RESOLUTION",
            title: "⚡ 5-Source Parallel Aggregation",
            description:
              "Executes simultaneous browser requests across GBIF Backbone, Global Flora Index, Wikidata P225, iNaturalist Taxa, and Kew POWO to assemble unified botanical dossiers without single-endpoint bottlenecks.",
          },
          {
            number: "2",
            kicker: "BILINGUAL LEXICON",
            title: "🌐 Cross-Script EN / বাংলা Alignment",
            description:
              "Expands semantic sitelink mapping between Linnaean binomials, English vernaculars, and Bengali Unicode nomenclature so every global taxon renders accurate bilingual headers and phonetic cues.",
          },
          {
            number: "3",
            kicker: "INSTANT NAVIGATION",
            title: "🔍 Typo-Tolerant Fuzzy Search & Shortcuts",
            description:
              "Combines client-side edit-distance matching for misspelled Latin or local plant names with an instant '/' keyboard focus shortcut active across every Plantipedia archive page.",
          },
        ];

  const timelineSteps =
    Array.isArray(milestone.timeline) && milestone.timeline.length > 0
      ? milestone.timeline
      : [
          { version: "v1.0", state: "past" },
          { version: "v2.0", state: "past" },
          { "version": "v3.0", "state": "past" },
          { version: "v3.1 (Current)", state: "current" },
          { version: "v3.2 (Next)", state: "next" },
          { version: "v4.0", state: "future" },
          { version: "v4.1", state: "future" },
          { version: "v4.2", state: "future" },
          { version: "v4.3", state: "future" },
        ];

  const wrapper = createEl("div", "next-milestone-section");
  wrapper.id = milestone.anchorId || "next-milestone";

  const container = createEl("div", "section-container");
  const card = createEl("div", "next-milestone-card");

  const metaRow = createEl("div", "next-milestone-meta-row");
  const badge = createEl("span", "next-milestone-badge");
  const pulseDot = createEl("span", "next-milestone-badge-dot");
  pulseDot.setAttribute("aria-hidden", "true");
  badge.appendChild(pulseDot);
  badge.appendChild(
    createEl("span", "", milestone.eyebrow || "NEXT MILESTONE · VERSION 3.2 SPOTLIGHT"),
  );
  metaRow.appendChild(badge);
  metaRow.appendChild(
    createEl(
      "span",
      "next-milestone-version-tag",
      milestone.statusTag || "IN ACTIVE ARCHITECTURE · SCHEDULED NEXT RELEASE",
    ),
  );
  card.appendChild(metaRow);

  const head = createEl("div", "next-milestone-head");
  const copyCol = createEl("div", "next-milestone-copy");
  copyCol.appendChild(
    createEl(
      "h2",
      "section-heading",
      milestone.heading || "Next Up: Version 3.2 — Multi-Source Parallel Botanical Engine",
    ),
  );
  copyCol.appendChild(
    createEl(
      "p",
      "justified-prose next-milestone-overview",
      milestone.description ||
        "Immediately following Version 3.1, Plantipedia Version 3.2 upgrades the live lookup stack into a parallel multi-source botanical engine uniting GBIF, the Global Flora Index, Wikidata, iNaturalist, and Kew POWO. Alongside concurrent resolution across 400,000+ vascular taxa, v3.2 introduces automated cross-script EN / বাংলা alignment and typo-tolerant Levenshtein fuzzy search bound to the global '/' shortcut.",
    ),
  );
  head.appendChild(copyCol);
  card.appendChild(head);

  const readinessBar = createEl("div", "next-milestone-readiness");
  const readinessHead = createEl("div", "next-milestone-readiness-head");
  readinessHead.appendChild(createEl("span", "", readiness.label || "Version 3.2 Core Architecture Readiness"));
  readinessHead.appendChild(createEl("span", "", readiness.statusText || `${readiness.percent || 72}% Spec Locked`));
  const readinessTrack = createEl("div", "next-milestone-readiness-track");
  readinessTrack.setAttribute("role", "progressbar");
  readinessTrack.setAttribute("aria-valuemin", "0");
  readinessTrack.setAttribute("aria-valuemax", "100");
  readinessTrack.setAttribute("aria-valuenow", String(readiness.percent || 72));
  const readinessFill = createEl("div", "next-milestone-readiness-fill");
  readinessFill.style.width = `${Math.min(100, Math.max(10, Number(readiness.percent) || 72))}%`;
  readinessTrack.appendChild(readinessFill);
  readinessBar.appendChild(readinessHead);
  readinessBar.appendChild(readinessTrack);
  card.appendChild(readinessBar);

  const pillarsGrid = createEl("div", "next-milestone-pillars");
  pillars.forEach((pillar, idx) => {
    const pCard = createEl("article", "next-milestone-pillar");
    const pTop = createEl("div", "next-milestone-pillar-top");
    pTop.appendChild(createEl("span", "next-milestone-pillar-kicker", pillar.kicker || ""));
    pTop.appendChild(createEl("span", "next-milestone-pillar-num", pillar.number || String(idx + 1)));
    pCard.appendChild(pTop);
    pCard.appendChild(createEl("h3", "next-milestone-pillar-title", pillar.title || ""));
    pCard.appendChild(createEl("p", "justified-prose next-milestone-pillar-desc", pillar.description || ""));
    pillarsGrid.appendChild(pCard);
  });
  card.appendChild(pillarsGrid);

  const timeline = createEl("div", "next-milestone-timeline");
  timeline.setAttribute("aria-label", "Plantipedia release timeline from v1.0 to v4.3");
  timelineSteps.forEach((step, idx) => {
    if (idx > 0) {
      const sep = createEl("span", "timeline-arrow", "→");
      sep.setAttribute("aria-hidden", "true");
      timeline.appendChild(sep);
    }
    const stateCls =
      step.state === "current"
        ? " is-current"
        : step.state === "next"
          ? " is-next"
          : step.state === "past"
            ? " is-past"
            : "";
    timeline.appendChild(createEl("span", `timeline-step-pill${stateCls}`, step.version));
  });
  card.appendChild(timeline);

  const ctaRow = createEl("div", "next-milestone-cta-row");
  const primaryBtn = createEl("a", "cta-glow-button");
  primaryBtn.href = sanitizeUrl(milestone.ctaHref || "./roadmap/", "./roadmap/");
  primaryBtn.appendChild(
    createEl("span", "", milestone.ctaLabel || "🚀 View Full Release Roadmap (v3.1 → v4.3)"),
  );
  const arrow = createEl("span", "cta-glow-arrow", "→");
  arrow.setAttribute("aria-hidden", "true");
  primaryBtn.appendChild(arrow);
  ctaRow.appendChild(primaryBtn);

  const secBtn = createEl(
    "a",
    "next-milestone-cta-secondary",
    milestone.secondaryCtaLabel || "🧭 Explore Current v3.1 Capabilities",
  );
  secBtn.href = sanitizeUrl(milestone.secondaryCtaHref || "./services/", "./services/");
  ctaRow.appendChild(secBtn);
  card.appendChild(ctaRow);

  container.appendChild(card);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 5. Botanical Curiosities — Did You Know? Section (./data/catalog/trivia.json)
 */
export function renderTriviaSection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "curiosities-section");
  wrapper.id = "did-you-know";

  const container = createEl("div", "section-container");
  const header = createEl("div", "curiosities-header");
  header.appendChild(
    createEl("span", "section-eyebrow", meta.eyebrow || "04. Botanical Curiosities"),
  );
  header.appendChild(createEl("h2", "section-heading", meta.heading || "Did You Know?"));
  if (meta.description) {
    header.appendChild(createEl("p", "justified-prose curiosities-intro", meta.description));
  }
  container.appendChild(header);

  const list = createEl("div", "curiosities-list");
  list.id = "curiositiesList";
  list.setAttribute("aria-live", "polite");

  const triviaFallbackThemes = ["violet", "lime", "amber", "cyan", "crimson"];
  items.forEach((item, idx) => {
    const theme = resolveBotanicalTheme(
      item.themeColor ||
        (item.speciesSlug ? { slug: item.speciesSlug } : triviaFallbackThemes[idx % triviaFallbackThemes.length]),
      idx,
    );
    const strip = createEl("article", `curiosity-strip botanical-theme--${theme}`);
    strip.setAttribute("data-trivia-id", item.id || "");

    const num = createEl("span", "curiosity-num", String(idx + 1).padStart(2, "0"));
    num.setAttribute("aria-hidden", "true");
    strip.appendChild(num);

    const body = createEl("div", "curiosity-body");
    const titleRow = createEl("div", "curiosity-title-row");
    titleRow.appendChild(createEl("h3", "curiosity-title", item.title));

    const fallbackHref = item.speciesSlug
      ? `./plant/?species=${encodeURIComponent(item.speciesSlug)}`
      : "./species/";
    const taxonLink = createEl("a", "curiosity-taxon");
    taxonLink.href = sanitizeUrl(item.href, fallbackHref);
    taxonLink.appendChild(createEl("span", "", item.taxonLabel));
    const arrow = createEl("span", "", " →");
    arrow.setAttribute("aria-hidden", "true");
    taxonLink.appendChild(arrow);

    titleRow.appendChild(taxonLink);
    body.appendChild(titleRow);
    body.appendChild(createEl("p", "curiosity-desc", item.description));
    strip.appendChild(body);

    if (item.image?.imageUrl || item.image?.url) {
      const mediaBox = createEl("div", "curiosity-media");
      mediaBox.style.aspectRatio = item.image.aspectRatio || "4 / 3";
      const img = buildImageElement(
        item.image.imageUrl || item.image.url,
        item.image.imageAlt || item.image.alt || item.taxonLabel || item.title,
        item.image.fallbackLabel || item.taxonLabel || item.title,
      );
      if (item.image.photographer) {
        img.setAttribute("data-photographer", item.image.photographer);
      }
      mediaBox.appendChild(img);
      strip.appendChild(mediaBox);
    }

    list.appendChild(strip);
  });

  container.appendChild(list);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

/**
 * 6. Botanical Highlights & Stewardship Principles Section (./data/catalog/highlights.json)
 */
export function renderHighlightsSection(mountEl, { sectionData }) {
  if (!mountEl || !sectionData) return;
  const items = Array.isArray(sectionData.items) ? sectionData.items : [];
  const meta = sectionData.section || {};

  const wrapper = createEl("div", "highlights-section");
  wrapper.id = "botanical-highlights";

  const container = createEl("div", "section-container");
  const header = createEl("div", "highlights-header");
  header.appendChild(
    createEl("span", "section-eyebrow", meta.eyebrow || "05. Field Notes & Ecology"),
  );
  header.appendChild(
    createEl(
      "h2",
      "section-heading",
      meta.heading || "Botanical Highlights & Stewardship Principles",
    ),
  );
  container.appendChild(header);

  const grid = createEl("div", "highlights-grid");
  grid.id = "botanicalHighlightsGrid";
  grid.setAttribute("aria-live", "polite");

  const highlightThemes = ["emerald", "amber", "cyan", "violet"];
  items.forEach((item, idx) => {
    const theme = resolveBotanicalTheme(
      item.themeColor || highlightThemes[idx % highlightThemes.length],
      idx,
    );
    const card = createEl("article", `highlight-card botanical-theme--${theme}`);
    card.setAttribute("data-highlight-id", item.id || "");

    if (item.image?.imageUrl || item.image?.url) {
      const mediaBox = createEl("div", "highlight-card-media");
      mediaBox.style.aspectRatio = item.image.aspectRatio || "16 / 10";
      const img = buildImageElement(
        item.image.imageUrl || item.image.url,
        item.image.imageAlt || item.image.alt || item.title,
        item.image.fallbackLabel || item.title,
      );
      if (item.image.photographer) {
        img.setAttribute("data-photographer", item.image.photographer);
      }
      mediaBox.appendChild(img);
      card.appendChild(mediaBox);
    }

    const content = createEl("div", "highlight-card-content");
    content.appendChild(createEl("span", "highlight-index", String(idx + 1).padStart(2, "0")));
    content.appendChild(createEl("h3", "highlight-title", item.title));
    content.appendChild(createEl("p", "justified-prose", item.description));

    card.appendChild(content);
    grid.appendChild(card);
  });

  container.appendChild(grid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

export function createGlobalServerCtaNode(query) {
  const cleanQuery = String(query || "").trim();
  const cta = document.createElement("a");
  cta.href = resolveRootPath(`./plant/live/?q=${encodeURIComponent(cleanQuery)}`);
  cta.className = "global-server-cta-item";
  cta.setAttribute("role", "option");

  const label = createEl(
    "span",
    "global-server-cta-label",
    `🌐 Query Global Botanical Server for "${cleanQuery}"`,
  );
  const arrow = createEl("span", "global-server-cta-arrow", "→");
  arrow.setAttribute("aria-hidden", "true");

  cta.appendChild(label);
  cta.appendChild(arrow);
  return cta;
}

/**
 * Safely populates live search suggestion dropdowns using DocumentFragment & textContent.
 */
export function renderSearchSuggestionNodes(container, matches, emptyQuery, itemVariant) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  const trimmedQuery = String(emptyQuery || "").trim();

  if (matches.length === 0) {
    const emptyEl = createEl(
      "div",
      itemVariant === "home" ? "suggestion-empty-row" : "nav-suggestion-empty",
    );
    if (itemVariant === "home") {
      emptyEl.appendChild(
        createEl("span", "", `No matching local species found for "${trimmedQuery}"`),
      );
    } else {
      emptyEl.textContent = `No local species matched "${trimmedQuery}"`;
    }
    fragment.appendChild(emptyEl);
    if (trimmedQuery.length >= 2) {
      fragment.appendChild(createGlobalServerCtaNode(trimmedQuery));
    }
    container.replaceChildren(fragment);
    container.hidden = false;
    return;
  }

  matches.forEach((plant, idx) => {
    const link = document.createElement("a");
    link.href = resolveRootPath(`./plant/?species=${encodeURIComponent(plant.slug)}`);
    link.setAttribute("role", "option");

    const commonLabel = plant.commonNameBn
      ? `${plant.commonName} (${plant.commonNameBn})`
      : plant.commonName;

    if (itemVariant === "home") {
      link.className = "suggestion-row";
      const leftWrap = createEl("div", "suggestion-left-wrap");
      const thumb = buildImageElement(
        plant.thumbnailUrl || plant.image?.imageUrl,
        plant.commonName,
        plant.commonName,
      );
      thumb.className = "suggestion-thumb";
      const left = document.createElement("div");
      left.appendChild(createEl("span", "suggestion-main", commonLabel));
      left.appendChild(createEl("span", "suggestion-sci", plant.scientificName));
      leftWrap.appendChild(thumb);
      leftWrap.appendChild(left);
      link.appendChild(leftWrap);
      link.appendChild(
        createEl("span", "suggestion-family", plant.overview?.family || plant.family || ""),
      );
    } else {
      link.className = "nav-suggestion-item";
      link.setAttribute("data-nav-idx", String(idx));
      const leftWrap = createEl("div", "nav-suggestion-left");
      const thumb = buildImageElement(
        plant.thumbnailUrl || plant.image?.imageUrl,
        plant.commonName,
        plant.commonName,
      );
      thumb.className = "nav-suggestion-thumb";
      const left = document.createElement("div");
      left.appendChild(createEl("span", "nav-suggestion-title", commonLabel));
      left.appendChild(createEl("span", "nav-suggestion-sci", plant.scientificName));
      leftWrap.appendChild(thumb);
      leftWrap.appendChild(left);
      link.appendChild(leftWrap);
      link.appendChild(
        createEl("span", "nav-suggestion-family", plant.overview?.family || plant.family || ""),
      );
    }

    fragment.appendChild(link);
  });

  if (trimmedQuery.length >= 2 && matches.length < 2) {
    fragment.appendChild(createGlobalServerCtaNode(trimmedQuery));
  }

  container.replaceChildren(fragment);
  container.hidden = false;
}
