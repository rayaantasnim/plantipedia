/**
 * Distraction-Free Split Specimen Comparison Result View (/compare/result/)
 * - Renders ONLY the compact utility header + 15-chapter side-by-side comparison matrix
 * - Supports curated local monographs and Global Botanical Server species
 * - Routes failed/invalid lookups cleanly back to ../compare/ for inline recovery (zero 404 redirects)
 */

import { createEl, sanitizeUrl } from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { fetchSpeciesMonograph, normalizeSpeciesSlug } from "../../engines/global-server/api.js";
import { applyCompareSeo } from "../utils/seo.js";
import {
  ensureGsapWithScrollTrigger,
  extractPlantTelemetryStats,
} from "../../core/telemetry/telemetry-stats.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../../engines/global-server/global-botanical-server.js";
import {
  isIgnoredHeading,
  normalizeImageKey,
} from "../../engines/global-server/taxon-parser.js";

const PLACEHOLDER_PLATE = "./assets/images/placeholder-botanical.svg";

const DEFAULT_SEASONS_META = [
  { id: "grishmo", nameEn: "Summer", nameBn: "গ্রীষ্ম", transliteration: "Grishmo", gregorianRange: "Mid-Apr – Mid-Jun" },
  { id: "borsha", nameEn: "Monsoon", nameBn: "বর্ষা", transliteration: "Borsha", gregorianRange: "Mid-Jun – Mid-Aug" },
  { id: "shorot", nameEn: "Autumn", nameBn: "শরৎ", transliteration: "Shorot", gregorianRange: "Mid-Aug – Mid-Oct" },
  { id: "hemonto", nameEn: "Late Autumn", nameBn: "হেমন্ত", transliteration: "Hemonto", gregorianRange: "Mid-Oct – Mid-Dec" },
  { id: "sheet", nameEn: "Winter", nameBn: "শীত", transliteration: "Sheet", gregorianRange: "Mid-Dec – Mid-Feb" },
  { id: "boshonto", nameEn: "Spring", nameBn: "বসন্ত", transliteration: "Boshonto", gregorianRange: "Mid-Feb – Mid-Apr" },
];

function createIconSvg(paths, size = 16) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  paths.forEach((d) => {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  });
  return svg;
}

function buildReturnHref(parsed) {
  const params = new URLSearchParams();
  if (parsed?.left) {
    params.set("left", parsed.left);
    if (parsed.leftType === "global") params.set("leftType", "global");
    else params.set("leftType", "local");
  }
  if (parsed?.right) {
    params.set("right", parsed.right);
    if (parsed.rightType === "global") params.set("rightType", "global");
    else params.set("rightType", "local");
  }
  const qs = params.toString();
  return resolveRootPath(qs ? `./compare/?${qs}` : "./compare/");
}

function redirectBackToSelector(parsed = null) {
  window.location.replace(buildReturnHref(parsed));
}

function redirectToCompareInlineRecovery(parsed, failedSide, failedQuery, failedReason) {
  const params = new URLSearchParams();
  if (parsed?.left) {
    params.set("left", parsed.left);
    params.set("leftType", parsed.leftType === "global" ? "global" : "local");
  }
  if (parsed?.right) {
    params.set("right", parsed.right);
    params.set("rightType", parsed.rightType === "global" ? "global" : "local");
  }
  if (failedSide) params.set("failedSide", failedSide);
  if (failedQuery) params.set("failedQuery", failedQuery);
  params.set("failedReason", failedReason || "invalid");
  window.location.replace(resolveRootPath(`./compare/?${params.toString()}`));
}

function parseSpecimenParams() {
  const params = new URLSearchParams(window.location.search);

  const leftGlobalRaw = params.get("leftGlobal");
  const rightGlobalRaw = params.get("rightGlobal");

  const rawLeft = leftGlobalRaw || params.get("left") || params.get("a") || "";
  const rawRight = rightGlobalRaw || params.get("right") || params.get("b") || "";

  const leftType =
    leftGlobalRaw || params.get("leftType") === "global" ? "global" : "local";
  const rightType =
    rightGlobalRaw || params.get("rightType") === "global" ? "global" : "local";

  return {
    left: leftType === "global" ? normalizeGlobalQuery(rawLeft) : normalizeSpeciesSlug(rawLeft),
    right: rightType === "global" ? normalizeGlobalQuery(rawRight) : normalizeSpeciesSlug(rawRight),
    leftType,
    rightType,
  };
}

function formatTelemetryValue(stat) {
  if (!stat) return "N/A";
  const decimals = Number.isFinite(stat.decimals)
    ? stat.decimals
    : Number.isInteger(stat.value)
      ? 0
      : 1;
  const numStr = decimals > 0 ? Number(stat.value).toFixed(decimals) : String(Math.round(stat.value));
  return `${stat.prefix || ""}${numStr}${stat.suffix || ""}`;
}

function normalizeHeightToCm(stat) {
  if (!stat) return 0;
  const val = Number(stat.value) || 0;
  const suffix = String(stat.suffix || "").toLowerCase();
  if (suffix === "cm") return val;
  if (suffix === "mm") return val / 10;
  return val * 100;
}

function normalizeLifespanToDays(stat) {
  if (!stat) return 0;
  const val = Number(stat.value) || 0;
  const suffix = String(stat.suffix || "").toLowerCase();
  if (suffix === "d" || suffix === "days") return val;
  if (suffix === "wks" || suffix === "weeks") return val * 7;
  return val * 365;
}

function getCleanPlantSections(plant) {
  const sections = Array.isArray(plant?.sections) ? plant.sections : [];
  return sections.filter((sec) => sec && !isIgnoredHeading(sec.title));
}

function claimMatchingSection(plant, claimedSet, keywordRe, preferredNumbers = []) {
  const sections = getCleanPlantSections(plant);
  if (sections.length === 0) return null;

  const unclaimed = sections.filter((sec) => !claimedSet.has(sec));
  const byNumPreferred = (pool) => {
    for (const num of preferredNumbers) {
      const hit = pool.find((sec) => String(sec.number || "") === num);
      if (hit) return hit;
    }
    return null;
  };

  let picked = unclaimed.find((sec) => keywordRe.test(`${sec.title || ""} ${sec.subtitle || ""}`));
  if (!picked) picked = byNumPreferred(unclaimed);
  if (!picked) picked = sections.find((sec) => keywordRe.test(`${sec.title || ""} ${sec.subtitle || ""}`));
  if (!picked) picked = byNumPreferred(sections);
  if (picked) {
    claimedSet.add(picked);
  }
  return picked || null;
}

function peekSection(plant, keywordRe, preferredNumbers = []) {
  const sections = getCleanPlantSections(plant);
  const byTitle = sections.find((sec) => keywordRe.test(`${sec.title || ""} ${sec.subtitle || ""}`));
  if (byTitle) return byTitle;
  for (const num of preferredNumbers) {
    const byNum = sections.find((sec) => String(sec.number || "") === num);
    if (byNum) return byNum;
  }
  return sections[0] || null;
}

