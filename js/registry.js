/**
 * Declarative Component Registry for Plantipedia Headless Static Architecture.
 * - Scans DOM for [data-shell] and [data-section] mount points on load
 * - Resolves minimal deduplicated JSON dataset dependencies per active page
 * - Renders skeletons immediately to prevent CLS and hydrates concurrently via Promise.allSettled()
 */

import { fetchDataset, fetchDatasetsConcurrently } from "./api.js";
import { setMountState, setSpeciesCatalog } from "./state.js";
import { applyPageSeo } from "./modules/seo.js";
import { renderNavbarShell, renderFooterShell } from "./modules/shell.js";
import {
  renderHeroSection,
  renderAboutSection,
  renderFeaturedSpeciesSection,
  renderTaxonomySection,
  renderTriviaSection,
  renderHighlightsSection,
  renderMountSkeleton,
  renderMountError,
} from "./templates.js";
import {
  renderDirectoryBanner,
  renderDirectoryExplorer,
} from "./modules/species-directory.js";
import { renderPlantMonograph } from "./modules/plant-monograph.js";
import { animateHydratedSection, refreshScrollTriggers } from "./animations.js";
import { initNavigationInteractions } from "./navigation.js";

const SHELL_REGISTRY = {
  navbar: {
    datasets: ["siteShell"],
    render: (el, dataMap) => {
      renderNavbarShell(el, dataMap.get("siteShell")?.data || null);
    },
  },
  footer: {
    datasets: ["siteShell"],
    render: (el, dataMap) => {
      renderFooterShell(el, dataMap.get("siteShell")?.data || null);
    },
  },
};

