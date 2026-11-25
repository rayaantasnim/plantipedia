/**
 * Dedicated "Bangladeshi 6-Season Botanical Calendar" Page (/seasons/)
 * - Auto-highlights the current Bangladeshi season (Shororitu) by default
 * - Allows clicking any season card to inspect seasonal ecological notes & filtered flora
 * - Renders a fixed bottom-right floating "← Go Back" button when inspecting an individual season view
 */

import {
  buildImageElement,
  createEl,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { animateDynamicSpeciesGrid } from "../../core/telemetry/animations.js";
import { applySeasonsSeo } from "../utils/seo.js";

const SPECIES_PER_PAGE = 5;

function detectCurrentBangladeshiSeasonId(seasons) {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const mmdd = m * 100 + d;

  for (const s of seasons) {
    const windows = Array.isArray(s.monthWindows) ? s.monthWindows : [];
    for (const [m1, d1, m2, d2] of windows) {
      const start = m1 * 100 + d1;
      const end = m2 * 100 + d2;
      if (mmdd >= start && mmdd <= end) {
        return s.id;
      }
    }
  }
  return seasons[0]?.id || "grishmo";
}

function renderSeasonSpeciesGrid(speciesList, seasonObj) {
  const grid = createEl("div", "species-grid species-grid--directory");
  speciesList.forEach((plant) => {
    const card = createSpeciesCardElement(plant, "Explore Monograph");
    const phenologyNote = plant.seasonalPhenology?.[seasonObj.id];
    if (phenologyNote) {
      const body = card.querySelector(".species-card-body");
      const cta = card.querySelector(".species-card-cta");
      if (body && cta) {
        const noteEl = createEl(
          "p",
          "season-phenology-note",
          `${seasonObj.nameBn}: ${phenologyNote}`,
        );
        body.insertBefore(noteEl, cta);
      }
    }
    grid.appendChild(card);
  });
  return grid;
}

export function renderSeasonsCalendar(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const seasons = Array.isArray(pageData.seasons) ? pageData.seasons : [];
  const ui = pageData.ui || {};
  const bannerCfg = pageData.banner || {};
  const currentSeasonId = detectCurrentBangladeshiSeasonId(seasons);
  const seasonMap = new Map(seasons.map((s) => [s.id, s]));

  function resolveFocusedSeasonFromUrl() {
    const q = new URLSearchParams(window.location.search).get("season");
    if (!q) return null;
    return seasonMap.get(q.trim().toLowerCase()) || null;
  }

  let focusedSeason = resolveFocusedSeasonFromUrl();
  let highlightedSeasonId = focusedSeason?.id || currentSeasonId;
  let seasonPage = 1;

  function syncFloatingBackButton(visible, onBack) {
    let btn = document.getElementById("seasonsFloatingBackBtn");
    if (!visible) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = createEl("button", "floating-back-btn", ui.goBackLabel || "← Go Back");
      btn.type = "button";
      btn.id = "seasonsFloatingBackBtn";
      btn.setAttribute("aria-label", "Return to all 6 Bangladeshi seasons");
      document.body.appendChild(btn);
    }
    btn.onclick = onBack;
  }

  function updateSeasonParam(seasonId) {
    try {
      const url = new URL(window.location.href);
      if (seasonId) {
        url.searchParams.set("season", seasonId);
      } else {
        url.searchParams.delete("season");
      }
      window.history.pushState({ season: seasonId || null }, "", url.toString());
    } catch {
      // Ignore history restrictions
    }
  }

  function buildSeasonPaginationBar(totalItems, totalPages, onPageChange) {
    const bar = createEl("div", "directory-pagination-bar");
    const status = createEl("div", "directory-pagination-status");
    const startIdx = totalItems === 0 ? 0 : (seasonPage - 1) * SPECIES_PER_PAGE + 1;
    const endIdx = Math.min(seasonPage * SPECIES_PER_PAGE, totalItems);
    status.appendChild(
      createEl(
        "p",
        "explorer-count",
        `Showing ${startIdx}–${endIdx} of ${totalItems} active seasonal flora species`,
      ),
    );
    bar.appendChild(status);

    const nav = createEl("nav", "directory-pagination-nav");
    nav.setAttribute("aria-label", "Seasonal flora pagination");
    if (totalPages <= 1) {
      nav.hidden = true;
    } else {
      const prevBtn = createEl("button", "pagination-btn", "← Prev");
      prevBtn.type = "button";
      prevBtn.disabled = seasonPage <= 1;
      prevBtn.addEventListener("click", () => onPageChange(seasonPage - 1));
      nav.appendChild(prevBtn);

      const pillsWrap = createEl("div", "pagination-pills");
      for (let p = 1; p <= totalPages; p += 1) {
        const pill = createEl(
          "button",
          `pagination-pill${p === seasonPage ? " active" : ""}`,
          String(p),
        );
        pill.type = "button";
        pill.setAttribute("aria-label", `Seasonal species page ${p}`);
        if (p === seasonPage) pill.setAttribute("aria-current", "page");
        pill.addEventListener("click", () => onPageChange(p));
        pillsWrap.appendChild(pill);
      }
      nav.appendChild(pillsWrap);

      const nextBtn = createEl("button", "pagination-btn", "Next →");
      nextBtn.type = "button";
      nextBtn.disabled = seasonPage >= totalPages;
      nextBtn.addEventListener("click", () => onPageChange(seasonPage + 1));
      nav.appendChild(nextBtn);
    }

    bar.appendChild(nav);
    return bar;
  }

  function renderSeasonDetailBlock(container, seasonObj) {
    const activeSpecies = (speciesIndex || []).filter(
      (p) => Array.isArray(p.seasons) && p.seasons.includes(seasonObj.id),
    );

    const ecoCard = createEl("section", "season-ecological-panel");
    ecoCard.setAttribute("aria-label", `${seasonObj.nameEn} ecological notes`);

    const ecoHead = createEl("div", "season-eco-head");
    const ecoTitles = document.createElement("div");
    ecoTitles.appendChild(
      createEl(
        "span",
        "section-eyebrow",
        `${seasonObj.bengaliMonths} · ${seasonObj.gregorianRange}`,
      ),
    );
    ecoTitles.appendChild(
      createEl(
        "h2",
        "season-eco-heading",
        `${seasonObj.nameEn} (${seasonObj.nameBn}) — ${seasonObj.phenologyHighlight}`,
      ),
    );
    ecoHead.appendChild(ecoTitles);

    if (seasonObj.id === currentSeasonId) {
      ecoHead.appendChild(
        createEl("span", "season-current-indicator", ui.currentBadge || "Current Season"),
      );
    }
    ecoCard.appendChild(ecoHead);
    ecoCard.appendChild(createEl("p", "justified-prose", seasonObj.climateSummary));

    if (Array.isArray(seasonObj.ecologicalNotes) && seasonObj.ecologicalNotes.length > 0) {
      const ul = createEl("ul", "family-traits-list");
      seasonObj.ecologicalNotes.forEach((n) => ul.appendChild(createEl("li", "family-trait-item", n)));
      ecoCard.appendChild(ul);
    }
    container.appendChild(ecoCard);

    const floraTitle = createEl(
      "h2",
      "taxonomy-members-heading",
      (ui.floraSectionHeading || "Flora Active in {season} ({bn})")
        .replace("{season}", seasonObj.nameEn)
        .replace("{bn}", seasonObj.nameBn),
    );
    container.appendChild(floraTitle);

    const listMount = createEl("div", "season-species-paginated-mount");

    const renderPage = () => {
      const totalPages = Math.max(1, Math.ceil(activeSpecies.length / SPECIES_PER_PAGE));
      if (seasonPage > totalPages) seasonPage = 1;
      const start = (seasonPage - 1) * SPECIES_PER_PAGE;
      const pageItems = activeSpecies.slice(start, start + SPECIES_PER_PAGE);

      const frag = document.createDocumentFragment();
      frag.appendChild(
        buildSeasonPaginationBar(activeSpecies.length, totalPages, (nextP) => {
          seasonPage = nextP;
          renderPage();
          floraTitle.scrollIntoView({ behavior: "smooth", block: "start" });
        }),
      );
      const grid = renderSeasonSpeciesGrid(pageItems, seasonObj);
      frag.appendChild(grid);
      listMount.replaceChildren(frag);
      animateDynamicSpeciesGrid(grid);
    };

    renderPage();
    container.appendChild(listMount);
  }

  function renderView() {
    try {
      const seoSpecies = focusedSeason
        ? (speciesIndex || []).filter(
            (p) => Array.isArray(p.seasons) && p.seasons.includes(focusedSeason.id),
          )
        : [];
      applySeasonsSeo({
        pageData,
        seasons,
        focusedSeason,
        activeSpecies: seoSpecies,
      });
    } catch {
      // Non-blocking SEO update
    }
    const wrapper = createEl("div", "seasons-calendar-shell");
    const container = createEl("div", "section-container");

    // Breadcrumb & Banner
    const breadcrumbNav = createEl("nav", "breadcrumb-bar");
    breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
    const ol = createEl("ol", "breadcrumb-list");
    const crumbs = focusedSeason
      ? [
          { label: "Home", href: "./" },
          { label: "6-Season Calendar", href: "./seasons/" },
          { label: `${focusedSeason.nameEn} (${focusedSeason.nameBn})`, current: true },
        ]
      : bannerCfg.breadcrumbs || [
          { label: "Home", href: "./" },
          { label: "6-Season Calendar", current: true },
        ];

    crumbs.forEach((crumb, idx) => {
      const li = createEl("li", "breadcrumb-item");
      if (idx > 0) {
        const sep = createEl("span", "breadcrumb-sep", "/");
        sep.setAttribute("aria-hidden", "true");
        li.appendChild(sep);
      }
      if (crumb.current || !crumb.href) {
        const span = createEl("span", "breadcrumb-current", crumb.label);
        span.setAttribute("aria-current", "page");
        li.appendChild(span);
      } else {
        const a = createEl("a", "breadcrumb-link", crumb.label);
        a.href = sanitizeUrl(crumb.href, "./");
        li.appendChild(a);
      }
      ol.appendChild(li);
    });
    breadcrumbNav.appendChild(ol);
    container.appendChild(breadcrumbNav);

    const header = createEl("div", "taxonomy-page-header");
    header.appendChild(
      createEl(
        "span",
        "section-eyebrow",
        focusedSeason
          ? `${focusedSeason.bengaliMonths} · ${focusedSeason.gregorianRange}`
          : bannerCfg.eyebrow || "Phenology & Climate",
      ),
    );
    header.appendChild(
      createEl(
        "h1",
        "directory-headline",
        focusedSeason
          ? `${focusedSeason.nameEn} (${focusedSeason.nameBn})`
          : bannerCfg.headline || "Bangladeshi 6-Season Botanical Calendar",
      ),
    );
    header.appendChild(
      createEl(
        "p",
        "justified-prose directory-subcopy",
        focusedSeason ? focusedSeason.climateSummary : bannerCfg.subcopy || "",
      ),
    );
    if (!focusedSeason) {
      const plate = createEl("figure", "page-preview-plate");
      const media = createEl("div", "page-preview-plate-media");
      media.appendChild(
        buildImageElement(
          "https://inaturalist-open-data.s3.amazonaws.com/photos/407168966/large.jpg",
          "Rhizophora mangle coastal mangrove biome reflecting tidal and monsoon seasonality",
          "Shororitu Wetland Phenology",
        ),
      );
      plate.appendChild(media);
      plate.appendChild(
        createEl(
          "figcaption",
          "page-preview-plate-caption",
          "Fig. SN-01 — Estuarine Rhizophora mangle root and canopy guild demonstrating monsoon rainfall and tidal phenological shifts across Bengal's six seasons.",
        ),
      );
      header.appendChild(plate);
    }
    container.appendChild(header);

    if (!focusedSeason) {
      syncFloatingBackButton(false);

      const seasonGrid = createEl("div", "seasons-grid");
      seasons.forEach((s) => {
        const isCurrent = s.id === currentSeasonId;
        const isActive = s.id === highlightedSeasonId;
        const count = (speciesIndex || []).filter(
          (p) => Array.isArray(p.seasons) && p.seasons.includes(s.id),
        ).length;

        const card = createEl(
          "button",
          `season-card${isCurrent ? " is-current-season" : ""}${isActive ? " is-selected" : ""}`,
        );
        card.type = "button";
        card.setAttribute("data-season-id", s.id);

        if (s.imageUrl) {
          const mediaBox = createEl("div", "season-card-media");
          mediaBox.appendChild(
            buildImageElement(
              s.imageUrl,
              s.imageAlt || `${s.nameEn} (${s.nameBn}) seasonal botanical habitat`,
              `${s.nameEn} — ${s.nameBn}`,
            ),
          );
          card.appendChild(mediaBox);
        }

        const top = createEl("div", "season-card-top");
        top.appendChild(createEl("span", "season-number", s.number));
        if (isCurrent) {
          top.appendChild(
            createEl("span", "season-current-indicator", ui.currentBadge || "Current Season"),
          );
        } else {
          top.appendChild(createEl("span", "season-months-meta", s.gregorianRange));
        }
        card.appendChild(top);

        const titles = createEl("div", "season-card-titles");
        titles.appendChild(createEl("h2", "season-card-en", s.nameEn));
        titles.appendChild(createEl("span", "season-card-bn", s.nameBn));
        card.appendChild(titles);

        card.appendChild(createEl("p", "season-card-bengali-months", s.bengaliMonths));
        card.appendChild(createEl("p", "season-card-highlight", s.phenologyHighlight));

        const foot = createEl("div", "season-card-footer");
        foot.appendChild(
          createEl(
            "span",
            "season-count-label",
            (ui.speciesCountTemplate || "{count} Active Species").replace(
              "{count}",
              String(count),
            ),
          ),
        );
        foot.appendChild(
          createEl("span", "family-inspect-cta", ui.inspectSeasonCta || "Explore Season Flora →"),
        );
        card.appendChild(foot);

        card.addEventListener("click", () => {
          focusedSeason = s;
          highlightedSeasonId = s.id;
          seasonPage = 1;
          updateSeasonParam(s.id);
          renderView();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });

        seasonGrid.appendChild(card);
      });

      container.appendChild(seasonGrid);
    } else {
      // Individual Focused Season View + Floating Go Back + 5-per-page pagination
      renderSeasonDetailBlock(container, focusedSeason);

      syncFloatingBackButton(true, () => {
        focusedSeason = null;
        highlightedSeasonId = currentSeasonId;
        seasonPage = 1;
        updateSeasonParam(null);
        renderView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    wrapper.appendChild(container);
    mountEl.replaceChildren(wrapper);
  }

  window.addEventListener("popstate", () => {
    focusedSeason = resolveFocusedSeasonFromUrl();
    highlightedSeasonId = focusedSeason?.id || currentSeasonId;
    seasonPage = 1;
    renderView();
  });

  renderView();
}