function getSpecimenImageUrl(plant) {
  const candidate =
    plant?.heroImage?.url ||
    plant?.thumbnailUrl ||
    plant?.heroImage?.fallbackUrl ||
    PLACEHOLDER_PLATE;
  return sanitizeUrl(candidate, PLACEHOLDER_PLATE);
}

function findSecondarySpecimenImage(plant, usedImageKeys, preferredRe = null) {
  const sections = getCleanPlantSections(plant);
  const candidates = [];

  if (preferredRe) {
    sections.forEach((sec) => {
      const tagText = `${sec.title || ""} ${sec.subtitle || ""}`;
      if (preferredRe.test(tagText) && Array.isArray(sec.images)) {
        sec.images.forEach((im) => candidates.push(im));
      }
    });
  }

  sections.forEach((sec) => {
    if (Array.isArray(sec.images)) {
      sec.images.forEach((im) => candidates.push(im));
    }
  });

  for (const im of candidates) {
    const rawUrl = im?.url || im?.imageUrl || "";
    if (!rawUrl) continue;
    const cleanUrl = sanitizeUrl(rawUrl, "");
    if (!cleanUrl || cleanUrl === PLACEHOLDER_PLATE) continue;
    const normKey = normalizeImageKey(cleanUrl);
    if (!normKey || usedImageKeys.has(normKey)) continue;
    usedImageKeys.add(normKey);
    return {
      url: cleanUrl,
      alt: im.alt || `${plant.commonName} botanical specimen plate`,
      caption: im.caption || im.alt || `${plant.commonName} comparative specimen plate`,
    };
  }
  return null;
}

function buildSecondaryPlateFigure(imgObj, figCode) {
  if (!imgObj?.url) return null;
  const fig = createEl("figure", "compare-secondary-plate");
  const media = createEl("div", "compare-secondary-plate-media");
  const img = document.createElement("img");
  img.src = imgObj.url;
  img.alt = imgObj.alt || "";
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => {
    fig.remove();
  });
  media.appendChild(img);
  fig.appendChild(media);

  const cap = document.createElement("figcaption");
  cap.className = "compare-secondary-plate-cap";
  cap.appendChild(createEl("span", "figcaption-fig", figCode));
  cap.appendChild(document.createTextNode(` ${imgObj.caption || ""}`));
  fig.appendChild(cap);
  return fig;
}

function getSpecimenMonographHref(spec) {
  if (spec.type === "global" || spec.plant.isGlobalLive) {
    const q = spec.query || spec.plant.query || spec.plant.commonName;
    return resolveRootPath(`./plant/live/?q=${encodeURIComponent(q)}&cached=1`);
  }
  return resolveRootPath(`./plant/?species=${encodeURIComponent(spec.plant.slug)}`);
}

function buildTopHeader(parsed, leftPlant, rightPlant) {
  const header = createEl("header", "compare-result-header");
  const inner = createEl("div", "compare-result-header-inner");

  const backLink = createEl("a", "compare-result-back-btn");
  backLink.href = buildReturnHref(parsed);
  backLink.appendChild(createIconSvg(["m15 18-6-6 6-6"], 16));
  backLink.appendChild(createEl("span", "", "Change Specimens"));

  const titleGroup = createEl("div", "compare-result-title-group");
  titleGroup.appendChild(createEl("h1", "compare-result-title", "Split Specimen Comparison"));
  titleGroup.appendChild(
    createEl(
      "p",
      "compare-result-subtitle",
      `${leftPlant.commonName} (${leftPlant.scientificName}) vs. ${rightPlant.commonName} (${rightPlant.scientificName})`,
    ),
  );

  const actions = createEl("div", "compare-result-header-actions");
  const exportBtn = createEl("button", "compare-result-export-btn");
  exportBtn.type = "button";
  exportBtn.appendChild(
    createIconSvg(
      [
        "M6 9V2h12v7",
        "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
        "M6 14h12v8H6z",
      ],
      16,
    ),
  );
  exportBtn.appendChild(createEl("span", "", "Export Comparison (PDF)"));
  exportBtn.addEventListener("click", () => {
    window.print();
  });
  actions.appendChild(exportBtn);

  inner.appendChild(backLink);
  inner.appendChild(titleGroup);
  inner.appendChild(actions);
  header.appendChild(inner);
  return header;
}

function buildHeroCard(spec, sideLabel) {
  const { plant } = spec;
  const card = createEl("article", `compare-hero-card compare-hero-card--${spec.side}`);

  const mediaWrap = createEl("div", "compare-hero-media");
  const img = document.createElement("img");
  img.className = "compare-hero-img";
  img.src = getSpecimenImageUrl(plant);
  img.alt = plant.heroImage?.alt || `${plant.commonName} botanical specimen`;
  img.loading = "eager";
  img.decoding = "async";
  img.addEventListener("error", () => {
    const fallbackHref = resolveRootPath(PLACEHOLDER_PLATE);
    if (img.src !== fallbackHref) {
      img.src = fallbackHref;
    }
  });
  mediaWrap.appendChild(img);

  const sourceLabel = plant.isGlobalLive ? "GLOBAL FLORA INDEX" : "CURATED ARCHIVE";
  const badgeOverlay = createEl("div", "compare-hero-badges");
  badgeOverlay.appendChild(
    createEl(
      "span",
      `compare-source-badge${plant.isGlobalLive ? " is-global" : ""}`,
      sourceLabel,
    ),
  );
  badgeOverlay.appendChild(createEl("span", "compare-side-tag", sideLabel));
  mediaWrap.appendChild(badgeOverlay);
  card.appendChild(mediaWrap);

  const body = createEl("div", "compare-hero-body");

  const metaRow = createEl("div", "compare-hero-meta");
  metaRow.appendChild(createEl("span", "compare-category-pill", plant.category || "Botanical Taxon"));
  if (plant.specimenId) {
    metaRow.appendChild(createEl("span", "compare-id-mono", plant.specimenId));
  }
  body.appendChild(metaRow);

  const nameRow = createEl("div", "compare-hero-names");
  nameRow.appendChild(createEl("h2", "compare-hero-common", plant.commonName || plant.scientificName || "Botanical Specimen"));
  const bnLabel = String(plant.localName || plant.commonNameBn || "").trim();
  if (bnLabel && bnLabel.toLowerCase() !== String(plant.commonName || "").trim().toLowerCase()) {
    nameRow.appendChild(createEl("span", "compare-hero-bn", bnLabel));
  }
  body.appendChild(nameRow);

  body.appendChild(createEl("p", "compare-hero-sci", plant.scientificName || ""));
  if (plant.overview?.family) {
    const hasDistinctBnFam =
      plant.familyBn &&
      plant.familyBn.trim().toLowerCase() !== plant.overview.family.trim().toLowerCase();
    body.appendChild(
      createEl(
        "p",
        "compare-hero-family",
        hasDistinctBnFam
          ? `Family: ${plant.overview.family} (${plant.familyBn})`
          : `Family: ${plant.overview.family}`,
      ),
    );
  }

  body.appendChild(
    createEl("p", "compare-hero-summary", plant.leadOverview || plant.shortSummary || ""),
  );

  const footer = createEl("div", "compare-hero-footer");
  const openLink = createEl("a", "compare-hero-link", "Open Full Monograph →");
  openLink.href = getSpecimenMonographHref(spec);
  footer.appendChild(openLink);
  body.appendChild(footer);

  card.appendChild(body);
  return card;
}

