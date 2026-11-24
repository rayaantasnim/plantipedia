/**
 * GSAP-Powered Animated Telemetry Stats Grid Engine (/js/utils/telemetry-stats.js)
 * - Dynamically ensures GSAP 3 + ScrollTrigger CDN availability (with offline IntersectionObserver + rAF fallback)
 * - Initializes counters at 0 (preserving prefixes/suffixes like +, %, m, cm, °C, yrs, s, ms, hrs)
 * - Animates count-up on ScrollTrigger (start: "top 85%", once: true) with staggered card + bottom accent bar reveal
 * - Provides page-specific telemetry builders (Home, Species Atlas, Services, 404) & dynamic Plant Monograph metric parser
 */

import { createEl } from "./templates.js";

const GSAP_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
const SCROLLTRIGGER_CDN_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js";

const ACCENT_TONES = ["emerald", "sky", "amber", "violet"];

let cdnLoadPromise = null;
let scrollTriggerRegistered = false;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((s) => s.src === src);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Ensures window.gsap and window.ScrollTrigger are available, loading from CDN if missing.
 * Fails gracefully within 3.5s if offline or CDN blocked so fallback rAF animation takes over.
 */
export async function ensureGsapWithScrollTrigger() {
  if (typeof window === "undefined") return false;

  if (window.gsap && window.ScrollTrigger) {
    if (!scrollTriggerRegistered) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      scrollTriggerRegistered = true;
    }
    return true;
  }

  if (!cdnLoadPromise) {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("GSAP CDN timeout")), 3500),
    );
    const loader = (async () => {
      if (!window.gsap) {
        await loadScriptOnce(GSAP_CDN_URL);
      }
      if (!window.ScrollTrigger) {
        await loadScriptOnce(SCROLLTRIGGER_CDN_URL);
      }
      if (window.gsap && window.ScrollTrigger && !scrollTriggerRegistered) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        scrollTriggerRegistered = true;
      }
      return Boolean(window.gsap && window.ScrollTrigger);
    })();

    cdnLoadPromise = Promise.race([loader, timeoutPromise]).catch(() => false);
  }

  return cdnLoadPromise;
}

/**
 * Generic numeric range/value parser (e.g. "pH 6.0 - 7.5" -> 6.8, "20–30 m" -> 30m).
 */
export function parseNumericMetric(rawText, { mode = "max", defaultUnit = "" } = {}) {
  if (typeof rawText !== "string" || !rawText.trim()) return null;
  const rangeMatch = rawText.match(
    /(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)(?:\s*(cm|mm|m|metres|meters|°C|hrs|hours|yrs|years|%|s|ms))?/i,
  );
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1]);
    const maxVal = parseFloat(rangeMatch[2]);
    let val = maxVal;
    if (mode === "avg") {
      val = Math.round(((minVal + maxVal) / 2) * 10) / 10;
    } else if (mode === "min") {
      val = minVal;
    }
    const rawUnit = (rangeMatch[3] || defaultUnit || "").toLowerCase();
    const unit = normalizeUnit(rawUnit);
    const decimals = Number.isInteger(val) ? 0 : 1;
    return { value: val, decimals, suffix: unit };
  }

  const singleMatch = rawText.match(
    /(\d+(?:\.\d+)?)(?:\s*(cm|mm|m|metres|meters|°C|hrs|hours|yrs|years|%|s|ms))?/i,
  );
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    const rawUnit = (singleMatch[2] || defaultUnit || "").toLowerCase();
    const unit = normalizeUnit(rawUnit);
    const decimals = Number.isInteger(val) ? 0 : 1;
    return { value: val, decimals, suffix: unit };
  }
  return null;
}

function normalizeUnit(rawUnit) {
  if (!rawUnit) return "";
  if (rawUnit === "metres" || rawUnit === "meters" || rawUnit === "m") return "m";
  if (rawUnit === "hours" || rawUnit === "hrs") return "hrs";
  if (rawUnit === "years" || rawUnit === "yrs") return "+";
  if (rawUnit === "°c") return "°C";
  return rawUnit;
}

