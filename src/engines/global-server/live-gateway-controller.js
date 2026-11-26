import { isAbortError, waitWithSignal } from "./gbs-client.js";

export const TELEMETRY_DURATION_MS = 10000;

export const GLOBAL_TELEMETRY_STAGES = Object.freeze([
  {
    num: "01",
    title: "Resolving Taxonomic Lineage",
    source: "GBIF Backbone & Wikidata Graph",
    status: "Resolving Linnaean binomial & hierarchical lineage via GBIF Backbone & Wikidata Graph...",
  },
  {
    num: "02",
    title: "Aggregating 15+ Botanical Chapters",
    source: "Global Flora Index & EOL",
    status: "Aggregating morphological, ecological & phytochemical records via Global Flora Index & EOL...",
  },
  {
    num: "03",
    title: "Calibrating Bilingual Telemetry & Translation",
    source: "EN / বাংলা Synthesis",
    status: "Calibrating soil pH, thermal envelope & bilingual EN / বাংলা translation synthesis...",
  },
  {
    num: "04",
    title: "Verifying High-Resolution Specimen Plates",
    source: "iNaturalist & Global Herbarium Guard",
    status: "Verifying multi-plate specimen photography via iNaturalist & Global Herbarium Guard...",
  },
]);

export const GLOBAL_STATUS_MESSAGES = Object.freeze(
  GLOBAL_TELEMETRY_STAGES.map((stage) => stage.status),
);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  if (props && typeof props === "object") {
    Object.entries(props).forEach(([key, val]) => {
      if (val === undefined || val === null) return;
      if (key === "className") {
        node.className = String(val);
      } else if (key === "textContent") {
        node.textContent = String(val);
      } else if (key === "type" || key === "id" || key === "title" || key === "disabled") {
        node[key] = val;
      } else {
        node.setAttribute(key, String(val));
      }
    });
  }
  if (Array.isArray(children)) {
    children.forEach((child) => {
      if (child === undefined || child === null) return;
      node.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child,
      );
    });
  }
  return node;
}

function createRadarPulseElement() {
  const wrap = el("div", { className: "gbs-loader-radar", "aria-hidden": "true" });
  wrap.appendChild(el("span", { className: "gbs-loader-radar-ring gbs-loader-radar-ring--outer" }));
  wrap.appendChild(el("span", { className: "gbs-loader-radar-ring gbs-loader-radar-ring--inner" }));

  const core = el("span", { className: "gbs-loader-radar-core" });
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.9");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const pathLeaf = document.createElementNS(svgNS, "path");
  pathLeaf.setAttribute("d", "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z");
  const pathVein = document.createElementNS(svgNS, "path");
  pathVein.setAttribute("d", "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12");

  svg.appendChild(pathLeaf);
  svg.appendChild(pathVein);
  core.appendChild(svg);
  wrap.appendChild(core);
  return wrap;
}

