import { extractPlantTelemetryStats } from "../../core/telemetry/telemetry-stats.js";

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
  "Verifying academic citation metadata..."
]);

const RETRY_SCHEDULE_MS = [0, 1500, 3000, 4200];
const TELEMETRY_DURATION_MS = 5000;
const CACHE_STORAGE_PREFIX = "plantipedia_global_monograph_v31::";
const memoryCache = new Map();

const BOTANICAL_KEYWORDS_EN = [
  "plant", "species", "tree", "flower", "flowering", "herb", "herbaceous",
  "shrub", "fern", "moss", "palm", "genus", "family", "flora", "botanical",
  "botany", "cultivar", "plantae", "angiosperm", "angiosperms", "gymnosperm",
  "magnoliophyta", "tracheophytes", "eudicots", "monocots", "rosids", "asterids",
  "taxobox", "speciesbox", "binomial", "perennial", "deciduous", "evergreen",
  "rhizome", "inflorescence", "foliage", "seed", "fruit", "legume", "citrus",
  "vine", "climber", "aquatic plant", "medicinal plant", "succulent", "grass",
  "bamboo", "orchid", "caryophyllales", "fabaceae", "asteraceae", "poaceae",
  "malvaceae", "rubiaceae", "apocynaceae", "arecaceae", "lamiaceae", "solanaceae",
  "carnivorous plant", "droseraceae", "welwitschiaceae"
];

const BOTANICAL_KEYWORDS_BN = [
  "উদ্ভিদ", "গাছ", "বৃক্ষ", "ফুল", "ভেষজ", "প্রজাতি", "গোত্র", "গণ",
  "গুল্ম", "লতা", "পাতা", "ফল", "বর্গ", "শ্রেণি", "উদ্ভিদবিজ্ঞান", "সপুষ্পক",
  "বীরুৎ", "কন্দ", "অঙ্কুর", "পরাগ", "বীজ", "বংশ", "জাত"
];

const DISAMBIGUATION_MARKERS = [
  "may refer to:",
  "can refer to:",
  "most commonly refers to:",
  "disambiguation",
  "দ্ব্যর্থতা নিরসন",
  "নির্দেশ করতে পারে:"
];

const NON_BOTANICAL_STRONG_SIGNALS = [
  "operating system", "software", "video game", "film", "album", "song",
  "television series", "football club", "basketball", "cricket", "athlete",
  "politician", "actor", "actress", "musician", "laptop", "computer",
  "smartphone", "programming language", "fictional character", "city in",
  "municipality", "county in", "chemical element", "constellation",
  "planet in", "mythology", "company", "corporation", "airline", "airport"
];

const FAMILY_TO_ORDER_MAP = Object.freeze({
  Acanthaceae: "Lamiales",
  Actinidiaceae: "Ericales",
  Adoxaceae: "Dipsacales",
  Agavaceae: "Asparagales",
  Aizoaceae: "Caryophyllales",
  Alismataceae: "Alismatales",
  Alliaceae: "Asparagales",
  Amaranthaceae: "Caryophyllales",
  Amaryllidaceae: "Asparagales",
  Anacardiaceae: "Sapindales",
  Annonaceae: "Magnoliales",
  Apiaceae: "Apiales",
  Apocynaceae: "Gentianales",
  Aquifoliaceae: "Aquifoliales",
  Araceae: "Alismatales",
  Araliaceae: "Apiales",
  Araucariaceae: "Araucariales",
  Arecaceae: "Arecales",
  Asparagaceae: "Asparagales",
  Asphodelaceae: "Asparagales",
  Asteraceae: "Asterales",
  Balsaminaceae: "Ericales",
  Basellaceae: "Caryophyllales",
  Begoniaceae: "Cucurbitales",
  Berberidaceae: "Ranunculales",
  Betulaceae: "Fagales",
  Bignoniaceae: "Lamiales",
  Bixaceae: "Malvales",
  Boraginaceae: "Boraginales",
  Brassicaceae: "Brassicales",
  Bromeliaceae: "Poales",
  Burseraceae: "Sapindales",
  Byblidaceae: "Lamiales",
  Cactaceae: "Caryophyllales",
  Cannabaceae: "Rosales",
  Capparaceae: "Brassicales",
  Caprifoliaceae: "Dipsacales",
  Caricaceae: "Brassicales",
  Caryophyllaceae: "Caryophyllales",
  Casuarinaceae: "Fagales",
  Celastraceae: "Celastrales",
  Cephalotaceae: "Oxalidales",
  Clusiaceae: "Malpighiales",
  Combretaceae: "Myrtales",
  Commelinaceae: "Commelinales",
  Convolvulaceae: "Solanales",
  Cornaceae: "Cornales",
  Crassulaceae: "Saxifragales",
  Cucurbitaceae: "Cucurbitales",
  Cupressaceae: "Pinales",
  Cycadaceae: "Cycadales",
  Cyperaceae: "Poales",
  Dilleniaceae: "Dilleniales",
  Dioscoreaceae: "Dioscoreales",
  Dipterocarpaceae: "Malvales",
  Droseraceae: "Caryophyllales",
  Drosophyllaceae: "Caryophyllales",
  Ebenaceae: "Ericales",
  Elaeocarpaceae: "Oxalidales",
  Ephedraceae: "Ephedrales",
  Ericaceae: "Ericales",
  Euphorbiaceae: "Malpighiales",
  Fabaceae: "Fabales",
  Fagaceae: "Fagales",
  Gentianaceae: "Gentianales",
  Geraniaceae: "Geraniales",
  Ginkgoaceae: "Ginkgoales",
  Gnetaceae: "Gnetales",
  Heliconiaceae: "Zingiberales",
  Hydrangeaceae: "Cornales",
  Hypericaceae: "Malpighiales",
  Iridaceae: "Asparagales",
  Juglandaceae: "Fagales",
  Lamiaceae: "Lamiales",
  Lauraceae: "Laurales",
  Lecythidaceae: "Ericales",
  Lentibulariaceae: "Lamiales",
  Liliaceae: "Liliales",
  Linaceae: "Malpighiales",
  Lythraceae: "Myrtales",
  Magnoliaceae: "Magnoliales",
  Malpighiaceae: "Malpighiales",
  Malvaceae: "Malvales",
  Melastomataceae: "Myrtales",
  Meliaceae: "Sapindales",
  Menispermaceae: "Ranunculales",
  Moraceae: "Rosales",
  Moringaceae: "Brassicales",
  Musaceae: "Zingiberales",
  Myricaceae: "Fagales",
  Myristicaceae: "Magnoliales",
  Myrtaceae: "Myrtales",
  Nelumbonaceae: "Proteales",
  Nepenthaceae: "Caryophyllales",
  Nyctaginaceae: "Caryophyllales",
  Nymphaeaceae: "Nymphaeales",
  Oleaceae: "Lamiales",
  Onagraceae: "Myrtales",
  Orchidaceae: "Asparagales",
  Orobanchaceae: "Lamiales",
  Oxalidaceae: "Oxalidales",
  Paeoniaceae: "Saxifragales",
  Pandanaceae: "Pandanales",
  Papaveraceae: "Ranunculales",
  Passifloraceae: "Malpighiales",
  Pedaliaceae: "Lamiales",
  Phyllanthaceae: "Malpighiales",
  Pinaceae: "Pinales",
  Piperaceae: "Piperales",
  Plantaginaceae: "Lamiales",
  Plumbaginaceae: "Caryophyllales",
  Poaceae: "Poales",
  Polygonaceae: "Caryophyllales",
  Polypodiaceae: "Polypodiales",
  Pontederiaceae: "Commelinales",
  Portulacaceae: "Caryophyllales",
  Primulaceae: "Ericales",
  Proteaceae: "Proteales",
  Pteridaceae: "Polypodiales",
  Ranunculaceae: "Ranunculales",
  Rhamnaceae: "Rosales",
  Rhizophoraceae: "Malpighiales",
  Rosaceae: "Rosales",
  Rubiaceae: "Gentianales",
  Rutaceae: "Sapindales",
  Salicaceae: "Malpighiales",
  Santalaceae: "Santalales",
  Sapindaceae: "Sapindales",
  Sapotaceae: "Ericales",
  Sarraceniaceae: "Ericales",
  Saxifragaceae: "Saxifragales",
  Scrophulariaceae: "Lamiales",
  Solanaceae: "Solanales",
  Strelitziaceae: "Zingiberales",
  Taxaceae: "Pinales",
  Theaceae: "Ericales",
  Thymelaeaceae: "Malvales",
  Typhaceae: "Poales",
  Ulmaceae: "Rosales",
  Urticaceae: "Rosales",
  Verbenaceae: "Lamiales",
  Violaceae: "Malpighiales",
  Vitaceae: "Vitales",
  Welwitschiaceae: "Welwitschiales",
  Zamiaceae: "Cycadales",
  Zingiberaceae: "Zingiberales",
  Zygophyllaceae: "Zygophyllales"
});

const NON_BOTANICAL_IMAGE_RE =
  /(?:^|[\s/_-])(map|range|distribut|location|locator|blank|flag|coat[_ -]?of[_ -]?arms|crest|logo|icon|symbol|cladogram|phylogen|diagram|structur|formula|molecul|chemical|skeletal|synthesis|portrait|headshot|signature|stamp|coin|chart|graph|timeline|scale[_ -]?bar|commons-logo|wiki|edit-clear|question[_ -]?book|ambox|padlock)(?:$|[\s/_.0-9-])/i;

const SUPER_DIGITS = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", "n": "ⁿ"
};

const SUB_DIGITS = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎"
};

function toSuperscriptChars(str) {
  return String(str || "")
    .split("")
    .map((ch) => SUPER_DIGITS[ch] ?? ch)
    .join("");
}

function toSubscriptChars(str) {
  return String(str || "")
    .split("")
    .map((ch) => SUB_DIGITS[ch] ?? ch)
    .join("");
}

