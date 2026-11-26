/**
 * Compare Split View Controller (/compare/)
 * - Dual Real-Time Search Inputs (#left-specimen-input & #right-specimen-input)
 *   with instant 50-species local autocomplete (EN / বাংলা / Latin / family)
 * - Global Botanical Server lookup trigger whenever query >= 2 chars
 * - Direct JS fetch with compact inline % progress bar (0% -> 100%) and Cancel control inside active slot
 * - Unified full-width notice banner above Compare Specimens preserving opposite slot & failed query text
 * - URL pre-selection support (?left=<slug>, ?right=<slug>, ?leftGlobal=, ?rightGlobal=, ?leftType=, ?rightType=)
 * - Clean handoff to ./result/?left=...&leftType=...&right=...&rightType=...
 */

import {
  buildImageElement,
  createEl,
  createSearchIconSvg,
} from "../utils/templates.js";
import { resolveRootPath } from "../../core/bootstrap/router.js";
import { applyCompareSeo } from "../utils/seo.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../../engines/global-server/global-botanical-server.js";
import { openComparisonSynthesisOverlay } from "../../engines/comparator/synthesis-overlay.js";
import {
  searchSpeciesFuzzy,
  setHighlightedContent,
} from "../../engines/search/fuzzy-matcher.js";
import { fetchGlobalFuzzySuggestions } from "../../engines/search/global-fuzzy.js";
import { fetchSpeciesMonograph } from "../../engines/global-server/api.js";
import {
  detectLanguage,
  normalizeLangCode,
  translateMonographRecord,
} from "../utils/translator.js";

function formatSpecimenInputLabel(sp, lang = "en") {
  if (!sp) return "";
  if (lang === "bn") {
    const bn = String(sp.commonNameBn || "").trim();
    if (bn && /[\u0980-\u09FF]/.test(bn)) return bn;
  }
  return sp.commonName || "";
}

