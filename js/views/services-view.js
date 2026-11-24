/**
 * Dedicated "Digital Botanical Research Suite & Services" Page (/services/)
 * 6 Interactive Sections built 100% natively with XSS-safe DOM builders & custom SVG analytics:
 *  1. Visual Hero & Live Archive Telemetry
 *  2. Interactive Filterable Platform Comparison Table
 *  3. Live Data Visualization & Interactive Charts (Category Distribution + 6-Season Curve)
 *  4. Core Digital Toolkit Showcase (2x2 Grid)
 *  5. Interactive Live Sandbox ("Try Plantipedia Tools Live": Citation Engine + Glossary Tooltips)
 *  6. Audience Pathways & Quick-Start CTA
 */

import {
  buildImageElement,
  createEl,
  sanitizeUrl,
} from "../utils/templates.js";
import { renderCitationGenerator } from "../utils/citation-generator.js";
import { applyGlossaryTooltips } from "../utils/glossary-tooltips.js";
import { applyPageSeo } from "../services/seo.js";
import {
  buildServicesTelemetryStats,
  createTelemetryStatsGrid,
} from "../utils/telemetry-stats.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const CATEGORY_ORDER = [
  "Flowers",
  "Fruit Trees",
  "Medicinal",
  "Shrubs & Herbs",
  "Trees & Palms",
  "Aquatic",
];

const FALLBACK_SEASONS = [
  { id: "grishmo", nameEn: "Summer", nameBn: "গ্রীষ্ম", bengaliMonths: "বৈশাখ – জ্যৈষ্ঠ", climateSummary: "Peak fruit sugar ripeness & warm evapotranspiration." },
  { id: "borsha", nameEn: "Monsoon", nameBn: "বর্ষা", bengaliMonths: "আষাঢ় – শ্রাবণ", climateSummary: "Floodplain recharge, bamboo shoot flush & wetland growth." },
  { id: "shorot", nameEn: "Autumn", nameBn: "শরৎ", bengaliMonths: "ভাদ্র – আশ্বিন", climateSummary: "Peak wetland blooms of Shapla and Sacred Lotus." },
  { id: "hemonto", nameEn: "Late Autumn", nameBn: "হেমন্ত", bengaliMonths: "কার্তিক – অগ্রহায়ণ", climateSummary: "Cooling mists & floral bud induction." },
  { id: "sheet", nameEn: "Winter", nameBn: "শীত", bengaliMonths: "পৌষ – মাঘ", climateSummary: "Cool exhibition blooms for Rose, Marigold, & Orchids." },
  { id: "boshonto", nameEn: "Spring", nameBn: "বসন্ত", bengaliMonths: "ফাল্গুন – চৈত্র", climateSummary: "Orchard panicles, copper leaf flush & first-flush tea." },
];

function computeArchiveMetrics(speciesIndex, seasons) {
  const list = Array.isArray(speciesIndex) ? speciesIndex : [];
  const familySet = new Set();
  list.forEach((sp) => {
    const fam = sp.family || sp.overview?.family;
    if (fam) familySet.add(fam);
  });

  const categoryStats = CATEGORY_ORDER.map((cat) => {
    const members = list.filter(
      (sp) =>
        sp.category === cat ||
        (Array.isArray(sp.categories) && sp.categories.includes(cat)),
    );
    return {
      category: cat,
      count: members.length,
      sharePct: list.length > 0 ? Math.round((members.length / list.length) * 100) : 0,
      sampleNames: members.slice(0, 3).map((m) => m.commonName),
    };
  });

  const seasonList = Array.isArray(seasons) && seasons.length > 0 ? seasons : FALLBACK_SEASONS;
  const seasonStats = seasonList.map((s) => {
    const active = list.filter(
      (sp) => Array.isArray(sp.seasons) && sp.seasons.includes(s.id),
    );
    return {
      ...s,
      count: active.length,
      sampleNames: active.slice(0, 4).map((m) => m.commonName),
    };
  });

  return {
    speciesCount: list.length || 50,
    familiesCount: familySet.size || 34,
    seasonsCount: seasonList.length || 6,
    categoryStats,
    seasonStats,
  };
}