function buildSectionShell(number, title, subtitle) {
  const sec = createEl("section", "compare-matrix-section");
  const head = createEl("div", "compare-matrix-section-head");
  head.appendChild(createEl("span", "compare-matrix-num", number));
  const headText = createEl("div", "compare-matrix-head-text");
  headText.appendChild(createEl("h2", "compare-matrix-title", title));
  if (subtitle) {
    headText.appendChild(createEl("p", "compare-matrix-sub", subtitle));
  }
  head.appendChild(headText);
  sec.appendChild(head);
  return sec;
}

function appendDualCardSubblocks(card, subblocks) {
  if (!Array.isArray(subblocks) || subblocks.length === 0) return;
  const subGrid = createEl("div", "compare-subblocks-grid");
  subblocks.slice(0, 4).forEach((sb) => {
    if (!sb?.heading || !sb?.text) return;
    const box = createEl("div", "compare-subblock");
    box.appendChild(createEl("h4", "compare-subblock-title", sb.heading));
    box.appendChild(createEl("p", "compare-subblock-text", sb.text));
    subGrid.appendChild(box);
  });
  if (subGrid.children.length > 0) {
    card.appendChild(subGrid);
  }
}

function buildTaxonomySection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "01",
    "Scientific Taxonomy",
    "Linnaean hierarchy, ordinal placement, growth habit, and biogeographic classification",
  );

  const tableWrap = createEl("div", "compare-taxonomy-table-wrap");
  const table = createEl("table", "compare-taxonomy-table");

  const thead = document.createElement("thead");
  const hRow = document.createElement("tr");
  hRow.appendChild(createEl("th", "", "Taxonomic Field"));
  hRow.appendChild(createEl("th", "is-left", leftPlant.commonName));
  hRow.appendChild(createEl("th", "is-right", rightPlant.commonName));
  thead.appendChild(hRow);
  table.appendChild(thead);

  const formatFam = (pl) =>
    pl.familyBn && pl.familyBn.trim().toLowerCase() !== String(pl.overview?.family || "").trim().toLowerCase()
      ? `${pl.overview?.family || "—"} (${pl.familyBn})`
      : pl.overview?.family || "—";

  const rows = [
    ["Plant Group", leftPlant.overview?.plantGroup || "—", rightPlant.overview?.plantGroup || "—"],
    ["Taxonomic Domain", leftPlant.taxonomicDomain || leftPlant.category || "—", rightPlant.taxonomicDomain || rightPlant.category || "—"],
    ["Botanical Order", leftPlant.overview?.order || "—", rightPlant.overview?.order || "—"],
    ["Botanical Family", formatFam(leftPlant), formatFam(rightPlant)],
    ["Genus", leftPlant.overview?.genus || "—", rightPlant.overview?.genus || "—"],
    ["Species Epithet", leftPlant.overview?.species || leftPlant.scientificName || "—", rightPlant.overview?.species || rightPlant.scientificName || "—"],
    ["Growth Habit", leftPlant.overview?.growthForm || "—", rightPlant.overview?.growthForm || "—"],
    ["Native Origin", leftPlant.overview?.nativeOrigin || "—", rightPlant.overview?.nativeOrigin || "—"],
    ["Common Uses", leftPlant.overview?.commonUses || "—", rightPlant.overview?.commonUses || "—"],
  ];

  const tbody = document.createElement("tbody");
  rows.forEach(([field, valL, valR]) => {
    const tr = document.createElement("tr");
    tr.appendChild(createEl("th", "compare-tax-field", field));
    const tdL = createEl("td", "compare-tax-val is-left", valL);
    tdL.dataset.specimenLabel = leftPlant.commonName;
    const tdR = createEl("td", "compare-tax-val is-right", valR);
    tdR.dataset.specimenLabel = rightPlant.commonName;
    tr.appendChild(tdL);
    tr.appendChild(tdR);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  sec.appendChild(tableWrap);
  return sec;
}

function buildTelemetrySection(leftPlant, rightPlant) {
  const sec = buildSectionShell(
    "02",
    "Numerical Telemetry Comparison Bars",
    "Proportional comparison across mature stature, substrate pH, climate envelope, and longevity",
  );

  const leftStats = extractPlantTelemetryStats(leftPlant);
  const rightStats = extractPlantTelemetryStats(rightPlant);

  const heightCmL = normalizeHeightToCm(leftStats[0]);
  const heightCmR = normalizeHeightToCm(rightStats[0]);
  const maxHeightCm = Math.max(heightCmL, heightCmR, 100);

  const phL = Number(leftStats[1]?.value) || 6.5;
  const phR = Number(rightStats[1]?.value) || 6.5;

  const lifeDaysL = normalizeLifespanToDays(leftStats[2]);
  const lifeDaysR = normalizeLifespanToDays(rightStats[2]);
  const maxLifeDays = Math.max(lifeDaysL, lifeDaysR, 365);

  const climL = Number(leftStats[3]?.value) || 30;
  const climR = Number(rightStats[3]?.value) || 30;
  const climMax =
    String(leftStats[3]?.suffix || "").toLowerCase() === "hrs" &&
    String(rightStats[3]?.suffix || "").toLowerCase() === "hrs"
      ? 12
      : Math.max(climL, climR, 45);

  const metricSpecs = [
    {
      title: "Mature Stature / Canopy Scale",
      leftStat: leftStats[0],
      rightStat: rightStats[0],
      pctL: Math.max(8, Math.min(100, Math.round((heightCmL / maxHeightCm) * 100))),
      pctR: Math.max(8, Math.min(100, Math.round((heightCmR / maxHeightCm) * 100))),
    },
    {
      title: "Optimal Substrate / Soil pH",
      leftStat: leftStats[1],
      rightStat: rightStats[1],
      pctL: Math.max(12, Math.min(100, Math.round((phL / 9.5) * 100))),
      pctR: Math.max(12, Math.min(100, Math.round((phR / 9.5) * 100))),
    },
    {
      title: "Longevity / Phenological Cycle",
      leftStat: leftStats[2],
      rightStat: rightStats[2],
      pctL: Math.max(8, Math.min(100, Math.round((lifeDaysL / maxLifeDays) * 100))),
      pctR: Math.max(8, Math.min(100, Math.round((lifeDaysR / maxLifeDays) * 100))),
    },
    {
      title: "Thermal / Solar Operating Window",
      leftStat: leftStats[3],
      rightStat: rightStats[3],
      pctL: Math.max(12, Math.min(100, Math.round((climL / climMax) * 100))),
      pctR: Math.max(12, Math.min(100, Math.round((climR / climMax) * 100))),
    },
  ];

  const grid = createEl("div", "compare-telemetry-grid");
  metricSpecs.forEach((m) => {
    const card = createEl("article", "compare-telemetry-card");
    card.appendChild(createEl("h3", "compare-telemetry-card-title", m.title));

    const bars = createEl("div", "compare-telemetry-bars");

    const buildRow = (plantName, stat, pct, sideCls) => {
      const row = createEl("div", "compare-bar-row");
      const rowHead = createEl("div", "compare-bar-head");
      const labelSide = createEl("div", "compare-bar-label-group");
      labelSide.appendChild(createEl("span", `compare-bar-species is-${sideCls}`, plantName));
      labelSide.appendChild(createEl("span", "compare-bar-metric-name", stat?.label || ""));
      rowHead.appendChild(labelSide);

      const finalText = formatTelemetryValue(stat);
      const valEl = createEl("span", "compare-bar-value", finalText);
      const targetNum = Number(stat?.value) || 0;
      const decimals = Number.isFinite(stat?.decimals)
        ? stat.decimals
        : Number.isInteger(targetNum)
          ? 0
          : 1;
      valEl.dataset.targetValue = String(targetNum);
      valEl.dataset.decimals = String(decimals);
      valEl.dataset.prefix = stat?.prefix || "";
      valEl.dataset.suffix = stat?.suffix || "";
      valEl.dataset.finalText = finalText;
      valEl.setAttribute("aria-label", `${plantName} ${stat?.label || ""}: ${finalText}`);
      rowHead.appendChild(valEl);

      const track = createEl("div", "compare-bar-track");
      const fill = createEl("div", `compare-bar-fill compare-bar-fill--${sideCls}`);
      fill.style.width = `${pct}%`;
      fill.dataset.targetPct = String(pct);
      track.appendChild(fill);

      row.appendChild(rowHead);
      row.appendChild(track);
      if (stat?.subtext) {
        row.appendChild(createEl("p", "compare-bar-subtext", stat.subtext));
      }
      return row;
    };

    bars.appendChild(buildRow(leftPlant.commonName, m.leftStat, m.pctL, "left"));
    bars.appendChild(buildRow(rightPlant.commonName, m.rightStat, m.pctR, "right"));
    card.appendChild(bars);
    grid.appendChild(card);
  });

  sec.appendChild(grid);
  return sec;
}

function buildComparativeChapterSection({
  number,
  title,
  subtitle,
  leftPlant,
  rightPlant,
  claimedLeft,
  claimedRight,
  usedImageKeys,
  keywordRe,
  preferredNumbers = [],
  photoMatchRe,
  fallbackBuilder,
  extraPillsBuilder = null,
  includeSafetyBox = false,
}) {
  const sec = buildSectionShell(number, title, subtitle);
  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left", claimed: claimedLeft, figSuffix: "L" },
    { plant: rightPlant, side: "right", claimed: claimedRight, figSuffix: "R" },
  ].forEach(({ plant, side, claimed, figSuffix }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));

    const matchedSec = claimMatchingSection(plant, claimed, keywordRe, preferredNumbers);
    const fb = typeof fallbackBuilder === "function" ? fallbackBuilder(plant, matchedSec) : null;

    cardHead.appendChild(
      createEl(
        "h3",
        "compare-detail-heading",
        matchedSec?.subtitle || matchedSec?.title || fb?.heading || title,
      ),
    );
    card.appendChild(cardHead);

    const paragraphs = Array.isArray(matchedSec?.paragraphs) ? matchedSec.paragraphs : [];
    const proseList =
      paragraphs.length > 0
        ? paragraphs.slice(0, 2)
        : Array.isArray(fb?.paragraphs) && fb.paragraphs.length > 0
          ? fb.paragraphs
          : [`Comparative botanical telemetry for ${plant.commonName} (${plant.scientificName}) is indexed in its full monograph.`];

    proseList.forEach((p) => {
      if (p) card.appendChild(createEl("p", "compare-detail-prose", p));
    });

    if (typeof extraPillsBuilder === "function") {
      const carePairs = extraPillsBuilder(plant);
      if (Array.isArray(carePairs) && carePairs.length > 0) {
        const specsGrid = createEl("div", "compare-care-pills");
        carePairs.forEach(([k, v]) => {
          const item = createEl("div", "compare-care-item");
          item.appendChild(createEl("span", "compare-care-key", k));
          item.appendChild(createEl("span", "compare-care-val", v));
          specsGrid.appendChild(item);
        });
        card.appendChild(specsGrid);
      }
    }

    const subblocks =
      Array.isArray(matchedSec?.subblocks) && matchedSec.subblocks.length > 0
        ? matchedSec.subblocks
        : fb?.subblocks || [];
    appendDualCardSubblocks(card, subblocks);

    if (includeSafetyBox && matchedSec?.safetyNote) {
      const noteBox = createEl("div", "safety-notice-box");
      noteBox.setAttribute("role", "note");
      noteBox.appendChild(createEl("span", "safety-notice-title", "Safety Advisory"));
      noteBox.appendChild(document.createTextNode(matchedSec.safetyNote));
      card.appendChild(noteBox);
    }

    const plate = findSecondarySpecimenImage(plant, usedImageKeys, photoMatchRe || keywordRe);
    if (plate) {
      const figEl = buildSecondaryPlateFigure(plate, `Fig. ${number}.${figSuffix}`);
      if (figEl) card.appendChild(figEl);
    }

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

function buildFoliageSection(leftPlant, rightPlant, claimedLeft, claimedRight, usedImageKeys) {
  const sec = buildSectionShell(
    "04",
    "Foliar & Canopy Architecture",
    "Phyllotaxis, leaf lamina geometry, vascular venation, and light-harvesting structure",
  );
  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left", claimed: claimedLeft, figSuffix: "L" },
    { plant: rightPlant, side: "right", claimed: claimedRight, figSuffix: "R" },
  ].forEach(({ plant, side, claimed, figSuffix }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));

    // Only claim sections whose heading/subtitle genuinely targets foliage (not already claimed morphology)
    const sections = getCleanPlantSections(plant);
    let foliarSec = sections.find(
      (secItem) =>
        !claimed.has(secItem) &&
        /foliar|foliage|canopy architecture|leaf|leaves|frond/i.test(`${secItem.title || ""} ${secItem.subtitle || ""}`),
    );
    if (foliarSec) claimed.add(foliarSec);

    cardHead.appendChild(
      createEl(
        "h3",
        "compare-detail-heading",
        foliarSec?.subtitle || foliarSec?.title || "Foliar Venation & Canopy Light Capture",
      ),
    );
    card.appendChild(cardHead);

    if (foliarSec?.paragraphs?.length) {
      foliarSec.paragraphs.slice(0, 2).forEach((p) => {
        card.appendChild(createEl("p", "compare-detail-prose", p));
      });
      appendDualCardSubblocks(card, foliarSec.subblocks);
    } else {
      const morphRef = peekSection(plant, /morpholog|description/i, ["01"]);
      const allMorphSents = (morphRef?.paragraphs || [])
        .join(" ")
        .split(/(?<=[.!?।])\s+/)
        .filter((s) => /\b(leaf|leaves|foliage|frond|blade|vein|venation|rosette|canopy|crown|leaflet|stoma)\b/i.test(s));
      const leafFocusText =
        allMorphSents.slice(0, 2).join(" ") ||
        `${plant.commonName} (${plant.scientificName}) arranges its photosynthetic canopy to match ${plant.cultivationTelemetry?.sunlightLabel || "regional solar regimes"}, forming a ${plant.overview?.growthForm || "vascular specimen"}.`;

      card.appendChild(createEl("p", "compare-detail-prose", leafFocusText));
      card.appendChild(
        createEl(
          "p",
          "compare-detail-prose",
          `Classified within ${plant.overview?.family || "its botanical family"} (${plant.overview?.plantGroup || "vascular flora"}), cuticular resilience and canopy exposure coordinate transpiration efficiency with ${plant.cultivationTelemetry?.irrigationLabel || "ambient soil moisture"} availability.`,
        ),
      );

      const morphSubs = Array.isArray(morphRef?.subblocks) ? morphRef.subblocks.slice(2, 4) : [];
      if (morphSubs.length > 0) {
        appendDualCardSubblocks(card, morphSubs);
      } else {
        appendDualCardSubblocks(card, [
          { heading: "Light Interception", text: plant.cultivationTelemetry?.sunlightLabel || "Filtered to Full Sun" },
          { heading: "Canopy Growth Form", text: plant.overview?.growthForm || plant.overview?.plantGroup || "Vascular Flora" },
        ]);
      }
    }

    const foliarPlate = findSecondarySpecimenImage(plant, usedImageKeys, /foliar|foliage|leaf|canopy|crown|morpholog/i);
    if (foliarPlate) {
      const figEl = buildSecondaryPlateFigure(foliarPlate, `Fig. 04.${figSuffix}`);
      if (figEl) card.appendChild(figEl);
    }

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

function buildPhenologySection(leftPlant, rightPlant, seasonsData, claimedLeft, claimedRight, usedImageKeys) {
  const sec = buildSectionShell(
    "09",
    "Seasonal Phenology & Growth Rhythms",
    "Flowering, fruiting, vegetative flush, and dormancy cadence across Bengal's six seasons (ষড়ঋতু) and global climate regimes",
  );

  const seasonsList =
    Array.isArray(seasonsData?.seasons) && seasonsData.seasons.length > 0
      ? seasonsData.seasons
      : DEFAULT_SEASONS_META;

  const dualGrid = createEl("div", "compare-dual-cards");

  [
    { plant: leftPlant, side: "left", claimed: claimedLeft, figSuffix: "L" },
    { plant: rightPlant, side: "right", claimed: claimedRight, figSuffix: "R" },
  ].forEach(({ plant, side, claimed, figSuffix }) => {
    const card = createEl("article", `compare-detail-card compare-detail-card--${side}`);
    const cardHead = createEl("div", "compare-detail-head");
    cardHead.appendChild(createEl("span", `compare-detail-tag is-${side}`, plant.commonName));
    cardHead.appendChild(
      createEl(
        "h3",
        "compare-detail-heading",
        plant.isGlobalLive ? "Global Lifecycle & Climate Cadence" : "Shororitu Phenological Cycle",
      ),
    );
    card.appendChild(cardHead);

    const phenoSec = claimMatchingSection(plant, claimed, /phenol|season|rhythm|dormanc/i, ["08"]);
    const activeSeasons = Array.isArray(plant.seasons) ? plant.seasons : [];
    const phenoMap =
      plant.seasonalPhenology && typeof plant.seasonalPhenology === "object"
        ? plant.seasonalPhenology
        : null;

    if (phenoMap || activeSeasons.length > 0) {
      const list = createEl("div", "compare-phenology-list");
      seasonsList.forEach((s) => {
        const isActive = activeSeasons.includes(s.id);
        const note =
          phenoMap?.[s.id] ||
          (isActive ? "Active growth / reproductive phase documented." : "Maintenance / vegetative rest period.");
        const row = createEl(
          "div",
          `compare-phenology-row${isActive ? " is-active-season" : ""}`,
        );
        const sHead = createEl("div", "compare-phenology-season");
        sHead.appendChild(createEl("span", "compare-phenology-en", `${s.nameEn} (${s.nameBn})`));
        sHead.appendChild(
          createEl(
            "span",
            `compare-phenology-status${isActive ? " is-active" : ""}`,
            isActive ? "Active Peak" : "Vegetative / Rest",
          ),
        );
        row.appendChild(sHead);
        row.appendChild(createEl("p", "compare-phenology-note", note));
        list.appendChild(row);
      });
      card.appendChild(list);
    } else {
      const lifespanText = plant.overview?.lifespan || "Perennial";
      if (phenoSec?.paragraphs?.length) {
        phenoSec.paragraphs.slice(0, 2).forEach((p) => {
          card.appendChild(createEl("p", "compare-detail-prose", p));
        });
      } else {
        card.appendChild(
          createEl(
            "p",
            "compare-detail-prose",
            `${plant.commonName} (${plant.scientificName}) follows a ${lifespanText.toLowerCase()} biological cycle indexed via the Global Flora Index, synchronizing meristematic flushes and anthesis with ${plant.overview?.sunlight || "ambient irradiance"} and ${plant.overview?.temperatureRange || "18–32 °C"}.`,
          ),
        );
      }

      const badgeStrip = createEl("div", "compare-care-pills");
      [
        ["Lifecycle Class", lifespanText],
        ["Taxon Category", plant.category || "Global Flora"],
        ["Thermal Envelope", plant.overview?.temperatureRange || "18–32 °C"],
        ["Moisture Regime", plant.cultivationTelemetry?.irrigationLabel || "Moderate"],
      ].forEach(([k, v]) => {
        const item = createEl("div", "compare-care-item");
        item.appendChild(createEl("span", "compare-care-key", k));
        item.appendChild(createEl("span", "compare-care-val", v));
        badgeStrip.appendChild(item);
      });
      card.appendChild(badgeStrip);
    }

    const phenoPlate = findSecondarySpecimenImage(plant, usedImageKeys, /phenol|season|bloom|timing|flush/i);
    if (phenoPlate) {
      const figEl = buildSecondaryPlateFigure(phenoPlate, `Fig. 09.${figSuffix}`);
      if (figEl) card.appendChild(figEl);
    }

    dualGrid.appendChild(card);
  });

  sec.appendChild(dualGrid);
  return sec;
}

export async function renderCompareResultWorkspace(
  mountEl,
  { pageData, speciesIndex, seasonsData },
) {
  if (!mountEl) return;

  const parsed = parseSpecimenParams();
  if (!parsed.left || !parsed.right) {
    redirectBackToSelector(parsed);
    return;
  }

  if (
    parsed.left.toLowerCase() === parsed.right.toLowerCase() &&
    parsed.leftType === parsed.rightType
  ) {
    redirectBackToSelector(parsed);
    return;
  }

  const indexList = Array.isArray(speciesIndex) ? speciesIndex : [];
  const speciesBySlug = new Map(indexList.map((sp) => [sp.slug.toLowerCase(), sp]));

  if (parsed.leftType === "local" && !speciesBySlug.has(parsed.left)) {
    redirectToCompareInlineRecovery(parsed, "left", parsed.left, "invalid");
    return;
  }
  if (parsed.rightType === "local" && !speciesBySlug.has(parsed.right)) {
    redirectToCompareInlineRecovery(parsed, "right", parsed.right, "invalid");
    return;
  }

  async function resolveLocalSpecimen(slug) {
    const indexEntry = speciesBySlug.get(slug) || {};
    const monograph = await fetchSpeciesMonograph(slug);
    return {
      ...indexEntry,
      ...monograph,
      commonNameBn: monograph.localName || indexEntry.commonNameBn || "",
      familyBn: indexEntry.familyBn || "",
      taxonomicDomain: monograph.taxonomicDomain || indexEntry.taxonomicDomain || "",
      seasons: indexEntry.seasons || [],
      seasonalPhenology: indexEntry.seasonalPhenology || null,
      thumbnailUrl: indexEntry.thumbnailUrl || monograph.heroImage?.url || PLACEHOLDER_PLATE,
    };
  }

  let leftPlant = null;
  let rightPlant = null;

  try {
    const uncachedGlobals = [];
    if (parsed.leftType === "global") {
      leftPlant = getCachedGlobalMonograph(parsed.left);
      if (!leftPlant) uncachedGlobals.push({ side: "left", query: parsed.left });
    }
    if (parsed.rightType === "global") {
      rightPlant = getCachedGlobalMonograph(parsed.right);
      if (!rightPlant) uncachedGlobals.push({ side: "right", query: parsed.right });
    }

    if (uncachedGlobals.length > 0) {
      const label = uncachedGlobals.map((item) => item.query).join(" & ");
      const telemetryOutcome = await runGlobalServerTelemetry({
        container: mountEl,
        queryLabel: label,
        work: async ({ signal, onRetry }) => {
          const resolvedMap = {};
          for (const item of uncachedGlobals) {
            const res = await fetchFromGlobalBotanicalServer(item.query, { signal, onRetry });
            if (!res?.ok || !res.monograph) {
              return {
                ok: false,
                reason: res?.reason || "invalid",
                failedSide: item.side,
                failedQuery: item.query,
              };
            }
            resolvedMap[item.side] = res.monograph;
          }
          return { ok: true, resolvedMap };
        },
        onAbort: () => {
          window.location.href = buildReturnHref(parsed);
        },
      });

      if (telemetryOutcome.aborted) return;

      const res = telemetryOutcome.result;
      if (!res?.ok) {
        redirectToCompareInlineRecovery(
          parsed,
          res?.failedSide || uncachedGlobals[0]?.side || "right",
          res?.failedQuery || uncachedGlobals[0]?.query || label,
          res?.reason || "invalid",
        );
        return;
      }

      if (res.resolvedMap?.left) leftPlant = res.resolvedMap.left;
      if (res.resolvedMap?.right) rightPlant = res.resolvedMap.right;
    }

    const [resolvedL, resolvedR] = await Promise.all([
      leftPlant ? Promise.resolve(leftPlant) : resolveLocalSpecimen(parsed.left),
      rightPlant ? Promise.resolve(rightPlant) : resolveLocalSpecimen(parsed.right),
    ]);

    leftPlant = resolvedL;
    rightPlant = resolvedR;
  } catch (err) {
    console.error("Split comparison hydration failed:", err);
    redirectToCompareInlineRecovery(
      parsed,
      parsed.rightType === "global" ? "right" : "left",
      parsed.rightType === "global" ? parsed.right : parsed.left,
      "network",
    );
    return;
  }

  try {
    applyCompareSeo({ pageData: { ...(pageData || {}), isResultView: true }, leftPlant, rightPlant });
  } catch {
    // Non-blocking SEO metadata update
  }

  const leftSpec = { side: "left", type: parsed.leftType, query: parsed.left, plant: leftPlant };
  const rightSpec = { side: "right", type: parsed.rightType, query: parsed.right, plant: rightPlant };

  const workspace = createEl("div", "compare-result-shell");
  workspace.appendChild(buildTopHeader(parsed, leftPlant, rightPlant));

  const matrix = createEl("div", "compare-matrix-shell");

  // 00: Specimen Hero Comparison
  const heroGrid = createEl("section", "compare-hero-grid");
  heroGrid.setAttribute("aria-label", "Specimen Hero Comparison");
  heroGrid.appendChild(buildHeroCard(leftSpec, "LEFT SPECIMEN"));
  heroGrid.appendChild(buildHeroCard(rightSpec, "RIGHT SPECIMEN"));
  matrix.appendChild(heroGrid);

  // Strict site-wide/page-wide unique image registry (Max 1 normalized URL per page)
  const usedImageKeys = new Set(
    [normalizeImageKey(getSpecimenImageUrl(leftPlant)), normalizeImageKey(getSpecimenImageUrl(rightPlant))].filter(
      Boolean,
    ),
  );
  const claimedLeft = new Set();
  const claimedRight = new Set();

  // 01: Scientific Taxonomy
  matrix.appendChild(buildTaxonomySection(leftPlant, rightPlant));

  // 02: Numerical Telemetry Comparison Bars
  matrix.appendChild(buildTelemetrySection(leftPlant, rightPlant));

  // 03: Botanical Habit & Morphological Description
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "03",
      title: "Botanical Habit & Morphology",
      subtitle: "Comparative vegetative architecture, stem structure, bark, and root systems",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /morpholog|habit|description|anatomy/i,
      preferredNumbers: ["01"],
      photoMatchRe: /morpholog|habit|vegetative|structure/i,
    }),
  );

  // 04: Foliar & Canopy Architecture
  matrix.appendChild(buildFoliageSection(leftPlant, rightPlant, claimedLeft, claimedRight, usedImageKeys));

  // 05: Floral Biology & Pollinator Ecology
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "05",
      title: "Floral Biology & Pollinator Ecology",
      subtitle: "Inflorescence morphology, anthesis rhythms, and pollination vectors",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /floral|flower|pollinat|ecolog|reproduc/i,
      preferredNumbers: ["04", "03"],
      photoMatchRe: /floral|flower|pollinat|reproduc/i,
    }),
  );

  // 06: Fruit, Seed & Dispersal Biology
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "06",
      title: "Fruit, Seed & Dispersal Biology",
      subtitle: "Carpology, seed germination dynamics, and propagule dissemination",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /fruit|seed|dispers|germinat|propagation/i,
      preferredNumbers: ["09", "04"],
      photoMatchRe: /seed|fruit|propagat|germinat/i,
    }),
  );

  // 07: Native Biogeography & Cultivation Envelope
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "07",
      title: "Native Biogeography & Cultivation Envelope",
      subtitle: "Geographic distribution, edaphic soil chemistry, solar exposure, and hydration profile",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /biogeograph|habitat|distribut|native|range/i,
      preferredNumbers: ["03", "05"],
      photoMatchRe: /habitat|biogeograph|distribut|range/i,
      extraPillsBuilder: (plant) => {
        const stats = extractPlantTelemetryStats(plant);
        const tel = plant.cultivationTelemetry || {};
        return [
          ["Native Distribution", plant.overview?.nativeOrigin || "Broad Global / Tropical Range"],
          ["Soil pH Envelope", tel.phOptimalLabel || plant.overview?.phRange || `pH ${stats[1]?.value ?? 6.5}`],
          ["Solar Exposure", tel.sunlightLabel || plant.overview?.sunlight || `${stats[3]?.value ?? 30}${stats[3]?.suffix || "°C"}`],
          ["Moisture & Substrate", [tel.irrigationLabel, tel.soilDrainageLabel].filter(Boolean).join(" · ") || "Well-drained organic loam"],
        ];
      },
    }),
  );

  // 08: Evolutionary Lineage & Phylogeny
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "08",
      title: "Evolutionary Lineage & Phylogeny",
      subtitle: "Taxonomic radiation, clade placement, and adaptive systematic traits",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /phylogen|evolution|genetic|taxonom|lineage|clade|nomenclature/i,
      preferredNumbers: ["13", "02", "06"],
      photoMatchRe: /phylogen|taxonom|lineage|clade/i,
    }),
  );

  // 09: Seasonal Phenology & Growth Rhythms
  matrix.appendChild(
    buildPhenologySection(leftPlant, rightPlant, seasonsData, claimedLeft, claimedRight, usedImageKeys),
  );

  // 10: Phytochemistry & Bioactive Medicinal Profile
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "10",
      title: "Phytochemistry & Medicinal Profile",
      subtitle: "Secondary metabolites, pharmacognosy, and clinical safety advisories",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /phytochem|medicin|compound|bioactive|alkaloid|pharmacol/i,
      preferredNumbers: ["06", "09"],
      photoMatchRe: /phytochem|medicin|compound|bioactive/i,
      includeSafetyBox: true,
    }),
  );

  // 11: Ethnobotanical, Cultural & Economic History
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "11",
      title: "Ethnobotanical & Cultural History",
      subtitle: "Culinary traditions, artisanal uses, folklore, and horticultural commerce",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /ethnobot|cultur|econom|culinar|history|heritage|use/i,
      preferredNumbers: ["05", "10", "11"],
      photoMatchRe: /cultur|ethnobot|econom|harvest/i,
    }),
  );

  // 12: Cultivation Protocol, Spacing & Telemetry
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "12",
      title: "Cultivation Protocol & Husbandry",
      subtitle: "Substrate preparation, canopy spacing, irrigation discipline, and pruning",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /cultivat|spacing|prun|horticult|care|telemetry|soil/i,
      preferredNumbers: ["07", "12"],
      photoMatchRe: /cultivat|substrate|spacing|garden/i,
    }),
  );

  // 13: Pathology Defense, Pests & Resilience
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "13",
      title: "Pathology, Pests & Stress Resilience",
      subtitle: "Biotic stressors, phytoalexin defenses, and organic IPM practices",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /patholog|pest|disease|ipm|resilien|threat|vector/i,
      preferredNumbers: ["10", "13"],
      photoMatchRe: /pest|patholog|ipm|defense/i,
    }),
  );

  // 14: Conservation Standing & Field Identification Key
  matrix.appendChild(
    buildComparativeChapterSection({
      number: "14",
      title: "Conservation & Field Identification Key",
      subtitle: "IUCN vulnerability status, germplasm stewardship, and diagnostic markers",
      leftPlant,
      rightPlant,
      claimedLeft,
      claimedRight,
      usedImageKeys,
      keywordRe: /conserv|identif|diagnostic|registry|status|iucn/i,
      preferredNumbers: ["14", "11"],
      photoMatchRe: /conserv|identif|herbarium|status/i,
    }),
  );

  workspace.appendChild(matrix);
  mountEl.replaceChildren(workspace);

  animateCompareResultWorkspace(workspace);
}

