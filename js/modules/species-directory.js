/**
 * Species Directory Renderer & Interactive Filter Controller (species.html)
 * Driven 100% by ./data/pages/species.json and ./data/plants.json.
 */

import {
  createEl,
  createSearchIconSvg,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../templates.js";
import { animateDynamicSpeciesGrid } from "../animations.js";

function plantMatchesQuery(plant, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const family = plant.overview?.family || plant.family || "";
  const plantGroup = plant.overview?.plantGroup || "";
  return (
    plant.commonName.toLowerCase().includes(q) ||
    plant.scientificName.toLowerCase().includes(q) ||
    family.toLowerCase().includes(q) ||
    plant.category.toLowerCase().includes(q) ||
    plantGroup.toLowerCase().includes(q)
  );
}

function plantMatchesCategory(plant, category) {
  if (!category || category === "All") return true;
  if (Array.isArray(plant.categories)) {
    return plant.categories.includes(category) || plant.category === category;
  }
  return plant.category === category;
}

export function renderDirectoryBanner(mountEl, { pageData, catalog }) {
  const banner = pageData?.banner;
  if (!mountEl || !banner) return;

  const totalCount = Array.isArray(catalog) ? catalog.length : 0;
  const wrapper = createEl("div", "directory-banner");
  const container = createEl("div", "section-container");

  // Breadcrumb bar
  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");
  (banner.breadcrumbs || []).forEach((crumb, idx) => {
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
      a.href = sanitizeUrl(crumb.href, "./index.html");
      li.appendChild(a);
    }
    ol.appendChild(li);
  });
  breadcrumbNav.appendChild(ol);
  container.appendChild(breadcrumbNav);

  // Banner grid
  const bannerGrid = createEl("div", "directory-banner-grid");
  const left = document.createElement("div");
  left.appendChild(createEl("span", "section-eyebrow", banner.eyebrow));
  left.appendChild(createEl("h1", "directory-headline", banner.headline));
  left.appendChild(createEl("p", "directory-subcopy", banner.subcopy));

  const statsWrap = createEl("div", "directory-live-stats");
  statsWrap.setAttribute("aria-live", "polite");

  const totalStat = createEl("div", "directory-stat-pill");
  const totalNum = createEl("span", "directory-stat-num", String(totalCount));
  totalNum.id = "directoryTotalCount";
  totalStat.appendChild(totalNum);
  totalStat.appendChild(
    createEl(
      "span",
      "directory-stat-label",
      banner.stats?.totalLabel || "Documented Species",
    ),
  );

  const filteredStat = createEl("div", "directory-stat-pill");
  const filteredNum = createEl("span", "directory-stat-num", String(totalCount));
  filteredNum.id = "directoryFilteredNum";
  filteredStat.appendChild(filteredNum);
  filteredStat.appendChild(
    createEl(
      "span",
      "directory-stat-label",
      banner.stats?.filteredLabel || "Matching Filters",
    ),
  );

  statsWrap.appendChild(totalStat);
  statsWrap.appendChild(filteredStat);

  bannerGrid.appendChild(left);
  bannerGrid.appendChild(statsWrap);
  container.appendChild(bannerGrid);
  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);
}