function buildSectionHeader(eyebrow, heading, lead) {
  const header = createEl("div", "services-section-header");
  const left = document.createElement("div");
  if (eyebrow) left.appendChild(createEl("span", "section-eyebrow", eyebrow));
  if (heading) left.appendChild(createEl("h2", "section-heading", heading));
  header.appendChild(left);
  if (lead) header.appendChild(createEl("p", "services-section-lead", lead));
  return header;
}

function renderHeroAndTelemetry(banner, telemetry, metrics) {
  const hero = createEl("section", "services-hero");
  hero.setAttribute("aria-labelledby", "servicesHeroHeading");

  if (banner.heroImage?.imageUrl) {
    const backdrop = createEl("div", "services-hero-backdrop");
    backdrop.setAttribute("aria-hidden", "true");
    const img = buildImageElement(
      banner.heroImage.imageUrl,
      banner.heroImage.imageAlt || "",
      "Plantipedia Digital Botanical Suite",
      { eager: true },
    );
    img.className = "services-hero-img";
    backdrop.appendChild(img);
    backdrop.appendChild(createEl("div", "services-hero-scrim"));
    hero.appendChild(backdrop);
  }

  const inner = createEl("div", "section-container services-hero-inner");

  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  (banner.breadcrumbs || []).forEach((crumb, idx) => {
    if (idx > 0) {
      const sep = createEl("span", "breadcrumb-sep", "/");
      sep.setAttribute("aria-hidden", "true");
      breadcrumbNav.appendChild(sep);
    }
    if (crumb.current) {
      const curr = createEl("span", "breadcrumb-current", crumb.label);
      curr.setAttribute("aria-current", "page");
      breadcrumbNav.appendChild(curr);
    } else {
      const link = document.createElement("a");
      link.href = sanitizeUrl(crumb.href, "./");
      link.textContent = crumb.label;
      breadcrumbNav.appendChild(link);
    }
  });
  inner.appendChild(breadcrumbNav);

  const grid = createEl("div", "services-hero-grid");
  const copyCol = document.createElement("div");
  copyCol.appendChild(createEl("span", "section-eyebrow", banner.eyebrow || ""));
  const h1 = createEl("h1", "services-hero-title", banner.headline || "");
  h1.id = "servicesHeroHeading";
  copyCol.appendChild(h1);
  copyCol.appendChild(createEl("p", "services-hero-subcopy", banner.subcopy || ""));

  const actions = createEl("div", "services-hero-actions");
  if (banner.primaryCta) {
    const primary = createEl("a", "specimen-nf-btn specimen-nf-btn--primary", banner.primaryCta.label);
    primary.href = sanitizeUrl(banner.primaryCta.href, "./species/");
    actions.appendChild(primary);
  }
  if (banner.secondaryCta) {
    const secondary = createEl(
      "a",
      "specimen-nf-btn specimen-nf-btn--secondary",
      banner.secondaryCta.label,
    );
    secondary.href = banner.secondaryCta.href || "#services-sandbox";
    actions.appendChild(secondary);
  }
  copyCol.appendChild(actions);

  const kpiGrid = createEl("div", "services-telemetry-grid");
  kpiGrid.setAttribute("aria-label", "Live archive telemetry");
  (telemetry || []).forEach((kpi) => {
    const card = createEl("article", "services-kpi-card");
    let displayVal = kpi.value;
    if (kpi.dynamic === "speciesCount") {
      displayVal = String(metrics.speciesCount).padStart(2, "0");
    } else if (kpi.dynamic === "familiesCount") {
      displayVal = String(metrics.familiesCount).padStart(2, "0");
    } else if (kpi.dynamic === "seasonsCount") {
      displayVal = String(metrics.seasonsCount).padStart(2, "0");
    }
    const valEl = createEl("span", "services-kpi-value", displayVal);
    if (kpi.id) valEl.id = kpi.id;
    card.appendChild(valEl);
    card.appendChild(createEl("span", "services-kpi-label", kpi.label));
    card.appendChild(createEl("span", "services-kpi-note", kpi.note));
    kpiGrid.appendChild(card);
  });

  grid.appendChild(copyCol);
  grid.appendChild(kpiGrid);
  inner.appendChild(grid);
  hero.appendChild(inner);
  return hero;
}