function prefersReducedMotionResult() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatCounterStep(val, el) {
  const decimals = Number(el.dataset.decimals || 0);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  const numStr = decimals > 0 ? Number(val).toFixed(decimals) : String(Math.round(val));
  return `${prefix}${numStr}${suffix}`;
}

function restoreFinalTelemetryState(workspace) {
  if (!workspace) return;
  workspace.querySelectorAll(".compare-bar-value[data-final-text]").forEach((el) => {
    el.textContent = el.dataset.finalText;
  });
  workspace.querySelectorAll(".compare-bar-fill").forEach((fill) => {
    fill.style.transform = "";
    fill.classList.add("is-bar-revealed");
  });
  workspace.querySelectorAll(".compare-reveal-target").forEach((el) => {
    el.classList.add("is-revealed");
    el.style.opacity = "";
    el.style.transform = "";
  });
}

function runFallbackTelemetryCounters(gridEl) {
  if (!gridEl || gridEl.dataset.barsAnimated === "true") return;
  gridEl.dataset.barsAnimated = "true";

  const valueEls = Array.from(gridEl.querySelectorAll(".compare-bar-value[data-target-value]"));
  const fillEls = Array.from(gridEl.querySelectorAll(".compare-bar-fill"));

  fillEls.forEach((fill, idx) => {
    fill.style.transitionDelay = `${idx * 65}ms`;
    fill.style.transform = "";
    fill.classList.add("is-bar-revealed");
  });

  const start = performance.now();
  const duration = 1150;

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    valueEls.forEach((el) => {
      const target = Number(el.dataset.targetValue) || 0;
      el.textContent = formatCounterStep(target * eased, el);
    });
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      valueEls.forEach((el) => {
        el.textContent = el.dataset.finalText || formatCounterStep(Number(el.dataset.targetValue) || 0, el);
      });
    }
  };

  requestAnimationFrame(tick);
}