const SECTION_REGISTRY = {
  hero: {
    datasets: ["page:home"],
    optionalDatasets: ["catalog"],
    render: (el, dataMap) => {
      renderHeroSection(el, {
        pageData: dataMap.get("page:home")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  about: {
    datasets: ["page:home"],
    optionalDatasets: ["catalog"],
    render: (el, dataMap) => {
      renderAboutSection(el, {
        pageData: dataMap.get("page:home")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  "featured-species": {
    datasets: ["featured"],
    optionalDatasets: ["catalog"],
    render: (el, dataMap) => {
      renderFeaturedSpeciesSection(el, {
        sectionData: dataMap.get("featured")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  taxonomy: {
    datasets: ["taxonomy"],
    render: (el, dataMap) => {
      renderTaxonomySection(el, {
        sectionData: dataMap.get("taxonomy")?.data,
      });
    },
  },
  trivia: {
    datasets: ["trivia"],
    render: (el, dataMap) => {
      renderTriviaSection(el, {
        sectionData: dataMap.get("trivia")?.data,
      });
    },
  },
  highlights: {
    datasets: ["highlights"],
    render: (el, dataMap) => {
      renderHighlightsSection(el, {
        sectionData: dataMap.get("highlights")?.data,
      });
    },
  },
  "directory-banner": {
    datasets: ["page:species"],
    optionalDatasets: ["catalog"],
    render: (el, dataMap) => {
      renderDirectoryBanner(el, {
        pageData: dataMap.get("page:species")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  "directory-explorer": {
    datasets: ["page:species", "catalog"],
    render: (el, dataMap) => {
      renderDirectoryExplorer(el, {
        pageData: dataMap.get("page:species")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  "plant-monograph": {
    datasets: ["page:plant", "catalog"],
    render: (el, dataMap) => {
      renderPlantMonograph(el, {
        pageData: dataMap.get("page:plant")?.data,
        catalog: dataMap.get("catalog")?.data || [],
      });
    },
  },
  "section-map": {
    // Co-hydrated by plant-monograph once active species monograph resolves
    datasets: [],
    skipSkeleton: true,
    render: null,
  },
};

function resolveActivePageKey() {
  const mainEl = document.getElementById("app-main");
  const pageName =
    mainEl?.getAttribute("data-page") ||
    document.body.getAttribute("data-page") ||
    "home";
  const pageKeyMap = {
    home: "page:home",
    species: "page:species",
    plant: "page:plant",
  };
  return pageKeyMap[pageName] || null;
}

function hydrateSectionMount(mountEl, sectionKey, entry, dataMap) {
  const missingRequired = (entry.datasets || []).find(
    (key) => !dataMap.get(key)?.ok,
  );

  if (missingRequired) {
    const err = dataMap.get(missingRequired)?.error;
    const msg = err?.message || `Unable to load dataset "${missingRequired}".`;
    setMountState(sectionKey, { status: "error", error: err || new Error(msg) });
    renderMountError(mountEl, sectionKey, msg);
    return;
  }

  try {
    entry.render(mountEl, dataMap);
    setMountState(sectionKey, { status: "ready", error: null });
    animateHydratedSection(sectionKey, mountEl);
    initNavigationInteractions();
  } catch (renderErr) {
    setMountState(sectionKey, { status: "error", error: renderErr });
    renderMountError(mountEl, sectionKey, renderErr.message);
  }
}

export async function retryMountSection(sectionKey) {
  const mountEl = document.querySelector(`[data-section="${sectionKey}"]`);
  const entry = SECTION_REGISTRY[sectionKey];
  if (!mountEl || !entry || typeof entry.render !== "function") return;

  setMountState(sectionKey, { status: "loading", error: null });
  renderMountSkeleton(mountEl, sectionKey);

  const keysToLoad = [
    ...(entry.datasets || []),
    ...(entry.optionalDatasets || []),
  ];
  const dataMap = await fetchDatasetsConcurrently(keysToLoad, { forceRefresh: true });

  const catalogOutcome = dataMap.get("catalog");
  if (catalogOutcome?.ok) {
    setSpeciesCatalog(catalogOutcome.data);
  }

  hydrateSectionMount(mountEl, sectionKey, entry, dataMap);
  refreshScrollTriggers();
}

export async function hydrateActivePage(root = document) {
  const shellMounts = Array.from(root.querySelectorAll("[data-shell]"));
  const sectionMounts = Array.from(root.querySelectorAll("[data-section]"));

  const requiredDatasetKeys = new Set();
  const activePageKey = resolveActivePageKey();
  if (activePageKey) {
    requiredDatasetKeys.add(activePageKey);
  }

  shellMounts.forEach((el) => {
    const shellKey = el.getAttribute("data-shell");
    const entry = SHELL_REGISTRY[shellKey];
    if (!entry) return;
    (entry.datasets || []).forEach((k) => requiredDatasetKeys.add(k));
  });

  sectionMounts.forEach((el) => {
    const sectionKey = el.getAttribute("data-section");
    const entry = SECTION_REGISTRY[sectionKey];
    if (!entry) return;
    if (!entry.skipSkeleton) {
      setMountState(sectionKey, { status: "loading", error: null });
      renderMountSkeleton(el, sectionKey);
    }
    (entry.datasets || []).forEach((k) => requiredDatasetKeys.add(k));
    (entry.optionalDatasets || []).forEach((k) => requiredDatasetKeys.add(k));
  });

  // Load only datasets needed for the active page concurrently via Promise.allSettled()
  const dataMap = await fetchDatasetsConcurrently(Array.from(requiredDatasetKeys));

  // Sync shared species catalog first if present
  const catalogOutcome = dataMap.get("catalog");
  if (catalogOutcome?.ok) {
    setSpeciesCatalog(catalogOutcome.data);
  }

  // Apply page-level SEO / OpenGraph / Schema.org metadata from page JSON
  if (activePageKey && dataMap.get(activePageKey)?.ok) {
    applyPageSeo(dataMap.get(activePageKey).data.seo);
  }

  // Hydrate shell mount points ([data-shell="navbar"], [data-shell="footer"])
  shellMounts.forEach((el) => {
    const shellKey = el.getAttribute("data-shell");
    const entry = SHELL_REGISTRY[shellKey];
    if (entry && typeof entry.render === "function") {
      entry.render(el, dataMap);
    }
  });

  // Hydrate all section mount points ([data-section="..."])
  sectionMounts.forEach((el) => {
    const sectionKey = el.getAttribute("data-section");
    const entry = SECTION_REGISTRY[sectionKey];
    if (!entry || typeof entry.render !== "function") return;
    hydrateSectionMount(el, sectionKey, entry, dataMap);
  });

  // Bind global search inputs across navbar, mobile overlay, and hero
  initNavigationInteractions();
  refreshScrollTriggers();

  // If species catalog wasn't requested explicitly above (edge cases), ensure warm background fetch isn't needed unless navbar search exists
  if (!requiredDatasetKeys.has("catalog") && document.getElementById("navbarSearchForm")) {
    fetchDataset("catalog")
      .then((speciesList) => setSpeciesCatalog(speciesList))
      .catch(() => {
        // Navbar search stays non-blocking on background fetch failure
      });
  }
}