function renderComparisonSection(comparisonCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-comparison";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      comparisonCfg.eyebrow,
      comparisonCfg.heading,
      comparisonCfg.lead,
    ),
  );

  const filters = Array.isArray(comparisonCfg.filters) ? comparisonCfg.filters : [];
  const rows = Array.isArray(comparisonCfg.rows) ? comparisonCfg.rows : [];
  let activeFilter = "all";

  const filterBar = createEl("div", "services-filter-bar");
  filterBar.setAttribute("role", "tablist");
  filterBar.setAttribute("aria-label", "Filter capability comparison rows");

  const tableScroll = createEl("div", "services-table-scroll");
  const table = createEl("table", "services-comparison-table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Botanical Capability", "Traditional Plant Blogs", "Plantipedia Digital Ecosystem"].forEach(
    (label, idx) => {
      const th = createEl("th", idx === 2 ? "is-plantipedia-col" : "", label);
      th.scope = "col";
      headRow.appendChild(th);
    },
  );
  thead.appendChild(headRow);
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  tableScroll.appendChild(table);

  const renderRows = () => {
    const visibleRows =
      activeFilter === "all"
        ? rows
        : rows.filter((r) => r.group === activeFilter);
    const frag = document.createDocumentFragment();
    visibleRows.forEach((row) => {
      const tr = document.createElement("tr");

      const tdCap = createEl("td", "services-cell-capability");
      tdCap.appendChild(createEl("span", "services-cap-name", row.capability));
      tdCap.appendChild(createEl("span", "services-cap-tag", row.domainLabel));

      const tdTrad = createEl("td", "services-cell-traditional");
      const tradWrap = createEl("div", "services-cell-status");
      const negIcon = createEl("span", "services-status-icon services-status-icon--neg", "✕");
      negIcon.setAttribute("aria-hidden", "true");
      tradWrap.appendChild(negIcon);
      tradWrap.appendChild(createEl("span", "", row.traditional));
      tdTrad.appendChild(tradWrap);

      const tdPlant = createEl("td", "services-cell-plantipedia");
      const plantWrap = createEl("div", "services-cell-status");
      const posIcon = createEl("span", "services-status-icon services-status-icon--pos", "✓");
      posIcon.setAttribute("aria-hidden", "true");
      plantWrap.appendChild(posIcon);
      plantWrap.appendChild(createEl("span", "", row.plantipedia));
      tdPlant.appendChild(plantWrap);

      tr.appendChild(tdCap);
      tr.appendChild(tdTrad);
      tr.appendChild(tdPlant);
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
  };

  filters.forEach((f) => {
    const btn = createEl(
      "button",
      `services-filter-pill${f.id === activeFilter ? " is-active" : ""}`,
      f.label,
    );
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(f.id === activeFilter));
    btn.addEventListener("click", () => {
      activeFilter = f.id;
      filterBar.querySelectorAll(".services-filter-pill").forEach((b) => {
        const isCurrent = b === btn;
        b.classList.toggle("is-active", isCurrent);
        b.setAttribute("aria-selected", String(isCurrent));
      });
      renderRows();
    });
    filterBar.appendChild(btn);
  });

  renderRows();
  container.appendChild(filterBar);
  container.appendChild(tableScroll);
  section.appendChild(container);
  return section;
}