function formatStatNumber(num, stat) {
  const decimals = Number.isFinite(stat.decimals)
    ? stat.decimals
    : Number.isInteger(stat.value)
      ? 0
      : 1;
  const formatted = decimals > 0 ? Number(num).toFixed(decimals) : String(Math.round(num));
  return `${stat.prefix || ""}${formatted}${stat.suffix || ""}`;
}

function runFallbackCountUp(gridEl, entries) {
  const animateNow = () => {
    if (gridEl.dataset.telemetryAnimated === "true") return;
    gridEl.dataset.telemetryAnimated = "true";
    gridEl.classList.add("is-revealed");

    const startTime = performance.now();
    const duration = 1800;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // Power3 easeOut approximation: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      entries.forEach(({ stat, valueEl }) => {
        const current = stat.value * eased;
        valueEl.textContent = formatStatNumber(current, stat);
      });
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        entries.forEach(({ stat, valueEl }) => {
          valueEl.textContent = formatStatNumber(stat.value, stat);
        });
      }
    };
    requestAnimationFrame(tick);
  };

  if (typeof IntersectionObserver === "undefined") {
    animateNow();
    return;
  }

  const rect = gridEl.getBoundingClientRect();
  if (rect.top < window.innerHeight * 0.92) {
    animateNow();
    return;
  }

  const observer = new IntersectionObserver(
    (obsEntries) => {
      if (obsEntries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        animateNow();
      }
    },
    { threshold: 0.15 },
  );
  observer.observe(gridEl);
}

function attachScrollAnimation(gridEl, entries) {
  const reduced =
    prefersReducedMotion() || document.body?.classList.contains("is-embed");

  if (reduced) {
    gridEl.dataset.telemetryAnimated = "true";
    gridEl.classList.add("is-revealed");
    entries.forEach(({ stat, valueEl }) => {
      valueEl.textContent = formatStatNumber(stat.value, stat);
    });
    return;
  }

  // Initialize every card at 0 while preserving prefix & suffix
  entries.forEach(({ stat, valueEl }) => {
    valueEl.textContent = formatStatNumber(0, stat);
  });

  ensureGsapWithScrollTrigger().then((ready) => {
    if (!document.body.contains(gridEl)) return;
    if (!ready || !window.gsap || !window.ScrollTrigger) {
      runFallbackCountUp(gridEl, entries);
      return;
    }

    const { gsap, ScrollTrigger } = window;
    const cards = Array.from(gridEl.querySelectorAll(".telemetry-stat-card"));
    const accents = Array.from(gridEl.querySelectorAll(".telemetry-stat-accent"));

    gsap.set(cards, { opacity: 0, y: 18 });
    gsap.set(accents, { scaleX: 0, transformOrigin: "left center" });

    const runGsapTimeline = () => {
      if (gridEl.dataset.telemetryAnimated === "true") return;
      gridEl.dataset.telemetryAnimated = "true";
      gridEl.classList.add("is-revealed");

      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform,opacity",
      });

      gsap.to(accents, {
        scaleX: 1,
        duration: 0.72,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform",
      });

      entries.forEach(({ stat, valueEl }) => {
        const proxy = { val: 0 };
        gsap.to(proxy, {
          val: Number(stat.value) || 0,
          duration: 1.8,
          ease: "power3.out",
          onUpdate: () => {
            valueEl.textContent = formatStatNumber(proxy.val, stat);
          },
          onComplete: () => {
            valueEl.textContent = formatStatNumber(stat.value, stat);
          },
        });
      });
    };

    ScrollTrigger.create({
      trigger: gridEl,
      start: "top 85%",
      once: true,
      onEnter: runGsapTimeline,
    });

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const rect = gridEl.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.88) {
        runGsapTimeline();
      }
    });
  });
}

/**
 * Builds and mounts a responsive 4-column GSAP-animated telemetry stats bar.
 */
