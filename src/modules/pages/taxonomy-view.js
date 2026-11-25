/**
 * Dedicated "Taxonomic Lineage" Explorer Page (/taxonomy/)
 * Step 1: Glassmorphism grid of botanical families with description, Bengali name & live species count
 * Step 2: Filtered family diagnostic traits & species archive + fixed bottom-right Floating "← Go Back" button
 */

import {
  buildImageElement,
  createEl,
  createSpeciesCardElement,
  sanitizeUrl,
} from "../utils/templates.js";
import { animateDynamicSpeciesGrid } from "../../core/telemetry/animations.js";
import { applyTaxonomySeo } from "../utils/seo.js";

const FAMILIES_PER_PAGE = 10;

function matchesCladeFilter(cladeStr, filterId) {
  if (filterId === "all") return true;
  const lc = String(cladeStr || "").toLowerCase();
  if (filterId === "eudicot") return lc.includes("eudicot") && !lc.includes("basal");
  if (filterId === "monocot") return lc.includes("monocot");
  if (filterId === "basal") return lc.includes("basal") || lc.includes("magnoliid");
  return true;
}

function buildFamilyDirectory(speciesIndex, familiesMeta = {}) {
  const map = new Map();
  (speciesIndex || []).forEach((plant) => {
    const familyName = plant.family || plant.overview?.family;
    if (!familyName) return;
    if (!map.has(familyName)) {
      const meta = familiesMeta[familyName] || {};
      map.set(familyName, {
        name: familyName,
        familyBn: plant.familyBn || meta.familyBn || "",
        order: meta.order || "Angiosperms",
        clade: meta.clade || plant.plantGroup || "Vascular Flora",
        description:
          meta.description ||
          `Documented monographs belonging to the ${familyName} botanical family.`,
        traits: Array.isArray(meta.traits) ? meta.traits : [],
        imageUrl:
          meta.imageUrl ||
          plant.thumbnailUrl ||
          "./assets/images/placeholder-botanical.svg",
        imageAlt:
          meta.imageAlt ||
          `${familyName} representative specimen: ${plant.commonName} (${plant.scientificName})`,
        species: [],
      });
    }
    map.get(familyName).species.push(plant);
  });

  // Sort strictly descending by documented monograph count, then alphabetically
  return Array.from(map.values()).sort(
    (a, b) => b.species.length - a.species.length || a.name.localeCompare(b.name),
  );
}

function renderTaxonomyBanner(container, bannerCfg, activeFamilyObj) {
  const breadcrumbNav = createEl("nav", "breadcrumb-bar");
  breadcrumbNav.setAttribute("aria-label", "Breadcrumb");
  const ol = createEl("ol", "breadcrumb-list");

  const crumbs = activeFamilyObj
    ? [
        { label: "Home", href: "./" },
        { label: "Taxonomic Lineage", href: "./taxonomy/" },
        { label: activeFamilyObj.name, current: true },
      ]
    : bannerCfg.breadcrumbs || [
        { label: "Home", href: "./" },
        { label: "Taxonomic Lineage", current: true },
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
      activeFamilyObj
        ? `${activeFamilyObj.order} · ${activeFamilyObj.clade}`
        : bannerCfg.eyebrow || "Phylogenetic Archive",
    ),
  );
  header.appendChild(
    createEl(
      "h1",
      "directory-headline",
      activeFamilyObj
        ? activeFamilyObj.familyBn
          ? `${activeFamilyObj.name} — ${activeFamilyObj.familyBn}`
          : activeFamilyObj.name
        : bannerCfg.headline || "Taxonomic Lineage Explorer",
    ),
  );
  header.appendChild(
    createEl(
      "p",
      "justified-prose directory-subcopy",
      activeFamilyObj
        ? activeFamilyObj.description
        : bannerCfg.subcopy || "",
    ),
  );
  if (!activeFamilyObj) {
    const plate = createEl("figure", "page-preview-plate");
    const media = createEl("div", "page-preview-plate-media");
    media.appendChild(
      buildImageElement(
        "https://inaturalist-open-data.s3.amazonaws.com/photos/605486422/original.jpg",
        "Magnolia grandiflora basal angiosperm floral specimen representing comparative botanical taxonomy",
        "Taxonomic Lineage Specimen",
      ),
    );
    plate.appendChild(media);
    plate.appendChild(
      createEl(
        "figcaption",
        "page-preview-plate-caption",
        "Fig. TX-01 — Basal angiosperm floral morphology of Magnolia grandiflora anchoring Plantipedia's 34-family phylogenetic classification.",
      ),
    );
    header.appendChild(plate);
  }
  container.appendChild(header);
}