function buildCategoryDistributionCard(metrics) {
  const card = createEl("article", "services-chart-card");
  const head = createEl("div", "services-chart-head");
  const titleWrap = document.createElement("div");
  titleWrap.appendChild(createEl("h3", "services-chart-title", "Taxonomic Category Distribution"));
  titleWrap.appendChild(
    createEl(
      "p",
      "services-chart-sub",
      `Multi-realm coverage across ${metrics.speciesCount} indexed botanical monographs`,
    ),
  );
  head.appendChild(titleWrap);
  card.appendChild(head);

  const readout = createEl("div", "services-chart-readout");
  const readoutLabel = createEl("span", "", "Select or hover a realm to inspect species coverage");
  const readoutVal = createEl("strong", "", `${metrics.speciesCount} Total`);
  readout.appendChild(readoutLabel);
  readout.appendChild(readoutVal);

  const listWrap = createEl("div", "services-bars-list");
  const maxCount = Math.max(1, ...metrics.categoryStats.map((c) => c.count));

  const updateReadout = (item, activeRow) => {
    listWrap.querySelectorAll(".services-bar-row").forEach((el) => {
      el.classList.toggle("is-active", el === activeRow);
    });
    const sampleSuffix = item.sampleNames.length > 0 ? ` (${item.sampleNames.join(", ")})` : "";
    readoutLabel.textContent = `${item.category}${sampleSuffix}`;
    readoutVal.textContent = `${item.count} species · ${item.sharePct}%`;
  };

  metrics.categoryStats.forEach((item, idx) => {
    const row = createEl("a", `services-bar-row${idx === 0 ? " is-active" : ""}`);
    row.href = sanitizeUrl(
      `./species/?category=${encodeURIComponent(item.category)}`,
      "./species/",
    );
    row.setAttribute(
      "aria-label",
      `${item.category}: ${item.count} species (${item.sharePct}% of archive). Explore category.`,
    );

    const meta = createEl("div", "services-bar-meta");
    meta.appendChild(createEl("span", "services-bar-name", item.category));
    meta.appendChild(
      createEl("span", "services-bar-count", `${item.count} spp · ${item.sharePct}%`),
    );

    const track = createEl("div", "services-bar-track");
    const fill = createEl("div", "services-bar-fill");
    const widthPct = Math.max(10, Math.round((item.count / maxCount) * 100));
    fill.style.width = `${widthPct}%`;
    track.appendChild(fill);

    row.appendChild(meta);
    row.appendChild(track);

    row.addEventListener("mouseenter", () => updateReadout(item, row));
    row.addEventListener("focus", () => updateReadout(item, row));
    listWrap.appendChild(row);
  });

  if (metrics.categoryStats[0]) {
    const first = metrics.categoryStats[0];
    readoutLabel.textContent = `${first.category} (${first.sampleNames.join(", ")})`;
    readoutVal.textContent = `${first.count} species · ${first.sharePct}%`;
  }

  card.appendChild(listWrap);
  card.appendChild(readout);
  return card;
}