export function createTelemetryStatsGrid(
  statsList,
  { variant = "default", ariaLabel = "Archive telemetry metrics", sectionId = "" } = {},
) {
  const items = Array.isArray(statsList) ? statsList.slice(0, 4) : [];
  const grid = createEl(
    "div",
    `plantipedia-telemetry-grid${variant === "compact" ? " plantipedia-telemetry-grid--compact" : ""}`,
  );
  if (sectionId) grid.id = sectionId;
  grid.setAttribute("role", "region");
  grid.setAttribute("aria-label", ariaLabel);

  const entries = [];

  items.forEach((stat, idx) => {
    const tone = stat.tone || ACCENT_TONES[idx % ACCENT_TONES.length];
    const card = createEl(
      "article",
      `telemetry-stat-card telemetry-stat-card--${tone}${idx === 0 ? " is-primary-stat" : ""}`,
    );

    const finalText = formatStatNumber(stat.value, stat);
    const valueEl = createEl("span", "telemetry-stat-value", finalText);
    valueEl.setAttribute("aria-label", `${finalText} ${stat.label}`);

    const labelEl = createEl("span", "telemetry-stat-label", stat.label);
    const subtextEl = createEl("p", "telemetry-stat-subtext", stat.subtext || "");

    const accentBar = createEl("span", "telemetry-stat-accent");
    accentBar.setAttribute("aria-hidden", "true");

    card.appendChild(valueEl);
    card.appendChild(labelEl);
    card.appendChild(subtextEl);
    card.appendChild(accentBar);
    grid.appendChild(card);

    entries.push({ stat, valueEl });
  });

  attachScrollAnimation(grid, entries);
  return grid;
}

/* ==================== PAGE-SPECIFIC TELEMETRY MAPPINGS ==================== */

export function buildHomeTelemetryStats(speciesIndex = []) {
  const count = Array.isArray(speciesIndex) && speciesIndex.length > 0 ? speciesIndex.length : 20;
  return [
    {
      value: count,
      suffix: "+",
      label: "CURATED MONOGRAPHS",
      subtext: "Peer-verified botanical records",
    },
    {
      value: 8,
      label: "CHAPTERS / SPECIES",
      subtext: "Standardized scientific structure",
    },
    {
      value: 6,
      label: "BENGALI SEASONS",
      subtext: "Complete phenology coverage",
    },
    {
      value: 100,
      suffix: "%",
      label: "OPEN ACCESS",
      subtext: "Offline-ready botanical archive",
    },
  ];
}

export function buildSpeciesAtlasTelemetryStats(speciesIndex = []) {
  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  const totalSpecies = list.length > 0 ? list.length : 20;

  const domainSet = new Set();
  let bilingualCount = 0;
  list.forEach((sp) => {
    if (Array.isArray(sp.categories) && sp.categories.length > 0) {
      sp.categories.forEach((c) => domainSet.add(c));
    } else if (sp.category) {
      domainSet.add(sp.category);
    }
    if (sp.commonNameBn || sp.localName) {
      bilingualCount += 1;
    }
  });

  const domainCount = domainSet.size > 0 ? domainSet.size : 6;
  const bilingualPct =
    list.length > 0 ? Math.round((bilingualCount / list.length) * 100) : 100;

  return [
    {
      value: totalSpecies,
      label: "DOCUMENTED TAXA",
      subtext: "Global & South Asian flora",
    },
    {
      value: domainCount,
      label: "BOTANICAL DOMAINS",
      subtext: "Trees, flowers, aquatic & herbs",
    },
    {
      value: bilingualPct,
      suffix: "%",
      label: "EN / বাংলা INDEXED",
      subtext: "Instant dual-script search",
    },
    {
      value: totalSpecies * 8,
      suffix: "+",
      label: "RESEARCH SECTIONS",
      subtext: "Morphology, ecology & care",
    },
  ];
}

