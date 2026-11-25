import { isAbortError, waitWithSignal } from "./gbs-client.js";

const TELEMETRY_DURATION_MS = 5000;

export const GLOBAL_STATUS_MESSAGES = Object.freeze([
  "Establishing handshake with Global Botanical Server...",
  "Resolving Linnaean binomial & taxonomic hierarchy...",
  "Cross-referencing South Asian & Bengali flora nomenclature...",
  "Extracting morphological & foliar anatomy records...",
  "Synthesizing native habitat & ecological distribution...",
  "Calibrating biome-aware soil pH & thermal telemetry...",
  "Indexing ethnobotanical & phytochemical literature...",
  "Curating multi-plate high-resolution herbarium imagery...",
  "Structuring 15-chapter Plantipedia monograph schema...",
  "Verifying academic citation metadata...",
]);

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

function pickFiveStatusMessages() {
  const pool = [...GLOBAL_STATUS_MESSAGES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

export async function runGlobalServerTelemetry({
  container,
  queryLabel = "Global Specimen",
  work,
  onAbort,
}) {
  if (!container) {
    throw new Error("Telemetry container element is required.");
  }

  const controller = new AbortController();
  const messages = pickFiveStatusMessages();
  let abortedByUser = false;
  let rafId = 0;
  let cycleTimer = 0;
  let retryFlag = false;

  const progressFill = el("div", { className: "gbs-loader-fill" });
  const pctBadge = el("span", { className: "gbs-loader-pct", textContent: "0%" });
  const statusEl = el("p", { className: "gbs-loader-status", textContent: messages[0] });
  const subStatusEl = el("p", {
    className: "gbs-loader-substatus",
    textContent: `Target taxon: "${queryLabel}" · Encrypted Botanical Index Stream`,
  });
  const abortBtn = el("button", {
    type: "button",
    className: "compare-loader-abort-btn",
    textContent: "✕ Abort",
  });

  const loaderCard = el(
    "div",
    {
      className: "gbs-loader-card glass-panel",
      role: "status",
      "aria-live": "polite",
    },
    [
      el("div", { className: "gbs-loader-head" }, [
        el("div", { className: "gbs-loader-title-wrap" }, [
          el("span", { className: "gbs-loader-badge", textContent: "GLOBAL BOTANICAL SERVER" }),
          el("h3", {
            className: "gbs-loader-heading",
            textContent: "Synthesizing Live Botanical Monograph",
          }),
        ]),
        abortBtn,
      ]),
      statusEl,
      el("div", { className: "gbs-loader-track" }, [progressFill]),
      el("div", { className: "gbs-loader-meta" }, [subStatusEl, pctBadge]),
    ],
  );

  const previousChildren = [...container.childNodes];
  container.replaceChildren(loaderCard);

  const cleanupTimers = () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (cycleTimer) clearInterval(cycleTimer);
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
    controller.abort();
    restorePrevious();
  });

  const startMs = performance.now();
  let messageStep = 0;
  cycleTimer = setInterval(() => {
    if (abortedByUser) return;
    messageStep = Math.min(messageStep + 1, messages.length - 1);
    statusEl.textContent = messages[messageStep];
  }, 1000);

  const updateProgress = () => {
    if (abortedByUser) return;
    const elapsed = performance.now() - startMs;
    const pct = Math.min(100, Math.round((elapsed / TELEMETRY_DURATION_MS) * 100));
    progressFill.style.width = `${pct}%`;
    pctBadge.textContent = `${pct}%`;
    if (elapsed < TELEMETRY_DURATION_MS) {
      rafId = requestAnimationFrame(updateProgress);
    }
  };
  rafId = requestAnimationFrame(updateProgress);

  const notifyRetry = () => {
    if (abortedByUser || retryFlag) return;
    retryFlag = true;
    subStatusEl.textContent = "Retrying Global Server connection...";
    subStatusEl.classList.add("is-retrying");
  };

  try {
    const workPromise = Promise.resolve().then(() =>
      work({ signal: controller.signal, onRetry: notifyRetry }),
    );
    const timerPromise = waitWithSignal(TELEMETRY_DURATION_MS, controller.signal);

    const [workResult] = await Promise.all([workPromise, timerPromise]);
    cleanupTimers();

    if (abortedByUser || controller.signal.aborted) {
      return { aborted: true };
    }

    progressFill.style.width = "100%";
    pctBadge.textContent = "100%";
    return { aborted: false, result: workResult };
  } catch (err) {
    cleanupTimers();
    if (abortedByUser || isAbortError(err) || controller.signal.aborted) {
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