export function renderDirectoryExplorer(mountEl, { pageData, catalog }) {
  const explorer = pageData?.explorer;
  if (!mountEl || !explorer) return;

  const allPlants = Array.isArray(catalog) ? catalog : [];
  const categories =
    Array.isArray(explorer.categories) && explorer.categories.length > 0
      ? explorer.categories
      : [
          "All",
          "Flowers",
          "Fruit Trees",
          "Medicinal",
          "Shrubs & Herbs",
          "Trees & Palms",
          "Aquatic",
        ];
  const batchSize = Number(explorer.batchSize) > 0 ? Number(explorer.batchSize) : 24;

  const wrapper = createEl("div", "explorer-section directory-explorer");
  const container = createEl("div", "section-container");

  // Filter Panel
  const filterPanel = createEl("div", "directory-filter-panel");

  // Search + Sort row
  const searchSortRow = createEl("div", "directory-search-sort-row");
  const searchForm = createEl("form", "directory-search-form");
  searchForm.id = "directorySearchForm";
  searchForm.setAttribute("role", "search");
  searchForm.appendChild(createSearchIconSvg(18, "home-search-icon"));

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.id = "directorySearchInput";
  searchInput.placeholder =
    explorer.searchPlaceholder ||
    "Filter by common name, Latin binomial, or plant family...";
  searchInput.autocomplete = "off";
  searchInput.setAttribute(
    "aria-label",
    explorer.searchAriaLabel || "Filter available plant species",
  );

  const searchClear = createEl(
    "button",
    "home-search-clear",
    explorer.clearLabel || "Clear",
  );
  searchClear.type = "button";
  searchClear.id = "directorySearchClear";
  searchClear.hidden = true;

  searchForm.appendChild(searchInput);
  searchForm.appendChild(searchClear);

  const sortWrap = createEl("div", "directory-sort-wrap");
  const sortLabel = createEl("label", "directory-sort-label", explorer.sortLabel || "Sort");
  sortLabel.setAttribute("for", "directorySortSelect");
  const sortSelect = createEl("select", "directory-sort-select");
  sortSelect.id = "directorySortSelect";
  sortSelect.setAttribute("aria-label", explorer.sortAriaLabel || "Sort species");

  (explorer.sortOptions || [
    { value: "az", label: "Name (A–Z)" },
    { value: "za", label: "Name (Z–A)" },
    { value: "family", label: "Plant Family" },
  ]).forEach((optCfg) => {
    const opt = document.createElement("option");
    opt.value = optCfg.value;
    opt.textContent = optCfg.label;
    sortSelect.appendChild(opt);
  });

  sortWrap.appendChild(sortLabel);
  sortWrap.appendChild(sortSelect);
  searchSortRow.appendChild(searchForm);
  searchSortRow.appendChild(sortWrap);
  filterPanel.appendChild(searchSortRow);

  // Category Tabs
  const categoryTabsEl = createEl("div", "category-tabs");
  categoryTabsEl.id = "directoryCategoryTabs";
  categoryTabsEl.setAttribute("role", "tablist");
  categoryTabsEl.setAttribute(
    "aria-label",
    explorer.categoriesAriaLabel || "Filter species by botanical category",
  );

  categories.forEach((catName) => {
    const tab = createEl("button", "category-tab", catName);
    tab.type = "button";
    tab.setAttribute("data-category", catName);
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    categoryTabsEl.appendChild(tab);
  });
  filterPanel.appendChild(categoryTabsEl);

  // A–Z Strip
  const azWrap = createEl("div", "az-strip-wrap");
  azWrap.setAttribute("aria-label", explorer.azAriaLabel || "Alphabetical quick jump");
  azWrap.appendChild(createEl("span", "az-strip-label", explorer.azLabel || "A–Z Index"));

  const azStripEl = createEl("div", "az-letter-strip");
  azStripEl.id = "directoryAzStrip";
  azStripEl.setAttribute("role", "group");
  azStripEl.setAttribute(
    "aria-label",
    explorer.azGroupAriaLabel || "Filter by starting letter",
  );
  azWrap.appendChild(azStripEl);
  filterPanel.appendChild(azWrap);
  container.appendChild(filterPanel);

  // Status row
  const statusRow = createEl("div", "directory-status-row");
  const countEl = createEl(
    "p",
    "explorer-count",
    explorer.loadingLabel || "Indexing botanical species...",
  );
  countEl.id = "directoryExplorerCount";
  countEl.setAttribute("aria-live", "polite");

  const resetAllBtn = createEl(
    "button",
    "directory-clear-all",
    explorer.resetButtonLabel || "Reset All Filters",
  );
  resetAllBtn.type = "button";
  resetAllBtn.id = "directoryResetAllBtn";
  resetAllBtn.hidden = true;

  statusRow.appendChild(countEl);
  statusRow.appendChild(resetAllBtn);
  container.appendChild(statusRow);

  // Species Grid & Load More
  const gridEl = createEl("div", "species-grid");
  gridEl.id = "directorySpeciesGrid";
  container.appendChild(gridEl);

  const loadMoreWrap = createEl("div", "load-more-wrap");
  loadMoreWrap.id = "directoryLoadMoreWrap";
  loadMoreWrap.hidden = true;

  const loadMoreBtn = createEl("button", "cta-glow-button cta-glow-button--compact");
  loadMoreBtn.type = "button";
  loadMoreBtn.id = "directoryLoadMoreBtn";
  const loadMoreLabel = createEl(
    "span",
    "",
    explorer.loadMoreBaseLabel || "Load More Species",
  );
  loadMoreLabel.id = "directoryLoadMoreLabel";
  const loadMoreArrow = createEl("span", "cta-glow-arrow", "↓");
  loadMoreArrow.setAttribute("aria-hidden", "true");
  loadMoreBtn.appendChild(loadMoreLabel);
  loadMoreBtn.appendChild(loadMoreArrow);
  loadMoreWrap.appendChild(loadMoreBtn);
  container.appendChild(loadMoreWrap);

  wrapper.appendChild(container);
  mountEl.replaceChildren(wrapper);

  // Interactive controller state
  const params = new URLSearchParams(window.location.search);
  const paramCat = params.get("category");
  const paramQuery = params.get("q");
  const paramLetter = params.get("letter");

  let activeCategory =
    paramCat && categories.includes(paramCat) ? paramCat : "All";
  let activeQuery = paramQuery ? paramQuery.trim() : "";
  let activeLetter =
    paramLetter && /^[A-Z]$/i.test(paramLetter.trim())
      ? paramLetter.trim().toUpperCase()
      : "All";
  let activeSort = "az";
  let visibleLimit = batchSize;
  let isUserInteraction = false;

  if (activeQuery) {
    searchInput.value = activeQuery;
    searchClear.hidden = false;
  }

  const availableLetters = new Set(
    allPlants.map((p) => (p.commonName ? p.commonName.charAt(0).toUpperCase() : "")),
  );

  function renderAzStrip() {
    const letters = ["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    const frag = document.createDocumentFragment();
    letters.forEach((ltr) => {
      const isAll = ltr === "All";
      const hasEntries = isAll || availableLetters.has(ltr);
      const isActive = activeLetter === ltr;
      const btn = createEl(
        "button",
        `az-letter-btn${isActive ? " active" : ""}`,
        ltr,
      );
      btn.type = "button";
      btn.setAttribute("data-letter", ltr);
      if (!hasEntries) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
      }
      frag.appendChild(btn);
    });
    azStripEl.replaceChildren(frag);
  }

  function syncCategoryTabs() {
    categoryTabsEl.querySelectorAll("[data-category]").forEach((tab) => {
      const isActive = tab.getAttribute("data-category") === activeCategory;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
  }

  function getFilteredAndSorted() {
    const filtered = allPlants.filter((plant) => {
      const matchesCat = plantMatchesCategory(plant, activeCategory);
      const matchesQ = plantMatchesQuery(plant, activeQuery);
      const matchesLtr =
        activeLetter === "All" ||
        (plant.commonName && plant.commonName.charAt(0).toUpperCase() === activeLetter);
      return matchesCat && matchesQ && matchesLtr;
    });

    return filtered.slice().sort((a, b) => {
      if (activeSort === "za") {
        return b.commonName.localeCompare(a.commonName);
      }
      if (activeSort === "family") {
        const famCmp = (a.overview?.family || "").localeCompare(
          b.overview?.family || "",
        );
        return famCmp !== 0 ? famCmp : a.commonName.localeCompare(b.commonName);
      }
      return a.commonName.localeCompare(b.commonName);
    });
  }

  function resetAllFilters() {
    activeCategory = "All";
    activeQuery = "";
    activeLetter = "All";
    activeSort = "az";
    visibleLimit = batchSize;
    searchInput.value = "";
    searchClear.hidden = true;
    sortSelect.value = "az";
    syncCategoryTabs();
    renderAzStrip();
    renderDirectory();
  }

  function renderDirectory() {
    const sorted = getFilteredAndSorted();
    const totalMatched = sorted.length;
    const sliced = sorted.slice(0, visibleLimit);
    const hasFilters =
      activeCategory !== "All" || activeQuery !== "" || activeLetter !== "All";

    const filteredNumEl = document.getElementById("directoryFilteredNum");
    if (filteredNumEl) {
      filteredNumEl.textContent = String(totalMatched);
    }

    const totalStatEl = document.getElementById("directoryTotalCount");
    if (totalStatEl) {
      totalStatEl.textContent = String(allPlants.length);
    }

    countEl.textContent = `Displaying ${sliced.length} of ${totalMatched} matching species (${allPlants.length} total in archive)`;
    resetAllBtn.hidden = !hasFilters;

    if (totalMatched === 0) {
      const emptyBox = createEl("div", "empty-search-state");
      emptyBox.appendChild(
        createEl(
          "h3",
          "",
          explorer.emptyState?.heading || "No matching botanical species found",
        ),
      );
      emptyBox.appendChild(
        createEl(
          "p",
          "",
          explorer.emptyState?.message ||
            "Try clearing the letter filter, selecting a broader taxonomic category, or searching another plant name.",
        ),
      );
      const resetBtn = createEl(
        "button",
        "empty-reset-btn",
        explorer.emptyState?.resetLabel || "Reset All Filters",
      );
      resetBtn.type = "button";
      resetBtn.id = "dirEmptyResetBtn";
      resetBtn.addEventListener("click", () => {
        isUserInteraction = true;
        resetAllFilters();
      });
      emptyBox.appendChild(resetBtn);
      gridEl.replaceChildren(emptyBox);
      loadMoreWrap.hidden = true;
      return;
    }

    const frag = document.createDocumentFragment();
    sliced.forEach((plant) => {
      frag.appendChild(
        createSpeciesCardElement(plant, explorer.cardCtaLabel || "Explore Monograph"),
      );
    });
    gridEl.replaceChildren(frag);

    if (isUserInteraction) {
      animateDynamicSpeciesGrid(gridEl);
    }

    const remaining = totalMatched - sliced.length;
    if (remaining > 0) {
      loadMoreWrap.hidden = false;
      loadMoreLabel.textContent = `${explorer.loadMoreBaseLabel || "Load More Species"} (${Math.min(batchSize, remaining)} more of ${remaining} remaining)`;
    } else {
      loadMoreWrap.hidden = true;
    }
  }

  categoryTabsEl.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-category]");
    if (!tab) return;
    activeCategory = tab.getAttribute("data-category");
    visibleLimit = batchSize;
    isUserInteraction = true;
    syncCategoryTabs();
    renderDirectory();
  });

  azStripEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-letter]");
    if (!btn || btn.disabled) return;
    activeLetter = btn.getAttribute("data-letter");
    visibleLimit = batchSize;
    isUserInteraction = true;
    renderAzStrip();
    renderDirectory();
  });

  searchInput.addEventListener("input", () => {
    activeQuery = searchInput.value.trim();
    visibleLimit = batchSize;
    isUserInteraction = true;
    searchClear.hidden = activeQuery.length === 0;
    renderDirectory();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    visibleLimit = batchSize;
    isUserInteraction = true;
    searchClear.hidden = true;
    renderDirectory();
    searchInput.focus();
  });

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    isUserInteraction = true;
    renderDirectory();
  });

  sortSelect.addEventListener("change", () => {
    activeSort = sortSelect.value;
    visibleLimit = batchSize;
    isUserInteraction = true;
    renderDirectory();
  });

  resetAllBtn.addEventListener("click", () => {
    isUserInteraction = true;
    resetAllFilters();
  });

  loadMoreBtn.addEventListener("click", () => {
    visibleLimit += batchSize;
    isUserInteraction = true;
    renderDirectory();
  });

  window.__plantipediaSelectDirectoryCategory = (category) => {
    if (!categories.includes(category)) return;
    activeCategory = category;
    visibleLimit = batchSize;
    isUserInteraction = true;
    syncCategoryTabs();
    renderDirectory();
  };

  syncCategoryTabs();
  renderAzStrip();
  renderDirectory();
}
