/**
 * Multi-Stage Comparison Synthesis Labor Illusion Engine
 * - Displays the 10-second, 4-stage emerald-cyan glassmorphism modal (#compare-synthesis-overlay)
 *   for Federated Taxon Resolution, 6-Source Synthesis, Cross-Language Translation & Visual Guard
 * - Executes concurrent `prepareWork` alongside the 10s progress track
 * - Supports Escape key & tactile Cancel button aborting timers & network fetches cleanly
 */

import { createEl } from "../../modules/utils/templates.js";

export const SYNTHESIS_DURATION_MS = 10000;

export const SYNTHESIS_STAGES = Object.freeze([
  {
    num: "01",
    shortLabel: "Taxon Resolution",
    badge: "STAGE 01 / 04 · TAXON RESOLUTION",
    status: "01 Federated Taxon Resolution — Resolving Linnaean binomials & input scripts...",
  },
  {
    num: "02",
    shortLabel: "6-Source Synthesis",
    badge: "STAGE 02 / 04 · 6-SOURCE SYNTHESIS",
    status: "02 6-Source Ecological & Morphological Synthesis — Aggregating GBIF, Global Flora Index, Wikidata, iNaturalist, EOL & Open Tree of Life...",
  },
  {
    num: "03",
    shortLabel: "Language Alignment",
    badge: "STAGE 03 / 04 · LANGUAGE ALIGNMENT",
    status: "03 Cross-Language Translation & Telemetry Alignment — Locking Left & Right slot languages...",
  },
  {
    num: "04",
    shortLabel: "Visual Guard",
    badge: "STAGE 04 / 04 · VISUAL GUARD",
    status: "04 Dual-Plate Visual Verification — Enforcing 3-tier botanical photography guard...",
  },
]);