export function buildServicesTelemetryStats() {
  return [
    {
      value: 4,
      label: "CORE RESEARCH TOOLS",
      subtext: "Comparator, Atlas, Calendar & Citation",
    },
    {
      value: 3,
      label: "CITATION FORMATS",
      subtext: "APA 7th, MLA 9th & BibTeX export",
    },
    {
      value: 6,
      label: "PHENOLOGY CYCLES",
      subtext: "Seasonal bloom & harvest tracking",
    },
    {
      value: 0,
      suffix: "ms",
      label: "LOGIN FRICTION",
      subtext: "LocalStorage herbarium persistence",
    },
  ];
}

export function buildNotFoundTelemetryStats(speciesIndex = []) {
  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  const total = list.length > 0 ? list.length : 20;
  const domainSet = new Set();
  list.forEach((sp) => {
    if (Array.isArray(sp.categories) && sp.categories.length > 0) {
      sp.categories.forEach((c) => domainSet.add(c));
    } else if (sp.category) {
      domainSet.add(sp.category);
    }
  });
  const domains = domainSet.size > 0 ? domainSet.size : 6;

  return [
    {
      value: total,
      suffix: "+",
      label: "AVAILABLE SPECIMENS",
      subtext: "Ready to explore in archive",
    },
    {
      value: domains,
      label: "FLORA CATEGORIES",
      subtext: "Browse by botanical domain",
    },
    {
      value: 6,
      label: "SEASONAL GUIDES",
      subtext: "Discover active blooms today",
    },
    {
      value: 30,
      suffix: "s",
      label: "AUTO-GATEWAY",
      subtext: "Smart return to main conservatory",
    },
  ];
}

/* ==================== PLANT MONOGRAPH TELEMETRY PARSER ==================== */

