/**
 * Shared live species autocomplete interactions for Navbar, Mobile Overlay, and Home Hero.
 * Idempotently binds event handlers as shell and hero mount points hydrate.
 */

import { getSpeciesCatalog } from "./state.js";
import { renderSearchSuggestionNodes } from "./templates.js";
import { bindGlobalImageFallbackHandler } from "./modules/shell.js";

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

function bindLiveSpeciesSearch(config) {
  const form = document.getElementById(config.formId);
  const input = document.getElementById(config.inputId);
  const clearBtn = document.getElementById(config.clearId);
  const suggestionsEl = document.getElementById(config.suggestionsId);

  if (!form || !input || !suggestionsEl) return;
  if (form.dataset.searchBound === "true") return;
  form.dataset.searchBound = "true";

  let activeIndex = -1;
  let currentMatches = [];

  function hideSuggestions() {
    suggestionsEl.hidden = true;
    suggestionsEl.replaceChildren();
    activeIndex = -1;
  }

  function renderSuggestions(query) {
    const q = query.trim();
    if (clearBtn) clearBtn.hidden = q.length === 0;

    if (!q) {
      currentMatches = [];
      hideSuggestions();
      return;
    }

    const catalog = getSpeciesCatalog();
    currentMatches = catalog
      .filter((plant) => plantMatchesQuery(plant, q))
      .slice(0, config.maxResults || 8);

    activeIndex = -1;
    renderSearchSuggestionNodes(
      suggestionsEl,
      currentMatches,
      q,
      config.itemVariant || "nav",
    );
  }

  function syncActiveSuggestion() {
    const items = suggestionsEl.querySelectorAll(".nav-suggestion-item");
    items.forEach((el, idx) => {
      el.classList.toggle("is-active", idx === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }
  }

  function navigateToSpecies(slug) {
    if (typeof config.onNavigate === "function") {
      config.onNavigate();
    }
    window.location.href = `./plant.html?species=${encodeURIComponent(slug)}`;
  }

  input.addEventListener("input", () => {
    renderSuggestions(input.value);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderSuggestions(input.value);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideSuggestions();
      input.blur();
      return;
    }
    if (suggestionsEl.hidden || currentMatches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentMatches.length;
      syncActiveSuggestion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex =
        (activeIndex - 1 + currentMatches.length) % currentMatches.length;
      syncActiveSuggestion();
    } else if (
      e.key === "Enter" &&
      activeIndex >= 0 &&
      currentMatches[activeIndex]
    ) {
      e.preventDefault();
      navigateToSpecies(currentMatches[activeIndex].slug);
    }
  });

  suggestionsEl.addEventListener("click", (e) => {
    if (e.target.closest("a") && typeof config.onNavigate === "function") {
      config.onNavigate();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.hidden = true;
      hideSuggestions();
      input.focus();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (activeIndex >= 0 && currentMatches[activeIndex]) {
      navigateToSpecies(currentMatches[activeIndex].slug);
      return;
    }
    const q = input.value.trim();
    if (!q && config.emptySubmitToDirectory) {
      window.location.href = "./species.html";
      return;
    }
    const matches = getSpeciesCatalog().filter((p) => plantMatchesQuery(p, q));
    if (matches.length === 1) {
      navigateToSpecies(matches[0].slug);
      return;
    }
    if (q) {
      if (typeof config.onNavigate === "function") {
        config.onNavigate();
      }
      window.location.href = `./species.html?q=${encodeURIComponent(q)}`;
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(config.wrapSelector)) {
      hideSuggestions();
    }
  });
}

function closeMobileOverlayIfOpen() {
  const overlay = document.getElementById("mobileNavOverlay");
  const toggleBtn = document.getElementById("mobileMenuToggle");
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  if (toggleBtn) {
    toggleBtn.classList.remove("is-open");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "Open navigation menu");
  }
  document.documentElement.classList.remove("overlay-locked");
  document.body.classList.remove("overlay-locked");
}

export function initNavigationInteractions() {
  bindGlobalImageFallbackHandler();

  bindLiveSpeciesSearch({
    formId: "navbarSearchForm",
    inputId: "navbarSearchInput",
    clearId: "navbarSearchClear",
    suggestionsId: "navbarSuggestions",
    wrapSelector: "#navbarSearchWrap",
    itemVariant: "nav",
    maxResults: 8,
  });

  bindLiveSpeciesSearch({
    formId: "homeSearchForm",
    inputId: "homeSearchInput",
    clearId: "homeSearchClear",
    suggestionsId: "homeSuggestions",
    wrapSelector: ".home-search-shell",
    itemVariant: "home",
    maxResults: 7,
    emptySubmitToDirectory: true,
  });

  bindLiveSpeciesSearch({
    formId: "mobileSearchForm",
    inputId: "mobileSearchInput",
    clearId: "mobileSearchClear",
    suggestionsId: "mobileSuggestions",
    wrapSelector: "#mobileSearchWrap",
    itemVariant: "nav",
    maxResults: 8,
    onNavigate: closeMobileOverlayIfOpen,
  });
}