export function cleanScientificNotation(input) {
  if (!input || typeof input !== "string") return "";
  return input
    // Broken proton/ion artifacts from MediaWiki text extraction (e.g., "1H+", "Ca2+", "NH4+")
    .replace(/(?:^|(?<=[\s(/]))1H\+/g, "H⁺")
    .replace(/\bH\+(?=\s|$|[),.;:])/g, "H⁺")
    .replace(/\bK\+(?=\s|$|[),.;:])/g, "K⁺")
    .replace(/\bNa\+(?=\s|$|[),.;:])/g, "Na⁺")
    .replace(/\bCl-(?=\s|$|[),.;:])/g, "Cl⁻")
    .replace(/\bOH-(?=\s|$|[),.;:])/g, "OH⁻")
    .replace(/\bCa2\+(?=\s|$|[),.;:])/g, "Ca²⁺")
    .replace(/\bMg2\+(?=\s|$|[),.;:])/g, "Mg²⁺")
    .replace(/\bFe2\+(?=\s|$|[),.;:])/g, "Fe²⁺")
    .replace(/\bFe3\+(?=\s|$|[),.;:])/g, "Fe³⁺")
    .replace(/\bNH4\+/g, "NH₄⁺")
    .replace(/\bNO3-/g, "NO₃⁻")
    .replace(/\bNO2-/g, "NO₂⁻")
    .replace(/\bSO42-/g, "SO₄²⁻")
    .replace(/\bPO43-/g, "PO₄³⁻")
    .replace(/\bCO32-/g, "CO₃²⁻")
    .replace(/\bHCO3-/g, "HCO₃⁻")
    .replace(/\bCO2\b/g, "CO₂")
    .replace(/\bH2O2\b/g, "H₂O₂")
    .replace(/\bH2O\b/g, "H₂O")
    .replace(/\bO2\b/g, "O₂")
    .replace(/\bN2O\b/g, "N₂O")
    .replace(/\bN2\b/g, "N₂")
    .replace(/\bH2\b/g, "H₂")
    .replace(/\bCH4\b/g, "CH₄")
    .replace(/\bSO2\b/g, "SO₂")
    .replace(/\bC3\b/g, "C₃")
    .replace(/\bC4\b/g, "C₄")
    // Convert plain HTML-less exponent notations like 10^-6 or m2/m3
    .replace(/([a-zA-Z])\^(\d+)/g, (_, b, exp) => `${b}${toSuperscriptChars(exp)}`)
    // Strip MediaWiki bracket citations like [1], [12], [note 2], [citation needed]
    .replace(/\[(?:\d+|citation needed|note\s*\d+|clarification needed)\]/gi, "");
}

export function sanitizeBotanicalText(input) {
  if (!input || typeof input !== "string") return "";
  return cleanScientificNotation(input)
    .replace(/https?:\/\/[a-z0-9.-]*wik(?:ipedia|imedia)\.org[^\s)]*/gi, "https://flora-index.global/")
    .replace(/\bwik(?:ipedia|imedia)\b/gi, "Global Flora Index")
    .replace(/\bwikidata\b/gi, "Global Taxon Registry")
    .replace(/\bwikicommons\b/gi, "Global Herbarium Archive")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGlobalQuery(query) {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cacheKeyFor(query) {
  return `${CACHE_STORAGE_PREFIX}${normalizeGlobalQuery(query).toLowerCase()}`;
}

export function getCachedGlobalMonograph(query) {
  const normalized = normalizeGlobalQuery(query);
  if (!normalized) return null;
  const key = cacheKeyFor(normalized);
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.commonName) {
          memoryCache.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
  return null;
}

export function setCachedGlobalMonograph(query, monograph) {
  if (!monograph || !query) return;
  const normalized = normalizeGlobalQuery(query);
  const key = cacheKeyFor(normalized);
  memoryCache.set(key, monograph);
  if (monograph.query && normalizeGlobalQuery(monograph.query).toLowerCase() !== normalized.toLowerCase()) {
    memoryCache.set(cacheKeyFor(monograph.query), monograph);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, JSON.stringify(monograph));
    }
  } catch {
    // Ignore storage errors
  }
}

function hasBengaliScript(text) {
  return /[\u0980-\u09FF]/.test(String(text || ""));
}

function isAbortError(err) {
  return Boolean(err && (err.name === "AbortError" || err.code === 20));
}

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchJsonWithSignal(url, signal, timeoutMs = 4500) {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onParentAbort, { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.isNetworkError = response.status >= 500 || response.status === 429 || response.status === 408;
      throw err;
    }
    return await response.json();
  } catch (err) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (err.name === "AbortError") {
      const netErr = new Error("Global Botanical Server request timed out.");
      netErr.isNetworkError = true;
      throw netErr;
    }
    if (err instanceof TypeError || err.isNetworkError) {
      err.isNetworkError = true;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}

function buildApiUrl(lang, params) {
  const host = lang === "bn" ? "https://bn.wikipedia.org/w/api.php" : "https://en.wikipedia.org/w/api.php";
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params
  });
  return `${host}?${searchParams.toString()}`;
}

function buildCommonsUrl(params) {
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params
  });
  return `https://commons.wikimedia.org/w/api.php?${searchParams.toString()}`;
}