function runCssFallbackChoreography(workspace) {
  workspace.classList.add("compare-anim-fallback");

  const targets = Array.from(
    workspace.querySelectorAll(
      ".compare-result-header-inner > *, .compare-hero-card, .compare-matrix-section, .compare-taxonomy-table tbody tr, .compare-telemetry-card, .compare-detail-card, .compare-subblock, .compare-care-item, .compare-phenology-row",
    ),
  );
  const telemetryGrid = workspace.querySelector(".compare-telemetry-grid");

  targets.forEach((el, idx) => {
    el.classList.add("compare-reveal-target");
    el.style.setProperty("--compare-reveal-delay", `${(idx % 4) * 55}ms`);
  });

  if (typeof IntersectionObserver === "undefined") {
    restoreFinalTelemetryState(workspace);
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
  );

  targets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.94) {
      requestAnimationFrame(() => el.classList.add("is-revealed"));
    } else {
      revealObserver.observe(el);
    }
  });

  if (telemetryGrid) {
    const triggerBars = () => runFallbackTelemetryCounters(telemetryGrid);
    const rect = telemetryGrid.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      triggerBars();
    } else {
      const barObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            barObserver.disconnect();
            triggerBars();
          }
        },
        { threshold: 0.14 },
      );
      barObserver.observe(telemetryGrid);
    }
  }
}

