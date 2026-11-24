/**
 * Plant Monograph Detail Page Renderer & Section Map Overlay Controller (plant.html)
 * Driven 100% by ./data/pages/plant.json and ./data/plants.json.
 */

import {
  buildImageElement,
  createCloseIconSvg,
  createEl,
  sanitizeUrl,
} from "../templates.js";
import { applyPlantMonographSeo } from "./seo.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function createSectionMapIconSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const poly = document.createElementNS(SVG_NS, "polygon");
  poly.setAttribute("points", "3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21");
  const l1 = document.createElementNS(SVG_NS, "line");
  l1.setAttribute("x1", "9");
  l1.setAttribute("y1", "3");
  l1.setAttribute("x2", "9");
  l1.setAttribute("y2", "18");
  const l2 = document.createElementNS(SVG_NS, "line");
  l2.setAttribute("x1", "15");
  l2.setAttribute("y1", "6");
  l2.setAttribute("x2", "15");
  l2.setAttribute("y2", "21");

  svg.appendChild(poly);
  svg.appendChild(l1);
  svg.appendChild(l2);
  return svg;
}

function getTargetSlug(allPlants) {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("species");
  if (querySlug) return querySlug.trim().toLowerCase();

  const hash = window.location.hash || "";
  const match = hash.match(/^#\/plant\/([^/?#]+)/i);
  if (match && match[1]) return decodeURIComponent(match[1]).toLowerCase();

  return allPlants.length > 0 ? allPlants[0].slug : "";
}

function buildFigureElement(fig, figCode, className) {
  const figure = createEl("figure", className);
  const mediaBox = createEl("div", "figure-media-box");
  mediaBox.appendChild(
    buildImageElement(
      fig.url || fig.imageUrl,
      fig.alt || fig.caption || "",
      fig.caption || fig.alt || "Botanical Illustration Plate",
    ),
  );
  figure.appendChild(mediaBox);

  const caption = document.createElement("figcaption");
  caption.appendChild(createEl("span", "figcaption-fig", figCode));
  caption.appendChild(document.createTextNode(fig.caption || ""));
  figure.appendChild(caption);
  return figure;
}

function renderTextbookChapter(section, safetyTitle) {
  const article = createEl("article", "chapter-card");
  article.id = `section-${section.number}`;

  // Header
  const header = createEl("header", "chapter-header");
  const titleGroup = createEl("div", "chapter-title-group");
  titleGroup.appendChild(createEl("span", "chapter-num", section.number));
  titleGroup.appendChild(createEl("h2", "chapter-title", section.title));
  header.appendChild(titleGroup);
  header.appendChild(createEl("span", "chapter-subtitle", section.subtitle || ""));
  article.appendChild(header);

  // Body
  const body = createEl("div", "chapter-body");
  const images = Array.isArray(section.images) ? section.images : [];
  const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];

  const createSafetyNotice = () => {
    if (!section.safetyNote) return null;
    const notice = createEl("div", "safety-notice-box");
    notice.setAttribute("role", "note");
    notice.appendChild(
      createEl(
        "span",
        "safety-notice-title",
        safetyTitle || "Botanical & Clinical Safety Advisory",
      ),
    );
    notice.appendChild(document.createTextNode(section.safetyNote));
    return notice;
  };

  const createSubblocks = () => {
    if (!Array.isArray(section.subblocks) || section.subblocks.length === 0) {
      return null;
    }
    const wrap = createEl("div", "chapter-subblocks");
    section.subblocks.forEach((sub) => {
      const item = createEl("div", "subblock-item");
      item.appendChild(createEl("h4", "", sub.heading));
      item.appendChild(createEl("p", "", sub.text));
      wrap.appendChild(item);
    });
    return wrap;
  };

  if (images.length === 1) {
    const splitGrid = createEl("div", "chapter-split-grid");
    const proseCol = createEl("div", "chapter-prose-col");
    paragraphs.forEach((p) => proseCol.appendChild(createEl("p", "", p)));
    const safetyEl = createSafetyNotice();
    if (safetyEl) proseCol.appendChild(safetyEl);

    splitGrid.appendChild(proseCol);
    splitGrid.appendChild(
      buildFigureElement(
        images[0],
        `Fig. ${section.number}.1`,
        "chapter-figure-single",
      ),
    );
    body.appendChild(splitGrid);

    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
  } else if (images.length >= 2) {
    paragraphs.forEach((p) => body.appendChild(createEl("p", "", p)));

    const gallery = createEl("div", "chapter-gallery-two");
    images.forEach((img, idx) => {
      gallery.appendChild(
        buildFigureElement(img, `Fig. ${section.number}.${idx + 1}`, "gallery-figure"),
      );
    });
    body.appendChild(gallery);

    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
    const safetyEl = createSafetyNotice();
    if (safetyEl) body.appendChild(safetyEl);
  } else {
    paragraphs.forEach((p) => body.appendChild(createEl("p", "", p)));
    const subblocks = createSubblocks();
    if (subblocks) body.appendChild(subblocks);
    const safetyEl = createSafetyNotice();
    if (safetyEl) body.appendChild(safetyEl);
  }

  article.appendChild(body);
  return article;
}

