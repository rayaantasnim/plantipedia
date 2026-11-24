/**
 * Browser-Native Tailwind Play CDN Layer Loader
 * Fetches the 6 modular /css/tailwind/tw-*.css files concurrently and injects them
 * as <style type="text/tailwindcss"> blocks so @layer components / @apply rules
 * compile natively in the browser on GitHub Pages without Node.js or PostCSS.
 */
(() => {
  const LAYER_FILES = [
    "./css/tailwind/tw-navbar.css",
    "./css/tailwind/tw-footer.css",
    "./css/tailwind/tw-hero-sections.css",
    "./css/tailwind/tw-grids-cards.css",
    "./css/tailwind/tw-pagination-controls.css",
    "./css/tailwind/tw-monograph-modals.css",
  ];

  const rootUrl = new URL("../../", document.currentScript?.src || window.location.href);

  Promise.all(
    LAYER_FILES.map(async (relPath) => {
      const url = new URL(relPath.replace(/^\.\//, ""), rootUrl).href;
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return "";
      return res.text();
    }),
  )
    .then((chunks) => {
      const combined = chunks.filter(Boolean).join("\n\n");
      if (!combined) return;
      const styleEl = document.createElement("style");
      styleEl.type = "text/tailwindcss";
      styleEl.setAttribute("data-plantipedia-tw", "components");
      styleEl.textContent = combined;
      document.head.appendChild(styleEl);
    })
    .catch(() => {
      // Non-blocking: baseline /css/*.css cascade guarantees full visual fidelity offline
    });
})();