async function runCompactSlotTelemetry({
  container,
  queryLabel = "Global Specimen",
  work,
  onAbort,
}) {
  const workController = new AbortController();
  const minFloorMs = 1100;
  let abortedByUser = false;
  let rafId = 0;
  let workFinished = false;
  let workFailed = false;
  let currentPct = 0;

  const progressFill = el("div", { className: "gbs-slot-loader-fill" });
  const progressTrack = el(
    "div",
    {
      className: "gbs-slot-loader-track",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": "0",
      "aria-label": `Global Botanical Server lookup progress for ${queryLabel}`,
    },
    [progressFill],
  );

  const pctEl = el("span", { className: "gbs-slot-loader-pct", textContent: "0%" });
  const cleanTarget = String(queryLabel || "Global Specimen").trim();
  const labelEl = el("span", {
    className: "gbs-slot-loader-label",
    title: `Synthesizing "${cleanTarget}"...`,
    textContent: `Synthesizing "${cleanTarget}"...`,
  });

  const retryNoteEl = el("p", {
    className: "gbs-slot-loader-retry",
    textContent: "Retrying Global Server uplink...",
  });
  retryNoteEl.hidden = true;

  const cancelBtn = el("button", {
    type: "button",
    className: "compare-loader-abort-btn",
    textContent: "✕ Cancel",
    "aria-label": "Cancel Global Botanical Server lookup",
  });

  const card = el(
    "div",
    {
      className: "gbs-slot-loader",
      role: "status",
      "aria-live": "polite",
    },
    [
      el("div", { className: "gbs-slot-loader-top" }, [
        el("div", { className: "gbs-slot-loader-brand" }, [
          el("span", { className: "gbs-loader-dot", "aria-hidden": "true" }),
          el("span", {
            className: "gbs-slot-loader-badge",
            textContent: "GLOBAL BOTANICAL SERVER",
          }),
        ]),
        cancelBtn,
      ]),
      el("div", { className: "gbs-slot-loader-row" }, [labelEl, pctEl]),
      progressTrack,
      retryNoteEl,
    ],
  );

  const previousChildren = [...container.childNodes];
  container.replaceChildren(card);

  const cleanupTimers = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const restorePrevious = () => {
    cleanupTimers();
    if (typeof onAbort === "function") {
      onAbort();
    } else {
      container.replaceChildren(...previousChildren);
    }
  };

  cancelBtn.addEventListener("click", () => {
    if (abortedByUser) return;
    abortedByUser = true;
    workController.abort();
    restorePrevious();
  });

  const setPct = (val) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    currentPct = clamped;
    progressFill.style.width = `${clamped}%`;
    progressTrack.setAttribute("aria-valuenow", String(clamped));
    pctEl.textContent = `${clamped}%`;
  };

  const startMs = performance.now();
  const updateCompactProgress = () => {
    if (abortedByUser || workFailed) return;
    const elapsed = Math.max(0, performance.now() - startMs);
    if (!workFinished) {
      // Smoothly ease toward 88% while the 6-source parallel JS fetch resolves
      const eased = 88 * (1 - Math.exp(-elapsed / 1600));
      setPct(Math.max(currentPct, eased));
      rafId = requestAnimationFrame(updateCompactProgress);
      return;
    }

    const totalFloor = Math.max(minFloorMs, elapsed);
    const finishPct = Math.min(100, (elapsed / totalFloor) * 100);
    setPct(Math.max(currentPct, finishPct));
    if (elapsed < minFloorMs) {
      rafId = requestAnimationFrame(updateCompactProgress);
    }
  };
  rafId = requestAnimationFrame(updateCompactProgress);

  const notifyRetry = () => {
    if (abortedByUser) return;
    retryNoteEl.hidden = false;
  };

  try {
    const res = await Promise.resolve().then(() =>
      work({ signal: workController.signal, onRetry: notifyRetry }),
    );
    workFinished = true;

    if (abortedByUser || workController.signal.aborted) {
      cleanupTimers();
      return { aborted: true };
    }

    if (res && res.ok === false) {
      workFailed = true;
      cleanupTimers();
      return { aborted: false, result: res };
    }

    const remainingMs = Math.max(0, minFloorMs - (performance.now() - startMs));
    if (remainingMs > 0) {
      await waitWithSignal(remainingMs, workController.signal);
    }
    cleanupTimers();

    if (abortedByUser || workController.signal.aborted) {
      return { aborted: true };
    }

    setPct(100);
    await waitWithSignal(140, workController.signal).catch(() => {});
    if (abortedByUser || workController.signal.aborted) {
      return { aborted: true };
    }
    return { aborted: false, result: res };
  } catch (err) {
    workFailed = true;
    cleanupTimers();
    if (abortedByUser || isAbortError(err) || workController.signal.aborted) {
      return { aborted: true };
    }
    return {
      aborted: false,
      result: {
        ok: false,
        reason: "network",
        error: err?.message || "Connection interrupted.",
      },
    };
  }
}