function buildSeasonalCurveCard(metrics) {
  const card = createEl("article", "services-chart-card");
  const head = createEl("div", "services-chart-head");
  const titleWrap = document.createElement("div");
  titleWrap.appendChild(
    createEl("h3", "services-chart-title", "Bengali 6-Season (ষড়ঋতু) Botanical Activity Curve"),
  );
  titleWrap.appendChild(
    createEl(
      "p",
      "services-chart-sub",
      "Click or tap any seasonal node to inspect flowering & fruiting phenology",
    ),
  );
  head.appendChild(titleWrap);
  card.appendChild(head);

  const stats = metrics.seasonStats;
  const maxVal = Math.max(10, ...stats.map((s) => s.count));

  // Responsive SVG Curve (viewBox 540 x 210)
  const svgWrap = createEl("div", "services-svg-wrap");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "services-season-svg");
  svg.setAttribute("viewBox", "0 0 540 215");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Interactive curve showing active species across six Bengali seasons");

  const defs = document.createElementNS(SVG_NS, "defs");
  const grad = document.createElementNS(SVG_NS, "linearGradient");
  grad.setAttribute("id", "servicesSeasonAreaGrad");
  grad.setAttribute("x1", "0%");
  grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "0%");
  grad.setAttribute("y2", "100%");
  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#34d399");
  stop1.setAttribute("stop-opacity", "0.4");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#10b981");
  stop2.setAttribute("stop-opacity", "0.02");
  grad.appendChild(stop1);
  grad.appendChild(stop2);
  defs.appendChild(grad);
  svg.appendChild(defs);

  const padX = 46;
  const plotW = 540 - padX * 2;
  const topY = 30;
  const baseY = 166;
  const plotH = baseY - topY;

  // Subtle horizontal guide lines
  [0.25, 0.5, 0.75, 1].forEach((ratio) => {
    const gy = baseY - plotH * ratio;
    const guide = document.createElementNS(SVG_NS, "line");
    guide.setAttribute("x1", String(padX));
    guide.setAttribute("x2", String(540 - padX));
    guide.setAttribute("y1", gy.toFixed(1));
    guide.setAttribute("y2", gy.toFixed(1));
    guide.setAttribute("stroke", "rgba(110, 231, 183, 0.12)");
    guide.setAttribute("stroke-dasharray", "3 4");
    svg.appendChild(guide);
  });

  const points = stats.map((s, idx) => {
    const x =
      stats.length > 1
        ? padX + (idx / (stats.length - 1)) * plotW
        : 270;
    const y = baseY - (s.count / maxVal) * plotH;
    return { x, y, season: s };
  });

  // Smooth cubic bezier path
  let lineD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    lineD += ` C ${cx} ${p0.y.toFixed(1)}, ${cx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const areaD = `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${baseY} L ${points[0].x.toFixed(1)} ${baseY} Z`;

  const areaPath = document.createElementNS(SVG_NS, "path");
  areaPath.setAttribute("d", areaD);
  areaPath.setAttribute("fill", "url(#servicesSeasonAreaGrad)");
  svg.appendChild(areaPath);

  const linePath = document.createElementNS(SVG_NS, "path");
  linePath.setAttribute("d", lineD);
  linePath.setAttribute("fill", "none");
  linePath.setAttribute("stroke", "#34d399");
  linePath.setAttribute("stroke-width", "3");
  linePath.setAttribute("stroke-linecap", "round");
  svg.appendChild(linePath);

  let activeSeasonId = stats[0]?.id || "grishmo";

  const pillsRow = createEl("div", "services-season-pills");
  const spotlight = createEl("div", "services-season-spotlight");
  const spotTop = createEl("div", "services-spotlight-top");
  const spotTitle = createEl("h4", "services-spotlight-title");
  const spotCount = createEl("span", "services-spotlight-count");
  spotTop.appendChild(spotTitle);
  spotTop.appendChild(spotCount);
  const spotSummary = createEl("p", "services-spotlight-summary");
  const spotLink = createEl("a", "services-spotlight-link", "Inspect Season Flora →");
  spotlight.appendChild(spotTop);
  spotlight.appendChild(spotSummary);
  spotlight.appendChild(spotLink);

  const nodeGroups = [];
  const pillButtons = [];

  const selectSeason = (seasonId) => {
    activeSeasonId = seasonId;
    const item = stats.find((s) => s.id === seasonId) || stats[0];
    if (!item) return;

    nodeGroups.forEach(({ id, g, core }) => {
      const isCurrent = id === seasonId;
      g.classList.toggle("is-active", isCurrent);
      core.setAttribute("fill", isCurrent ? "#fde68a" : "#34d399");
      core.setAttribute("r", isCurrent ? "6.5" : "5");
    });

    pillButtons.forEach(({ id, btn }) => {
      const isCurrent = id === seasonId;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-pressed", String(isCurrent));
    });

    spotTitle.textContent = `${item.nameEn} (${item.nameBn}) · ${item.bengaliMonths || ""}`;
    spotCount.textContent = `${item.count} Active Species`;
    const sampleStr = item.sampleNames.length > 0 ? ` Notable flora: ${item.sampleNames.join(", ")}.` : "";
    spotSummary.textContent = `${item.climateSummary || item.phenologyHighlight || ""}${sampleStr}`;
    spotLink.href = sanitizeUrl(
      `./seasons/?season=${encodeURIComponent(item.id)}`,
      "./seasons/",
    );
  };

  points.forEach(({ x, y, season }) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "services-svg-node");
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute(
      "aria-label",
      `${season.nameEn} (${season.nameBn}): ${season.count} active species`,
    );

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("class", "node-ring");
    ring.setAttribute("cx", x.toFixed(1));
    ring.setAttribute("cy", y.toFixed(1));
    ring.setAttribute("r", "10");
    ring.setAttribute("fill", "#34d399");
    ring.setAttribute("opacity", "0.18");

    const core = document.createElementNS(SVG_NS, "circle");
    core.setAttribute("cx", x.toFixed(1));
    core.setAttribute("cy", y.toFixed(1));
    core.setAttribute("r", "5");
    core.setAttribute("fill", "#34d399");
    core.setAttribute("stroke", "#04140c");
    core.setAttribute("stroke-width", "2");

    const valLabel = document.createElementNS(SVG_NS, "text");
    valLabel.setAttribute("x", x.toFixed(1));
    valLabel.setAttribute("y", (y - 13).toFixed(1));
    valLabel.setAttribute("text-anchor", "middle");
    valLabel.setAttribute("fill", "#a7f3d0");
    valLabel.setAttribute("font-size", "11");
    valLabel.setAttribute("font-family", "JetBrains Mono, monospace");
    valLabel.textContent = String(season.count);

    const bnLabel = document.createElementNS(SVG_NS, "text");
    bnLabel.setAttribute("x", x.toFixed(1));
    bnLabel.setAttribute("y", "192");
    bnLabel.setAttribute("text-anchor", "middle");
    bnLabel.setAttribute("fill", "#e2e8f0");
    bnLabel.setAttribute("font-size", "12");
    bnLabel.textContent = season.nameBn;

    g.appendChild(ring);
    g.appendChild(core);
    g.appendChild(valLabel);
    g.appendChild(bnLabel);

    g.addEventListener("click", () => selectSeason(season.id));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectSeason(season.id);
      }
    });

    svg.appendChild(g);
    nodeGroups.push({ id: season.id, g, core });

    const pill = createEl(
      "button",
      "services-season-pill",
      `${season.nameBn} (${season.count})`,
    );
    pill.type = "button";
    pill.addEventListener("click", () => selectSeason(season.id));
    pillsRow.appendChild(pill);
    pillButtons.push({ id: season.id, btn: pill });
  });

  svgWrap.appendChild(svg);
  card.appendChild(svgWrap);
  card.appendChild(pillsRow);
  card.appendChild(spotlight);

  selectSeason(activeSeasonId);
  return card;
}

function renderAnalyticsSection(analyticsCfg, metrics) {
  const section = createEl("section", "services-section");
  section.id = "services-analytics";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(
      analyticsCfg.eyebrow,
      analyticsCfg.heading,
      analyticsCfg.lead,
    ),
  );

  const grid = createEl("div", "services-charts-grid");
  grid.appendChild(buildCategoryDistributionCard(metrics));
  grid.appendChild(buildSeasonalCurveCard(metrics));

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderToolkitSection(toolkitCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-toolkit";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(toolkitCfg.eyebrow, toolkitCfg.heading, toolkitCfg.lead),
  );

  const grid = createEl("div", "services-toolkit-grid");
  (toolkitCfg.items || []).forEach((item) => {
    const card = createEl("article", "services-toolkit-card");
    if (item.imageUrl) {
      const media = createEl("div", "services-toolkit-media");
      media.appendChild(
        buildImageElement(item.imageUrl, item.imageAlt || item.title, item.title),
      );
      card.appendChild(media);
    }

    const body = createEl("div", "services-toolkit-body");
    body.appendChild(createEl("span", "services-toolkit-meta", item.meta));
    body.appendChild(createEl("h3", "services-toolkit-title", item.title));
    body.appendChild(createEl("p", "services-toolkit-desc", item.description));

    const cta = createEl("a", "services-toolkit-cta", item.ctaLabel || "Open Workspace →");
    cta.href = sanitizeUrl(item.href, "./species/");
    body.appendChild(cta);

    card.appendChild(body);
    grid.appendChild(card);
  });

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderSandboxSection(sandboxCfg, speciesIndex, glossaryData) {
  const section = createEl("section", "services-section");
  section.id = "services-sandbox";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(sandboxCfg.eyebrow, sandboxCfg.heading, sandboxCfg.lead),
  );

  const grid = createEl("div", "services-sandbox-grid");

  // Left Panel: Live Academic Citation Generator
  const leftPanel = createEl("div", "services-sandbox-panel");
  leftPanel.appendChild(createEl("h3", "services-chart-title", sandboxCfg.citationTitle));
  leftPanel.appendChild(createEl("p", "services-glossary-hint", sandboxCfg.citationHint));

  const selectWrap = document.createElement("div");
  const selectLabel = createEl("label", "services-sandbox-label", "Choose Documented Species");
  selectLabel.setAttribute("for", "servicesCitationSpeciesSelect");
  const select = createEl("select", "services-sandbox-select");
  select.id = "servicesCitationSpeciesSelect";

  const list = Array.isArray(speciesIndex) && speciesIndex.length > 0
    ? speciesIndex
    : [{ slug: "mango", commonName: "Mango", commonNameBn: "আম", scientificName: "Mangifera indica" }];

  list.forEach((sp) => {
    const opt = document.createElement("option");
    opt.value = sp.slug;
    opt.textContent = sp.commonNameBn
      ? `${sp.commonName} (${sp.commonNameBn}) — ${sp.scientificName}`
      : `${sp.commonName} — ${sp.scientificName}`;
    select.appendChild(opt);
  });

  selectWrap.appendChild(selectLabel);
  selectWrap.appendChild(select);
  leftPanel.appendChild(selectWrap);

  const citationMount = createEl("div", "services-sandbox-citation-mount");
  const updateCitationWidget = (slug) => {
    const active = list.find((s) => s.slug === slug) || list[0];
    citationMount.replaceChildren(
      renderCitationGenerator(active, {
        eyebrow: "Live Sandbox Output",
        heading: `${active.commonName} Citation`,
        copyLabel: "Copy Citation",
        copiedLabel: "Copied ✓",
      }),
    );
  };
  select.addEventListener("change", () => updateCitationWidget(select.value));
  updateCitationWidget(list[0].slug);
  leftPanel.appendChild(citationMount);

  // Right Panel: Interactive Botanical Glossary Engine
  const rightPanel = createEl("div", "services-sandbox-panel");
  rightPanel.appendChild(createEl("h3", "services-chart-title", sandboxCfg.glossaryTitle));
  rightPanel.appendChild(createEl("p", "services-glossary-hint", sandboxCfg.glossaryHint));

  const sampleBox = createEl("div", "services-glossary-sample");
  const sampleP = document.createElement("p");
  sampleP.textContent = sandboxCfg.sampleParagraph || "";
  sampleBox.appendChild(sampleP);
  rightPanel.appendChild(sampleBox);

  if (glossaryData) {
    applyGlossaryTooltips(sampleBox, glossaryData);
  }

  const featuredTermIds = ["allelopathy", "mycorrhiza", "l-theanine", "epiphytic"];
  const allTerms = Array.isArray(glossaryData?.terms) ? glossaryData.terms : [];
  const featuredTerms = featuredTermIds
    .map((id) => allTerms.find((t) => t.id === id))
    .filter(Boolean);

  if (featuredTerms.length > 0) {
    const previewCard = createEl("div", "services-glossary-preview");
    const previewHead = createEl("div", "services-glossary-preview-head");
    const pTerm = createEl("span", "services-glossary-preview-term");
    const pCat = createEl("span", "services-glossary-preview-cat");
    previewHead.appendChild(pTerm);
    previewHead.appendChild(pCat);
    const pEn = createEl("p", "services-glossary-preview-en");
    const pBn = createEl("p", "services-glossary-preview-bn");
    previewCard.appendChild(previewHead);
    previewCard.appendChild(pEn);
    previewCard.appendChild(pBn);

    const legend = createEl("div", "services-glossary-legend");
    const selectTermPreview = (entry, activeBtn) => {
      legend.querySelectorAll(".services-glossary-chip-btn").forEach((b) => {
        b.classList.toggle("is-active", b === activeBtn);
      });
      pTerm.textContent = entry.term;
      pCat.textContent = entry.category || "Botanical Term";
      pEn.textContent = entry.en || "";
      pBn.textContent = entry.bn || "";
    };

    featuredTerms.forEach((entry, idx) => {
      const btn = createEl(
        "button",
        `services-glossary-chip-btn${idx === 0 ? " is-active" : ""}`,
        entry.term,
      );
      btn.type = "button";
      btn.addEventListener("click", () => selectTermPreview(entry, btn));
      legend.appendChild(btn);
    });

    selectTermPreview(featuredTerms[0], legend.firstElementChild);

    sampleBox.addEventListener("click", (e) => {
      const trigger = e.target.closest(".glossary-term");
      if (!trigger) return;
      const id = trigger.getAttribute("data-glossary-id");
      const matched = featuredTerms.find((t) => t.id === id);
      if (matched) {
        const idx = featuredTerms.indexOf(matched);
        selectTermPreview(matched, legend.children[idx]);
      }
    });

    rightPanel.appendChild(legend);
    rightPanel.appendChild(previewCard);
  }

  grid.appendChild(leftPanel);
  grid.appendChild(rightPanel);
  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function renderPathwaysSection(pathwaysCfg) {
  const section = createEl("section", "services-section");
  section.id = "services-pathways";
  const container = createEl("div", "section-container");

  container.appendChild(
    buildSectionHeader(pathwaysCfg.eyebrow, pathwaysCfg.heading, pathwaysCfg.lead),
  );

  const grid = createEl("div", "services-pathways-grid");
  (pathwaysCfg.items || []).forEach((item) => {
    const card = createEl("article", "services-pathway-card");
    card.appendChild(createEl("span", "services-pathway-index", item.index));
    card.appendChild(createEl("h3", "services-pathway-title", item.title));
    card.appendChild(createEl("p", "services-pathway-desc", item.description));

    const cta = createEl("a", "services-pathway-cta", item.ctaLabel || "Get Started →");
    cta.href = sanitizeUrl(item.href, "./species/");
    card.appendChild(cta);

    grid.appendChild(card);
  });

  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

export function renderServicesPortal(
  mountEl,
  { pageData, speciesIndex = [], seasonsData = null, glossaryData = null } = {},
) {
  if (!mountEl || !pageData) return;

  if (pageData.seo) {
    applyPageSeo(pageData.seo);
  }

  const seasons = Array.isArray(seasonsData?.seasons)
    ? seasonsData.seasons
    : FALLBACK_SEASONS;
  const metrics = computeArchiveMetrics(speciesIndex, seasons);

  const portal = createEl("div", "services-portal");
  portal.appendChild(
    renderHeroAndTelemetry(pageData.banner || {}, pageData.telemetry || [], metrics),
  );

  const telemetryBand = createEl("section", "services-telemetry-band");
  telemetryBand.setAttribute("aria-label", "Research suite key metrics");
  const telemetryContainer = createEl("div", "section-container");
  telemetryContainer.appendChild(
    createTelemetryStatsGrid(buildServicesTelemetryStats(), {
      ariaLabel: "Plantipedia research suite telemetry metrics",
      sectionId: "servicesTelemetryStatsGrid",
    }),
  );
  telemetryBand.appendChild(telemetryContainer);
  portal.appendChild(telemetryBand);

  portal.appendChild(renderComparisonSection(pageData.comparison || {}));
  portal.appendChild(renderAnalyticsSection(pageData.analytics || {}, metrics));
  portal.appendChild(renderToolkitSection(pageData.toolkit || {}));
  portal.appendChild(
    renderSandboxSection(pageData.sandbox || {}, speciesIndex, glossaryData),
  );
  portal.appendChild(renderPathwaysSection(pageData.pathways || {}));

  mountEl.replaceChildren(portal);
}