async function animateCompareResultWorkspace(workspace) {
  if (!workspace || prefersReducedMotionResult()) {
    return;
  }

  const valueEls = Array.from(workspace.querySelectorAll(".compare-bar-value[data-target-value]"));
  const fillEls = Array.from(workspace.querySelectorAll(".compare-bar-fill"));
  const telemetryGrid = workspace.querySelector(".compare-telemetry-grid");

  valueEls.forEach((el) => {
    el.textContent = formatCounterStep(0, el);
  });
  fillEls.forEach((fill) => {
    fill.classList.add("is-bar-staged");
  });

  const handleBeforePrint = () => {
    if (window.gsap) {
      window.gsap.globalTimeline.progress(1);
    }
    restoreFinalTelemetryState(workspace);
  };
  window.addEventListener("beforeprint", handleBeforePrint, { once: true });

  const gsapReady =
    window.gsap && window.ScrollTrigger
      ? (() => {
          window.gsap.registerPlugin(window.ScrollTrigger);
          return true;
        })()
      : await ensureGsapWithScrollTrigger();

  if (!document.body.contains(workspace)) return;

  if (!gsapReady || !window.gsap || !window.ScrollTrigger) {
    fillEls.forEach((fill) => fill.classList.remove("is-bar-staged"));
    runCssFallbackChoreography(workspace);
    return;
  }

  const { gsap, ScrollTrigger } = window;

  const headerChildren = Array.from(
    workspace.querySelectorAll(".compare-result-header-inner > *"),
  );
  if (headerChildren.length) {
    gsap.from(headerChildren, {
      y: 16,
      opacity: 0,
      duration: 0.56,
      ease: "power3.out",
      stagger: 0.08,
      clearProps: "transform,opacity",
    });
  }

  const heroCards = Array.from(workspace.querySelectorAll(".compare-hero-card"));
  if (heroCards.length) {
    gsap.from(heroCards, {
      y: 26,
      opacity: 0,
      duration: 0.68,
      delay: 0.08,
      ease: "power3.out",
      stagger: 0.12,
      clearProps: "transform,opacity",
    });
  }

  // Scroll-choreographed Comparison Sections (01 - 14)
  const matrixSections = Array.from(workspace.querySelectorAll(".compare-matrix-section"));
  matrixSections.forEach((sec) => {
    gsap.from(sec, {
      y: 26,
      opacity: 0,
      duration: 0.65,
      ease: "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: sec,
        start: "top 90%",
        once: true,
      },
    });

    const taxRows = sec.querySelectorAll(".compare-taxonomy-table tbody tr");
    if (taxRows.length) {
      gsap.from(taxRows, {
        y: 14,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.045,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec.querySelector(".compare-taxonomy-table") || sec,
          start: "top 88%",
          once: true,
        },
      });
    }

    const telemetryCards = sec.querySelectorAll(".compare-telemetry-card");
    if (telemetryCards.length) {
      gsap.from(telemetryCards, {
        y: 20,
        opacity: 0,
        duration: 0.58,
        ease: "power3.out",
        stagger: 0.09,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: telemetryGrid || sec,
          start: "top 88%",
          once: true,
        },
      });
    }

    const detailCards = sec.querySelectorAll(".compare-detail-card");
    if (detailCards.length) {
      gsap.from(detailCards, {
        y: 22,
        opacity: 0,
        duration: 0.62,
        ease: "power3.out",
        stagger: 0.1,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec.querySelector(".compare-dual-cards") || sec,
          start: "top 88%",
          once: true,
        },
      });
    }

    const innerItems = sec.querySelectorAll(
      ".compare-subblock, .compare-care-item, .compare-phenology-row",
    );
    if (innerItems.length) {
      gsap.from(innerItems, {
        y: 14,
        opacity: 0,
        duration: 0.48,
        ease: "power2.out",
        stagger: 0.04,
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: sec,
          start: "top 84%",
          once: true,
        },
      });
    }
  });

  if (telemetryGrid && (fillEls.length > 0 || valueEls.length > 0)) {
    gsap.set(fillEls, { scaleX: 0, transformOrigin: "left center" });
    fillEls.forEach((fill) => fill.classList.remove("is-bar-staged"));

    const animateTelemetryBarsAndCounters = () => {
      if (telemetryGrid.dataset.barsAnimated === "true") return;
      telemetryGrid.dataset.barsAnimated = "true";

      gsap.to(fillEls, {
        scaleX: 1,
        duration: 1.05,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "transform",
      });

      valueEls.forEach((el, idx) => {
        const target = Number(el.dataset.targetValue) || 0;
        const proxy = { val: 0 };
        gsap.to(proxy, {
          val: target,
          duration: 1.15,
          delay: Math.min(idx * 0.05, 0.3),
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = formatCounterStep(proxy.val, el);
          },
          onComplete: () => {
            el.textContent =
              el.dataset.finalText || formatCounterStep(target, el);
          },
        });
      });
    };

    ScrollTrigger.create({
      trigger: telemetryGrid,
      start: "top 88%",
      once: true,
      onEnter: animateTelemetryBarsAndCounters,
    });

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const rect = telemetryGrid.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.9) {
        animateTelemetryBarsAndCounters();
      }
    });
  } else {
    ScrollTrigger.refresh();
  }
}