function stripWikitextMarkup(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<sup>\s*([^<]{1,12})\s*<\/sup>/gi, (_, inner) => toSuperscriptChars(inner))
    .replace(/<sub>\s*([^<]{1,12})\s*<\/sub>/gi, (_, inner) => toSubscriptChars(inner))
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{lang\|[^|}]+\|([^}]+)\}\}/gi, "$1")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,5}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTaxoboxFields(wikitext) {
  const fields = {};
  if (!wikitext) return fields;
  const infoboxMatch = wikitext.match(/\{\{(?:Taxobox|Speciesbox|Automatic taxobox|Subspeciesbox|Infraspeciesbox|Plantbox|Infobox plant|তথ্যছক উদ্ভিদ)[\s\S]*?\n\}\}/i);
  const sourceBlock = infoboxMatch ? infoboxMatch[0] : wikitext.slice(0, 4500);
  const lineRegex = /^\s*\|\s*([a-zA-Z0-9_ \u0980-\u09FF]+?)\s*=\s*(.+)$/gm;
  let match;
  while ((match = lineRegex.exec(sourceBlock)) !== null) {
    const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
    const val = sanitizeBotanicalText(stripWikitextMarkup(match[2]));
    if (val && !fields[key]) {
      fields[key] = val;
    }
  }
  fields.hasPlantTaxobox = /\{\{\s*(?:Taxobox|Speciesbox|Automatic taxobox|Subspeciesbox|Infraspeciesbox|Plantbox|Infobox plant|তথ্যছক উদ্ভিদ)\b/i.test(sourceBlock);
  return fields;
}

function isIgnoredHeading(heading) {
  return /^(see also|references|external links|further reading|notes|bibliography|sources|gallery|citations|works cited|footnotes|আরও দেখুন|তথ্যসূত্র|বহিঃসংযোগ|গ্যালারি)$/i.test(
    String(heading || "").trim(),
  );
}

function extractNodeCleanText(node) {
  if (!node) return "";
  const clone = node.cloneNode(true);
  clone.querySelectorAll("sup.reference, .mw-editsection, style, script, .noprint").forEach((bad) => bad.remove());
  clone.querySelectorAll("sup").forEach((sup) => {
    const txt = (sup.textContent || "").trim();
    if (!txt || /^\[/.test(txt)) {
      sup.remove();
    } else {
      sup.replaceWith(document.createTextNode(toSuperscriptChars(txt)));
    }
  });
  clone.querySelectorAll("sub").forEach((sub) => {
    const txt = (sub.textContent || "").trim();
    if (txt) {
      sub.replaceWith(document.createTextNode(toSubscriptChars(txt)));
    }
  });
  return sanitizeBotanicalText(clone.textContent || "");
}

function parseInfoboxFromDom(root) {
  const data = { clades: [] };
  if (!root) return data;
  const infobox = root.querySelector(".infobox.biota, table.infobox");
  if (!infobox) return data;
  data.hasPlantTaxobox = infobox.classList.contains("biota");

  infobox.querySelectorAll("tr").forEach((tr) => {
    const cells = tr.querySelectorAll("th, td");
    if (cells.length >= 2) {
      const label = sanitizeBotanicalText(cells[0].textContent || "").replace(/:$/, "").toLowerCase();
      const val = extractNodeCleanText(cells[1]);
      if (!label || !val) return;
      if (label.includes("kingdom") || label.includes("রাজ্য")) data.kingdom = val;
      else if (label.includes("clade")) data.clades.push(val);
      else if (label.includes("division") || label.includes("phylum") || label.includes("বিভাগ")) data.division = val;
      else if (label.includes("class") || label.includes("শ্রেণি")) data.classis = val;
      else if (label.includes("order") || label.includes("বর্গ")) data.order = val;
      else if (label.includes("family") || label.includes("গোত্র")) data.family = val;
      else if (label.includes("genus") || label.includes("গণ")) data.genus = val;
      else if (label.includes("species") || label.includes("প্রজাতি")) data.species = val;
      else if (label.includes("binomial") || label.includes("scientific")) data.binomial = val;
      else if (label.includes("native") || label.includes("distribution") || label.includes("range")) data.nativeRange = val;
      else if (label.includes("conservation")) data.conservationStatus = val;
    } else if (cells.length === 1) {
      const binomialNode = tr.querySelector(".binomial, i b, b i");
      if (binomialNode && !data.binomial) {
        data.binomial = extractNodeCleanText(binomialNode);
      }
    }
  });
  return data;
}

function parseSectionsFromHtml(htmlString) {
  if (!htmlString || typeof DOMParser === "undefined") {
    return { infobox: { clades: [] }, leadParagraphs: [], parsedSections: [] };
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const root = doc.querySelector(".mw-parser-output") || doc.body;
  if (!root) {
    return { infobox: { clades: [] }, leadParagraphs: [], parsedSections: [] };
  }

  const infobox = parseInfoboxFromDom(root);

  // Strip noise blocks so sections & lead only contain genuine botanical prose
  root.querySelectorAll(
    ".infobox, .navbox, .vertical-navbox, .sistersitebox, .hatnote, .shortdescription, .mw-empty-elt, .toc, #toc, .thumb, figure, .gallery, .reflist, .references, .mw-references-wrap, style, script, .ambox, .metadata",
  ).forEach((n) => n.remove());

  const leadParagraphs = [];
  const parsedSections = [];
  let currentSec = null;
  let currentSubHeading = "";

  const pushParagraph = (targetArr, text) => {
    const clean = sanitizeBotanicalText(text);
    if (clean && clean.length >= 28) {
      targetArr.push(clean);
    }
  };

  const walkBlocks = (container) => {
    Array.from(container.children).forEach((node) => {
      const tag = node.tagName ? node.tagName.toLowerCase() : "";
      if (tag === "div" && (node.classList.contains("mw-heading") || node.classList.contains("mw-heading2") || node.classList.contains("mw-heading3") || node.classList.contains("mw-heading4"))) {
        const innerHeading = node.querySelector("h2, h3, h4");
        if (innerHeading) {
          handleHeading(innerHeading);
          return;
        }
      }
      if (tag === "h2" || tag === "h3" || tag === "h4") {
        handleHeading(node);
        return;
      }
      if (tag === "p") {
        const txt = extractNodeCleanText(node);
        if (currentSec) {
          if (!currentSec.ignored) {
            pushParagraph(currentSec.paragraphs, txt);
            if (currentSubHeading && txt.length >= 28 && currentSec.subtopics.length < 3) {
              currentSec.subtopics.push({ heading: currentSubHeading, text: txt });
              currentSubHeading = "";
            }
          }
        } else {
          pushParagraph(leadParagraphs, txt);
        }
        return;
      }
      if (tag === "ul" || tag === "ol") {
        const listSentences = Array.from(node.querySelectorAll(":scope > li"))
          .map((li) => extractNodeCleanText(li))
          .filter((t) => t.length >= 16 && t.length <= 360)
          .slice(0, 6);
        if (listSentences.length >= 2 && currentSec && !currentSec.ignored) {
          const joined = listSentences.map((s) => (/[.!?।]$/.test(s) ? s : `${s}.`)).join(" ");
          pushParagraph(currentSec.paragraphs, joined);
        }
        return;
      }
      if (tag === "section" || tag === "div") {
        walkBlocks(node);
      }
    });
  };

  const handleHeading = (hEl) => {
    const tag = hEl.tagName.toLowerCase();
    const headingText = extractNodeCleanText(hEl);
    if (!headingText) return;
    if (isIgnoredHeading(headingText)) {
      currentSec = { heading: headingText, level: 2, paragraphs: [], subtopics: [], ignored: true };
      currentSubHeading = "";
      return;
    }
    if (tag === "h2") {
      currentSec = { heading: headingText, level: 2, paragraphs: [], subtopics: [], ignored: false };
      currentSubHeading = "";
      parsedSections.push(currentSec);
    } else if (tag === "h3") {
      if (currentSec && !currentSec.ignored && currentSec.paragraphs.length >= 1) {
        const h3Sec = {
          heading: headingText,
          parentHeading: currentSec.heading,
          level: 3,
          paragraphs: [],
          subtopics: [],
          ignored: false,
        };
        currentSec = h3Sec;
        currentSubHeading = "";
        parsedSections.push(h3Sec);
      } else if (!currentSec || !currentSec.ignored) {
        if (!currentSec) {
          currentSec = { heading: headingText, level: 3, paragraphs: [], subtopics: [], ignored: false };
          parsedSections.push(currentSec);
        } else {
          currentSubHeading = headingText;
        }
      }
    } else {
      currentSubHeading = headingText;
    }
  };

  walkBlocks(root);

  return {
    infobox,
    leadParagraphs,
    parsedSections: parsedSections.filter((s) => !s.ignored && s.paragraphs.length > 0),
  };
}

async function fetchParsedArticleData(title, lang, signal) {
  if (!title) return null;
  try {
    const parseUrl = buildApiUrl(lang, {
      action: "parse",
      page: title,
      prop: "text|sections",
      redirects: "1",
      disableeditsection: "1",
      disabletoc: "1"
    });
    const json = await fetchJsonWithSignal(parseUrl, signal, 4500);
    const parsedHtml = json?.parse?.text || "";
    if (!parsedHtml) return null;
    return parseSectionsFromHtml(parsedHtml);
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
    return null;
  }
}

function normalizeImageKey(url) {
  const str = String(url || "").trim();
  if (!str) return "";
  try {
    const u = new URL(str);
    // Normalize commons/wikipedia upload path so thumb sizes map to the same canonical asset
    const fileMatch = u.pathname.match(/\/([^/]+\.(?:jpe?g|png|webp))$/i);
    if (fileMatch) {
      return decodeURIComponent(fileMatch[1]).toLowerCase();
    }
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return str.toLowerCase();
  }
}

function isBotanicalPhotoCandidate(titleOrName, info) {
  if (!info || !info.url) return false;
  const url = String(info.url);
  if (!/^https?:\/\//i.test(url)) return false;

  const mime = String(info.mime || "").toLowerCase();
  if (mime && !/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) return false;
  if (/\.(?:svg|gif|pdf|tif|tiff|ogv|webm)(?:$|\?)/i.test(url)) return false;

  const w = Number(info.width) || 0;
  const h = Number(info.height) || 0;
  if ((w && w < 400) || (h && h < 300)) return false;
  if (w && h && (w / h > 3.2 || h / w > 3.2)) return false;

  const checkLabel = `${titleOrName || ""} ${url} ${info.extmetadata?.ObjectName?.value || ""}`;
  if (NON_BOTANICAL_IMAGE_RE.test(checkLabel)) return false;
  return true;
}

function cleanImageCaption(rawDesc, fallbackTitle, commonName, sciName) {
  const stripped = stripWikitextMarkup(String(rawDesc || ""));
  const sanitized = sanitizeBotanicalText(stripped)
    .replace(/^(English|বাংলা|Deutsch|Français|Español)\s*:\s*/i, "")
    .trim();
  if (sanitized && sanitized.length >= 16 && sanitized.length <= 165) {
    return sanitized;
  }
  const cleanFileTitle = sanitizeBotanicalText(
    String(fallbackTitle || "")
      .replace(/^File:/i, "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[_-]+/g, " "),
  );
  if (cleanFileTitle && cleanFileTitle.length >= 10 && cleanFileTitle.length <= 130 && !NON_BOTANICAL_IMAGE_RE.test(cleanFileTitle)) {
    return `${cleanFileTitle} — ${commonName || sciName}`;
  }
  return `${commonName || sciName} botanical specimen study`;
}

async function fetchMultiSpeciesImages({ title, lang, scientificName, commonName, heroPage, signal }) {
  const collected = [];
  const seenKeys = new Set();

  const tryPush = (rawUrl, alt, caption) => {
    const url = String(rawUrl || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (/\.(?:svg|gif|pdf|tif|tiff)(?:$|\?)/i.test(url)) return;
    if (NON_BOTANICAL_IMAGE_RE.test(url)) return;
    const key = normalizeImageKey(url);
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    collected.push({
      url,
      alt: sanitizeBotanicalText(alt || `${commonName} (${scientificName}) botanical photograph`),
      caption: sanitizeBotanicalText(caption || `${commonName} — Global Flora Index archival specimen`),
    });
  };

  const heroPrimary = heroPage?.original?.source || heroPage?.thumbnail?.source || "";
  if (heroPrimary) {
    tryPush(
      heroPrimary,
      `${commonName} (${scientificName}) botanical specimen plate`,
      `${commonName} (${scientificName}) — Primary specimen plate indexed via Global Botanical Server`,
    );
  }

  // Pass 1: Fetch article's embedded images with full metadata & MIME/resolution filtering
  if (title) {
    try {
      const pageImgsUrl = buildApiUrl(lang, {
        action: "query",
        titles: title,
        generator: "images",
        gimlimit: "50",
        prop: "imageinfo",
        iiprop: "url|mime|size|extmetadata",
        iiurlwidth: "1100",
      });
      const json = await fetchJsonWithSignal(pageImgsUrl, signal, 4000);
      const pages = json?.query?.pages || [];
      for (const imgPage of pages) {
        const info = imgPage?.imageinfo?.[0];
        if (!isBotanicalPhotoCandidate(imgPage.title, info)) continue;
        const preferredUrl = info.thumburl || info.url;
        const caption = cleanImageCaption(
          info.extmetadata?.ImageDescription?.value || info.extmetadata?.ObjectName?.value,
          imgPage.title,
          commonName,
          scientificName,
        );
        tryPush(preferredUrl, `${commonName} botanical photograph`, caption);
        if (collected.length >= 14) break;
      }
    } catch (err) {
      if (isAbortError(err) && signal?.aborted) throw err;
    }
  }

  // Pass 2: Supplement from Wikimedia Commons file search when fewer than 10 distinct photos
  if (collected.length < 10) {
    const searchQuery = scientificName && scientificName.includes(" ")
      ? `"${scientificName}"`
      : commonName || title;
    if (searchQuery) {
      try {
        const commonsUrl = buildCommonsUrl({
          action: "query",
          generator: "search",
          gsrnamespace: "6",
          gsrsearch: `${searchQuery} filetype:bitmap`,
          gsrlimit: "28",
          prop: "imageinfo",
          iiprop: "url|mime|size|extmetadata",
          iiurlwidth: "1100",
        });
        const commonsJson = await fetchJsonWithSignal(commonsUrl, signal, 4000);
        const pages = commonsJson?.query?.pages || [];
        for (const imgPage of pages) {
          const info = imgPage?.imageinfo?.[0];
          if (!isBotanicalPhotoCandidate(imgPage.title, info)) continue;
          const preferredUrl = info.thumburl || info.url;
          const caption = cleanImageCaption(
            info.extmetadata?.ImageDescription?.value || info.extmetadata?.ObjectName?.value,
            imgPage.title,
            commonName,
            scientificName,
          );
          tryPush(preferredUrl, `${commonName} (${scientificName}) botanical plate`, caption);
          if (collected.length >= 14) break;
        }
      } catch (err) {
        if (isAbortError(err) && signal?.aborted) throw err;
      }
    }
  }

  return collected;
}

function extractBinomial(taxobox, infobox, title, extract) {
  const candidates = [infobox?.binomial, taxobox.binomial, taxobox.taxon];
  for (const c of candidates) {
    const m = String(c || "").match(/\b([A-Z][a-z-]{2,}\s+[a-z-]{2,})\b/);
    if (m) return m[1];
  }
  const genusRaw = infobox?.genus || taxobox.genus || "";
  const speciesRaw = infobox?.species || taxobox.species || "";
  const genus = genusRaw.replace(/[^A-Za-z-]/g, " ").trim().split(/\s+/)[0] || "";
  const species = speciesRaw.replace(/^[A-Z]\.\s*/, "").replace(/[^a-z-]/g, " ").trim().split(/\s+/)[0] || "";
  if (genus && species && /^[A-Z][a-z-]+$/.test(genus) && /^[a-z-]+$/.test(species)) {
    return `${genus} ${species}`;
  }
  const parenMatch = String(extract || "").match(/\(([A-Z][a-z-]{2,}\s+[a-z-]{2,})\)/);
  if (parenMatch) return parenMatch[1];
  if (/^[A-Z][a-z-]{2,}\s+[a-z-]{2,}$/.test(title)) return title;
  return "";
}

function verifyBotanicalSubject(page, taxobox, infobox) {
  if (!page || page.missing) return false;
  const title = String(page.title || "").toLowerCase();
  const extract = String(page.extract || "");
  const extractLower = extract.toLowerCase();
  const categories = Array.isArray(page.categories)
    ? page.categories.map((c) => String(c.title || "").toLowerCase())
    : [];
  const joinedCats = categories.join(" | ");

  if (extract.trim().length < 40) return false;
  if (DISAMBIGUATION_MARKERS.some((m) => extractLower.slice(0, 260).includes(m)) || joinedCats.includes("disambiguation")) {
    return false;
  }

  const kingdom = String(infobox?.kingdom || taxobox.regnum || taxobox.kingdom || taxobox.রাজ্য || "").toLowerCase();
  if (kingdom.includes("plantae") || kingdom.includes("উদ্ভিদ")) {
    return true;
  }
  if (kingdom && (kingdom.includes("animalia") || kingdom.includes("fungi") || kingdom.includes("bacteria") || kingdom.includes("virus"))) {
    return false;
  }

  let score = 0;
  if (taxobox.hasPlantTaxobox || infobox?.hasPlantTaxobox) score += 3;
  if (infobox?.family || taxobox.familia || taxobox.family || taxobox.গোত্র) score += 2;
  if (infobox?.genus || taxobox.genus || taxobox.species || taxobox.binomial) score += 2;

  const introSlice = extractLower.slice(0, 750);
  for (const kw of BOTANICAL_KEYWORDS_EN) {
    if (joinedCats.includes(kw)) score += 2;
    if (introSlice.includes(kw)) score += 1;
  }
  for (const kwBn of BOTANICAL_KEYWORDS_BN) {
    if (joinedCats.includes(kwBn) || extract.slice(0, 750).includes(kwBn)) {
      score += 2;
    }
  }

  for (const neg of NON_BOTANICAL_STRONG_SIGNALS) {
    if (introSlice.includes(neg) || joinedCats.includes(neg)) {
      score -= 3;
    }
  }
  if (title.includes("(disambiguation)")) return false;

  return score >= 3;
}

function normalizeDedupKey(text) {
  return sanitizeBotanicalText(String(text || ""))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function splitIntoCleanParagraphs(rawText) {
  return String(rawText || "")
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((chunk) => sanitizeBotanicalText(chunk))
    .filter((chunk) => chunk.length > 24);
}

function splitIntoSentences(text) {
  const cleaned = sanitizeBotanicalText(text);
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

function splitSectionsFromExtract(extract) {
  const rawParagraphs = String(extract || "")
    .replace(/\r\n/g, "\n")
    .split(/\n==+\s*([^=\n]+?)\s*==+\n/)
    .map((chunk) => chunk.trim());

  const leadRaw = rawParagraphs[0] || String(extract || "");
  const leadParagraphs = splitIntoCleanParagraphs(leadRaw);

  const namedSections = [];
  for (let i = 1; i < rawParagraphs.length; i += 2) {
    const heading = sanitizeBotanicalText(rawParagraphs[i] || "");
    const rawBody = rawParagraphs[i + 1] || "";
    const paragraphs = splitIntoCleanParagraphs(rawBody);
    const body = paragraphs.join(" ") || sanitizeBotanicalText(rawBody);
    if (!heading || !body || isIgnoredHeading(heading)) continue;
    namedSections.push({ heading, body, paragraphs: paragraphs.length ? paragraphs : [body], subtopics: [] });
  }

  return { leadParagraphs, namedSections };
}

function extractSentences(text, maxSentences = 3) {
  return splitIntoSentences(text).slice(0, maxSentences).join(" ");
}

function extractBotanicalFamily(taxobox, infobox, lead, extract, wikitext, categoriesText) {
  const rawInfoboxFamily = sanitizeBotanicalText(infobox?.family || taxobox.familia || taxobox.family || taxobox.গোত্র || "");
  const infoboxAceae = rawInfoboxFamily.match(/\b([A-Z][a-z]+aceae)\b/);
  if (infoboxAceae) return infoboxAceae[1];
  if (rawInfoboxFamily && hasBengaliScript(rawInfoboxFamily)) return rawInfoboxFamily;

  const sources = [lead, extract, wikitext, categoriesText].filter(Boolean);
  for (const src of sources) {
    const explicitMatch = String(src).match(/\bfamily\s+(?:of\s+)?([A-Z][a-z]+aceae)\b|\b([A-Z][a-z]+aceae)\s+family\b/);
    if (explicitMatch) return explicitMatch[1] || explicitMatch[2];
  }
  for (const src of sources) {
    const genericMatch = String(src).match(/\b([A-Z][a-z]+aceae)\b/);
    if (genericMatch) return genericMatch[1];
  }
  return "";
}

function extractBotanicalOrder(taxobox, infobox, familyName, lead, extract, wikitext, categoriesText) {
  const rawOrder = sanitizeBotanicalText(infobox?.order || taxobox.ordo || taxobox.order || taxobox.বর্গ || "");
  const infoboxAles = rawOrder.match(/\b([A-Z][a-z]+ales)\b/);
  if (infoboxAles) return infoboxAles[1];
  if (rawOrder && hasBengaliScript(rawOrder)) return rawOrder;

  if (familyName && FAMILY_TO_ORDER_MAP[familyName]) {
    return FAMILY_TO_ORDER_MAP[familyName];
  }

  const sources = [lead, wikitext, extract, categoriesText].filter(Boolean);
  for (const src of sources) {
    const explicitMatch = String(src).match(/\border\s+(?:of\s+)?([A-Z][a-z]+ales)\b|\b([A-Z][a-z]+ales)\s+order\b/);
    if (explicitMatch) return explicitMatch[1] || explicitMatch[2];
  }
  for (const src of sources) {
    const genericMatch = String(src).match(/\b([A-Z][a-z]+ales)\b/);
    if (genericMatch) return genericMatch[1];
  }
  return "";
}

function inferPlantGroupAndClade(taxobox, infobox, leadLower, categoriesLower, extractLower) {
  const taxoboxCladeText = [
    ...(infobox?.clades || []),
    infobox?.division,
    infobox?.classis,
    infobox?.order,
    taxobox.cladus,
    taxobox.divisio,
    taxobox.phylum,
    taxobox.classis,
    taxobox.ordo,
    taxobox.order,
    taxobox.subregnum,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const primaryBlob = `${taxoboxCladeText} ${categoriesLower} ${leadLower}`;

  if (/\b(bryophyta|bryophyte|bryophytes|marchantiophyta|anthocerotophyta|liverwort|hornwort|moss|mosses)\b|মস/.test(primaryBlob)) {
    return { plantGroup: "Bryophyte", cladeLabel: "Bryophyta" };
  }

  if (
    /\b(pteridophyte|pteridophytes|pteridophyta|polypodiophyta|polypodiopsida|lycopodiophyta|fern|ferns)\b|ফার্ন/.test(primaryBlob) &&
    !/\bfern-like\b/.test(leadLower)
  ) {
    return { plantGroup: "Fern / Pteridophyte", cladeLabel: "Pteridophyta" };
  }

  if (
    /\b(gymnosperm|gymnosperms|gymnospermae|gnetophyta|ginkgophyta|cycadophyta|pinophyta|coniferophyta|conifer|conifers|welwitschiales|ginkgoales|cycadales|pinales|ephedrales|gnetales)\b/.test(
      `${primaryBlob} ${extractLower.slice(0, 1500)}`,
    )
  ) {
    return { plantGroup: "Gymnosperm", cladeLabel: "Gymnospermae" };
  }

  return { plantGroup: "Angiosperm (Flowering Plant)", cladeLabel: "Angiospermae" };
}

function inferGrowthForm(leadLower, categoriesLower, extractLower, plantGroup) {
  const primaryText = `${leadLower.slice(0, 850)} ${categoriesLower}`;
  const fullWindow = `${primaryText} ${extractLower.slice(0, 2200)}`;

  const detectHabit = (blob) => {
    if (/\b(carnivorous plant|carnivorous|insectivorous|snap trap|pitcher plant)\b/.test(blob)) {
      return /\b(herb|perennial|rosette|subshrub)\b/.test(blob)
        ? "Carnivorous Perennial Herb"
        : "Carnivorous Botanical Taxon";
    }
    if (/\b(aquatic|hydrophyte|water plant|submerged|floating)\b|জলজ/.test(blob)) {
      return "Hydrophytic Aquatic Macrophyte";
    }
    if (plantGroup === "Gymnosperm" && /\b(desert|namib|arid|xerophyte)\b/.test(blob)) {
      return "Desert Gymnosperm";
    }
    if (/\b(palm|palms)\b|তাল/.test(blob)) {
      return /\bmonocarpic\b/.test(blob) ? "Monocarpic Arborescent Palm" : "Arborescent Palm";
    }
    if (/\b(epiphyte|epiphytic)\b/.test(blob)) {
      return "Epiphytic Perennial";
    }
    if (/\b(succulent|cactus|cacti|xerophyte|caudex|caudiciform)\b/.test(blob)) {
      return "Perennial Succulent / Xerophyte";
    }
    if (/\b(vine|climber|climbing|liana|twining)\b|লতা/.test(blob)) {
      return "Twining Vine / Climber";
    }
    if (/\b(shrub|shrubs|subshrub|bush)\b|গুল্ম/.test(blob)) {
      return "Woody Shrub / Subshrub";
    }
    if (/\b(tree|trees|arborescent)\b|বৃক্ষ/.test(blob)) {
      return "Perennial Woody Tree";
    }
    if (/\b(herb|herbs|herbaceous|forb|rosette|perennial|annual)\b|ভেষজ|বীরুৎ/.test(blob)) {
      return /\bannual\b/.test(blob) && !/\bperennial\b/.test(blob)
        ? "Annual Herbaceous Plant"
        : "Herbaceous Perennial";
    }
    return "";
  };

  const primaryHabit = detectHabit(primaryText) || detectHabit(fullWindow);
  if (primaryHabit) return primaryHabit;

  if (/\bmonotypic\b/.test(fullWindow)) {
    return plantGroup === "Gymnosperm"
      ? "Monotypic Desert & Conifer Gymnosperm"
      : "Monotypic Vascular Taxon";
  }
  if (plantGroup === "Bryophyte") return "Non-Vascular Bryophyte";
  if (plantGroup === "Fern / Pteridophyte") return "Vascular Fern";
  if (plantGroup === "Gymnosperm") return "Gymnosperm Taxon";
  return "Vascular Botanical Taxon";
}

function classifyEcologicalGuild({ leadLower, extractLower, categoriesLower, familyName, habitLower }) {
  const blob = `${leadLower} ${categoriesLower} ${habitLower} ${familyName} ${extractLower.slice(0, 2600)}`.toLowerCase();

  // Explicit pH from prose if present
  const phMatch = extractLower.match(/\bpH\s*(?:of\s*)?(?:between\s*)?(\d+(?:\.\d+)?)\s*(?:-|–|—|to|and)\s*(\d+(?:\.\d+)?)/i)
    || extractLower.match(/\bpH\s*(?:around|near|about|of)?\s*(\d+(?:\.\d+)?)/i);
  let parsedPhMin = null;
  let parsedPhMax = null;
  if (phMatch) {
    const first = parseFloat(phMatch[1]);
    const second = phMatch[2] ? parseFloat(phMatch[2]) : first + 0.6;
    if (first >= 3.2 && first <= 9.0 && second >= first && second <= 9.2) {
      parsedPhMin = Math.round(first * 10) / 10;
      parsedPhMax = Math.round(Math.max(first + 0.4, second) * 10) / 10;
    }
  }

  // 1. Carnivorous / Ombrotrophic Bog / Acidic Peatland
  if (/\b(carnivorous|droseraceae|nepenthaceae|sarraceniaceae|venus flytrap|sundew|pitcher plant|bog|pocosin|sphagnum|peat moss|acidic wet)\b/.test(blob)) {
    const phMin = parsedPhMin ?? 3.5;
    const phMax = parsedPhMax ?? 5.0;
    return {
      guildId: "carnivorous_bog",
      guildLabel: "Acidic Peatland & Ombrotrophic Bog",
      phMin,
      phMax,
      phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
      sunlightLevel: 3,
      sunlightLabel: "Full Sun (6+ hrs direct bog exposure)",
      irrigationLevel: 3,
      irrigationLabel: "High / Wet (Distilled or Rainwater Only)",
      soilDrainageLabel: "Nutrient-Poor Peat & Perlite / Sphagnum Mix",
      lifespanYears: 20,
      lifespanUnit: "+",
      tempMaxC: 30,
      defaultStatureCm: 25,
    };
  }

  // 2. Arid Desert / Xerophyte / Calcareous / Welwitschia
  if (/\b(namib|welwitschia|xerophyte|desert|arid|semi-arid|cactaceae|cactus|succulent|gypsum|calcareous|alkaline scrub)\b/.test(blob)) {
    const phMin = parsedPhMin ?? 6.5;
    const phMax = parsedPhMax ?? 8.0;
    return {
      guildId: "arid_xerophyte",
      guildLabel: "Arid Desert & Xerophytic Mineral Steppe",
      phMin,
      phMax,
      phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
      sunlightLevel: 3,
      sunlightLabel: "Intense Full Desert Sun (8+ hrs daily)",
      irrigationLevel: 1,
      irrigationLabel: "Very Low / Drought & Fog-Adapted",
      soilDrainageLabel: "Arid Sandy & Gravelly Mineral Substrate",
      lifespanYears: /welwitschia/.test(blob) ? 1000 : 80,
      lifespanUnit: "+",
      tempMaxC: 42,
      defaultStatureCm: 150,
    };
  }

  // 3. Aquatic & Wetland Macrophyte
  if (/\b(aquatic|hydrophyte|submerged|floating|wetland|nelumbo|nymphaea|water lily|lotus|marsh|mangrove|জলজ)\b/.test(blob)) {
    const phMin = parsedPhMin ?? 6.0;
    const phMax = parsedPhMax ?? 7.5;
    return {
      guildId: "aquatic_wetland",
      guildLabel: "Freshwater Aquatic & Wetland Basin",
      phMin,
      phMax,
      phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
      sunlightLevel: 3,
      sunlightLabel: "Full Sun (6+ hrs direct pond light)",
      irrigationLevel: 3,
      irrigationLabel: "Permanent Standing Water / Saturated",
      soilDrainageLabel: "Submerged Aquatic Silt & Clay Loam",
      lifespanYears: 40,
      lifespanUnit: "+",
      tempMaxC: 34,
      defaultStatureCm: 150,
    };
  }

  // 4. Epiphytic Cloud Forest / Understory Acidic Bark
  if (/\b(epiphyte|epiphytic|orchidaceae|bromeliaceae|cloud forest|understory|filtered shade|woodland shade)\b/.test(blob)) {
    const phMin = parsedPhMin ?? 5.2;
    const phMax = parsedPhMax ?? 6.2;
    return {
      guildId: "epiphyte_cloudforest",
      guildLabel: "Epiphytic Canopy & Filtered Understory",
      phMin,
      phMax,
      phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
      sunlightLevel: 2,
      sunlightLabel: "Partial / Filtered Dappled Shade (4–6 hrs)",
      irrigationLevel: 2,
      irrigationLabel: "Moderate Humidity & Mist Cycles",
      soilDrainageLabel: "Coarse Aerated Bark & Sphagnum Matrix",
      lifespanYears: 30,
      lifespanUnit: "+",
      tempMaxC: 28,
      defaultStatureCm: 65,
    };
  }

  // 5. Monocarpic & Arborescent Tropical Palms / Forest Canopy
  if (/\b(tree|palm|canopy|arecaceae|dipterocarpaceae|fagaceae|pinaceae|forest)\b/.test(habitLower + " " + leadLower)) {
    const phMin = parsedPhMin ?? 5.8;
    const phMax = parsedPhMax ?? 7.0;
    return {
      guildId: "arborescent_canopy",
      guildLabel: "Tropical & Temperate Canopy Woodland",
      phMin,
      phMax,
      phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
      sunlightLevel: 3,
      sunlightLabel: "Full Sun to Upper Canopy Exposure",
      irrigationLevel: 2,
      irrigationLabel: "Moderate Seasonal Moisture",
      soilDrainageLabel: "Deep Well-Drained Alluvial & Forest Loam",
      lifespanYears: 80,
      lifespanUnit: "+",
      tempMaxC: 35,
      defaultStatureCm: 1800,
    };
  }

  // 6. Default Mesic / Terrestrial Flora
  const phMin = parsedPhMin ?? 6.0;
  const phMax = parsedPhMax ?? 7.2;
  const isHerb = /\b(herb|annual|perennial|shrub)\b/.test(habitLower);
  return {
    guildId: "mesic_terrestrial",
    guildLabel: "Mesic Terrestrial & Temperate-Tropical Flora",
    phMin,
    phMax,
    phDefault: Math.round(((phMin + phMax) / 2) * 10) / 10,
    sunlightLevel: 3,
    sunlightLabel: "Full Sun to Bright Light (6+ hrs daily)",
    irrigationLevel: 2,
    irrigationLabel: "Moderate Well-Drained Moisture",
    soilDrainageLabel: "Well-Drained Organic Loam",
    lifespanYears: /\bannual\b/.test(blob) ? 1 : isHerb ? 15 : 40,
    lifespanUnit: /\bannual\b/.test(blob) ? "yr" : "+",
    tempMaxC: 32,
    defaultStatureCm: /\bshrub\b/.test(habitLower) ? 250 : isHerb ? 90 : 400,
  };
}

function extractGeographicOrigin(infobox, lead, habitatSections, categoriesText) {
  if (infobox?.nativeRange && infobox.nativeRange.length >= 4 && infobox.nativeRange.length <= 120) {
    return sanitizeBotanicalText(infobox.nativeRange);
  }

  const candidateCorpus = [
    lead,
    ...habitatSections.map((s) => s.body.slice(0, 600)),
  ].join(" ");

  const patterns = [
    /\bnative\s+to\s+(?:the\s+)?([^.;(]{4,95}?)(?=[.;(]|\s+where|\s+and\s+is|\s+in\s+wetlands)/i,
    /\bendemic\s+to\s+(?:the\s+)?([^.;(]{4,95}?)(?=[.;(]|\s+within|\s+where)/i,
    /\bindigenous\s+to\s+(?:the\s+)?([^.;(]{4,95}?)(?=[.;(])/i,
    /\bfound\s+(?:in|across|along)\s+(?:the\s+)?([A-Z][^.;(]{4,80}?)(?=[.;(])/
  ];

  for (const re of patterns) {
    const m = candidateCorpus.match(re);
    if (m && m[1]) {
      const cleaned = sanitizeBotanicalText(m[1])
        .replace(/^(coastal|wetlands|forests|deserts|bogs|regions)\s+of\s+/i, "")
        .replace(/\s+(?:where|which|that)\b[\s\S]*$/i, "")
        .trim();
      if (cleaned.length >= 4 && cleaned.length <= 95) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  const catRegions = [];
  const catMatches = String(categoriesText || "").matchAll(/Category:Flora of ([^|\]]+)/gi);
  for (const cm of catMatches) {
    const place = sanitizeBotanicalText(cm[1]).replace(/^the\s+/i, "").trim();
    if (place && !/conservation|articles|common/i.test(place) && !catRegions.includes(place)) {
      catRegions.push(place);
    }
    if (catRegions.length >= 3) break;
  }
  if (catRegions.length > 0) {
    return catRegions.join(", ");
  }

  return "Global Botanical Distribution";
}

function extractPlantDimensionsAndLifespan(corpusText, leadText, guild, habit) {
  const searchCorpus = `${leadText} ${corpusText.slice(0, 7000)}`;

  // 1. Mature Stature (cm vs m, carefully ignoring flower/seed/trap sub-part sizes when whole-plant metrics exist)
  const heightPatterns = [
    /(?:grows?\s+(?:up\s+)?to|reaches?|attains?|height\s+of|tall|stature\s+of|trunk[s]?\s+(?:up\s+to|of)|culms?\s+(?:up\s+to|of)|rosette\s+(?:diameter|width|span)?\s*(?:up\s+to|of)?)\s*(?:about|around|up to|nearly)?\s*(\d+(?:\.\d+)?)\s*(?:–|-|to)?\s*(\d+(?:\.\d+)?)?\s*(metres|meters|m|centimetres|centimeters|cm)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*(metres|meters|m|centimetres|centimeters|cm)\s+(?:tall|high|in\s+height|in\s+diameter)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(metres|meters|m|centimetres|centimeters|cm)\s+(?:tall|high)\b/gi,
  ];

  let bestStature = null;
  for (const re of heightPatterns) {
    let m;
    while ((m = re.exec(searchCorpus)) !== null) {
      const n1 = parseFloat(m[1]);
      const n2 = m[2] ? parseFloat(m[2]) : n1;
      const rawVal = Math.max(n1, n2);
      const rawUnit = (m[3] || "").toLowerCase();
      const isCm = rawUnit.startsWith("c");
      const meters = isCm ? rawVal / 100 : rawVal;
      if (meters <= 0.03 || meters > 120) continue;
      // Avoid tiny leaf/seed numbers when habit is palm/tree unless nothing better exists
      if (/palm|tree/i.test(habit) && meters < 1.2) continue;
      if (/carnivorous/i.test(habit) && meters > 2.5) continue;
      bestStature = {
        value: isCm && rawVal < 150 ? Math.round(rawVal) : Math.round((meters < 1 ? meters * 100 : meters) * 10) / 10,
        unit: isCm && rawVal < 150 ? "cm" : meters < 1 ? "cm" : "m",
      };
      break;
    }
    if (bestStature) break;
  }

  if (!bestStature) {
    const defCm = guild.defaultStatureCm || 120;
    bestStature = defCm < 120
      ? { value: defCm, unit: "cm" }
      : { value: Math.round((defCm / 100) * 10) / 10, unit: "m" };
  }

  const statureDecimals = Number.isInteger(bestStature.value) ? 0 : 1;

  // 2. Lifespan extraction
  let lifespanVal = guild.lifespanYears;
  let lifespanSuffix = guild.lifespanUnit || "+";
  let lifespanLabel = "LIFESPAN (YEARS)";
  const ageMatch = searchCorpus.match(/(?:live(?:s)?\s+(?:for\s+)?(?:over|up\s+to|more\s+than)?|age\s+of|lifespan\s+of|carbon[- ]dated\s+(?:at|to))\s*(\d{2,4}(?:,\d{3})?)\s*(?:to\s*\d{2,4}(?:,\d{3})?\s*)?(?:years|yrs)\b/i);
  if (ageMatch) {
    const parsedAge = parseInt(ageMatch[1].replace(/,/g, ""), 10);
    if (parsedAge >= 2 && parsedAge <= 5000) {
      lifespanVal = parsedAge;
      lifespanSuffix = parsedAge >= 50 ? "+" : "";
    }
  } else if (/\bannual\b/i.test(leadText) && !/\bperennial\b/i.test(leadText)) {
    lifespanVal = 1;
    lifespanSuffix = "yr";
    lifespanLabel = "LIFECYCLE SPAN";
  }

  // 3. Peak thermal / climate extraction
  let tempMax = guild.tempMaxC;
  const tempRange = searchCorpus.match(/(-?\d{1,2})\s*(?:–|-|to)\s*(\d{1,2})\s*°\s*C\b/);
  if (tempRange) {
    const high = parseInt(tempRange[2], 10);
    if (high >= 10 && high <= 55) tempMax = high;
  }

  const tempRangeLabel = tempRange
    ? `${tempRange[1]}–${tempRange[2]} °C`
    : guild.guildId === "carnivorous_bog"
      ? "5–30 °C"
      : guild.guildId === "arid_xerophyte"
        ? "10–42 °C"
        : "18–34 °C";

  return {
    stature: {
      value: bestStature.value,
      decimals: statureDecimals,
      suffix: bestStature.unit,
      label: bestStature.unit === "cm" ? "MATURE SPECIMEN SPAN" : "MATURE CANOPY HEIGHT",
      subtext: `${habit} (${bestStature.value}${bestStature.unit})`,
    },
    lifespan: {
      value: lifespanVal,
      decimals: 0,
      suffix: lifespanSuffix,
      label: lifespanLabel,
      subtext: `${guild.guildLabel}`,
    },
    climate: {
      value: tempMax,
      decimals: 0,
      suffix: "°C",
      label: "PEAK THERMAL TOLERANCE",
      subtext: guild.sunlightLabel,
    },
    tempRangeLabel,
  };
}

function inferCategoryFromData(taxobox, extractLower, categoriesLower) {
  const blob = `${categoriesLower} ${extractLower.slice(0, 900)} ${taxobox.familia || ""}`.toLowerCase();
  if (/aquatic|hydrophyte|nymphaea|nelumbo|water lily|lotus|marsh|mangrove|wetland|bog|carnivorous|জলজ/.test(blob)) {
    return "Aquatic & Wetland";
  }
  if (/medicinal|ayurveda|herb|spice|rhizome|aromatic|alkaloid|tea|ভেষজ|মসলা/.test(blob)) {
    return "Medicinal & Spice";
  }
  if (/fruit|orchard|citrus|mango|berry|drupe|edible|cultivar|nut|palm|ফল/.test(blob)) {
    return "Fruit & Orchard";
  }
  if (/flower|ornamental|blossom|rose|jasmine|petal|bougainvillea|floral|ফুল/.test(blob)) {
    return "Ornamental Flora";
  }
  if (/tree|timber|forest|canopy|deciduous|evergreen|woody|bark|বৃক্ষ/.test(blob)) {
    return "Timber & Canopy";
  }
  return "Global Flora";
}

function classifyDynamicSectionMeta(rawHeading, bodyLower) {
  const h = String(rawHeading || "").toLowerCase();
  const cleanTitle = sanitizeBotanicalText(rawHeading || "Botanical Monograph Section");

  if (/etymology|naming|nomenclature|common name|name\b/.test(h)) {
    return {
      icon: "🏷️",
      title: /etymology/i.test(cleanTitle) ? "Nomenclature & Etymology" : cleanTitle,
      subtitle: "Botanical Etymology & Vernacular History",
      summary: "Origin of scientific binomials, common names, and historical taxonomy.",
      isCultivation: false,
    };
  }
  if (/evolution|phylogen|fossil|origin of|ancestr/.test(h)) {
    return {
      icon: "🧬",
      title: cleanTitle.includes("Evolution") || cleanTitle.includes("Phylogeny") ? cleanTitle : "Evolutionary Lineage & Phylogeny",
      subtitle: "Paleobotany & Clade Divergence",
      summary: "Evolutionary ancestry, fossil calibration, and phylogenetic relationships.",
      isCultivation: false,
    };
  }
  if (/taxonom|classif|systematics|subspecies|varieties|clade|শ্রেণিবিন্যাস/.test(h)) {
    return {
      icon: "🔬",
      title: "Taxonomic Lineage & Systematics",
      subtitle: "Linnaean Hierarchy & Clade Relationships",
      summary: "Accepted binomial rank, family placement, and taxonomic revisions.",
      isCultivation: false,
    };
  }
  if (/trap|mechanism|biomechan|snap|digest|enzyme|carnivor/.test(h)) {
    return {
      icon: "⚡",
      title: /mechanism|trap/i.test(cleanTitle) ? cleanTitle : "Trapping Biomechanics & Physiology",
      subtitle: "Action Potentials, Snap Mechanics & Enzymatic Digestion",
      summary: "Specialized sensory hairs, rapid turgor movement, and prey assimilation.",
      isCultivation: false,
    };
  }
  if (/morpholog|description|anatomy|vegetative|leaf|leaves|flower|reproduc|pollination|seed|fruit|cone|growth|biology|গঠন|বিবরণ/.test(h)) {
    return {
      icon: "🌿",
      title: cleanTitle.length <= 34 ? cleanTitle : "Botanical Description & Morphology",
      subtitle: "Vegetative, Foliar & Reproductive Architecture",
      summary: "Structural anatomy of leaves, stems, reproductive structures, and dispersal.",
      isCultivation: false,
    };
  }
  if (/cultivat|horticult|propagat|growing|care|soil|husbandry|agronomy|চাষ/.test(h)) {
    return {
      icon: "🪴",
      title: "Cultivation & Ecological Husbandry",
      subtitle: "Substrate Chemistry, Hydration & Propagation",
      summary: "Soil reaction, solar exposure, propagation methods, and horticultural care.",
      isCultivation: true,
    };
  }
  if (/habitat|distribution|ecology|range|biogeograph|wild|native|fire ecology|আবাস|বিস্তৃতি/.test(h)) {
    return {
      icon: "🌍",
      title: /distribution|habitat|ecology/i.test(cleanTitle) ? cleanTitle : `Native Habitat & ${cleanTitle}`,
      subtitle: "Biogeographic Envelope & Ecosystem Role",
      summary: "Native range, edaphic preferences, and environmental adaptations.",
      isCultivation: false,
    };
  }
  if (/conserv|threat|endanger|status|poach|protect/.test(h)) {
    return {
      icon: "🛡️",
      title: "Conservation & Population Status",
      subtitle: "IUCN Risk Assessment & Habitat Stewardship",
      summary: "Wild population pressures, legal protection, and habitat preservation.",
      isCultivation: false,
    };
  }
  if (/phytochem|chemist|compound|alkaloid|medic|toxic|pharmacol/.test(h)) {
    return {
      icon: "⚗️",
      title: cleanTitle.length <= 36 ? cleanTitle : "Phytochemistry & Bioactive Profile",
      subtitle: "Secondary Metabolites & Biochemical Traits",
      summary: "Characteristic natural products, defensive compounds, and pharmacognosy.",
      isCultivation: false,
    };
  }
  if (/use|economic|culinary|food|timber|fiber|human|ব্যবহার/.test(h)) {
    return {
      icon: "🧺",
      title: cleanTitle.length <= 36 ? cleanTitle : "Ethnobotanical & Human Uses",
      subtitle: "Traditional, Culinary & Economic Applications",
      summary: "Documented human uses spanning nutrition, craft, and botanical industry.",
      isCultivation: false,
    };
  }
  if (/cultur|myth|symbol|history|art|literature|ইতিহাস|সাহিত্য/.test(h)) {
    return {
      icon: "📜",
      title: cleanTitle.length <= 36 ? cleanTitle : "Cultural Heritage & Botanical History",
      subtitle: "Folklore, Exploration & Historical Records",
      summary: "Role in botanical expeditions, regional symbolism, and archival records.",
      isCultivation: false,
    };
  }
  if (/pest|disease|pathogen/.test(h)) {
    return {
      icon: "🐛",
      title: "Pathogens, Pests & Plant Health",
      subtitle: "Biotic Stressors & Resilience",
      summary: "Susceptibility to herbivores, fungal infections, and ecological defenses.",
      isCultivation: false,
    };
  }

  return {
    icon: "📖",
    title: cleanTitle,
    subtitle: "Global Flora Index Monograph Chapter",
    summary: `Synthesized botanical analysis covering ${cleanTitle.toLowerCase()} for this taxon.`,
    isCultivation: /\bpH\b|soil|watering|sunlight|cultivar/i.test(bodyLower),
  };
}

function buildPlantipediaMonograph({ page, parsedData, imagesPool, lang, originalQuery }) {
  const wikitext = page.revisions?.[0]?.slots?.main?.content || "";
  const taxobox = parseTaxoboxFields(wikitext);
  const infobox = parsedData?.infobox || { clades: [] };
  if (!verifyBotanicalSubject(page, taxobox, infobox)) {
    return null;
  }

  const title = sanitizeBotanicalText(page.title || originalQuery);
  const extractFallback = splitSectionsFromExtract(page.extract || "");

  // Prefer rich HTML-parsed sections & lead when available; fall back cleanly to plaintext extract
  const rawLeadParagraphs = (parsedData?.leadParagraphs?.length >= 1
    ? parsedData.leadParagraphs
    : extractFallback.leadParagraphs
  ).map((p) => sanitizeBotanicalText(p)).filter((p) => p.length > 24);

  const sourceSections = (parsedData?.parsedSections?.length >= 2
    ? parsedData.parsedSections
    : extractFallback.namedSections
  );

  const leadJoined = rawLeadParagraphs.join(" ");
  const extractFull = sanitizeBotanicalText([leadJoined, ...sourceSections.map((s) => s.paragraphs.join(" "))].join(" ") || page.extract || "");
  const extractLower = extractFull.toLowerCase();
  const leadLower = leadJoined.toLowerCase();
  const categoriesText = (page.categories || []).map((c) => c.title || "").join(" ");
  const categoriesLower = categoriesText.toLowerCase();

  const scientificName = extractBinomial(taxobox, infobox, title, leadJoined) || sanitizeBotanicalText(infobox.binomial || taxobox.binomial || taxobox.taxon || title);
  const familyName = extractBotanicalFamily(taxobox, infobox, leadJoined, extractFull, wikitext, categoriesText);
  const orderName = extractBotanicalOrder(taxobox, infobox, familyName, leadJoined, extractFull, wikitext, categoriesText);
  const displayFamily = familyName || "Botanical Taxon (Global Registry)";

  const genusName = sanitizeBotanicalText(
    infobox.genus || taxobox.genus || taxobox.গণ || (scientificName.includes(" ") ? scientificName.split(" ")[0] : title),
  );
  const speciesEpithet = sanitizeBotanicalText(
    infobox.species || taxobox.species || (scientificName.includes(" ") ? scientificName.split(/\s+/).slice(1).join(" ") : scientificName),
  );
  const bnLangTitle = page.langlinks?.find((l) => l.lang === "bn")?.title || "";

  const commonName = title;
  const commonNameBn = lang === "bn"
    ? title
    : sanitizeBotanicalText(bnLangTitle || "বৈশ্বিক উদ্ভিদ নমুনা");

  const category = inferCategoryFromData(taxobox, extractLower, categoriesLower);

  const { plantGroup: inferredGroup, cladeLabel } = inferPlantGroupAndClade(
    taxobox,
    infobox,
    leadLower,
    categoriesLower,
    extractLower,
  );
  const inferredHabit = inferGrowthForm(leadLower, categoriesLower, extractLower, inferredGroup);

  const guild = classifyEcologicalGuild({
    leadLower,
    extractLower,
    categoriesLower,
    familyName,
    habitLower: inferredHabit.toLowerCase(),
  });

  const dims = extractPlantDimensionsAndLifespan(extractFull, leadJoined, guild, inferredHabit);

  // Build strict 80-char deduplication registry and CLAIM leadOverview FIRST
  const usedParagraphKeys = new Set();
  const usedSentenceKeys = new Set();

  const isTextUnused = (text) => {
    const key = normalizeDedupKey(text);
    if (!key || usedParagraphKeys.has(key)) return false;
    const sentences = splitIntoSentences(text);
    if (sentences.length > 0 && sentences.every((s) => usedSentenceKeys.has(normalizeDedupKey(s)))) {
      return false;
    }
    if (sentences.length > 0 && usedSentenceKeys.has(normalizeDedupKey(sentences[0]))) {
      return false;
    }
    return true;
  };

  const markTextUsed = (text) => {
    const key = normalizeDedupKey(text);
    if (key) usedParagraphKeys.add(key);
    splitIntoSentences(text).forEach((s) => {
      const sk = normalizeDedupKey(s);
      if (sk) usedSentenceKeys.add(sk);
    });
  };

  const leadOverview = rawLeadParagraphs[0]
    ? extractSentences(rawLeadParagraphs[0], 3)
    : `${commonName} (${scientificName || commonName}) is a documented vascular botanical taxon indexed via the Global Botanical Server.`;
  const shortSummary = extractSentences(leadOverview, 2) || leadOverview;
  markTextUsed(leadOverview);

  const habitatSections = sourceSections.filter((s) => /habitat|distribution|ecology|range|origin|বিস্তৃতি|আবাস/i.test(s.heading));
  const usesSections = sourceSections.filter((s) => /use|medic|phytochem|culinary|economic|ব্যবহার/i.test(s.heading));

  const nativeOriginText = extractGeographicOrigin(infobox, leadJoined, habitatSections, categoriesText);
  const commonUsesText = usesSections.length > 0
    ? sanitizeBotanicalText(usesSections[0].heading)
    : `${category} conservation, research & horticultural cultivation`;

  const plantGroupDisplay = orderName
    ? `${inferredGroup} · Order ${orderName}`
    : inferredGroup;

  // Claim unused paragraphs helper
  const claimUnusedFromList = (paragraphs, maxCount = 3) => {
    const out = [];
    for (const p of paragraphs) {
      const clean = sanitizeBotanicalText(p);
      if (!clean || clean.length < 28) continue;
      if (!isTextUnused(clean)) continue;
      markTextUsed(clean);
      out.push(clean);
      if (out.length >= maxCount) break;
    }
    return out;
  };

  // Assemble up to 14 dynamic content-matched chapters (01..14 => 15 total with Section 00 Hero)
  const dynamicChapters = [];

  // 1. Add remaining unused lead sentences as Chapter 01 Overview / Botanical Summary if substantial
  const extraLeadParagraphs = claimUnusedFromList(
    rawLeadParagraphs.flatMap((p) => {
      const unusedSents = splitIntoSentences(p).filter((s) => !usedSentenceKeys.has(normalizeDedupKey(s)));
      return unusedSents.length ? [unusedSents.join(" ")] : [];
    }),
    2,
  );
  if (extraLeadParagraphs.length > 0) {
    dynamicChapters.push({
      title: "Botanical Identity & Overview",
      subtitle: "Global Flora Index Taxonomic & Diagnostic Summary",
      icon: "🌿",
      summary: `Taxonomic placement, diagnostic traits, and nomenclature for ${commonName}.`,
      paragraphs: extraLeadParagraphs,
      subblocks: [
        { heading: "Scientific Binomial", text: scientificName || commonName },
        {
          heading: "Order & Family Lineage",
          text: [orderName ? `Order: ${orderName}` : null, `Family: ${displayFamily}`, `Clade: ${cladeLabel}`].filter(Boolean).join(" · "),
        },
      ],
      isCultivationTelemetry: false,
    });
  }

  // 2. Map every genuine article section dynamically without mismatching titles
  for (const srcSec of sourceSections) {
    if (dynamicChapters.length >= 13) break;
    const claimed = claimUnusedFromList(srcSec.paragraphs || [], 4);
    if (claimed.length === 0) continue;

    const meta = classifyDynamicSectionMeta(srcSec.heading, claimed.join(" ").toLowerCase());
    // Avoid creating duplicate cultivation cards with identical titles
    const duplicateTitle = dynamicChapters.some((ch) => ch.title.toLowerCase() === meta.title.toLowerCase());
    const resolvedTitle = duplicateTitle ? sanitizeBotanicalText(srcSec.heading) : meta.title;

    const chObj = {
      title: resolvedTitle,
      subtitle: meta.subtitle,
      icon: meta.icon,
      summary: meta.summary,
      paragraphs: claimed,
      isCultivationTelemetry: meta.isCultivation,
    };

    if (Array.isArray(srcSec.subtopics) && srcSec.subtopics.length > 0) {
      chObj.subblocks = srcSec.subtopics.slice(0, 2).map((st) => ({
        heading: st.heading,
        text: extractSentences(st.text, 2) || st.text,
      }));
    }

    dynamicChapters.push(chObj);
  }

  // Ensure an explicit Ecological Guild & Cultivation Telemetry chapter is present (even if article lacks a Cultivation heading)
  const existingCultIdx = dynamicChapters.findIndex((c) => c.isCultivationTelemetry);
  const phLabelStr = `pH ${guild.phMin.toFixed(1)}–${guild.phMax.toFixed(1)}`;
  if (existingCultIdx === -1) {
    dynamicChapters.push({
      title: "Physiological Telemetry & Ecological Husbandry",
      subtitle: `${guild.guildLabel} · Substrate & Climate Envelope`,
      icon: "🪴",
      summary: `Calibrated soil reaction (${phLabelStr}), solar exposure, and hydration profile for ${commonName}.`,
      paragraphs: [
        `Physiological and edaphic telemetry places ${commonName} (${scientificName || commonName}) within the ${guild.guildLabel} ecological guild (${inferredHabit.toLowerCase()}).`,
        `Recommended substrate conditions mirror natural habitat tolerances: ${guild.soilDrainageLabel.toLowerCase()} calibrated around ${phLabelStr} with ${guild.irrigationLabel.toLowerCase()} and ${guild.sunlightLabel.toLowerCase()}.`,
      ],
      subblocks: [
        { heading: "Substrate & pH Window", text: `${guild.soilDrainageLabel} (${phLabelStr})` },
        { heading: "Solar & Thermal Envelope", text: `${guild.sunlightLabel} · Optimum up to ${dims.tempRangeLabel}` },
      ],
      isCultivationTelemetry: true,
    });
  } else {
    dynamicChapters[existingCultIdx].isCultivationTelemetry = true;
    if (!dynamicChapters[existingCultIdx].subblocks) {
      dynamicChapters[existingCultIdx].subblocks = [
        { heading: "Substrate & pH Window", text: `${guild.soilDrainageLabel} (${phLabelStr})` },
        { heading: "Solar & Thermal Envelope", text: `${guild.sunlightLabel} · Optimum up to ${dims.tempRangeLabel}` },
      ];
    }
  }

  // Pad to rich depth if short stub (without duplicating any sentence)
  if (dynamicChapters.length < 4) {
    const existingTopics = new Set(dynamicChapters.map((c) => c.title.toLowerCase()));
    if (!existingTopics.has("taxonomic lineage & systematics")) {
      dynamicChapters.unshift({
        title: "Taxonomic Lineage & Systematics",
        subtitle: "Linnaean Hierarchy & Clade Relationships",
        icon: "🧬",
        summary: `Taxonomic classification placing ${commonName} in ${displayFamily}${orderName ? ` (Order ${orderName})` : ""}.`,
        paragraphs: [
          `Systematically assigned to ${plantGroupDisplay} under family ${displayFamily} and genus ${genusName || commonName}. Verified via the Global Flora Index backbone.`,
        ],
        subblocks: [
          { heading: "Accepted Binomial", text: scientificName || commonName },
          { heading: "Native Biogeographic Region", text: nativeOriginText },
        ],
        isCultivationTelemetry: false,
      });
    }
  }

  // Limit strictly to 14 chapters (`01`–`14`, making `15` total chapters with Hero `00`)
  const cappedChapters = dynamicChapters.slice(0, 14);

  // Assign unique multi-plate images (`imagesPool[0]` reserved strictly for Hero `00`, `imagesPool[1..]` for chapters!)
  const usedSectionImages = new Set();
  const heroPhoto = imagesPool[0] || {
    url: "./assets/images/placeholder-botanical.svg",
    alt: `${commonName} (${scientificName || commonName}) botanical specimen plate`,
    caption: `${commonName} — Live taxon plate archived via Global Botanical Server`,
  };
  if (heroPhoto.url) {
    usedSectionImages.add(normalizeImageKey(heroPhoto.url));
  }

  const chapterPhotos = imagesPool.slice(1).filter((img) => {
    const k = normalizeImageKey(img.url);
    if (!k || usedSectionImages.has(k)) return false;
    usedSectionImages.add(k);
    return true;
  });

  // Distribute distinct images cleanly (prefer 1 per chapter across chapters, up to 2 if pool > chapter count)
  let photoCursor = 0;
  const finalSections = cappedChapters.map((ch, idx) => {
    const numStr = String(idx + 1).padStart(2, "0");
    const imgs = [];
    if (photoCursor < chapterPhotos.length) {
      imgs.push(chapterPhotos[photoCursor]);
      photoCursor += 1;
    }
    return {
      number: numStr,
      title: ch.title,
      subtitle: ch.subtitle,
      icon: ch.icon,
      summary: ch.summary,
      paragraphs: ch.paragraphs,
      ...(imgs.length ? { images: imgs } : {}),
      ...(ch.subblocks?.length ? { subblocks: ch.subblocks } : {}),
      ...(ch.isCultivationTelemetry ? { isCultivationTelemetry: true } : {}),
    };
  });

  // If additional verified unique photos remain (aiming for 6-12 total images per page), attach 2nd gallery image to major chapters without duplicates
  for (let i = 0; i < finalSections.length && photoCursor < chapterPhotos.length && i < 11; i += 2) {
    if (!finalSections[i].images) finalSections[i].images = [];
    if (finalSections[i].images.length < 2) {
      finalSections[i].images.push(chapterPhotos[photoCursor]);
      photoCursor += 1;
    }
  }

  const monograph = {
    isGlobalLive: true,
    query: normalizeGlobalQuery(originalQuery),
    slug: "",
    specimenId: `GBS-${String(page.pageid || "LIVE").slice(-5)}`,
    commonName,
    commonNameBn,
    scientificName: scientificName || commonName,
    familyBn: lang === "bn" ? familyName : "",
    category,
    featured: false,
    leadOverview,
    shortSummary,
    sourceBadge: "GLOBAL FLORA INDEX",
    heroImage: {
      url: heroPhoto.url,
      fallbackUrl: "./assets/images/placeholder-botanical.svg",
      alt: heroPhoto.alt,
      caption: heroPhoto.caption,
    },
    specimenMetadata: {
      specimenId: `GBS-${String(page.pageid || "LIVE").slice(-5)}`,
      taxonRank: "Species",
      collectionZone: nativeOriginText,
      photographer: "Global Flora Index Digital Archive",
      archiveCollection: "Global Botanical Server Live Feed",
    },
    overview: {
      plantGroup: plantGroupDisplay,
      order: orderName || "Vascular Taxon",
      family: displayFamily,
      genus: genusName || "Indexed Genus",
      species: speciesEpithet || scientificName || commonName,
      growthForm: inferredHabit,
      nativeOrigin: nativeOriginText,
      commonUses: commonUsesText,
      biomeGuild: guild.guildLabel,
      sunlight: guild.sunlightLabel,
      phRange: phLabelStr,
      temperatureRange: dims.tempRangeLabel,
      lifespan: dims.lifespan.value === 1 ? "Annual" : "Perennial",
    },
    telemetryHints: {
      stature: dims.stature,
      ph: {
        value: guild.phDefault,
        decimals: 1,
        label: "OPTIMAL SOIL pH",
        subtext: guild.soilDrainageLabel,
      },
      vitality: dims.lifespan,
      climate: dims.climate,
    },
    cultivationTelemetry: {
      phMin: guild.phMin,
      phMax: guild.phMax,
      phOptimalLabel: phLabelStr,
      sunlightLevel: guild.sunlightLevel,
      sunlightLabel: guild.sunlightLabel,
      irrigationLevel: guild.irrigationLevel,
      irrigationLabel: guild.irrigationLabel,
      soilDrainageLabel: guild.soilDrainageLabel,
    },
    sections: finalSections,
    relatedSpecies: [],
  };

  extractPlantTelemetryStats(monograph);
  return monograph;
}

async function inspectTitlesForBotany(titles, lang, originalQuery, signal) {
  for (const title of titles) {
    const detailUrl = buildApiUrl(lang, {
      action: "query",
      redirects: "1",
      titles: title,
      prop: "extracts|pageimages|categories|langlinks|revisions",
      explaintext: "1",
      exsectionformat: "wiki",
      piprop: "original|thumbnail",
      pithumbsize: "1100",
      cllimit: "45",
      lllang: lang === "bn" ? "en" : "bn",
      rvprop: "content",
      rvslots: "main",
      rvsection: "0",
    });
    const detailJson = await fetchJsonWithSignal(detailUrl, signal, 4500);
    const pages = detailJson?.query?.pages || [];
    for (const page of pages) {
      if (!page || page.missing) continue;
      const extractLower = String(page.extract || "").slice(0, 260).toLowerCase();
      const catsLower = (page.categories || []).map((c) => c.title || "").join(" ").toLowerCase();
      const isDisambig =
        DISAMBIGUATION_MARKERS.some((m) => extractLower.includes(m)) ||
        catsLower.includes("disambiguation");
      if (isDisambig) {
        return { disambiguation: true, monograph: null };
      }

      const wikitext = page.revisions?.[0]?.slots?.main?.content || "";
      const taxobox = parseTaxoboxFields(wikitext);
      const parsedData = await fetchParsedArticleData(page.title, lang, signal);
      if (!verifyBotanicalSubject(page, taxobox, parsedData?.infobox)) {
        continue;
      }

      const rawSci = extractBinomial(taxobox, parsedData?.infobox, page.title, page.extract) || page.title;
      const imagesPool = await fetchMultiSpeciesImages({
        title: page.title,
        lang,
        scientificName: rawSci,
        commonName: sanitizeBotanicalText(page.title || originalQuery),
        heroPage: page,
        signal,
      });

      const monograph = buildPlantipediaMonograph({
        page,
        parsedData,
        imagesPool,
        lang,
        originalQuery,
      });
      if (monograph) {
        return { disambiguation: false, monograph };
      }
    }
  }
  return { disambiguation: false, monograph: null };
}

async function queryServerInLanguage(query, lang, signal) {
  const searchUrl = buildApiUrl(lang, {
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
  });
  const searchJson = await fetchJsonWithSignal(searchUrl, signal);
  const hits = searchJson?.query?.search || [];
  if (!hits.length) {
    return { ok: false, reason: "invalid" };
  }

  const primaryTitles = hits.map((h) => h.title).filter(Boolean).slice(0, 3);
  const firstPass = await inspectTitlesForBotany(primaryTitles, lang, query, signal);
  if (firstPass.monograph) {
    return { ok: true, monograph: firstPass.monograph };
  }

  const hasPlantHintInSnippets =
    firstPass.disambiguation ||
    hits.some((h) => /plant|flower|tree|species|herb|genus|shrub|উদ্ভিদ|ফুল|গাছ/i.test(String(h.snippet || "")));

  if (hasPlantHintInSnippets && !/\b(plant|flower|tree)\b/i.test(query)) {
    const disambigUrl = buildApiUrl(lang, {
      action: "query",
      list: "search",
      srsearch: hasBengaliScript(query) ? `${query} উদ্ভিদ` : `${query} plant`,
      srlimit: "4",
    });
    const disambigJson = await fetchJsonWithSignal(disambigUrl, signal);
    const disambigTitles = (disambigJson?.query?.search || [])
      .map((h) => h.title)
      .filter((t) => t && !primaryTitles.includes(t))
      .slice(0, 3);
    if (disambigTitles.length > 0) {
      const secondPass = await inspectTitlesForBotany(disambigTitles, lang, query, signal);
      if (secondPass.monograph) {
        return { ok: true, monograph: secondPass.monograph };
      }
    }
  }

  return { ok: false, reason: "invalid" };
}

export async function fetchFromGlobalBotanicalServer(query, options = {}) {
  const { signal, onRetry } = options;
  const cleanQuery = normalizeGlobalQuery(query);
  if (!cleanQuery || cleanQuery.length < 2) {
    return { ok: false, reason: "invalid" };
  }

  const cached = getCachedGlobalMonograph(cleanQuery);
  if (cached) {
    return { ok: true, monograph: cached, fromCache: true };
  }

  const preferredLang = hasBengaliScript(cleanQuery) ? "bn" : "en";
  const fallbackLang = preferredLang === "bn" ? "en" : "bn";
  const startTime = Date.now();
  let lastNetworkError = null;

  for (let attempt = 0; attempt < RETRY_SCHEDULE_MS.length; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const targetOffset = RETRY_SCHEDULE_MS[attempt];
    const elapsed = Date.now() - startTime;
    if (attempt > 0) {
      if (typeof onRetry === "function") {
        onRetry(attempt + 1, RETRY_SCHEDULE_MS.length);
      }
      if (targetOffset > elapsed) {
        await waitWithSignal(targetOffset - elapsed, signal);
      }
    }

    try {
      const primaryResult = await queryServerInLanguage(cleanQuery, preferredLang, signal);
      if (primaryResult.ok) {
        setCachedGlobalMonograph(cleanQuery, primaryResult.monograph);
        return primaryResult;
      }

      if (preferredLang === "bn") {
        const secondaryResult = await queryServerInLanguage(cleanQuery, fallbackLang, signal);
        if (secondaryResult.ok) {
          setCachedGlobalMonograph(cleanQuery, secondaryResult.monograph);
          return secondaryResult;
        }
      }

      return { ok: false, reason: "invalid" };
    } catch (err) {
      if (isAbortError(err) && signal?.aborted) {
        throw err;
      }
      lastNetworkError = err;
    }
  }

  return {
    ok: false,
    reason: "network",
    error: lastNetworkError?.message || "Global Botanical Server connection failed.",
  };
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
  onAbort
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

  const loaderCard = el("div", {
    className: "gbs-loader-card glass-panel",
    role: "status",
    "aria-live": "polite",
  }, [
    el("div", { className: "gbs-loader-head" }, [
      el("div", { className: "gbs-loader-title-wrap" }, [
        el("span", { className: "gbs-loader-badge", textContent: "GLOBAL BOTANICAL SERVER" }),
        el("h3", { className: "gbs-loader-heading", textContent: "Synthesizing Live Botanical Monograph" }),
      ]),
      abortBtn,
    ]),
    statusEl,
    el("div", { className: "gbs-loader-track" }, [progressFill]),
    el("div", { className: "gbs-loader-meta" }, [
      subStatusEl,
      pctBadge,
    ]),
  ]);

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
    const workPromise = Promise.resolve().then(() => work({ signal: controller.signal, onRetry: notifyRetry }));
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
      result: { ok: false, reason: "network", error: err?.message || "Connection interrupted." },
    };
  }
}