export function openComparisonSynthesisOverlay({
  leftName,
  rightName,
  triggerBtn,
  prepareWork,
  onComplete,
  onCancel,
  onError,
}) {
  const existingOverlay = document.getElementById("compare-synthesis-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = createEl("div", "compare-synthesis-overlay");
  overlay.id = "compare-synthesis-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "compareSynthesisTitle");
  overlay.setAttribute("aria-describedby", "compareSynthesisStatus");

  const modalCard = createEl("div", "compare-synthesis-card");

  const titleWrap = createEl("div", "compare-synthesis-specimens");
  titleWrap.id = "compareSynthesisTitle";
  titleWrap.appendChild(createEl("span", "compare-synthesis-specimen is-left", leftName));
  const swapGlyph = createEl("span", "compare-synthesis-swap", "⇄");
  swapGlyph.setAttribute("aria-hidden", "true");
  titleWrap.appendChild(swapGlyph);
  titleWrap.appendChild(createEl("span", "compare-synthesis-specimen is-right", rightName));

  const stageBadgeEl = createEl(
    "div",
    "compare-synthesis-stage-badge",
    SYNTHESIS_STAGES[0].badge,
  );
  stageBadgeEl.setAttribute("aria-live", "polite");

  const pillsRow = createEl("div", "compare-synthesis-pills");
  pillsRow.setAttribute("role", "list");
  pillsRow.setAttribute("aria-label", "Comparison synthesis stages");

  const pillNodes = SYNTHESIS_STAGES.map((stage, idx) => {
    const pill = createEl(
      "div",
      `compare-synthesis-pill${idx === 0 ? " is-active" : ""}`,
    );
    pill.setAttribute("role", "listitem");
    pill.dataset.stage = stage.num;

    const marker = createEl("span", "compare-synthesis-pill-num", stage.num);
    const label = createEl("span", "compare-synthesis-pill-label", stage.shortLabel);
    pill.appendChild(marker);
    pill.appendChild(label);
    pillsRow.appendChild(pill);
    return { pill, marker, stage };
  });

  const statusEl = createEl(
    "p",
    "compare-synthesis-status",
    SYNTHESIS_STAGES[0].status,
  );
  statusEl.id = "compareSynthesisStatus";
  statusEl.setAttribute("aria-live", "polite");

  const progressSection = createEl("div", "compare-synthesis-progress-wrap");
  const progressTrack = createEl("div", "compare-synthesis-track");
  progressTrack.setAttribute("role", "progressbar");
  progressTrack.setAttribute("aria-valuemin", "0");
  progressTrack.setAttribute("aria-valuemax", "100");
  progressTrack.setAttribute("aria-valuenow", "0");
  progressTrack.setAttribute("aria-label", "Comparison synthesis progress");

  const progressFill = createEl("div", "compare-synthesis-fill");
  progressTrack.appendChild(progressFill);

  const progressMeta = createEl("div", "compare-synthesis-meta");
  progressMeta.appendChild(
    createEl(
      "span",
      "compare-synthesis-meta-label",
      "Plantipedia 6-Source Engine · 10s Synthesis Window",
    ),
  );
  const pctEl = createEl("span", "compare-synthesis-pct", "0%");
  progressMeta.appendChild(pctEl);

  progressSection.appendChild(progressTrack);
  progressSection.appendChild(progressMeta);

  const cancelBtn = createEl("button", "compare-synthesis-cancel-btn", "✕ Cancel");
  cancelBtn.type = "button";
  cancelBtn.id = "compareSynthesisCancelBtn";

  modalCard.appendChild(titleWrap);
  modalCard.appendChild(stageBadgeEl);
  modalCard.appendChild(pillsRow);
  modalCard.appendChild(statusEl);
  modalCard.appendChild(progressSection);
  modalCard.appendChild(cancelBtn);
  overlay.appendChild(modalCard);

  document.documentElement.classList.add("overlay-locked");
  document.body.classList.add("overlay-locked");
  document.body.appendChild(overlay);
  requestAnimationFrame(() => cancelBtn.focus({ preventScroll: true }));

  const workAbortController = new AbortController();
  let cancelled = false;
  let completed = false;
  let rafId = 0;
  let fallbackTimerId = 0;
  let activeStageIdx = -1;
  let timerFinished = false;
  let workDone = typeof prepareWork !== "function";
  let workResultPayload = null;

  function syncStageUi(stageIdx, allComplete = false) {
    if (!allComplete && stageIdx === activeStageIdx) return;
    activeStageIdx = stageIdx;

    const stageDef = SYNTHESIS_STAGES[Math.min(stageIdx, SYNTHESIS_STAGES.length - 1)];
    stageBadgeEl.textContent = stageDef.badge;
    statusEl.textContent = stageDef.status;

    pillNodes.forEach(({ pill, marker, stage }, idx) => {
      const isDone = allComplete || idx < stageIdx;
      const isCurr = !allComplete && idx === stageIdx;
      pill.classList.toggle("is-completed", isDone);
      pill.classList.toggle("is-active", isCurr);
      marker.textContent = isDone ? "✓" : stage.num;
    });
  }

  function teardownModal({ restoreFocus = true } = {}) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (fallbackTimerId) {
      clearTimeout(fallbackTimerId);
      fallbackTimerId = 0;
    }
    document.removeEventListener("keydown", handleKeydown);
    overlay.remove();
    document.documentElement.classList.remove("overlay-locked");
    document.body.classList.remove("overlay-locked");
    if (restoreFocus && triggerBtn && document.body.contains(triggerBtn)) {
      triggerBtn.focus({ preventScroll: true });
    }
  }

  function cleanup({ restoreFocus = true } = {}) {
    if (cancelled) return;
    cancelled = true;
    workAbortController.abort();
    teardownModal({ restoreFocus });
    if (typeof onCancel === "function") {
      onCancel();
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cleanup({ restoreFocus: true });
    }
  }

  function tryCompleteSynthesis() {
    if (cancelled || completed || !timerFinished || !workDone) return;
    completed = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (fallbackTimerId) {
      clearTimeout(fallbackTimerId);
      fallbackTimerId = 0;
    }

    if (workResultPayload && workResultPayload.ok === false) {
      teardownModal({ restoreFocus: true });
      if (typeof onError === "function") {
        onError(workResultPayload);
      }
      return;
    }

    progressFill.style.width = "100%";
    progressTrack.setAttribute("aria-valuenow", "100");
    pctEl.textContent = "100%";
    syncStageUi(SYNTHESIS_STAGES.length - 1, true);
    if (typeof onComplete === "function") {
      onComplete(workResultPayload);
    }
  }

  if (typeof prepareWork === "function") {
    Promise.resolve()
      .then(() => prepareWork({ signal: workAbortController.signal }))
      .then((res) => {
        if (cancelled) return;
        workResultPayload = res || { ok: true };
        workDone = true;
        if (workResultPayload.ok === false) {
          timerFinished = true;
          tryCompleteSynthesis();
        } else {
          tryCompleteSynthesis();
        }
      })
      .catch((err) => {
        if (cancelled || err?.name === "AbortError") return;
        workResultPayload = {
          ok: false,
          reason: "network",
          failedSide: "right",
          error: err?.message || "Synthesis interrupted.",
        };
        workDone = true;
        timerFinished = true;
        tryCompleteSynthesis();
      });
  }

  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cleanup({ restoreFocus: true });
  });
  document.addEventListener("keydown", handleKeydown);

  const startMs = performance.now();
  syncStageUi(0, false);

  function tick(now) {
    if (cancelled || completed) return;
    const elapsed = Math.max(0, now - startMs);
    const rawProgress = Math.min(1, elapsed / SYNTHESIS_DURATION_MS);
    const displayProgress = !workDone && rawProgress >= 0.96 ? 0.96 : rawProgress;
    const pct = Math.round(displayProgress * 100);

    progressFill.style.width = `${(displayProgress * 100).toFixed(2)}%`;
    progressTrack.setAttribute("aria-valuenow", String(pct));
    pctEl.textContent = `${pct}%`;

    if (elapsed >= SYNTHESIS_DURATION_MS) {
      timerFinished = true;
      if (workDone) {
        tryCompleteSynthesis();
        return;
      }
      statusEl.textContent = "04 Dual-Plate Visual Verification — Finalizing translation & verified media...";
      rafId = requestAnimationFrame(tick);
      return;
    }

    const stageIdx =
      elapsed < 2500 ? 0 : elapsed < 5000 ? 1 : elapsed < 7500 ? 2 : 3;
    syncStageUi(stageIdx, false);
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  fallbackTimerId = setTimeout(() => {
    timerFinished = true;
    tryCompleteSynthesis();
  }, SYNTHESIS_DURATION_MS + 60);

  return cleanup;
}