function mountAndBindSectionMap(sectionMapCfg, plant) {
  const mount = document.querySelector('[data-section="section-map"]');
  if (!mount) return;

  if (!plant) {
    mount.replaceChildren();
    return;
  }

  const descriptions = sectionMapCfg.descriptions || {};

  // Floating pill dock
  const dock = createEl("div", "section-map-dock");
  dock.id = "sectionMapDock";

  const trigger = createEl("button", "section-map-pill");
  trigger.type = "button";
  trigger.id = "sectionMapTrigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "sectionMapOverlay");
  trigger.appendChild(createSectionMapIconSvg());
  trigger.appendChild(createEl("span", "", sectionMapCfg.pillLabel || "Section Map"));
  dock.appendChild(trigger);

  // Fullscreen modal overlay
  const overlay = createEl("div", "section-map-overlay");
  overlay.id = "sectionMapOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "sectionMapHeading");
  overlay.hidden = true;

  const stickyHeader = createEl("div", "section-map-sticky-header");
  const headerInner = createEl("div", "section-map-header-inner");

  const headerText = document.createElement("div");
  const speciesLabel = createEl(
    "span",
    "section-map-kicker",
    `${plant.commonName} (${plant.scientificName})`,
  );
  speciesLabel.id = "sectionMapSpeciesLabel";
  const heading = createEl(
    "h2",
    "section-map-title",
    sectionMapCfg.heading || "JUMP TO SECTION",
  );
  heading.id = "sectionMapHeading";
  headerText.appendChild(speciesLabel);
  headerText.appendChild(heading);

  const closeBtn = createEl("button", "section-map-close");
  closeBtn.type = "button";
  closeBtn.id = "sectionMapClose";
  closeBtn.setAttribute("aria-label", sectionMapCfg.closeLabel || "Close section map");
  closeBtn.appendChild(createCloseIconSvg(20));

  headerInner.appendChild(headerText);
  headerInner.appendChild(closeBtn);
  stickyHeader.appendChild(headerInner);

  const overlayBody = createEl("div", "section-map-body");
  const grid = createEl("div", "section-map-grid");
  grid.id = "sectionMapGrid";

  const mapItems = [
    {
      number: "00",
      title: sectionMapCfg.overviewTitle || "Hero & Botanical Classification",
      desc: descriptions["00"] || "",
      targetId: "section-00",
    },
    ...(plant.sections || []).map((sec) => ({
      number: sec.number,
      title: sec.title,
      desc: sec.summary || descriptions[sec.number] || sec.subtitle || "",
      targetId: `section-${sec.number}`,
    })),
  ];

  mapItems.forEach((item) => {
    const cardBtn = createEl("button", "section-map-card");
    cardBtn.type = "button";
    cardBtn.setAttribute("data-jump-target", item.targetId);

    const cardTop = createEl("div", "section-map-card-top");
    cardTop.appendChild(createEl("span", "section-map-badge", item.number));
    const arrow = createEl("span", "section-map-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    cardTop.appendChild(arrow);

    const textBlock = document.createElement("div");
    textBlock.appendChild(createEl("h3", "section-map-card-title", item.title));
    textBlock.appendChild(createEl("p", "section-map-card-desc", item.desc));

    cardBtn.appendChild(cardTop);
    cardBtn.appendChild(textBlock);
    grid.appendChild(cardBtn);
  });

  overlayBody.appendChild(grid);
  overlay.appendChild(stickyHeader);
  overlay.appendChild(overlayBody);

  const frag = document.createDocumentFragment();
  frag.appendChild(dock);
  frag.appendChild(overlay);
  mount.replaceChildren(frag);

  const openOverlay = () => {
    overlay.hidden = false;
    document.body.classList.add("overlay-locked");
    trigger.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  };

  const closeOverlay = () => {
    overlay.hidden = true;
    document.body.classList.remove("overlay-locked");
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", openOverlay);
  closeBtn.addEventListener("click", () => {
    closeOverlay();
    trigger.focus();
  });

  overlay.addEventListener("click", (e) => {
    const card = e.target.closest("[data-jump-target]");
    if (card) {
      const targetId = card.getAttribute("data-jump-target");
      closeOverlay();
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (e.target === overlay) {
      closeOverlay();
      trigger.focus();
    }
  });

  if (!window.__plantipediaSectionMapEscBound) {
    window.__plantipediaSectionMapEscBound = true;
    document.addEventListener("keydown", (e) => {
      const ov = document.getElementById("sectionMapOverlay");
      const tg = document.getElementById("sectionMapTrigger");
      if (e.key === "Escape" && ov && !ov.hidden) {
        ov.hidden = true;
        document.body.classList.remove("overlay-locked");
        if (tg) {
          tg.setAttribute("aria-expanded", "false");
          tg.focus();
        }
      }
    });
  }
}

export function renderPlantMonograph(mountEl, { pageData, catalog }) {
  if (!mountEl || !pageData) return;

  const allPlants = Array.isArray(catalog) ? catalog : [];
  const monographCfg = pageData.monograph || {};
  const sectionMapCfg = pageData.sectionMap || {};
  const slug = getTargetSlug(allPlants);
  const plantIdx = allPlants.findIndex((p) => p.slug === slug);

  if (plantIdx === -1) {
    const notFound = monographCfg.notFound || {};
    document.title = notFound.seoTitle || "Species Not Found | Plantipedia";

    const detailWrap = createEl("div", "detail-container");
    const errCard = createEl("div", "app-error-state");
    errCard.appendChild(
      createEl("h1", "", notFound.heading || "Species Monograph Not Found"),
    );
    errCard.appendChild(
      createEl(
        "p",
        "",
        notFound.message ||
          "No plant entry matched the requested species identifier. Browse all documented monographs in the directory.",
      ),
    );
    const backLink = createEl(
      "a",
      "empty-reset-btn empty-reset-link",
      notFound.ctaLabel || "Browse Available Species",
    );
    backLink.href = sanitizeUrl(notFound.ctaHref, "./species.html");
    errCard.appendChild(backLink);
    detailWrap.appendChild(errCard);

    mountEl.replaceChildren(detailWrap);
    mountAndBindSectionMap(sectionMapCfg, null);
    return;
  }

  const plant = allPlants[plantIdx];
  const prevPlant = allPlants[(plantIdx - 1 + allPlants.length) % allPlants.length];
  const nextPlant = allPlants[(plantIdx + 1) % allPlants.length];

  applyPlantMonographSeo(plant);

  const ov = plant.overview || {};
  const labels = monographCfg.tableLabels || {};
  const categoryHref = `./species.html?category=${encodeURIComponent(plant.category)}`;

  const detailContainer = createEl("div", "detail-container");

  // 1. Breadcrumb & taxonomy trail
  const breadcrumbRow = createEl("div", "detail-breadcrumb-row");
  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");

  const crumbs = [
    { label: monographCfg.homeLabel || "Home", href: sanitizeUrl(monographCfg.homeHref, "./index.html") },
    { label: monographCfg.directoryLabel || "Available Species", href: sanitizeUrl(monographCfg.directoryHref, "./species.html") },
    { label: plant.category, href: categoryHref },
    { label: plant.commonName, current: true },
  ];

  crumbs.forEach((c, idx) => {
    const li = createEl("li", "breadcrumb-item");
    if (idx > 0) {
      const sep = createEl("span", "breadcrumb-sep", "/");
      sep.setAttribute("aria-hidden", "true");
      li.appendChild(sep);
    }
    if (c.current) {
      const curr = createEl("span", "breadcrumb-current", c.label);
      curr.setAttribute("aria-current", "page");
      li.appendChild(curr);
    } else {
      const a = createEl("a", "breadcrumb-link", c.label);
      a.href = c.href;
      li.appendChild(a);
    }
    ol.appendChild(li);
  });
  breadcrumbNav.appendChild(ol);

  const trail = createEl("div", "detail-taxonomy-trail");
  trail.appendChild(document.createTextNode(`${ov.family || ""} · `));
  const sciEm = createEl("em", "", plant.scientificName);
  trail.appendChild(sciEm);

  breadcrumbRow.appendChild(breadcrumbNav);
  breadcrumbRow.appendChild(trail);
  detailContainer.appendChild(breadcrumbRow);

  // 2. Section 00: Hero Overview Card & Classification Table
  const heroCard = createEl("section", "overview-hero-card");
  heroCard.id = "section-00";

  const headerGrid = createEl("div", "overview-header-grid");
  const titleBlock = createEl("div", "overview-title-block");
  titleBlock.appendChild(
    createEl(
      "span",
      "section-index-label",
      monographCfg.profileLabel || "SECTION 00 · BOTANICAL PROFILE",
    ),
  );
  titleBlock.appendChild(createEl("h1", "overview-plant-title", plant.commonName));
  titleBlock.appendChild(createEl("p", "overview-scientific-name", plant.scientificName));
  titleBlock.appendChild(createEl("p", "overview-lead-summary", plant.leadOverview));

  const heroFigure = createEl("figure", "overview-hero-figure");
  const heroMedia = createEl("div", "overview-hero-media");
  heroMedia.appendChild(
    buildImageElement(
      plant.heroImage?.url,
      plant.heroImage?.alt || plant.commonName,
      `${plant.commonName} Botanical Plate`,
      { eager: true },
    ),
  );
  heroFigure.appendChild(heroMedia);
  heroFigure.appendChild(
    createEl(
      "figcaption",
      "",
      `${monographCfg.platePrefix || "Plate 00"} — ${plant.heroImage?.caption || ""}`,
    ),
  );

  headerGrid.appendChild(titleBlock);
  headerGrid.appendChild(heroFigure);
  heroCard.appendChild(headerGrid);

  const tableWrap = createEl("div", "classification-table-wrap");
  tableWrap.appendChild(
    createEl(
      "div",
      "classification-table-caption",
      monographCfg.tableCaption || "Botanical Classification & Taxonomic Summary",
    ),
  );

  const tableGrid = createEl("div", "classification-table");
  tableGrid.setAttribute("role", "table");
  tableGrid.setAttribute("aria-label", "Botanical Classification Table");

  const overviewRows = [
    { key: labels.scientificName || "Scientific Name", val: plant.scientificName, italic: true },
    { key: labels.plantGroup || "Plant Group", val: ov.plantGroup, italic: false },
    { key: labels.family || "Plant Family", val: ov.family, italic: false },
    { key: labels.genus || "Genus", val: ov.genus, italic: true },
    { key: labels.species || "Species", val: ov.species, italic: true },
    { key: labels.growthForm || "Growth Form", val: ov.growthForm, italic: false },
    { key: labels.nativeOrigin || "Native Origin", val: ov.nativeOrigin, italic: false },
    { key: labels.commonUses || "Common Uses", val: ov.commonUses, italic: false },
  ];

  overviewRows.forEach((row) => {
    const rowEl = createEl("div", "classification-row");
    rowEl.appendChild(createEl("span", "classification-key", row.key));
    rowEl.appendChild(
      createEl(
        "span",
        `classification-val${row.italic ? " is-italic" : ""}`,
        row.val || "",
      ),
    );
    tableGrid.appendChild(rowEl);
  });

  tableWrap.appendChild(tableGrid);
  heroCard.appendChild(tableWrap);
  detailContainer.appendChild(heroCard);

  // 3. Chapters 01–07
  const chaptersWrap = createEl("div", "encyclopedia-chapters");
  (plant.sections || []).forEach((sec) => {
    chaptersWrap.appendChild(renderTextbookChapter(sec, monographCfg.safetyTitle));
  });
  detailContainer.appendChild(chaptersWrap);

  // 4. Previous / Next Pager
  const pagerNav = createEl("nav", "species-pager");
  pagerNav.setAttribute("aria-label", "Adjacent plant species");

  const makePagerLink = (targetPlant, directionClass, directionLabel) => {
    const a = createEl("a", `pager-link ${directionClass}`);
    a.href = `./plant.html?species=${encodeURIComponent(targetPlant.slug)}`;
    a.appendChild(createEl("span", "pager-direction", directionLabel));
    a.appendChild(createEl("span", "pager-species-name", targetPlant.commonName));
    a.appendChild(createEl("span", "pager-species-sci", targetPlant.scientificName));
    return a;
  };

  pagerNav.appendChild(
    makePagerLink(prevPlant, "prev", monographCfg.previousLabel || "← Previous Monograph"),
  );
  pagerNav.appendChild(
    makePagerLink(nextPlant, "next", monographCfg.nextLabel || "Next Monograph →"),
  );
  detailContainer.appendChild(pagerNav);

  mountEl.replaceChildren(detailContainer);
  mountAndBindSectionMap(sectionMapCfg, plant);
}
