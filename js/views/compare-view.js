/**
 * Compare Split View Controller (/compare/)
 * - Custom Glassmorphism Dropdowns for Left & Right specimens with scrollable 50-species list
 *   and sticky bottom Global Botanical Server action ("Fetch from Global Server ->")
 * - Independent panel transformation into global query input + "Fetch" + "<- List"
 * - 5-second Global Botanical Server telemetry loader with AbortController & auto-retry loop
 * - Smart error recovery redirecting to ./404.html?reason=invalid|network&q=...&from=compare
 * - Supports ?left=<slug>, ?right=<slug>, ?a=, ?b=, ?leftGlobal=, ?rightGlobal=
 * - Dual-pane 50/50 split view on desktop + Focus Mode / Split View toggle
 */

import { createEl } from "../utils/templates.js";
import { resolveRootPath } from "../core/router.js";
import { applyCompareSeo } from "../services/seo.js";
import {
  fetchFromGlobalBotanicalServer,
  getCachedGlobalMonograph,
  normalizeGlobalQuery,
  runGlobalServerTelemetry,
} from "../services/global-botanical-server.js";

function pickRandomMessage(pool, fallback) {
  if (!Array.isArray(pool) || pool.length === 0) return fallback;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] || fallback;
}

function createDropdownCaretSvg() {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "compare-dropdown-caret");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "m4 6 4 4 4-4");
  svg.appendChild(path);
  return svg;
}