const PLANT_TRAIT_PROFILES = {
  "aloe-vera": {
    height: { value: 90, suffix: "cm", label: "MATURE ROSETTE SPAN", subtext: "Succulent perennial rosette" },
    ph: { value: 7.3, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Neutral to mildly alkaline grit" },
    vitality: { value: 99, suffix: "%", label: "GEL WATER CONTENT", subtext: "Hydrating acemannan parenchyma" },
    climate: { value: 38, suffix: "°C", label: "ARID HEAT TOLERANCE", subtext: "Nocturnal CAM adaptation" },
  },
  bamboo: {
    height: { value: 22, suffix: "m", label: "CULM ELEVATION", subtext: "Silica-armored woody canes" },
    ph: { value: 6.0, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Slightly acidic alluvial loam" },
    vitality: { value: 91, suffix: "cm", label: "FASTEST DAILY GROWTH", subtext: "Peak monsoon shoot elongation" },
    climate: { value: 35, suffix: "°C", label: "MONSOON GROWTH TEMP", subtext: "Humid tropical riverbanks" },
  },
  banyan: {
    height: { value: 30, suffix: "m", label: "MAXIMUM CANOPY HEIGHT", subtext: "Giant tropical fig spread" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Slightly acidic to neutral" },
    vitality: { value: 200, suffix: "+", label: "LIFESPAN (YEARS)", subtext: "Multi-century heritage tree" },
    climate: { value: 32, suffix: "°C", label: "PEAK THERMAL TOLERANCE", subtext: "Humid subtropical climate" },
  },
  bougainvillea: {
    height: { value: 12, suffix: "m", label: "CLIMBING CANE SPAN", subtext: "Woody scrambling ornamental" },
    ph: { value: 6.0, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Slightly acidic porous soil" },
    vitality: { value: 40, suffix: "+", label: "VINE LIFESPAN (YRS)", subtext: "Drought-hardy bract bloomer" },
    climate: { value: 8, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Full sun fuels bract colour" },
  },
  coconut: {
    height: { value: 30, suffix: "m", label: "PALM TRUNK HEIGHT", subtext: "Coastal feather-frond canopy" },
    ph: { value: 6.5, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Salt-tolerant sandy loam" },
    vitality: { value: 70, suffix: "+", label: "BEARING YEARS", subtext: "Year-round drupe production" },
    climate: { value: 34, suffix: "°C", label: "COASTAL HEAT OPTIMUM", subtext: "Tropical maritime humidity" },
  },
  hibiscus: {
    height: { value: 4.5, decimals: 1, suffix: "m", label: "MATURE SHRUB HEIGHT", subtext: "Evergreen woody ornamental" },
    ph: { value: 6.4, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Mildly acidic organic loam" },
    vitality: { value: 25, suffix: "+", label: "SHRUB LIFESPAN (YRS)", subtext: "Continuous nectar blooms" },
    climate: { value: 6, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Bright warm tropical light" },
  },
  ixora: {
    height: { value: 3, suffix: "m", label: "COMPACT SHRUB HEIGHT", subtext: "Dense multi-stemmed hedge" },
    ph: { value: 5.0, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Acid-loving lateritic loam" },
    vitality: { value: 20, suffix: "+", label: "SHRUB LIFESPAN (YRS)", subtext: "Year-round corymb clusters" },
    climate: { value: 32, suffix: "°C", label: "HUMID WARMTH OPTIMUM", subtext: "Monsoon-thriving evergreen" },
  },
  jackfruit: {
    height: { value: 25, suffix: "m", label: "CANOPY TREE HEIGHT", subtext: "Cauliflorous tropical giant" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Deep well-drained loam" },
    vitality: { value: 80, suffix: "+", label: "TREE LONGEVITY (YRS)", subtext: "World's largest tree fruit" },
    climate: { value: 33, suffix: "°C", label: "SUMMER FRUITING TEMP", subtext: "Warm humid delta plains" },
  },
  jasmine: {
    height: { value: 3, suffix: "m", label: "TWINING VINE HEIGHT", subtext: "Fragrant scrambling shrub" },
    ph: { value: 6.5, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Neutral humus-rich soil" },
    vitality: { value: 15, suffix: "+", label: "VINE LIFESPAN (YRS)", subtext: "Nocturnal essential-oil flush" },
    climate: { value: 6, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Morning sun & warm dusk air" },
  },
  lotus: {
    height: { value: 1.8, decimals: 1, suffix: "m", label: "EMERGENT PETIOLE SPAN", subtext: "Superhydrophobic shield leaves" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL MUD pH", subtext: "Neutral wetland clay silt" },
    vitality: { value: 50, suffix: "+", label: "RHIZOME PERSISTENCE", subtext: "Multi-decade aquatic perennial" },
    climate: { value: 35, suffix: "°C", label: "PEAK AQUATIC WARMTH", subtext: "Sunlit summer-autumn beels" },
  },
  mango: {
    height: { value: 40, suffix: "m", label: "MAXIMUM CANOPY HEIGHT", subtext: "Evergreen alluvial orchard crown" },
    ph: { value: 6.5, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Slightly acidic sandy loam" },
    vitality: { value: 100, suffix: "+", label: "ORCHARD LIFESPAN (YRS)", subtext: "Multi-generational fruiting tree" },
    climate: { value: 35, suffix: "°C", label: "MADHUMAS RIPENING TEMP", subtext: "Full unobstructed orchard sun" },
  },
  marigold: {
    height: { value: 110, suffix: "cm", label: "FLOWERING STEM HEIGHT", subtext: "Upright branching annual herb" },
    ph: { value: 6.5, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Slightly acidic garden bed" },
    vitality: { value: 60, suffix: "d", label: "DAYS TO FIRST BLOOM", subtext: "Rapid lutein-rich capitula" },
    climate: { value: 7, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Crisp sunlit winter gardens" },
  },
  neem: {
    height: { value: 25, suffix: "m", label: "SHADE CANOPY HEIGHT", subtext: "Drought-hardy evergreen crown" },
    ph: { value: 7.0, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Tolerates neutral-alkaline soil" },
    vitality: { value: 150, suffix: "+", label: "LIFESPAN (YEARS)", subtext: "Centuries of azadirachtin defense" },
    climate: { value: 42, suffix: "°C", label: "PEAK DROUGHT HEAT", subtext: "Resilient dryland canopy tree" },
  },
  orchid: {
    height: { value: 75, suffix: "cm", label: "ARCHING SPIKE SPAN", subtext: "Epiphytic aerial root rosette" },
    ph: { value: 5.8, decimals: 1, label: "BARK SUBSTRATE pH", subtext: "Acidic coarse fir & charcoal" },
    vitality: { value: 12, suffix: "wks", label: "INDIVIDUAL BLOOM SPAN", subtext: "Long-lived waxy moth blossoms" },
    climate: { value: 26, suffix: "°C", label: "CANOPY MICROCLIMATE", subtext: "Filtered dappled forest light" },
  },
  periwinkle: {
    height: { value: 90, suffix: "cm", label: "SUBSHRUB STATURE", subtext: "Glossy evergreen perennial" },
    ph: { value: 6.3, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Well-drained acidic-neutral loam" },
    vitality: { value: 300, suffix: "d", label: "ANNUAL BLOOM DAYS", subtext: "Year-round pinwheel corollas" },
    climate: { value: 6, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Sunlit dry-to-moist borders" },
  },
  rose: {
    height: { value: 2.5, decimals: 1, suffix: "m", label: "MATURE SHRUB CANE", subtext: "Prickled perennial woody bush" },
    ph: { value: 6.5, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Mildly acidic fertile loam" },
    vitality: { value: 35, suffix: "+", label: "SHRUB LIFESPAN (YRS)", subtext: "Recurrent fragrant flushes" },
    climate: { value: 6, suffix: "hrs", label: "MINIMUM DIRECT SUN", subtext: "Cool winter exhibition petals" },
  },
  sunflower: {
    height: { value: 3.5, decimals: 1, suffix: "m", label: "HELIOTROPIC STEM", subtext: "Erect annual composite forb" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Neutral deep alluvial loam" },
    vitality: { value: 90, suffix: "d", label: "DAYS TO MATURITY", subtext: "Fibonacci-spiralled seed head" },
    climate: { value: 8, suffix: "hrs", label: "FULL SOLAR TRACKING", subtext: "High-oleic oil accumulation" },
  },
  "tea-plant": {
    height: { value: 1, suffix: "m", label: "ESTATE PLUCKING TABLE", subtext: "Pruned hedge height (15 m wild)" },
    ph: { value: 5.0, decimals: 1, label: "OPTIMAL ACIDIC pH", subtext: "Highland laterite tea soil" },
    vitality: { value: 100, suffix: "+", label: "ESTATE LIFESPAN (YRS)", subtext: "Prized seasonal apical flushes" },
    climate: { value: 28, suffix: "°C", label: "HIGHLAND MIST OPTIMUM", subtext: "Sylhet slope rainfall & shade" },
  },
  tulsi: {
    height: { value: 100, suffix: "cm", label: "AROMATIC SUBSHRUB", subtext: "Eugenol-rich branched herb" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL SOIL pH", subtext: "Neutral courtyard potting loam" },
    vitality: { value: 5, suffix: "+", label: "PERENNIAL SPAN (YRS)", subtext: "Pollinator-rich raceme spikes" },
    climate: { value: 6, suffix: "hrs", label: "DAILY SOLAR EXPOSURE", subtext: "Warm bright courtyard light" },
  },
  "water-lily": {
    height: { value: 2, suffix: "m", label: "POND BASIN DEPTH", subtext: "Rooted floating-leaved herb" },
    ph: { value: 6.8, decimals: 1, label: "OPTIMAL POND pH", subtext: "Neutral flooded alluvial silt" },
    vitality: { value: 40, suffix: "+", label: "TUBER PERSISTENCE (YRS)", subtext: "Bangladesh national flower" },
    climate: { value: 6, suffix: "hrs", label: "DIRECT POND SUNLIGHT", subtext: "Monsoon & autumn wetland peak" },
  },
};

/**
 * Dynamically extracts 4 real numerical telemetry metrics specific to a plant monograph.
 * Parses growthForm dimensions, soil pH ranges, and climate/sunlight specs from JSON prose,
 * enhanced with species-verified heritage/ecological telemetry profiles.
 */
export function extractPlantTelemetryStats(plant) {
  if (!plant || typeof plant !== "object") return [];

  const profile = PLANT_TRAIT_PROFILES[plant.slug] || {};
  const corpus = [
    plant.leadOverview || "",
    ...(plant.sections || []).flatMap((sec) => sec.paragraphs || []),
  ].join(" ");

  // 1. Height / Canopy Stature from overview.growthForm (or curated profile fallback)
  const parsedHeight = parseNumericMetric(plant.overview?.growthForm || "", {
    mode: "max",
  });
  const heightStat = {
    value: parsedHeight?.value ?? profile.height?.value ?? 5,
    decimals: parsedHeight?.decimals ?? profile.height?.decimals ?? 0,
    suffix: parsedHeight?.suffix || profile.height?.suffix || "m",
    label: profile.height?.label || "MATURE PLANT STATURE",
    subtext: profile.height?.subtext || plant.overview?.growthForm || "Botanical growth habit",
  };

  // 2. Optimal Soil pH extracted from monograph prose or cultivationTelemetry
  let phVal = profile.ph?.value ?? 6.5;
  let phDecimals = profile.ph?.decimals ?? 1;
  if (
    plant.cultivationTelemetry?.phMin &&
    plant.cultivationTelemetry?.phMax
  ) {
    phVal =
      Math.round(
        ((Number(plant.cultivationTelemetry.phMin) +
          Number(plant.cultivationTelemetry.phMax)) /
          2) *
          10,
      ) / 10;
  } else {
    const phMatch = corpus.match(
      /pH\s*(\d+(?:\.\d+)?(?:\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?)?)/i,
    );
    if (phMatch) {
      const parsedPh = parseNumericMetric(phMatch[1], { mode: "avg" });
      if (parsedPh && parsedPh.value >= 3.5 && parsedPh.value <= 9.0) {
        phVal = parsedPh.value;
        phDecimals = 1;
      }
    }
  }
  const phStat = {
    value: phVal,
    decimals: phDecimals,
    label: profile.ph?.label || "OPTIMAL SOIL pH",
    subtext:
      profile.ph?.subtext ||
      (phVal < 6.0
        ? "Acidic organic substrate"
        : phVal > 7.2
          ? "Neutral to mildly alkaline"
          : "Slightly acidic to neutral"),
  };

  // 3. Lifespan / Growth Speed / Harvest Cycle
  const vitalityStat = {
    value: profile.vitality?.value ?? 25,
    decimals: profile.vitality?.decimals ?? 0,
    suffix: profile.vitality?.suffix ?? "+",
    label: profile.vitality?.label || "LIFESPAN (YEARS)",
    subtext: profile.vitality?.subtext || `${plant.overview?.family || "Botanical"} specimen longevity`,
  };

  // 4. Thermal Tolerance / Daily Sunlight Hours
  let climateStat = profile.climate;
  if (!climateStat) {
    const tempMatch = corpus.match(/(\d+(?:[–-]\d+)?)\s*°C/i);
    const sunMatch = corpus.match(/(\d+(?:[–-]\d+)?)\s*(?:hours|hrs)/i);
    if (tempMatch) {
      const parsedT = parseNumericMetric(tempMatch[0], { mode: "max", defaultUnit: "°C" });
      climateStat = {
        value: parsedT?.value ?? 30,
        suffix: "°C",
        label: "PEAK THERMAL TOLERANCE",
        subtext: "Tropical & subtropical adaptation",
      };
    } else if (sunMatch) {
      const parsedS = parseNumericMetric(sunMatch[0], { mode: "max", defaultUnit: "hrs" });
      climateStat = {
        value: parsedS?.value ?? 6,
        suffix: "hrs",
        label: "DAILY SOLAR EXPOSURE",
        subtext: "Optimal photosynthetic light",
      };
    } else {
      climateStat = {
        value: 30,
        suffix: "°C",
        label: "CLIMATE OPTIMUM",
        subtext: "Warm humid growing season",
      };
    }
  }

  return [heightStat, phStat, vitalityStat, climateStat];
}