export function renderCompareWorkspace(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex.slice() : [];
  list.sort((a, b) => a.commonName.localeCompare(b.commonName));
  const speciesBySlug = new Map(list.map((s) => [s.slug.toLowerCase(), s]));

  const selCfg = pageData.selector || {};

  // Independent specimen states with strict per-slot inputLang lock
  const panelState = {
    left: { mode: "local", slug: "", globalQuery: "", inputLang: "en", verifiedPlant: null },
    right: { mode: "local", slug: "", globalQuery: "", inputLang: "en", verifiedPlant: null },
  };

  let docClickCleanup = null;
  let activeSynthesisCleanup = null;

  function clearDocumentListeners() {
    if (typeof docClickCleanup === "function") {
      docClickCleanup();
      docClickCleanup = null;
    }
    if (typeof activeSynthesisCleanup === "function") {
      activeSynthesisCleanup({ restoreFocus: false });
      activeSynthesisCleanup = null;
    }
  }

  function removeFloatingModeButton() {
    const existing = document.getElementById("compareModeToggleBtn");
    if (existing) existing.remove();
  }

  function filterCuratedSpecies(rawQuery) {
    return searchSpeciesFuzzy(list, rawQuery, { limit: 14 });
  }

  function getPanelIdentity(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      const q = normalizeGlobalQuery(
        st.globalQuery || st.verifiedPlant?.query || st.verifiedPlant?.commonName,
      );
      return q ? `global:${q.toLowerCase()}` : "";
    }
    return st.slug ? `local:${st.slug.toLowerCase()}` : "";
  }

  function getPanelDisplayPlant(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      if (st.verifiedPlant) return st.verifiedPlant;
      const q = normalizeGlobalQuery(st.globalQuery);
      const cached = q ? getCachedGlobalMonograph(q, st.inputLang) : null;
      return (
        cached || {
          isGlobalLive: true,
          query: q,
          commonName: q || "Global Specimen",
          scientificName: "Global Botanical Server",
        }
      );
    }
    return speciesBySlug.get(st.slug) || { slug: st.slug, commonName: st.slug };
  }

  function isPanelReady(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      return Boolean(st.verifiedPlant);
    }
    return Boolean(st.slug && speciesBySlug.has(st.slug));
  }

  function areSidesDuplicate() {
    if (!isPanelReady("left") || !isPanelReady("right")) return false;
    const langL = normalizeLangCode(panelState.left.inputLang);
    const langR = normalizeLangCode(panelState.right.inputLang);
    // Allow comparing even the exact same species when two different languages are locked per slot
    if (langL !== langR) return false;

    const idL = getPanelIdentity("left");
    const idR = getPanelIdentity("right");
    if (idL === idR) return true;
    const plantL = getPanelDisplayPlant("left");
    const plantR = getPanelDisplayPlant("right");
    if (
      plantL?.scientificName &&
      plantR?.scientificName &&
      plantL.scientificName.toLowerCase() === plantR.scientificName.toLowerCase() &&
      plantL.scientificName !== "Global Botanical Server"
    ) {
      return true;
    }
    return false;
  }

  function syncCompareUrlParams() {
    try {
      const url = new URL(window.location.href);
      [
        "a",
        "b",
        "left",
        "right",
        "leftGlobal",
        "rightGlobal",
        "leftType",
        "rightType",
        "leftLang",
        "rightLang",
        "failedSide",
        "failedQuery",
        "failedReason",
      ].forEach((k) => {
        url.searchParams.delete(k);
      });
      if (isPanelReady("left")) {
        if (panelState.left.mode === "global") {
          url.searchParams.set("left", normalizeGlobalQuery(panelState.left.globalQuery));
          url.searchParams.set("leftType", "global");
        } else {
          url.searchParams.set("left", panelState.left.slug);
          url.searchParams.set("leftType", "local");
        }
        url.searchParams.set("leftLang", normalizeLangCode(panelState.left.inputLang));
      }
      if (isPanelReady("right")) {
        if (panelState.right.mode === "global") {
          url.searchParams.set("right", normalizeGlobalQuery(panelState.right.globalQuery));
          url.searchParams.set("rightType", "global");
        } else {
          url.searchParams.set("right", panelState.right.slug);
          url.searchParams.set("rightType", "local");
        }
        url.searchParams.set("rightLang", normalizeLangCode(panelState.right.inputLang));
      }
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore history errors
    }
  }

  function navigateToCompareResult() {
    const params = new URLSearchParams();
    if (panelState.left.mode === "global") {
      const leftVal = normalizeGlobalQuery(
        panelState.left.globalQuery ||
          panelState.left.verifiedPlant?.query ||
          panelState.left.verifiedPlant?.commonName,
      );
      params.set("left", leftVal);
      params.set("leftType", "global");
    } else {
      params.set("left", panelState.left.slug);
      params.set("leftType", "local");
    }
    params.set("leftLang", normalizeLangCode(panelState.left.inputLang));

    if (panelState.right.mode === "global") {
      const rightVal = normalizeGlobalQuery(
        panelState.right.globalQuery ||
          panelState.right.verifiedPlant?.query ||
          panelState.right.verifiedPlant?.commonName,
      );
      params.set("right", rightVal);
      params.set("rightType", "global");
    } else {
      params.set("right", panelState.right.slug);
      params.set("rightType", "local");
    }
    params.set("rightLang", normalizeLangCode(panelState.right.inputLang));
    window.location.href = resolveRootPath(`./compare/result/?${params.toString()}`);
  }

  function resolveSpecimenDisplayName(side) {
    const plant = getPanelDisplayPlant(side);
    const st = panelState[side];
    const lang = normalizeLangCode(st.inputLang);
    if (lang === "bn" && plant?.commonNameBn && /[\u0980-\u09FF]/.test(plant.commonNameBn)) {
      return plant.commonNameBn;
    }
    return (
      plant?.commonName ||
      plant?.query ||
      st.globalQuery ||
      st.slug ||
      (side === "left" ? "Left Specimen" : "Right Specimen")
    );
  }

  function launchComparisonSynthesis(triggerBtn, onSynthesisError) {
    if (typeof activeSynthesisCleanup === "function") {
      return;
    }

    activeSynthesisCleanup = openComparisonSynthesisOverlay({
      leftName: resolveSpecimenDisplayName("left"),
      rightName: resolveSpecimenDisplayName("right"),
      triggerBtn,
      prepareWork: async ({ signal }) => {
        for (const side of ["left", "right"]) {
          const st = panelState[side];
          const lockedLang = normalizeLangCode(st.inputLang);
          if (st.mode === "global") {
            const q = normalizeGlobalQuery(st.globalQuery || st.verifiedPlant?.query || st.verifiedPlant?.commonName);
            const cached = getCachedGlobalMonograph(q, lockedLang);
            if (!cached || cached.lockedLanguage !== lockedLang) {
              const res = await fetchFromGlobalBotanicalServer(q, {
                signal,
                targetLang: lockedLang,
              });
              if (!res?.ok || !res.monograph) {
                return {
                  ok: false,
                  failedSide: side,
                  failedQuery: q,
                  reason: res?.reason || "invalid",
                };
              }
              st.verifiedPlant = res.monograph;
            }
          } else if (st.mode === "local" && st.slug) {
            try {
              const rawMonograph = await fetchSpeciesMonograph(st.slug);
              if (lockedLang === "bn") {
                const translated = await translateMonographRecord(rawMonograph, "bn", { signal });
                try {
                  sessionStorage.setItem(
                    `plantipedia_local_tr_${st.slug}_bn`,
                    JSON.stringify(translated),
                  );
                } catch {
                  // Non-blocking pre-translation cache
                }
              }
            } catch (err) {
              if (err?.name === "AbortError") throw err;
              return {
                ok: false,
                failedSide: side,
                failedQuery: st.slug,
                reason: "network",
              };
            }
          }
        }
        return { ok: true };
      },
      onComplete: () => {
        activeSynthesisCleanup = null;
        navigateToCompareResult();
      },
      onCancel: () => {
        activeSynthesisCleanup = null;
      },
      onError: (errPayload) => {
        activeSynthesisCleanup = null;
        if (typeof onSynthesisError === "function") {
          onSynthesisError(errPayload);
        }
      },
    });
  }

  function renderSelectorView({ resetUrl = false, highlightRight = false } = {}) {
    clearDocumentListeners();
    removeFloatingModeButton();

    if (resetUrl) {
      panelState.left = { mode: "local", slug: "", globalQuery: "", inputLang: "en", verifiedPlant: null };
      panelState.right = { mode: "local", slug: "", globalQuery: "", inputLang: "en", verifiedPlant: null };
      syncCompareUrlParams();
    }

    try {
      applyCompareSeo({ pageData, leftPlant: null, rightPlant: null });
    } catch {
      // Non-blocking SEO update
    }

    const shell = createEl("div", "compare-selector-shell");
    const card = createEl("section", "compare-selector-card");
    card.setAttribute("aria-label", "Search and select two botanical species to compare");

    card.appendChild(
      createEl("span", "section-eyebrow", selCfg.eyebrow || "Comparative Botanical Workspace"),
    );
    card.appendChild(
      createEl("h1", "compare-selector-heading", selCfg.headline || "Compare Split View"),
    );
    card.appendChild(
      createEl(
        "p",
        "compare-selector-subcopy",
        selCfg.subcopy ||
          "Search and lock two distinct plant species from the 50-monograph archive or query any worldwide taxon via the Global Botanical Server.",
      ),
    );

    const previewPlate = createEl("figure", "compare-preview-plate");
    const previewMedia = createEl("div", "compare-preview-plate-media");
    const previewImg = buildImageElement(
      "https://inaturalist-open-data.s3.amazonaws.com/photos/252106121/large.jpeg",
      "Cattleya labiata botanical field specimen plate",
      "Cattleya labiata field photograph",
    );
    previewImg.loading = "lazy";
    previewMedia.appendChild(previewImg);
    previewPlate.appendChild(previewMedia);

    const previewCap = document.createElement("figcaption");
    previewCap.className = "compare-preview-plate-caption";
    previewCap.appendChild(createEl("span", "figcaption-fig", "Fig. CM-01"));
    previewCap.appendChild(
      document.createTextNode(
        " Cattleya labiata field photograph — Dual-pane specimen comparator aligning curated 15-chapter monographs and 1,600,000+ live Global Flora Index taxa.",
      ),
    );
    previewPlate.appendChild(previewCap);
    card.appendChild(previewPlate);

    const selectsRow = createEl("div", "compare-selects-grid");
    const warningEl = createEl("div", "compare-validation-warning", "");
    warningEl.id = "compareValidationWarning";
    warningEl.setAttribute("role", "alert");
    warningEl.hidden = true;

    const submitBtn = createEl(
      "button",
      "compare-submit-btn",
      selCfg.submitLabel || "Compare Specimens",
    );
    submitBtn.type = "button";
    submitBtn.id = "compareLaunchBtn";
    submitBtn.disabled = true;

    const rightHint = createEl(
      "span",
      "compare-select-hint",
      selCfg.rightNextStepHint || "Next step: Type a second specimen name to compare side-by-side.",
    );

    const panelControllers = {};
    let activeLookupBanner = null;

    function closeAllMenus(exceptSide = null) {
      Object.entries(panelControllers).forEach(([sideKey, ctl]) => {
        if (exceptSide && sideKey === exceptSide) return;
        ctl.closeMenu();
      });
    }

    function syncUnifiedBanner() {
      warningEl.replaceChildren();
      if (areSidesDuplicate()) {
        warningEl.className = "compare-validation-warning is-warning";
        warningEl.appendChild(
          createEl(
            "p",
            "compare-warning-msg",
            selCfg.sameSpeciesWarning ||
              "Please select two different species to run a side-by-side comparison.",
          ),
        );
        warningEl.hidden = false;
        return;
      }

      if (activeLookupBanner) {
        const { side, reason, query } = activeLookupBanner;
        const sideLabel =
          side === "left"
            ? selCfg.leftLabel || "Left Specimen"
            : selCfg.rightLabel || "Right Specimen";

        warningEl.className = "compare-validation-warning is-error";

        const headRow = createEl("div", "compare-warning-head");
        headRow.appendChild(
          createEl(
            "span",
            "compare-warning-title",
            reason === "network"
              ? `${sideLabel} · Global Server Connection Failed`
              : reason === "short"
                ? `${sideLabel} · Query Too Short`
                : `${sideLabel} · Unrecognized Botanical Specimen`,
          ),
        );

        const msgText =
          reason === "network"
            ? `Unable to reach the Global Botanical Server for "${query}". Your opposite slot remains intact—check your connection and retry or edit the ${sideLabel} field above.`
            : reason === "short"
              ? `Please enter at least 2 characters (English, বাংলা, or Latin botanical name) in the ${sideLabel} field to search the Global Botanical Server.`
              : `"${query}" did not match a verified botanical taxon in the Global Flora Index. Edit the spelling in the ${sideLabel} input above, retry the Global Server, or pick from our 50 curated monographs.`;

        const actionsRow = createEl("div", "compare-warning-actions");
        if (reason !== "short" && query && query.length >= 2) {
          const retryBtn = createEl("button", "compare-warning-btn", "↻ Retry Global Server");
          retryBtn.type = "button";
          retryBtn.addEventListener("click", () => {
            panelControllers[side]?.triggerInlineGlobalFetch(query);
          });
          actionsRow.appendChild(retryBtn);
        }

        const browseLink = createEl("a", "compare-warning-btn", "Browse 50 Curated Species →");
        browseLink.href = resolveRootPath("./species/");
        actionsRow.appendChild(browseLink);

        warningEl.appendChild(headRow);
        warningEl.appendChild(createEl("p", "compare-warning-msg", msgText));
        warningEl.appendChild(actionsRow);
        warningEl.hidden = false;
        return;
      }

      warningEl.className = "compare-validation-warning";
      warningEl.hidden = true;
    }

    function buildSpecimenPanel(side, labelText) {
      const st = panelState[side];
      const field = createEl("div", "compare-select-field");
      field.dataset.side = side;

      const inputId = `${side}-specimen-input`;
      const clearBtnId = `${side}-clear-btn`;
      const menuId = `${side}-autocomplete-menu`;

      const label = createEl("label", "compare-select-label", labelText);
      label.setAttribute("for", inputId);
      field.appendChild(label);

      const searchWrap = createEl("div", "compare-search-wrap");
      const inputBox = createEl("div", "compare-search-input-box");

      const searchIcon = createSearchIconSvg(17, "compare-search-icon");
      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.id = inputId;
      inputEl.className = "compare-search-input";
      inputEl.placeholder = "Type plant name (EN / বাংলা / Latin)...";
      inputEl.autocomplete = "off";
      inputEl.spellcheck = false;
      inputEl.setAttribute("role", "combobox");
      inputEl.setAttribute("aria-autocomplete", "list");
      inputEl.setAttribute("aria-expanded", "false");
      inputEl.setAttribute("aria-controls", menuId);
      inputEl.setAttribute("aria-label", `${labelText} search`);

      const clearBtn = createEl("button", "compare-search-clear-btn", "✕");
      clearBtn.type = "button";
      clearBtn.id = clearBtnId;
      clearBtn.setAttribute("aria-label", `Clear ${labelText}`);
      clearBtn.hidden = true;

      inputBox.appendChild(searchIcon);
      inputBox.appendChild(inputEl);
      inputBox.appendChild(clearBtn);
      searchWrap.appendChild(inputBox);

      const menu = createEl("div", "compare-autocomplete-menu");
      menu.id = menuId;
      menu.hidden = true;
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", `${labelText} suggestions`);

      const listBox = createEl("div", "compare-autocomplete-list");
      const globalFooter = createEl("div", "compare-autocomplete-global-footer");
      globalFooter.hidden = true;

      const globalFetchBtn = createEl("button", "compare-dropdown-global-btn", "");
      globalFetchBtn.type = "button";
      globalFetchBtn.setAttribute("role", "option");
      globalFooter.appendChild(globalFetchBtn);

      menu.appendChild(listBox);
      menu.appendChild(globalFooter);
      searchWrap.appendChild(menu);

      const statusEl = createEl("div", "compare-selection-status");
      statusEl.hidden = true;

      const telemetrySlot = createEl("div", "compare-global-inline-telemetry");
      telemetrySlot.id = `${side}-global-telemetry-slot`;
      telemetrySlot.hidden = true;

      let currentMatches = [];
      let highlightedIndex = -1;
      let isInlineFetching = false;
      let activeGlobalQuery = "";
      let globalFuzzyTimer = null;
      let globalFuzzyController = null;
      let globalFuzzySeq = 0;

      function cancelGlobalFuzzyLookup() {
        if (globalFuzzyTimer) {
          clearTimeout(globalFuzzyTimer);
          globalFuzzyTimer = null;
        }
        if (globalFuzzyController) {
          globalFuzzyController.abort();
          globalFuzzyController = null;
        }
      }

      function syncClearButton() {
        clearBtn.hidden = inputEl.value.length === 0;
      }

      function syncStatusBadge() {
        statusEl.replaceChildren();
        const lockedLang = normalizeLangCode(st.inputLang);
        const langShort = lockedLang === "bn" ? "BN" : "EN";

        if (st.mode === "local" && st.slug && speciesBySlug.has(st.slug)) {
          const sp = speciesBySlug.get(st.slug);
          const badge = createEl("span", "compare-badge compare-badge--curated");
          badge.appendChild(document.createTextNode(`CURATED · LANG: ${langShort}`));
          if (sp.scientificName) {
            badge.appendChild(document.createTextNode(" · "));
            badge.appendChild(createEl("em", "compare-badge-sci", sp.scientificName));
          }
          statusEl.appendChild(badge);
          statusEl.hidden = false;
          return;
        }

        if (st.mode === "global" && st.verifiedPlant) {
          const badge = createEl("span", "compare-badge compare-badge--global");
          badge.appendChild(document.createTextNode(`🌐 GLOBAL SERVER · LANG: ${langShort}`));
          if (st.verifiedPlant.scientificName) {
            badge.appendChild(document.createTextNode(" · "));
            badge.appendChild(createEl("em", "compare-badge-sci", st.verifiedPlant.scientificName));
          }
          statusEl.appendChild(badge);

          if (st.verifiedPlant.autoCorrectedFrom) {
            const correctedLabel =
              st.verifiedPlant.correctedTaxonLabel ||
              st.verifiedPlant.scientificName ||
              st.verifiedPlant.commonName ||
              "";
            const pill = createEl("div", "gbs-autocorrect-pill is-compare-pill");
            pill.setAttribute("role", "status");
            pill.appendChild(
              document.createTextNode("✨ Showing results for corrected taxon: "),
            );
            pill.appendChild(createEl("em", "gbs-autocorrect-taxon", correctedLabel));
            statusEl.appendChild(pill);
          }

          statusEl.hidden = false;
          return;
        }
        statusEl.hidden = true;
      }

      function hydrateLockedInputText() {
        const lockedLang = normalizeLangCode(st.inputLang);
        if (st.mode === "local" && st.slug && speciesBySlug.has(st.slug)) {
          inputEl.value = formatSpecimenInputLabel(speciesBySlug.get(st.slug), lockedLang);
        } else if (st.mode === "global" && st.verifiedPlant) {
          inputEl.value =
            lockedLang === "bn" && st.verifiedPlant.commonNameBn
              ? st.verifiedPlant.commonNameBn
              : st.verifiedPlant.commonName || st.globalQuery || "";
        } else if (st.mode === "global" && st.globalQuery) {
          inputEl.value = st.globalQuery;
        }
        syncClearButton();
        syncStatusBadge();
      }

      function closeMenu() {
        cancelGlobalFuzzyLookup();
        globalFuzzySeq += 1;
        menu.hidden = true;
        highlightedIndex = -1;
        inputEl.setAttribute("aria-expanded", "false");
        field.classList.remove("is-open");
      }

      function getInteractiveMenuItems() {
        const opts = Array.from(listBox.querySelectorAll(".compare-autocomplete-option"));
        if (!globalFooter.hidden) {
          opts.push(globalFetchBtn);
        }
        return opts;
      }

      function applyHighlightIndex(nextIdx) {
        const items = getInteractiveMenuItems();
        items.forEach((el) => el.classList.remove("is-highlighted"));
        if (items.length === 0) {
          highlightedIndex = -1;
          return;
        }
        if (nextIdx < 0) {
          highlightedIndex = -1;
          return;
        }
        const bounded = nextIdx % items.length;
        highlightedIndex = bounded;
        const target = items[bounded];
        if (target) {
          target.classList.add("is-highlighted");
          target.scrollIntoView({ block: "nearest" });
        }
      }

      function lockLocalSpecies(sp) {
        if (!sp) return;
        const lockedLang = detectLanguage(inputEl.value);
        field.classList.remove("is-error");
        if (activeLookupBanner?.side === side) {
          activeLookupBanner = null;
        }
        st.mode = "local";
        st.slug = sp.slug.toLowerCase();
        st.globalQuery = "";
        st.inputLang = lockedLang;
        st.verifiedPlant = null;
        inputEl.value = formatSpecimenInputLabel(sp, lockedLang);
        syncClearButton();
        syncStatusBadge();
        closeMenu();
        validateSelection();
        syncCompareUrlParams();

        if (side === "left" && !isPanelReady("right")) {
          const rightInput = document.getElementById("right-specimen-input");
          if (rightInput) {
            requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
          }
        }
      }

      function renderInlineRecoveryNotice(failureReason, queryText) {
        const qDisplay = String(queryText || inputEl.value || "").trim();
        telemetrySlot.replaceChildren();
        telemetrySlot.hidden = true;
        searchWrap.hidden = false;
        st.mode = "local";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        inputEl.value = qDisplay;
        syncClearButton();
        syncStatusBadge();
        field.classList.add("is-error");
        activeLookupBanner = {
          side,
          reason: failureReason || "invalid",
          query: qDisplay,
        };
        validateSelection();
        syncCompareUrlParams();
      }

      async function triggerInlineGlobalFetch(rawQueryValue) {
        if (isInlineFetching) return;
        const query = normalizeGlobalQuery(rawQueryValue ?? inputEl.value);
        if (query.length < 2) {
          renderInlineRecoveryNotice("short", query);
          inputEl.focus();
          return;
        }

        const lockedLang = detectLanguage(query);
        closeAllMenus();
        field.classList.remove("is-error");
        if (activeLookupBanner?.side === side) {
          activeLookupBanner = null;
        }
        syncUnifiedBanner();
        st.mode = "global";
        st.slug = "";
        st.globalQuery = query;
        st.inputLang = lockedLang;
        st.verifiedPlant = null;
        inputEl.value = query;
        syncClearButton();
        syncStatusBadge();

        const cached = getCachedGlobalMonograph(query, lockedLang);
        if (cached) {
          st.verifiedPlant = cached;
          inputEl.value =
            lockedLang === "bn" && cached.commonNameBn
              ? cached.commonNameBn
              : cached.commonName || query;
          syncClearButton();
          syncStatusBadge();
          validateSelection();
          syncCompareUrlParams();
          if (side === "left" && !isPanelReady("right")) {
            const rightInput = document.getElementById("right-specimen-input");
            if (rightInput) {
              requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
            }
          }
          return;
        }

        isInlineFetching = true;
        searchWrap.hidden = true;
        statusEl.hidden = true;
        telemetrySlot.hidden = false;
        telemetrySlot.replaceChildren();

        const telemetryOutcome = await runGlobalServerTelemetry({
          container: telemetrySlot,
          queryLabel: query,
          compact: true,
          work: ({ signal, onRetry }) =>
            fetchFromGlobalBotanicalServer(query, { signal, onRetry, targetLang: lockedLang }),
          onAbort: () => {
            telemetrySlot.replaceChildren();
            telemetrySlot.hidden = true;
            searchWrap.hidden = false;
            syncStatusBadge();
          },
        });

        isInlineFetching = false;

        if (telemetryOutcome.aborted) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          searchWrap.hidden = false;
          st.mode = "local";
          st.globalQuery = "";
          st.verifiedPlant = null;
          inputEl.value = query;
          syncClearButton();
          syncStatusBadge();
          validateSelection();
          syncCompareUrlParams();
          requestAnimationFrame(() => inputEl.focus());
          return;
        }

        const res = telemetryOutcome.result;
        if (res?.ok && res.monograph) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          searchWrap.hidden = false;
          field.classList.remove("is-error");
          if (activeLookupBanner?.side === side) {
            activeLookupBanner = null;
          }
          st.mode = "global";
          st.globalQuery = query;
          st.inputLang = lockedLang;
          st.verifiedPlant = res.monograph;
          inputEl.value =
            lockedLang === "bn" && res.monograph.commonNameBn
              ? res.monograph.commonNameBn
              : res.monograph.commonName || query;
          syncClearButton();
          syncStatusBadge();
          validateSelection();
          syncCompareUrlParams();
          if (side === "left" && !isPanelReady("right")) {
            const rightInput = document.getElementById("right-specimen-input");
            if (rightInput) {
              requestAnimationFrame(() => rightInput.focus({ preventScroll: true }));
            }
          }
          return;
        }

        const failureReason = res?.reason || "invalid";
        renderInlineRecoveryNotice(failureReason, query);
      }

      function populateAutocompleteList(trimmed, globalSuggestions = [], isCheckingGlobal = false) {
        listBox.replaceChildren();
        const hasGlobal = Array.isArray(globalSuggestions) && globalSuggestions.length > 0;

        if (currentMatches.length === 0 && !hasGlobal) {
          listBox.appendChild(
            createEl(
              "div",
              "compare-autocomplete-empty",
              `No curated archive species matched "${trimmed}".`,
            ),
          );
        } else {
          currentMatches.forEach((entry, idx) => {
            const sp = entry?.item || entry;
            const isFuzzy = Boolean(entry?.isFuzzy);

            const optBtn = createEl(
              "button",
              isFuzzy
                ? "compare-autocomplete-option is-fuzzy-match"
                : "compare-autocomplete-option",
            );
            optBtn.type = "button";
            optBtn.setAttribute("role", "option");
            optBtn.dataset.slug = sp.slug;
            optBtn.dataset.idx = String(idx);

            const thumb = buildImageElement(
              sp.thumbnailUrl || sp.image?.imageUrl,
              sp.imageAlt || sp.commonName,
              sp.commonName,
            );
            thumb.className = "compare-autocomplete-thumb";
            optBtn.appendChild(thumb);

            const textCol = createEl("div", "compare-autocomplete-text");
            const titleRow = createEl("div", "compare-option-title-row");
            const bnName = sp.commonNameBn || sp.bengaliName || "";
            const displayLabel = bnName ? `${sp.commonName} (${bnName})` : sp.commonName;
            const commonEl = createEl("span", "compare-option-common");
            setHighlightedContent(commonEl, displayLabel, trimmed);
            titleRow.appendChild(commonEl);
            if (isFuzzy) {
              titleRow.appendChild(
                createEl("span", "fuzzy-match-badge compare-fuzzy-badge", "Did you mean · Fuzzy Match"),
              );
            }
            textCol.appendChild(titleRow);

            const sciSub = sp.family
              ? `${sp.scientificName} · ${sp.family}`
              : sp.scientificName;
            const sciEl = createEl("span", "compare-option-sci");
            setHighlightedContent(sciEl, sciSub, trimmed);
            textCol.appendChild(sciEl);
            optBtn.appendChild(textCol);

            optBtn.addEventListener("mouseenter", () => {
              applyHighlightIndex(idx);
            });

            optBtn.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              lockLocalSpecies(sp);
            });

            listBox.appendChild(optBtn);
          });
        }

        if (trimmed.length >= 3 && currentMatches.length < 3) {
          if (hasGlobal) {
            listBox.appendChild(
              createEl(
                "div",
                "nav-suggestion-global-header",
                "Global Flora Index · Worldwide Fuzzy Matches",
              ),
            );
            globalSuggestions.slice(0, 3).forEach((item, gIdx) => {
              const targetQuery = item.scientificName || item.commonName;
              const gBtn = createEl(
                "button",
                "compare-autocomplete-option is-global-fuzzy-option",
              );
              gBtn.type = "button";
              gBtn.setAttribute("role", "option");
              gBtn.dataset.globalTarget = targetQuery;
              gBtn.dataset.idx = String(currentMatches.length + gIdx);

              const gIcon = createEl("span", "nav-suggestion-global-icon", "🌐");
              gIcon.setAttribute("aria-hidden", "true");
              gBtn.appendChild(gIcon);

              const textCol = createEl("div", "compare-autocomplete-text");
              const titleRow = createEl("div", "compare-option-title-row");
              const commonEl = createEl("span", "compare-option-common");
              setHighlightedContent(commonEl, item.commonName || targetQuery, trimmed);
              titleRow.appendChild(commonEl);
              titleRow.appendChild(
                createEl("span", "global-fuzzy-badge", "🌐 GLOBAL FUZZY MATCH"),
              );
              textCol.appendChild(titleRow);

              const sciSub = item.family && item.family !== "Plantae"
                ? `${item.scientificName} · ${item.family}`
                : item.scientificName;
              const sciEl = createEl("span", "compare-option-sci");
              setHighlightedContent(sciEl, sciSub, trimmed);
              textCol.appendChild(sciEl);
              gBtn.appendChild(textCol);

              gBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerInlineGlobalFetch(targetQuery);
              });

              listBox.appendChild(gBtn);
            });
          } else if (isCheckingGlobal) {
            listBox.appendChild(
              createEl(
                "div",
                "nav-suggestion-global-loading",
                "🌐 Querying Global Flora Index fuzzy taxa...",
              ),
            );
          }
        }
      }

      function renderAutocomplete(rawQuery) {
        const trimmed = String(rawQuery || "").trim().replace(/\s+/g, " ");
        syncClearButton();
        cancelGlobalFuzzyLookup();
        globalFuzzySeq += 1;
        const seq = globalFuzzySeq;

        if (trimmed.length < 1) {
          currentMatches = [];
          activeGlobalQuery = "";
          closeMenu();
          return;
        }

        closeAllMenus(side);
        currentMatches = filterCuratedSpecies(trimmed);
        highlightedIndex = -1;

        const shouldFetchGlobal = trimmed.length >= 3 && currentMatches.length < 3;
        populateAutocompleteList(trimmed, [], shouldFetchGlobal);

        const qLower = trimmed.toLowerCase();
        const hasExactMatch = currentMatches.some((entry) => {
          const sp = entry?.item || entry;
          return (
            String(sp.commonName || "").toLowerCase() === qLower ||
            String(sp.commonNameBn || "").toLowerCase() === qLower ||
            String(sp.scientificName || "").toLowerCase() === qLower ||
            String(sp.slug || "").toLowerCase() === qLower
          );
        });

        if (trimmed.length >= 2 && (currentMatches.length < 3 || !hasExactMatch)) {
          activeGlobalQuery = trimmed;
          globalFetchBtn.textContent = `🌐 Fetch from Global Botanical Server · "${trimmed}"`;
          globalFooter.hidden = false;
        } else {
          activeGlobalQuery = "";
          globalFooter.hidden = true;
        }

        menu.hidden = false;
        inputEl.setAttribute("aria-expanded", "true");
        field.classList.add("is-open");

        if (shouldFetchGlobal) {
          globalFuzzyTimer = setTimeout(async () => {
            if (seq !== globalFuzzySeq || menu.hidden) return;
            const controller = new AbortController();
            globalFuzzyController = controller;
            try {
              const res = await fetchGlobalFuzzySuggestions(trimmed, {
                signal: controller.signal,
                limit: 3,
              });
              if (controller.signal.aborted || seq !== globalFuzzySeq || menu.hidden) return;
              const items = Array.isArray(res?.suggestions) ? res.suggestions : [];
              populateAutocompleteList(trimmed, items, false);
            } catch {
              if (seq === globalFuzzySeq && !menu.hidden) {
                populateAutocompleteList(trimmed, [], false);
              }
            }
          }, 320);
        }
      }

      inputEl.addEventListener("input", () => {
        // Unlock previous selection whenever user edits the search query
        if (!isInlineFetching && telemetrySlot.firstChild) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
        }
        field.classList.remove("is-error");
        if (activeLookupBanner?.side === side) {
          activeLookupBanner = null;
        }
        st.mode = "local";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        syncStatusBadge();
        validateSelection();
        syncCompareUrlParams();
        renderAutocomplete(inputEl.value);
      });

      inputEl.addEventListener("focus", () => {
        if (!isPanelReady(side) && inputEl.value.trim().length >= 1) {
          renderAutocomplete(inputEl.value);
        }
      });

      inputEl.addEventListener("keydown", (e) => {
        const items = getInteractiveMenuItems();
        if (e.key === "ArrowDown") {
          if (menu.hidden && inputEl.value.trim().length >= 1) {
            renderAutocomplete(inputEl.value);
          }
          if (!menu.hidden && items.length > 0) {
            e.preventDefault();
            applyHighlightIndex(highlightedIndex + 1);
          }
        } else if (e.key === "ArrowUp") {
          if (!menu.hidden && items.length > 0) {
            e.preventDefault();
            const prevIdx =
              highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1;
            applyHighlightIndex(prevIdx);
          }
        } else if (e.key === "Escape") {
          if (!menu.hidden) {
            e.preventDefault();
            closeMenu();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();

          if (highlightedIndex >= 0 && items[highlightedIndex]) {
            const target = items[highlightedIndex];
            if (target === globalFetchBtn) {
              triggerInlineGlobalFetch(activeGlobalQuery || inputEl.value);
            } else if (target.dataset.globalTarget) {
              triggerInlineGlobalFetch(target.dataset.globalTarget);
            } else {
              const slug = target.dataset.slug;
              const sp = speciesBySlug.get(String(slug || "").toLowerCase());
              if (sp) lockLocalSpecies(sp);
            }
            return;
          }

          const trimmed = inputEl.value.trim().replace(/\s+/g, " ");
          if (currentMatches.length >= 1) {
            const top = currentMatches[0]?.item || currentMatches[0];
            lockLocalSpecies(top);
            return;
          }
          if (trimmed.length >= 2) {
            triggerInlineGlobalFetch(trimmed);
            return;
          }
          renderInlineRecoveryNotice("short", trimmed);
        }
      });

      globalFetchBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerInlineGlobalFetch(activeGlobalQuery || inputEl.value);
      });

      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInlineFetching) {
          const abortBtn = telemetrySlot.querySelector(".compare-loader-abort-btn");
          if (abortBtn) abortBtn.click();
        } else if (telemetrySlot.firstChild) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
        }
        field.classList.remove("is-error");
        if (activeLookupBanner?.side === side) {
          activeLookupBanner = null;
        }
        st.mode = "local";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        inputEl.value = "";
        syncClearButton();
        syncStatusBadge();
        closeMenu();
        validateSelection();
        syncCompareUrlParams();
        requestAnimationFrame(() => inputEl.focus());
      });

      menu.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      hydrateLockedInputText();
      panelControllers[side] = {
        triggerInlineGlobalFetch,
        renderInlineRecoveryNotice,
        restoreFailedInput: (reason, queryText) => {
          const stObj = panelState[side];
          const textToKeep = queryText || inputEl.value || stObj.globalQuery || stObj.slug || "";
          stObj.verifiedPlant = null;
          inputEl.value = textToKeep;
          syncClearButton();
          renderInlineRecoveryNotice(reason || "invalid", textToKeep);
          validateSelection();
          requestAnimationFrame(() => inputEl.focus({ preventScroll: true }));
        },
        closeMenu,
        focusInput: () => inputEl.focus({ preventScroll: true }),
      };

      field.appendChild(searchWrap);
      field.appendChild(statusEl);
      field.appendChild(telemetrySlot);

      if (side === "right") {
        field.appendChild(rightHint);
      }

      return field;
    }

    const leftField = buildSpecimenPanel("left", selCfg.leftLabel || "Left Specimen");
    const rightField = buildSpecimenPanel("right", selCfg.rightLabel || "Right Specimen");

    selectsRow.appendChild(leftField);
    selectsRow.appendChild(rightField);
    card.appendChild(selectsRow);
    card.appendChild(warningEl);
    card.appendChild(submitBtn);

    function validateSelection() {
      const leftReady = isPanelReady("left");
      const rightReady = isPanelReady("right");

      leftField.classList.toggle("is-preselected", leftReady);
      rightField.classList.toggle("is-preselected", rightReady);

      const guideRight = Boolean(leftReady && !rightReady);
      rightField.classList.toggle("is-guided-next", guideRight);
      rightHint.hidden = !guideRight;

      syncUnifiedBanner();
      if (areSidesDuplicate()) {
        submitBtn.disabled = true;
        return false;
      }

      submitBtn.disabled = !(leftReady && rightReady);
      return !submitBtn.disabled;
    }

    submitBtn.addEventListener("click", () => {
      if (!validateSelection()) return;
      launchComparisonSynthesis(submitBtn, (errPayload) => {
        const failedSide = errPayload?.failedSide === "left" ? "left" : "right";
        panelControllers[failedSide]?.restoreFailedInput(
          errPayload?.reason || "invalid",
          errPayload?.failedQuery || "",
        );
      });
    });

    const handleDocClick = (e) => {
      if (!e.target.closest(".compare-search-wrap")) {
        closeAllMenus();
      }
    };
    document.addEventListener("click", handleDocClick);
    docClickCleanup = () => document.removeEventListener("click", handleDocClick);

    validateSelection();
    shell.appendChild(card);
    mountEl.replaceChildren(shell);

    // Resolve any uncached URL global specimens inline (or restore inline recovery notice if redirected from /compare/result/)
    ["left", "right"].forEach((side) => {
      const st = panelState[side];
      if (st.failedReason) {
        panelControllers[side]?.renderInlineRecoveryNotice(st.failedReason, st.globalQuery);
      } else if (st.mode === "global" && st.globalQuery && !st.verifiedPlant) {
        panelControllers[side]?.triggerInlineGlobalFetch(st.globalQuery);
      }
    });

    if (highlightRight && isPanelReady("left") && !isPanelReady("right")) {
      requestAnimationFrame(() => {
        rightField.scrollIntoView({ behavior: "smooth", block: "center" });
        const rightInput = document.getElementById("right-specimen-input");
        if (rightInput) rightInput.focus({ preventScroll: true });
      });
    }
  }

  // Hydrate initial URL parameters (?left=, ?right=, ?a=, ?b=, ?leftGlobal=, ?rightGlobal=, ?leftType=, ?rightType=, ?leftLang=, ?rightLang=, ?failedSide=)
  const urlParams = new URLSearchParams(window.location.search);
  const leftTypeParam = urlParams.get("leftType");
  const rightTypeParam = urlParams.get("rightType");

  const failedSideParam = urlParams.get("failedSide");
  const failedQueryParam = normalizeGlobalQuery(urlParams.get("failedQuery") || "");
  const failedReasonParam = urlParams.get("failedReason") || "";

  const rawLeftParam = urlParams.get("left") || urlParams.get("a") || urlParams.get("species") || "";
  const rawRightParam = urlParams.get("right") || urlParams.get("b") || "";

  const initialLeftGlobal = normalizeGlobalQuery(
    urlParams.get("leftGlobal") || (leftTypeParam === "global" ? rawLeftParam : ""),
  );
  const initialRightGlobal = normalizeGlobalQuery(
    urlParams.get("rightGlobal") || (rightTypeParam === "global" ? rawRightParam : ""),
  );
  const initialA = leftTypeParam === "global" ? "" : rawLeftParam.trim().toLowerCase();
  const initialB = rightTypeParam === "global" ? "" : rawRightParam.trim().toLowerCase();

  const initialLeftLang = normalizeLangCode(urlParams.get("leftLang"), initialLeftGlobal || rawLeftParam);
  const initialRightLang = normalizeLangCode(urlParams.get("rightLang"), initialRightGlobal || rawRightParam);

  if (failedSideParam === "left" && (failedQueryParam || rawLeftParam)) {
    panelState.left = {
      mode: "global",
      slug: "",
      globalQuery: failedQueryParam || normalizeGlobalQuery(rawLeftParam),
      inputLang: initialLeftLang,
      verifiedPlant: null,
      failedReason: failedReasonParam || "invalid",
    };
  } else if (initialLeftGlobal) {
    panelState.left = {
      mode: "global",
      slug: "",
      globalQuery: initialLeftGlobal,
      inputLang: initialLeftLang,
      verifiedPlant: getCachedGlobalMonograph(initialLeftGlobal, initialLeftLang),
    };
  } else if (initialA && speciesBySlug.has(initialA)) {
    panelState.left = {
      mode: "local",
      slug: initialA,
      globalQuery: "",
      inputLang: initialLeftLang,
      verifiedPlant: null,
    };
  }

  if (failedSideParam === "right" && (failedQueryParam || rawRightParam)) {
    panelState.right = {
      mode: "global",
      slug: "",
      globalQuery: failedQueryParam || normalizeGlobalQuery(rawRightParam),
      inputLang: initialRightLang,
      verifiedPlant: null,
      failedReason: failedReasonParam || "invalid",
    };
  } else if (initialRightGlobal) {
    panelState.right = {
      mode: "global",
      slug: "",
      globalQuery: initialRightGlobal,
      inputLang: initialRightLang,
      verifiedPlant: getCachedGlobalMonograph(initialRightGlobal, initialRightLang),
    };
  } else if (
    initialB &&
    speciesBySlug.has(initialB) &&
    (initialB !== panelState.left.slug || initialRightLang !== panelState.left.inputLang)
  ) {
    panelState.right = {
      mode: "local",
      slug: initialB,
      globalQuery: "",
      inputLang: initialRightLang,
      verifiedPlant: null,
    };
  }

  renderSelectorView({
    highlightRight: Boolean(isPanelReady("left") && !isPanelReady("right") && !failedSideParam),
  });
}