export function renderCompareWorkspace(mountEl, { pageData, speciesIndex }) {
  if (!mountEl || !pageData) return;

  const list = Array.isArray(speciesIndex) ? speciesIndex.slice() : [];
  list.sort((a, b) => a.commonName.localeCompare(b.commonName));
  const speciesBySlug = new Map(list.map((s) => [s.slug, s]));

  const selCfg = pageData.selector || {};
  const stages = Array.isArray(pageData.loaderStages) && pageData.loaderStages.length === 3
    ? pageData.loaderStages
    : [
        [
          "Retrieving botanical monograph archives...",
          "Sequencing Linnaean taxonomic lineage...",
          "Indexing herbarium specimen records...",
          "Loading native habitat & distribution data...",
          "Cross-referencing species catalog entries...",
        ],
        [
          "Aligning morphological & leaf venation traits...",
          "Calibrating soil pH & cultivation parameters...",
          "Comparing pollinator guilds & ecological roles...",
          "Synthesizing phytochemical & medicinal profiles...",
          "Mapping seasonal flowering & growth cycles...",
        ],
        [
          "Assembling dual-pane split comparison...",
          "Finalizing high-contrast specimen plates...",
          "Synchronizing responsive monograph viewports...",
          "Preparing side-by-side botanical workspace...",
          "Ready — launching comparative view...",
        ],
      ];
  const wsCfg = pageData.workspace || {};

  // Independent panel states
  const panelState = {
    left: { mode: "local", slug: "", globalQuery: "", verifiedPlant: null },
    right: { mode: "local", slug: "", globalQuery: "", verifiedPlant: null },
  };

  let isFocusMode = window.innerWidth <= 768;
  let activeFocusPane = "left";
  let loaderTimerIds = [];
  let activeResizeHandler = null;
  let docClickCleanup = null;

  function clearLoaderTimers() {
    loaderTimerIds.forEach((id) => clearTimeout(id));
    loaderTimerIds = [];
    if (activeResizeHandler) {
      window.removeEventListener("resize", activeResizeHandler);
      activeResizeHandler = null;
    }
  }

  function clearDocumentDropdownListener() {
    if (typeof docClickCleanup === "function") {
      docClickCleanup();
      docClickCleanup = null;
    }
  }

  function removeFloatingModeButton() {
    const existing = document.getElementById("compareModeToggleBtn");
    if (existing) existing.remove();
  }

  function getPanelIdentity(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      const q = normalizeGlobalQuery(st.globalQuery);
      return q ? `global:${q.toLowerCase()}` : "";
    }
    return st.slug ? `local:${st.slug.toLowerCase()}` : "";
  }

  function getPanelDisplayPlant(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      if (st.verifiedPlant) return st.verifiedPlant;
      const q = normalizeGlobalQuery(st.globalQuery);
      const cached = q ? getCachedGlobalMonograph(q) : null;
      return cached || {
        isGlobalLive: true,
        query: q,
        commonName: q || "Global Specimen",
        scientificName: "Global Botanical Server",
      };
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
      ["a", "b", "left", "right", "leftGlobal", "rightGlobal", "leftType", "rightType"].forEach((k) => {
        url.searchParams.delete(k);
      });
      if (isPanelReady("left") && isPanelReady("right") && !areSidesDuplicate()) {
        if (panelState.left.mode === "global") {
          url.searchParams.set("left", normalizeGlobalQuery(panelState.left.globalQuery));
          url.searchParams.set("leftType", "global");
        } else {
          url.searchParams.set("left", panelState.left.slug);
          url.searchParams.set("leftType", "local");
        }
        if (panelState.right.mode === "global") {
          url.searchParams.set("right", normalizeGlobalQuery(panelState.right.globalQuery));
          url.searchParams.set("rightType", "global");
        } else {
          url.searchParams.set("right", panelState.right.slug);
          url.searchParams.set("rightType", "local");
        }
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
        panelState.left.globalQuery || panelState.left.verifiedPlant?.query || panelState.left.verifiedPlant?.commonName,
      );
      params.set("left", leftVal);
      params.set("leftType", "global");
    } else {
      params.set("left", panelState.left.slug);
      params.set("leftType", "local");
    }
    if (panelState.right.mode === "global") {
      const rightVal = normalizeGlobalQuery(
        panelState.right.globalQuery || panelState.right.verifiedPlant?.query || panelState.right.verifiedPlant?.commonName,
      );
      params.set("right", rightVal);
      params.set("rightType", "global");
    } else {
      params.set("right", panelState.right.slug);
      params.set("rightType", "local");
    }
    window.location.href = resolveRootPath(`./compare/result/?${params.toString()}`);
  }

  function redirectToCompare404(reason, query) {
    const params = new URLSearchParams({
      reason: reason || "invalid",
      q: query || "",
      from: "compare",
    });
    window.location.href = resolveRootPath(`./404.html?${params.toString()}`);
  }

  function renderSelectorView({ resetUrl = false, highlightRight = false } = {}) {
    clearLoaderTimers();
    clearDocumentDropdownListener();
    removeFloatingModeButton();

    if (resetUrl) {
      panelState.left = { mode: "local", slug: "", globalQuery: "", verifiedPlant: null };
      panelState.right = { mode: "local", slug: "", globalQuery: "", verifiedPlant: null };
      syncCompareUrlParams();
    }

    try {
      applyCompareSeo({ pageData, leftPlant: null, rightPlant: null });
    } catch {
      // Non-blocking SEO update
    }

    const shell = createEl("div", "compare-selector-shell");
    const card = createEl("section", "compare-selector-card");
    card.setAttribute("aria-label", "Select two botanical species to compare");

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
          "Select two distinct plant species from the archive—or query any taxon worldwide from the Global Botanical Server.",
      ),
    );

    const selectsRow = createEl("div", "compare-selects-grid");
    const warningEl = createEl("p", "compare-validation-warning", "");
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
      selCfg.rightNextStepHint || "Next step: Pick a second specimen to compare side-by-side.",
    );

    const dropdownControllers = [];
    const panelControllers = {};

    function closeAllCustomDropdowns(exceptSide = null) {
      dropdownControllers.forEach((ctl) => {
        if (exceptSide && ctl.side === exceptSide) return;
        ctl.setOpen(false);
      });
    }

    function buildSpecimenPanel(side, idPrefix, labelText) {
      const st = panelState[side];
      const field = createEl("div", "compare-select-field");
      field.dataset.side = side;

      const label = createEl("label", "compare-select-label", labelText);
      const triggerId = `${idPrefix}Trigger`;
      const globalInputId = `${idPrefix}GlobalInput`;
      label.setAttribute("for", st.mode === "global" ? globalInputId : triggerId);
      field.appendChild(label);

      // 1. Custom Glassmorphism Dropdown + Scrollable 50-Species List + Sticky Global Server Footer
      const dropdownWrap = createEl("div", "compare-dropdown-wrap");
      dropdownWrap.id = `${side}-dropdown-wrap`;

      const trigger = createEl("button", "compare-dropdown-trigger");
      trigger.type = "button";
      trigger.id = triggerId;
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");

      const selectedPlant = st.slug ? speciesBySlug.get(st.slug) : null;
      const triggerText = selectedPlant
        ? (selectedPlant.commonNameBn
            ? `${selectedPlant.commonName} (${selectedPlant.commonNameBn}) — ${selectedPlant.scientificName}`
            : `${selectedPlant.commonName} — ${selectedPlant.scientificName}`)
        : (selCfg.placeholderOption || "Select a botanical specimen...");

      const textSpan = createEl(
        "span",
        `compare-dropdown-value${selectedPlant ? "" : " is-placeholder"}`,
        triggerText,
      );
      trigger.appendChild(textSpan);
      trigger.appendChild(createDropdownCaretSvg());

      const menu = createEl("div", "compare-dropdown-menu");
      menu.hidden = true;
      menu.setAttribute("role", "listbox");
      menu.setAttribute("aria-label", `${labelText} curated species`);

      const listBox = createEl("div", "compare-dropdown-list");

      list.forEach((sp) => {
        const isSelected = sp.slug === st.slug;
        const optBtn = createEl(
          "button",
          `compare-dropdown-option${isSelected ? " is-selected" : ""}`,
        );
        optBtn.type = "button";
        optBtn.setAttribute("role", "option");
        optBtn.setAttribute("aria-selected", String(isSelected));
        optBtn.dataset.slug = sp.slug;

        const nameSpan = createEl(
          "span",
          "compare-option-common",
          sp.commonNameBn ? `${sp.commonName} (${sp.commonNameBn})` : sp.commonName,
        );
        const sciSpan = createEl("span", "compare-option-sci", sp.scientificName);
        optBtn.appendChild(nameSpan);
        optBtn.appendChild(sciSpan);

        optBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          st.mode = "local";
          st.slug = sp.slug;
          st.verifiedPlant = null;
          textSpan.textContent = sp.commonNameBn
            ? `${sp.commonName} (${sp.commonNameBn}) — ${sp.scientificName}`
            : `${sp.commonName} — ${sp.scientificName}`;
          textSpan.classList.remove("is-placeholder");
          listBox.querySelectorAll(".compare-dropdown-option").forEach((b) => {
            const matched = b.dataset.slug === sp.slug;
            b.classList.toggle("is-selected", matched);
            b.setAttribute("aria-selected", String(matched));
          });
          setOpen(false);
          validateSelection();
          trigger.focus();
        });

        listBox.appendChild(optBtn);
      });

      const stickyFooter = createEl("div", "compare-dropdown-footer");
      const globalTriggerBtn = createEl(
        "button",
        "compare-dropdown-global-btn",
        "🌐 Fetch from Global Server →",
      );
      globalTriggerBtn.type = "button";
      stickyFooter.appendChild(globalTriggerBtn);
      listBox.appendChild(stickyFooter);

      menu.appendChild(listBox);
      dropdownWrap.appendChild(trigger);
      dropdownWrap.appendChild(menu);

      function setOpen(open) {
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        field.classList.toggle("is-open", open);
        if (open) {
          const activeOpt = listBox.querySelector(".compare-dropdown-option.is-selected");
          if (activeOpt) {
            requestAnimationFrame(() => activeOpt.scrollIntoView({ block: "nearest" }));
          }
        }
      }

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const nextOpen = menu.hidden;
        closeAllCustomDropdowns(side);
        setOpen(nextOpen);
      });

      trigger.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          setOpen(false);
        } else if (e.key === "ArrowDown" && menu.hidden) {
          e.preventDefault();
          closeAllCustomDropdowns(side);
          setOpen(true);
        }
      });

      menu.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      menu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          trigger.focus();
        }
      });

      dropdownControllers.push({ side, field, setOpen });

      // 2. Independent Global Botanical Server Query Input Container (#left-global-input-wrap / #right-global-input-wrap)
      const globalWrap = createEl("div", "compare-global-panel");
      globalWrap.id = `${side}-global-input-wrap`;

      const inputRow = createEl("form", "compare-global-form");
      inputRow.setAttribute("role", "search");

      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.id = globalInputId;
      textInput.className = "compare-global-input";
      textInput.placeholder = "Enter global plant name (EN / বাংলা)...";
      textInput.value = st.globalQuery || "";
      textInput.autocomplete = "off";
      textInput.setAttribute("aria-label", `${labelText} global botanical query`);

      const fetchBtn = createEl("button", "compare-global-fetch-btn", "Fetch");
      fetchBtn.type = "submit";

      const backListBtn = createEl("button", "compare-global-reset-btn", "← List");
      backListBtn.type = "button";
      backListBtn.title = "Return to 50 curated species list";

      inputRow.appendChild(textInput);
      inputRow.appendChild(fetchBtn);
      inputRow.appendChild(backListBtn);

      const statusBadge = createEl("div", "compare-global-status");
      const telemetrySlot = createEl("div", "compare-global-inline-telemetry");
      telemetrySlot.id = `${side}-global-telemetry-slot`;
      telemetrySlot.hidden = true;

      function syncGlobalStatusUi() {
        statusBadge.replaceChildren();
        if (st.verifiedPlant) {
          statusBadge.classList.add("is-verified");
          statusBadge.appendChild(
            createEl(
              "span",
              "compare-global-server-badge",
              `🌐 GLOBAL SERVER: ${st.verifiedPlant.commonName}`,
            ),
          );
          if (
            st.verifiedPlant.scientificName &&
            st.verifiedPlant.scientificName.toLowerCase() !== st.verifiedPlant.commonName.toLowerCase()
          ) {
            statusBadge.appendChild(
              createEl("span", "compare-global-verified-name", st.verifiedPlant.scientificName),
            );
          }
        } else {
          statusBadge.classList.remove("is-verified");
          statusBadge.appendChild(
            document.createTextNode("Type a plant name and press Enter or click Fetch"),
          );
        }
      }

      function syncPanelVisibility() {
        const isGlobal = st.mode === "global";
        dropdownWrap.hidden = isGlobal;
        globalWrap.hidden = !isGlobal;
        label.setAttribute("for", isGlobal ? globalInputId : triggerId);
        if (!isGlobal) {
          setOpen(false);
        }
        syncGlobalStatusUi();
      }

      let isInlineFetching = false;

      async function triggerInlineGlobalFetch(rawQueryValue) {
        if (isInlineFetching) return;
        const query = normalizeGlobalQuery(rawQueryValue ?? textInput.value);
        if (query.length < 2) {
          warningEl.textContent = "Please enter at least 2 characters for Global Botanical Server lookup.";
          warningEl.hidden = false;
          textInput.focus();
          return;
        }

        warningEl.hidden = true;
        warningEl.textContent = "";
        st.mode = "global";
        st.globalQuery = query;
        textInput.value = query;

        const cached = getCachedGlobalMonograph(query);
        if (cached) {
          st.verifiedPlant = cached;
          syncPanelVisibility();
          validateSelection();
          if (side === "left" && !isPanelReady("right")) {
            rightField.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return;
        }

        isInlineFetching = true;
        inputRow.hidden = true;
        statusBadge.hidden = true;
        telemetrySlot.hidden = false;
        telemetrySlot.replaceChildren();

        const telemetryOutcome = await runGlobalServerTelemetry({
          container: telemetrySlot,
          queryLabel: query,
          work: ({ signal, onRetry }) =>
            fetchFromGlobalBotanicalServer(query, { signal, onRetry }),
          onAbort: () => {
            telemetrySlot.replaceChildren();
            telemetrySlot.hidden = true;
            inputRow.hidden = false;
            statusBadge.hidden = false;
          },
        });

        isInlineFetching = false;

        if (telemetryOutcome.aborted || st.mode !== "global") {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          inputRow.hidden = false;
          statusBadge.hidden = false;
          if (st.mode === "global") {
            requestAnimationFrame(() => textInput.focus());
          }
          validateSelection();
          return;
        }

        const res = telemetryOutcome.result;
        if (res?.ok && res.monograph) {
          telemetrySlot.replaceChildren();
          telemetrySlot.hidden = true;
          inputRow.hidden = false;
          statusBadge.hidden = false;
          st.verifiedPlant = res.monograph;
          syncPanelVisibility();
          validateSelection();
          if (side === "left" && !isPanelReady("right")) {
            rightField.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          return;
        }

        redirectToCompare404(res?.reason || "invalid", query);
      }

      globalTriggerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAllCustomDropdowns();
        st.mode = "global";
        st.slug = "";
        st.globalQuery = "";
        st.verifiedPlant = null;
        textInput.value = "";
        syncPanelVisibility();
        validateSelection();
        requestAnimationFrame(() => textInput.focus());
      });

      textInput.addEventListener("input", () => {
        const val = textInput.value;
        if (normalizeGlobalQuery(val).toLowerCase() !== normalizeGlobalQuery(st.globalQuery).toLowerCase()) {
          st.verifiedPlant = null;
          syncGlobalStatusUi();
        }
        st.globalQuery = val;
        validateSelection();
      });

      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          triggerInlineGlobalFetch(textInput.value);
        }
      });

      inputRow.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerInlineGlobalFetch(textInput.value);
      });

      backListBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInlineFetching) {
          const abortBtn = telemetrySlot.querySelector(".compare-loader-abort-btn");
          if (abortBtn) abortBtn.click();
        }
        st.mode = "local";
        st.globalQuery = "";
        st.verifiedPlant = null;
        textInput.value = "";
        telemetrySlot.replaceChildren();
        telemetrySlot.hidden = true;
        inputRow.hidden = false;
        statusBadge.hidden = false;
        syncPanelVisibility();
        validateSelection();
        requestAnimationFrame(() => trigger.focus());
      });

      globalWrap.appendChild(inputRow);
      globalWrap.appendChild(statusBadge);
      globalWrap.appendChild(telemetrySlot);

      syncPanelVisibility();
      panelControllers[side] = { triggerInlineGlobalFetch, syncPanelVisibility };

      field.appendChild(dropdownWrap);
      field.appendChild(globalWrap);

      if (side === "right") {
        field.appendChild(rightHint);
      }

      return field;
    }

    const leftField = buildSpecimenPanel(
      "left",
      "compareLeftSelect",
      selCfg.leftLabel || "Left Specimen",
    );
    const rightField = buildSpecimenPanel(
      "right",
      "compareRightSelect",
      selCfg.rightLabel || "Right Specimen",
    );

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

      if (areSidesDuplicate()) {
        submitBtn.disabled = true;
        warningEl.textContent =
          selCfg.sameSpeciesWarning ||
          "Please select two different species to run a side-by-side comparison.";
        warningEl.hidden = false;
        return false;
      }

      warningEl.hidden = true;
      warningEl.textContent = "";
      submitBtn.disabled = !(leftReady && rightReady);
      return !submitBtn.disabled;
    }

    submitBtn.addEventListener("click", () => {
      if (!validateSelection()) return;
      handleCompareLaunch();
    });

    const handleDocClick = (e) => {
      if (!e.target.closest(".compare-dropdown-wrap")) {
        closeAllCustomDropdowns();
      }
    };
    document.addEventListener("click", handleDocClick);
    docClickCleanup = () => document.removeEventListener("click", handleDocClick);

    validateSelection();
    shell.appendChild(card);
    mountEl.replaceChildren(shell);

    // If page opened with pre-filled URL global specimen(s) that aren't cached yet, resolve inline automatically
    ["left", "right"].forEach((side) => {
      const st = panelState[side];
      if (st.mode === "global" && st.globalQuery && !st.verifiedPlant) {
        panelControllers[side]?.triggerInlineGlobalFetch(st.globalQuery);
      }
    });

    if (highlightRight && isPanelReady("left") && !isPanelReady("right")) {
      requestAnimationFrame(() => {
        rightField.scrollIntoView({ behavior: "smooth", block: "center" });
        const rightTarget = document.getElementById(
          panelState.right.mode === "global"
            ? "compareRightSelectGlobalInput"
            : "compareRightSelectTrigger",
        );
        if (rightTarget) rightTarget.focus({ preventScroll: true });
      });
    }
  }

  async function handleCompareLaunch() {
    if (!isPanelReady("left") || !isPanelReady("right") || areSidesDuplicate()) {
      return;
    }
    navigateToCompareResult();
  }

  function buildPaneIframeSrc(side) {
    const st = panelState[side];
    if (st.mode === "global") {
      const q = normalizeGlobalQuery(st.globalQuery);
      return resolveRootPath(
        `./plant/live/?q=${encodeURIComponent(q)}&embed=true&cached=1`,
      );
    }
    return resolveRootPath(
      `./plant/?species=${encodeURIComponent(st.slug)}&embed=true`,
    );
  }

  function launchDualViewport({ skipLoader = false } = {}) {
    clearLoaderTimers();
    clearDocumentDropdownListener();
    removeFloatingModeButton();

    const leftPlant = getPanelDisplayPlant("left");
    const rightPlant = getPanelDisplayPlant("right");

    syncCompareUrlParams();
    try {
      applyCompareSeo({ pageData, leftPlant, rightPlant });
    } catch {
      // Non-blocking SEO update
    }

    const stageRoot = createEl("div", "compare-active-root");

    // 1. Top Pill Switcher + Reset Bar
    const controlStrip = createEl("div", "compare-focus-bar");
    controlStrip.id = "compareFocusBar";

    const pillGroup = createEl("div", "compare-pill-switcher");
    pillGroup.setAttribute("role", "tablist");
    pillGroup.setAttribute("aria-label", "Switch focused specimen");

    const leftPill = createEl(
      "button",
      "compare-pill-btn is-active",
      leftPlant.commonName,
    );
    leftPill.type = "button";
    leftPill.setAttribute("role", "tab");
    leftPill.setAttribute("data-pane", "left");
    leftPill.setAttribute("aria-selected", "true");

    const rightPill = createEl(
      "button",
      "compare-pill-btn",
      rightPlant.commonName,
    );
    rightPill.type = "button";
    rightPill.setAttribute("role", "tab");
    rightPill.setAttribute("data-pane", "right");
    rightPill.setAttribute("aria-selected", "false");

    pillGroup.appendChild(leftPill);
    pillGroup.appendChild(rightPill);

    const changeBtn = createEl(
      "button",
      "compare-change-btn",
      wsCfg.changeSpeciesLabel || "Change Species",
    );
    changeBtn.type = "button";
    changeBtn.addEventListener("click", () => renderSelectorView({ resetUrl: true }));

    controlStrip.appendChild(pillGroup);
    controlStrip.appendChild(changeBtn);

    // 2. Dual Iframe Viewport Container
    const panesContainer = createEl("div", "compare-panes-grid");
    panesContainer.id = "comparePanesGrid";

    const leftIframe = document.createElement("iframe");
    leftIframe.className = "compare-iframe compare-iframe--left";
    leftIframe.title = `${leftPlant.commonName} Botanical Monograph`;
    leftIframe.loading = "eager";
    leftIframe.src = buildPaneIframeSrc("left");

    const rightIframe = document.createElement("iframe");
    rightIframe.className = "compare-iframe compare-iframe--right";
    rightIframe.title = `${rightPlant.commonName} Botanical Monograph`;
    rightIframe.loading = "eager";
    rightIframe.src = buildPaneIframeSrc("right");

    panesContainer.appendChild(leftIframe);
    panesContainer.appendChild(rightIframe);

    stageRoot.appendChild(controlStrip);
    stageRoot.appendChild(panesContainer);

    const syncPaneClasses = () => {
      const mobileViewport = window.innerWidth <= 768;
      const effectiveFocus = mobileViewport || isFocusMode;

      stageRoot.classList.toggle("is-focus-mode", effectiveFocus);
      panesContainer.classList.toggle("is-focus-mode", effectiveFocus);
      leftIframe.classList.toggle("is-active-pane", !effectiveFocus || activeFocusPane === "left");
      rightIframe.classList.toggle("is-active-pane", !effectiveFocus || activeFocusPane === "right");

      leftPill.classList.toggle("is-active", activeFocusPane === "left");
      leftPill.setAttribute("aria-selected", String(activeFocusPane === "left"));
      rightPill.classList.toggle("is-active", activeFocusPane === "right");
      rightPill.setAttribute("aria-selected", String(activeFocusPane === "right"));

      const floatBtn = document.getElementById("compareModeToggleBtn");
      if (floatBtn) {
        floatBtn.textContent = isFocusMode
          ? wsCfg.splitViewLabel || "Split View"
          : wsCfg.focusModeLabel || "Focus Mode";
        floatBtn.hidden = mobileViewport;
      }

      const visiblePane =
        !effectiveFocus || activeFocusPane === "left" ? leftIframe : rightIframe;
      try {
        visiblePane.contentWindow?.dispatchEvent(new Event("resize"));
      } catch {
        // Ignore cross-frame restrictions
      }
    };

    const mountFloatModeBtn = () => {
      const floatBtn = createEl(
        "button",
        "floating-back-btn compare-floating-mode-btn",
        isFocusMode
          ? wsCfg.splitViewLabel || "Split View"
          : wsCfg.focusModeLabel || "Focus Mode",
      );
      floatBtn.type = "button";
      floatBtn.id = "compareModeToggleBtn";
      floatBtn.addEventListener("click", () => {
        isFocusMode = !isFocusMode;
        syncPaneClasses();
      });
      document.body.appendChild(floatBtn);
      syncPaneClasses();
    };

    leftPill.addEventListener("click", () => {
      activeFocusPane = "left";
      syncPaneClasses();
    });
    rightPill.addEventListener("click", () => {
      activeFocusPane = "right";
      syncPaneClasses();
    });

    if (skipLoader) {
      mountEl.replaceChildren(stageRoot);
      mountFloatModeBtn();
    } else {
      const loaderOverlay = createEl("div", "compare-loader-overlay");
      loaderOverlay.setAttribute("role", "status");
      loaderOverlay.setAttribute("aria-live", "polite");

      const loaderCard = createEl("div", "compare-loader-card");
      loaderCard.appendChild(createEl("div", "loading-spinner"));
      loaderCard.appendChild(
        createEl(
          "h2",
          "compare-loader-title",
          `${leftPlant.commonName} vs. ${rightPlant.commonName}`,
        ),
      );
      const stageMsgEl = createEl(
        "p",
        "compare-loader-message",
        pickRandomMessage(stages[0], "Retrieving botanical monograph archives..."),
      );
      loaderCard.appendChild(stageMsgEl);

      const progressTrack = createEl("div", "compare-loader-progress");
      const progressFill = createEl("div", "compare-loader-progress-fill");
      progressTrack.appendChild(progressFill);
      loaderCard.appendChild(progressTrack);

      const stageLabelEl = createEl("span", "compare-loader-step", "Stage 1 of 3");
      loaderCard.appendChild(stageLabelEl);
      loaderOverlay.appendChild(loaderCard);

      stageRoot.appendChild(loaderOverlay);
      mountEl.replaceChildren(stageRoot);

      requestAnimationFrame(() => {
        progressFill.style.width = "33%";
      });

      loaderTimerIds.push(
        setTimeout(() => {
          stageLabelEl.textContent = "Stage 2 of 3";
          stageMsgEl.textContent = pickRandomMessage(
            stages[1],
            "Aligning morphological & leaf venation traits...",
          );
          progressFill.style.width = "68%";
        }, 1000),
      );

      loaderTimerIds.push(
        setTimeout(() => {
          stageLabelEl.textContent = "Stage 3 of 3";
          stageMsgEl.textContent = pickRandomMessage(
            stages[2],
            "Assembling dual-pane split comparison...",
          );
          progressFill.style.width = "100%";
        }, 2000),
      );

      loaderTimerIds.push(
        setTimeout(() => {
          loaderOverlay.classList.add("is-leaving");
          setTimeout(() => loaderOverlay.remove(), 240);
          mountFloatModeBtn();
        }, 3000),
      );
    }

    activeResizeHandler = syncPaneClasses;
    window.addEventListener("resize", activeResizeHandler);
    syncPaneClasses();
  }

  // Hydrate initial URL parameters (?left=, ?right=, ?a=, ?b=, ?leftGlobal=, ?rightGlobal=, ?leftType=, ?rightType=)
  const urlParams = new URLSearchParams(window.location.search);
  const leftTypeParam = urlParams.get("leftType");
  const rightTypeParam = urlParams.get("rightType");

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

  if (initialLeftGlobal) {
    panelState.left = {
      mode: "global",
      slug: "",
      globalQuery: initialLeftGlobal,
      verifiedPlant: getCachedGlobalMonograph(initialLeftGlobal),
    };
  } else if (initialA && speciesBySlug.has(initialA)) {
    panelState.left = {
      mode: "local",
      slug: initialA,
      globalQuery: "",
      verifiedPlant: null,
    };
  }

  if (initialRightGlobal) {
    panelState.right = {
      mode: "global",
      slug: "",
      globalQuery: initialRightGlobal,
      verifiedPlant: getCachedGlobalMonograph(initialRightGlobal),
    };
  } else if (initialB && speciesBySlug.has(initialB) && initialB !== panelState.left.slug) {
    panelState.right = {
      mode: "local",
      slug: initialB,
      globalQuery: "",
      verifiedPlant: null,
    };
  }

  // Always render the Specimen Selection Gateway on /compare/ (so "<- Change Specimens" never bounces back)
  renderSelectorView({
    highlightRight: Boolean(isPanelReady("left") && !isPanelReady("right")),
  });
}