export async function runGlobalServerTelemetry({
  container,
  queryLabel = "Global Specimen",
  compact = false,
  work,
  onAbort,
}) {
  if (!container) {
    throw new Error("Telemetry container element is required.");
  }

  if (compact) {
    return runCompactSlotTelemetry({
      container,
      queryLabel,
      work,
      onAbort,
    });
  }

  const workController = new AbortController();
  const timerController = new AbortController();
  let abortedByUser = false;
  let rafId = 0;
  let retryFlag = false;
  let workFinished = false;
  let activeStageIdx = -1;

  const progressFill = el("div", { className: "gbs-loader-fill" });
  const progressTrack = el(
    "div",
    {
      className: "gbs-loader-track",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": "0",
      "aria-label": "Global Botanical Server synthesis progress",
    },
    [progressFill],
  );

  const pctBadge = el("span", { className: "gbs-loader-pct", textContent: "0%" });
  const statusEl = el("p", {
    className: "gbs-loader-status",
    textContent: GLOBAL_TELEMETRY_STAGES[0].status,
  });

  const cleanTarget = String(queryLabel || "Global Specimen").trim();
  const targetMetaEl = el("span", {
    className: "gbs-loader-meta-target",
    title: `Target Taxon: ${cleanTarget}`,
    textContent: `Target Taxon: ${cleanTarget}`,
  });

  const retryNoteEl = el("p", {
    className: "gbs-loader-retry-note",
    textContent: "Retrying Global Server uplink...",
  });
  retryNoteEl.hidden = true;

  const abortBtn = el("button", {
    type: "button",
    className: "compare-loader-abort-btn",
    textContent: "✕ Abort",
    "aria-label": "Abort Global Botanical Server synthesis",
  });

  const stageNodes = GLOBAL_TELEMETRY_STAGES.map((stage, idx) => {
    const numEl = el("span", { className: "gbs-stage-num", textContent: stage.num });
    const stateEl = el("span", {
      className: "gbs-stage-state",
      textContent: idx === 0 ? "ACTIVE" : "QUEUED",
    });
    const row = el(
      "div",
      {
        className: `gbs-stage-item${idx === 0 ? " is-active" : " is-pending"}`,
        role: "listitem",
        "data-stage": stage.num,
      },
      [
        numEl,
        el("div", { className: "gbs-stage-copy" }, [
          el("span", { className: "gbs-stage-title", textContent: stage.title }),
          el("span", { className: "gbs-stage-source", textContent: stage.source }),
        ]),
        stateEl,
      ],
    );
    return { row, numEl, stateEl, stage };
  });

  const loaderCard = el(
    "div",
    {
      className: "gbs-loader-card glass-panel",
      role: "status",
      "aria-live": "polite",
    },
    [
      el("div", { className: "gbs-loader-topbar" }, [
        el("div", { className: "gbs-loader-pill" }, [
          el("span", { className: "gbs-loader-dot", "aria-hidden": "true" }),
          el("span", {
            className: "gbs-loader-badge",
            textContent: "GLOBAL BOTANICAL SERVER · 1.6M+ INDEX",
          }),
        ]),
        abortBtn,
      ]),
      el("div", { className: "gbs-loader-hero" }, [
        createRadarPulseElement(),
        el("div", { className: "gbs-loader-title-wrap" }, [
          el("h3", {
            className: "gbs-loader-heading",
            textContent: "Synthesizing Live Botanical Monograph",
          }),
          statusEl,
        ]),
      ]),
      el(
        "div",
        {
          className: "gbs-loader-stepper",
          role: "list",
          "aria-label": "Botanical synthesis telemetry stages",
        },
        stageNodes.map((n) => n.row),
      ),
      progressTrack,
      el("div", { className: "gbs-loader-meta" }, [
        targetMetaEl,
        el("div", { className: "gbs-loader-meta-right" }, [
          el("span", { className: "gbs-loader-meta-sources", textContent: "6 Federated Sources" }),
          el("span", { className: "gbs-loader-meta-sep", textContent: "·", "aria-hidden": "true" }),
          pctBadge,
        ]),
      ]),
      retryNoteEl,
    ],
  );

  const previousChildren = [...container.childNodes];
  container.replaceChildren(loaderCard);

  const syncStageUi = (stageIdx, allComplete = false) => {
    if (!allComplete && stageIdx === activeStageIdx) return;
    activeStageIdx = stageIdx;

    const currentStage =
      GLOBAL_TELEMETRY_STAGES[Math.min(stageIdx, GLOBAL_TELEMETRY_STAGES.length - 1)];
    if (!allComplete) {
      statusEl.textContent = currentStage.status;
    } else {
      statusEl.textContent = "All 6 federated botanical streams synthesized & verified.";
    }

    stageNodes.forEach(({ row, numEl, stateEl, stage }, idx) => {
      const isDone = allComplete || idx < stageIdx;
      const isCurr = !allComplete && idx === stageIdx;
      row.classList.toggle("is-done", isDone);
      row.classList.toggle("is-active", isCurr);
      row.classList.toggle("is-pending", !isDone && !isCurr);
      numEl.textContent = isDone ? "✓" : stage.num;
      stateEl.textContent = isDone ? "DONE" : isCurr ? "ACTIVE" : "QUEUED";
    });
  };

  syncStageUi(0, false);

  const cleanupTimers = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const restorePrevious = () => {
    cleanupTimers();
    if (typeof onAbort === "function") {
      onAbort();
    } else {
      container.replaceChildren(...previousChildren);
    }
  };

  abortBtn.addEventListener("click", () => {
    if (abortedByUser) return;
    abortedByUser = true;
    workController.abort();
    timerController.abort();
    restorePrevious();
  });

  const startMs = performance.now();
  const updateProgress = () => {
    if (abortedByUser) return;
    const elapsed = Math.max(0, performance.now() - startMs);
    const rawPct = Math.min(100, Math.round((elapsed / TELEMETRY_DURATION_MS) * 100));
    const displayPct = !workFinished && rawPct >= 97 ? 97 : rawPct;

    progressFill.style.width = `${displayPct}%`;
    progressTrack.setAttribute("aria-valuenow", String(displayPct));
    pctBadge.textContent = `${displayPct}%`;

    const stageIdx =
      elapsed < 2500 ? 0 : elapsed < 5000 ? 1 : elapsed < 7500 ? 2 : 3;
    syncStageUi(stageIdx, false);

    if (elapsed < TELEMETRY_DURATION_MS || !workFinished) {
      rafId = requestAnimationFrame(updateProgress);
    }
  };
  rafId = requestAnimationFrame(updateProgress);

  const notifyRetry = () => {
    if (abortedByUser || retryFlag) return;
    retryFlag = true;
    retryNoteEl.hidden = false;
  };

  try {
    const workPromise = Promise.resolve()
      .then(() => work({ signal: workController.signal, onRetry: notifyRetry }))
      .then((res) => {
        workFinished = true;
        if (!abortedByUser && res && res.ok === false) {
          timerController.abort();
        }
        return res;
      })
      .catch((err) => {
        workFinished = true;
        if (!abortedByUser && !isAbortError(err)) {
          timerController.abort();
        }
        throw err;
      });

    const timerPromise = waitWithSignal(TELEMETRY_DURATION_MS, timerController.signal).catch(
      (err) => {
        if (abortedByUser || workController.signal.aborted) {
          throw err;
        }
        // Timer cancelled early due to fast non-plant or network resolution
        return null;
      },
    );

    const [workResult] = await Promise.all([workPromise, timerPromise]);
    cleanupTimers();

    if (abortedByUser || workController.signal.aborted) {
      return { aborted: true };
    }

    if (!workResult || workResult.ok !== false) {
      progressFill.style.width = "100%";
      progressTrack.setAttribute("aria-valuenow", "100");
      pctBadge.textContent = "100%";
      syncStageUi(GLOBAL_TELEMETRY_STAGES.length - 1, true);
    }

    return { aborted: false, result: workResult };
  } catch (err) {
    cleanupTimers();
    if (abortedByUser || isAbortError(err) || workController.signal.aborted) {
      return { aborted: true };
    }
    return {
      aborted: false,
      result: {
        ok: false,
        reason: "network",
        error: err?.message || "Connection interrupted.",
      },
    };
  }
}