export function renderTaxonomyExplorer(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const ui = pageData.ui || {};
  const families = buildFamilyDirectory(speciesIndex, pageData.families || {});
  const familyLookup = new Map(
    families.map((f) => [f.name.toLowerCase(), f]),
  );

  function resolveUrlFamily() {
    const param = new URLSearchParams(window.location.search).get("family");
    if (!param) return null;
    return familyLookup.get(param.trim().toLowerCase()) || null;
  }

  let activeFamily = resolveUrlFamily();
  let activeClade = "all";
  let searchTerm = "";
  let currentPage = 1;

  function syncFloatingBackButton(visible, onBack) {
    let btn = document.getElementById("taxonomyFloatingBackBtn");
    if (!visible) {
      if (btn) btn.remove();
      return;
    }
    if (!btn) {
      btn = createEl("button", "floating-back-btn", ui.goBackLabel || "← Go Back");
      btn.type = "button";
      btn.id = "taxonomyFloatingBackBtn";
      btn.setAttribute("aria-label", "Return to all botanical families");
      document.body.appendChild(btn);
    }
    btn.onclick = onBack;
  }

  function updateQueryParam(familyName) {
    try {
      const url = new URL(window.location.href);
      if (familyName) {
        url.searchParams.set("family", familyName);
      } else {
        url.searchParams.delete("family");
      }
      window.history.pushState({ family: familyName || null }, "", url.toString());
    } catch {
      // Ignore history errors
    }
  }

  function buildPaginationBar(totalItems, totalPages, onPageChange) {
    const bar = createEl("div", "directory-pagination-bar");
    const status = createEl("div", "directory-pagination-status");
    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * FAMILIES_PER_PAGE + 1;
    const endIdx = Math.min(currentPage * FAMILIES_PER_PAGE, totalItems);
    status.appendChild(
      createEl(
        "p",
        "explorer-count",
        `Showing ${startIdx}–${endIdx} of ${totalItems} botanical families (sorted by monograph count)`,
      ),
    );
    bar.appendChild(status);

    const nav = createEl("nav", "directory-pagination-nav");
    nav.setAttribute("aria-label", "Botanical families pagination");
    if (totalPages <= 1) {
      nav.hidden = true;
    } else {
      const prevBtn = createEl("button", "pagination-btn", "← Prev");
      prevBtn.type = "button";
      prevBtn.disabled = currentPage <= 1;
      prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
      nav.appendChild(prevBtn);

      const pillsWrap = createEl("div", "pagination-pills");
      for (let p = 1; p <= totalPages; p += 1) {
        const pill = createEl(
          "button",
          `pagination-pill${p === currentPage ? " active" : ""}`,
          String(p),
        );
        pill.type = "button";
        pill.setAttribute("aria-label", `Family archive page ${p}`);
        if (p === currentPage) pill.setAttribute("aria-current", "page");
        pill.addEventListener("click", () => onPageChange(p));
        pillsWrap.appendChild(pill);
      }
      nav.appendChild(pillsWrap);

      const nextBtn = createEl("button", "pagination-btn", "Next →");
      nextBtn.type = "button";
      nextBtn.disabled = currentPage >= totalPages;
      nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
      nav.appendChild(nextBtn);
    }

    bar.appendChild(nav);
    return bar;
  }

  function renderView() {
    try {
      applyTaxonomySeo({ pageData, families, activeFamily });
    } catch {
      // Non-blocking SEO update
    }
    const wrapper = createEl("div", "taxonomy-explorer-shell");
    const container = createEl("div", "section-container");

    renderTaxonomyBanner(container, pageData.banner || {}, activeFamily);

    if (!activeFamily) {
      syncFloatingBackButton(false);

      const controlsBar = createEl("div", "taxonomy-controls-bar");
      const controlsTop = createEl("div", "taxonomy-controls-top");

      const cladePills = createEl("div", "taxonomy-clade-pills");
      cladePills.setAttribute("role", "tablist");
      cladePills.setAttribute("aria-label", "Filter families by evolutionary clade");

      const clades = [
        { id: "all", label: `All Clades (${families.length})` },
        {
          id: "eudicot",
          label: `Eudicots (${families.filter((f) => matchesCladeFilter(f.clade, "eudicot")).length})`,
        },
        {
          id: "monocot",
          label: `Monocots (${families.filter((f) => matchesCladeFilter(f.clade, "monocot")).length})`,
        },
        {
          id: "basal",
          label: `Basal & Magnoliids (${families.filter((f) => matchesCladeFilter(f.clade, "basal")).length})`,
        },
      ];

      clades.forEach((c) => {
        const pill = createEl(
          "button",
          `taxonomy-clade-pill${activeClade === c.id ? " is-active" : ""}`,
          c.label,
        );
        pill.type = "button";
        pill.setAttribute("role", "tab");
        pill.setAttribute("aria-selected", String(activeClade === c.id));
        pill.addEventListener("click", () => {
          activeClade = c.id;
          currentPage = 1;
          renderView();
        });
        cladePills.appendChild(pill);
      });

      const searchInput = createEl("input", "taxonomy-search-input");
      searchInput.type = "search";
      searchInput.value = searchTerm;
      searchInput.placeholder = "Filter family, order, বাংলা, or member species...";
      searchInput.setAttribute("aria-label", "Filter botanical families");

      controlsTop.appendChild(cladePills);
      controlsTop.appendChild(searchInput);
      controlsBar.appendChild(controlsTop);
      container.appendChild(controlsBar);

      const resultsMount = createEl("div", "taxonomy-results-mount");

      const renderFamilyGridResults = () => {
        const q = searchTerm.trim().toLowerCase();
        const filtered = families.filter((fam) => {
          if (!matchesCladeFilter(fam.clade, activeClade)) return false;
          if (!q) return true;
          const haystack = [
            fam.name,
            fam.familyBn,
            fam.order,
            fam.clade,
            ...fam.species.map((s) => `${s.commonName} ${s.scientificName} ${s.commonNameBn || ""}`),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / FAMILIES_PER_PAGE));
        if (currentPage > totalPages) currentPage = 1;

        const start = (currentPage - 1) * FAMILIES_PER_PAGE;
        const pageItems = filtered.slice(start, start + FAMILIES_PER_PAGE);

        const frag = document.createDocumentFragment();
        frag.appendChild(
          buildPaginationBar(filtered.length, totalPages, (newPage) => {
            currentPage = newPage;
            renderFamilyGridResults();
            controlsBar.scrollIntoView({ behavior: "smooth", block: "start" });
          }),
        );

        if (pageItems.length === 0) {
          const empty = createEl("div", "section-error-card");
          empty.appendChild(createEl("h2", "section-error-title", "No Matching Families"));
          empty.appendChild(
            createEl(
              "p",
              "section-error-message",
              "Try switching the clade filter or clearing your search query.",
            ),
          );
          const resetBtn = createEl("button", "section-retry-btn", "Reset Filters");
          resetBtn.type = "button";
          resetBtn.addEventListener("click", () => {
            activeClade = "all";
            searchTerm = "";
            currentPage = 1;
            renderView();
          });
          empty.appendChild(resetBtn);
          frag.appendChild(empty);
          resultsMount.replaceChildren(frag);
          return;
        }

        const grid = createEl("div", "family-lineage-grid");
        pageItems.forEach((fam) => {
          const card = createEl("button", "family-lineage-card");
          card.type = "button";
          card.setAttribute("data-family-select", fam.name);

          const mediaBox = createEl("div", "family-card-media");
          mediaBox.appendChild(
            buildImageElement(
              fam.imageUrl,
              fam.imageAlt || `${fam.name} botanical specimen`,
              fam.name,
            ),
          );
          card.appendChild(mediaBox);

          const topRow = createEl("div", "family-card-top");
          topRow.appendChild(createEl("span", "family-order-label", `${fam.order} · ${fam.clade}`));
          const countText =
            fam.species.length === 1
              ? ui.speciesCountSingular || "1 Documented Species"
              : (ui.speciesCountPlural || "{count} Documented Species").replace(
                  "{count}",
                  String(fam.species.length),
                );
          topRow.appendChild(createEl("span", "family-count-badge", countText));
          card.appendChild(topRow);

          card.appendChild(createEl("h2", "family-card-title", fam.name));
          if (fam.familyBn) {
            card.appendChild(createEl("p", "family-card-bn", fam.familyBn));
          }
          card.appendChild(createEl("p", "family-card-desc", fam.description));

          const footer = createEl("div", "family-card-footer");
          const previewNames = fam.species.map((s) => s.commonName).slice(0, 4).join(", ");
          footer.appendChild(createEl("span", "family-members-preview", previewNames));
          footer.appendChild(
            createEl("span", "family-inspect-cta", ui.viewFamilyCta || "Inspect Lineage →"),
          );
          card.appendChild(footer);

          card.addEventListener("click", () => {
            activeFamily = fam;
            updateQueryParam(fam.name);
            renderView();
            window.scrollTo({ top: 0, behavior: "smooth" });
          });

          grid.appendChild(card);
        });

        frag.appendChild(grid);
        resultsMount.replaceChildren(frag);
      };

      searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value;
        currentPage = 1;
        renderFamilyGridResults();
      });

      renderFamilyGridResults();
      container.appendChild(resultsMount);
    } else {
      // Step 2: Family Diagnostic Traits + Filtered Species Cards
      if (activeFamily.traits.length > 0) {
        const traitsBox = createEl("section", "family-diagnostic-card");
        traitsBox.setAttribute("aria-label", "Diagnostic family traits");
        traitsBox.appendChild(
          createEl("h2", "family-traits-heading", ui.traitsHeading || "Diagnostic Family Traits"),
        );
        const list = createEl("ul", "family-traits-list");
        activeFamily.traits.forEach((trait) => {
          list.appendChild(createEl("li", "family-trait-item", trait));
        });
        traitsBox.appendChild(list);
        container.appendChild(traitsBox);
      }

      const membersHeading = createEl(
        "h2",
        "taxonomy-members-heading",
        (ui.membersHeading || "Documented Species in {family}").replace(
          "{family}",
          activeFamily.name,
        ),
      );
      container.appendChild(membersHeading);

      const speciesGrid = createEl("div", "species-grid species-grid--directory");
      activeFamily.species.forEach((plant) => {
        speciesGrid.appendChild(createSpeciesCardElement(plant, "Explore Monograph"));
      });
      container.appendChild(speciesGrid);
      animateDynamicSpeciesGrid(speciesGrid);

      syncFloatingBackButton(true, () => {
        activeFamily = null;
        updateQueryParam(null);
        renderView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    wrapper.appendChild(container);
    mountEl.replaceChildren(wrapper);
  }

  window.addEventListener("popstate", () => {
    activeFamily = resolveUrlFamily();
    renderView();
  });

  renderView();
}
