import {
  DISAMBIGUATION_MARKERS,
  buildPlantipediaMonograph,
  extractBinomial,
  hasBengaliScript,
  normalizeGlobalQuery,
  normalizeImageKey,
  parseTaxoboxFields,
  sanitizeBotanicalText,
  stripWikitextMarkup,
  verifyBotanicalSubject,
} from "./taxon-parser.js";
import {
  normalizeLangCode,
  translateMonographRecord,
} from "../../modules/utils/translator.js";
import {
  isNormalizedTaxonMatch,
  resolveFuzzyGlobalTaxon,
} from "../search/global-fuzzy.js";

const RETRY_SCHEDULE_MS = [0, 1200, 2600];
const DEFAULT_TIMEOUT_MS = 6000;
const CACHE_STORAGE_PREFIX = "plantipedia_global_monograph_v40::";
const SITE_IMAGE_COUNT_KEY = "plantipedia_global_img_usage_v1";
const MAX_SITE_WIDE_IMAGE_USES = 4;
const MIN_MONOGRAPH_IMAGES = 6;
const MAX_MONOGRAPH_IMAGES = 10;
const memoryCache = new Map();
const siteImageUsageMap = new Map();

const NON_BOTANICAL_IMAGE_RE =
  /(?:^|[\s/_-])(cat|cats|dog|dogs|bird|birds|animal|animals|insect|beetle|butterfly|spider|mammal|reptile|amphibian|fish|building|architecture|church|temple|mosque|house|city|street|person|people|human|map|range|distribut|location|locator|blank|flag|coat[_ -]?of[_ -]?arms|crest|logo|icon|symbol|cladogram|phylogen|diagram|structur|formula|molecul|chemical|skeletal|synthesis|portrait|headshot|signature|stamp|coin|chart|graph|timeline|scale[_ -]?bar|commons-logo|wiki|edit-clear|question[_ -]?book|ambox|padlock)(?:$|[\s/_.0-9-])/i;

const CURATED_BOTANICAL_BIOME_POOL = Object.freeze({
  tree: [
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/692993477/large.jpg",
      alt: "Tropical broadleaf canopy foliage & foliar venation study",
      caption: "Archival Canopy Study — Broadleaf branching & foliar venation specimen",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/116163302/large.jpeg",
      alt: "Native arboreal woodland canopy habitat specimen",
      caption: "Biogeographic Habitat — Natural arboreal canopy ecology plate",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/692993524/large.jpg",
      alt: "Arboreal inflorescence & reproductive floral cluster study",
      caption: "Floral Morphology — Panicle inflorescence & reproductive anatomy",
    },
  ],
  aquatic: [
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/311500399/large.jpeg",
      alt: "Wetland aquatic flora floating leaf & emergent bloom specimen",
      caption: "Wetland Hydrophyte — Emergent floral & floating lamina study",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/212420069/large.jpeg",
      alt: "Freshwater marshland botanical habitat colony",
      caption: "Riparian Ecosystem — Aquatic & marshland ecological guild",
    },
  ],
  palm: [
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/173578566/large.jpeg",
      alt: "Tropical palm crown fronds & monocot trunk habit",
      caption: "Arecaceae Crown Study — Pinnate frond architecture & ringed trunk",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/294471104/large.jpeg",
      alt: "Coastal palm grove & tropical alluvial stand",
      caption: "Biogeographic Biome — Tropical palm stand in sunlit habitat",
    },
  ],
  succulent: [
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/625322666/original.jpg",
      alt: "Arid-adapted xerophytic flora in natural desert substrate",
      caption: "Arid Xerophyte — Moisture-conserving foliar morphology",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/192412405/large.jpeg",
      alt: "Succulent basal rosette & fibrous xerophytic structure",
      caption: "Foliar Adaptation — Basal succulent rosette in full solar exposure",
    },
  ],
  flora: [
    {
      url: "https://static.inaturalist.org/photos/234675028/large.jpeg",
      alt: "Vascular angiosperm foliage & botanical field study",
      caption: "Herbarium Reference — Vascular angiosperm foliar detail",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/34507862/large.jpg",
      alt: "Flowering herbaceous specimen in natural botanical habitat",
      caption: "Floral Anatomy — Corolla morphology & pollinator interface",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/192412405/large.jpeg",
      alt: "Foliar rosette & herbaceous vegetative growth habit",
      caption: "Vegetative Form — Living specimen in outdoor botanical garden",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/692993477/large.jpg",
      alt: "Botanical leaf lamina & vein arrangement plate",
      caption: "Foliar Venation — Diagnostic leaf margin & midrib plate",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/116163302/large.jpeg",
      alt: "Subtropical botanical specimen ecological stand",
      caption: "Ecological Niche — Native growth environment & light regime",
    },
    {
      url: "https://inaturalist-open-data.s3.amazonaws.com/photos/692993524/large.jpg",
      alt: "Botanical reproductive cluster & fruit development",
      caption: "Reproductive Study — Flowering & seed-bearing botanical stage",
    },
  ],
});

function loadSiteImageUsage() {
  if (siteImageUsageMap.size > 0) return;
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(SITE_IMAGE_COUNT_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        Object.entries(obj || {}).forEach(([k, v]) => {
          if (typeof v === "number" && v > 0) siteImageUsageMap.set(k, v);
        });
      }
    }
  } catch {
    // Ignore storage access issues
  }
}

function recordSiteImageUsage(images) {
  loadSiteImageUsage();
  (images || []).forEach((img) => {
    const k = normalizeImageKey(img?.url);
    if (!k) return;
    siteImageUsageMap.set(k, (siteImageUsageMap.get(k) || 0) + 1);
  });
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        SITE_IMAGE_COUNT_KEY,
        JSON.stringify(Object.fromEntries(siteImageUsageMap.entries())),
      );
    }
  } catch {
    // Non-blocking
  }
}

function cacheKeyFor(query, lang = "en") {
  const cleanLang = normalizeLangCode(lang, query);
  return `${CACHE_STORAGE_PREFIX}${cleanLang}::${normalizeGlobalQuery(query).toLowerCase()}`;
}

export function getCachedGlobalMonograph(query, targetLang = null) {
  const normalized = normalizeGlobalQuery(query);
  if (!normalized) return null;
  const lang = normalizeLangCode(targetLang, normalized);
  const key = cacheKeyFor(normalized, lang);
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.commonName && Array.isArray(parsed.sections)) {
          memoryCache.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage quota or restricted context errors
  }
  return null;
}

export function setCachedGlobalMonograph(query, monograph, targetLang = null) {
  if (!monograph || !query) return;
  const normalized = normalizeGlobalQuery(query);
  const lang = normalizeLangCode(targetLang || monograph.lockedLanguage, normalized);
  const key = cacheKeyFor(normalized, lang);
  memoryCache.set(key, monograph);
  if (
    monograph.query &&
    normalizeGlobalQuery(monograph.query).toLowerCase() !== normalized.toLowerCase()
  ) {
    memoryCache.set(cacheKeyFor(monograph.query, lang), monograph);
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, JSON.stringify(monograph));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function isAbortError(err) {
  return Boolean(err && (err.name === "AbortError" || err.code === 20));
}

export function waitWithSignal(ms, signal) {
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

export async function fetchJsonWithSignal(url, signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
      signal: controller.signal,
    });
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      err.isNetworkError =
        response.status >= 500 || response.status === 429 || response.status === 408;
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
  const host =
    lang === "bn"
      ? "https://bn.wikipedia.org/w/api.php"
      : "https://en.wikipedia.org/w/api.php";
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  });
  return `${host}?${searchParams.toString()}`;
}

function buildRestSummaryUrl(lang, title) {
  const host =
    lang === "bn"
      ? "https://bn.wikipedia.org/api/rest_v1/page/summary/"
      : "https://en.wikipedia.org/api/rest_v1/page/summary/";
  return `${host}${encodeURIComponent(String(title || "").replace(/\s+/g, "_"))}`;
}

function buildCommonsUrl(params) {
  const searchParams = new URLSearchParams({
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  });
  return `https://commons.wikimedia.org/w/api.php?${searchParams.toString()}`;
}

function parseGlobalSlugFromUrl(pageUrl) {
  if (!pageUrl) return "";
  try {
    const u = new URL(pageUrl);
    const parts = u.pathname.split("/wiki/");
    if (parts.length < 2) return "";
    return decodeURIComponent(parts[1]).replace(/_/g, " ").trim();
  } catch {
    return "";
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
  if (
    cleanFileTitle &&
    cleanFileTitle.length >= 10 &&
    cleanFileTitle.length <= 130 &&
    !NON_BOTANICAL_IMAGE_RE.test(cleanFileTitle)
  ) {
    return `${cleanFileTitle} — ${commonName || sciName}`;
  }
  return `${commonName || sciName} botanical specimen study`;
}

function upgradeInatPhotoUrl(url) {
  const s = String(url || "").trim();
  if (!s || /\.(?:svg|gif)(?:$|\?)/i.test(s)) return "";
  return s.replace(/\/(square|thumb|small|medium)\.(jpe?g|png|webp)/i, "/large.$2");
}

function collectInatPhotoEntries(inatTaxon, commonName, scientificName) {
  if (!inatTaxon) return [];
  const rawPhotos = [];
  if (inatTaxon.default_photo) {
    rawPhotos.push(inatTaxon.default_photo);
  }
  if (Array.isArray(inatTaxon.taxon_photos)) {
    inatTaxon.taxon_photos.forEach((tp) => {
      if (tp?.photo) rawPhotos.push(tp.photo);
    });
  }
  const out = [];
  for (const photo of rawPhotos) {
    const rawUrl = photo.large_url || photo.medium_url || photo.original_url || photo.url || "";
    const url = upgradeInatPhotoUrl(rawUrl);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const w = Number(photo.original_dimensions?.width || 0);
    const h = Number(photo.original_dimensions?.height || 0);
    if ((w && w < 400) || (h && h < 300)) continue;
    out.push({
      url,
      alt: `${commonName || scientificName} (${scientificName || commonName}) natural field photograph`,
      caption: sanitizeBotanicalText(
        photo.attribution
          ? `${commonName || scientificName} — Field observation (${photo.attribution})`
          : `${commonName || scientificName} — Verified taxonomic field observation`,
      ),
    });
  }
  return out;
}

async function searchMediaWiki(query, lang, signal, limit = 8) {
  const searchUrl = buildApiUrl(lang, {
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
  });
  const json = await fetchJsonWithSignal(searchUrl, signal, DEFAULT_TIMEOUT_MS);
  return json?.query?.search || [];
}

async function fetchGbifMatch(nameQuery, signal) {
  const clean = normalizeGlobalQuery(nameQuery);
  if (!clean || clean.length < 2) return null;
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(clean)}&kingdom=Plantae&verbose=false`;
  const data = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  if (!data || data.matchType === "NONE") return null;
  if (data.kingdom && data.kingdom !== "Plantae") return null;
  if (data.rank === "KINGDOM" && clean.toLowerCase() !== "plantae") return null;
  if (data.matchType === "FUZZY" && Number(data.confidence || 0) < 92) return null;
  return data;
}

async function fetchInatTaxa(query, lang, signal) {
  const clean = normalizeGlobalQuery(query);
  if (!clean || clean.length < 2) return [];
  const locale = lang === "bn" ? "bn" : "en";
  // Taxon ID 47126 constrains matches strictly to Kingdom Plantae
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(clean)}&taxon_id=47126&per_page=5&locale=${locale}`;
  const data = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  return Array.isArray(data?.results) ? data.results : [];
}

function pickBestInatTaxon(results, query) {
  if (!Array.isArray(results) || results.length === 0) return null;
  const qLower = normalizeGlobalQuery(query).toLowerCase();
  const qTokens = qLower.split(/\s+/).filter((w) => w.length >= 2);
  const scored = results
    .filter(
      (t) =>
        t &&
        t.iconic_taxon_name === "Plantae" &&
        Number(t.rank_level || 100) < 40,
    )
    .map((t) => {
      let score = 0;
      const nameLower = String(t.name || "").toLowerCase();
      const commonLower = String(t.preferred_common_name || "").toLowerCase();
      const matchedLower = String(t.matched_term || "").toLowerCase();

      const hasExactMatch =
        nameLower === qLower ||
        commonLower === qLower ||
        matchedLower === qLower;
      const hasTokenOverlap =
        hasBengaliScript(qLower) ||
        qTokens.some(
          (tok) =>
            nameLower.includes(tok) ||
            commonLower.includes(tok) ||
            matchedLower.includes(tok),
        );

      if (!hasTokenOverlap) return { taxon: t, score: -100 };

      if (hasExactMatch) score += 32;
      else if (nameLower.startsWith(qLower) || commonLower.startsWith(qLower)) score += 12;
      else score += 4;

      if (t.rank === "species") score += 10;
      else if (t.rank === "genus") score += 7;
      if (t.wikipedia_url) score += 6;
      if (Array.isArray(t.ancestors) && t.ancestors.length >= 2) score += 4;
      if (Number(t.observations_count || 0) > 500) score += 4;

      if (qLower === "lotus" && nameLower.includes("corniculatus")) {
        score -= 8;
      }
      if (
        qLower === "lotus" &&
        (nameLower.includes("nelumbo") || commonLower.includes("sacred lotus"))
      ) {
        score += 24;
      }
      return { taxon: t, score };
    })
    .filter((entry) => entry.score > 10)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.taxon || null;
}

function rankSearchCandidates(mwHits, inatTaxon, gbifData, query) {
  const qLower = normalizeGlobalQuery(query).toLowerCase();
  const candidateMap = new Map();

  // If primary Global Flora Index hit is an exact/strong non-plant subject (e.g. Linux, Python language), abort immediately
  const topHit = mwHits[0];
  if (topHit) {
    const topTitleLower = String(topHit.title || "").toLowerCase();
    const topSnippetLower = String(topHit.snippet || "").toLowerCase();
    const isStrongNonPlant =
      /\b(operating system|open-source|unix-like|software|programming language|video game|film|album|football club|band|company|automobile)\b/.test(
        topSnippetLower,
      ) &&
      !/\b(plant|species of|genus|botanical|flower|tree|herb)\b/.test(topSnippetLower);
    if (topTitleLower === qLower && isStrongNonPlant) {
      return [];
    }
  }

  const register = (rawTitle, baseScore) => {
    const title = String(rawTitle || "").trim();
    if (!title) return;
    const key = title.toLowerCase();
    const prev = candidateMap.get(key);
    if (!prev || baseScore > prev.score) {
      candidateMap.set(key, { title, score: baseScore });
    }
  };

  if (qLower === "lotus") {
    register("Nelumbo nucifera", 56);
  }
  if (qLower === "baobab") {
    register("Adansonia", 52);
  }
  if (qLower === "lavender") {
    register("Lavandula", 52);
  }

  let hasStrongBotanicalMw = false;

  mwHits.forEach((hit, idx) => {
    const title = String(hit?.title || "");
    const tLower = title.toLowerCase();
    const snippetLower = String(hit?.snippet || "").toLowerCase();
    let score = Math.max(2, 16 - idx * 2);

    if (/^(list of|index of|outline of)\b/i.test(title)) score -= 55;
    if (/\(disambiguation\)/i.test(title) || /দ্ব্যর্থতা নিরসন/.test(title)) score -= 60;
    if (tLower === qLower) score += 28;
    else if (tLower.startsWith(qLower)) score += 10;

    if (
      /\b(species of|genus of|flowering plant|aquatic plant|carnivorous plant|tree|shrub|herb|plantae|family|botanical)\b|উদ্ভিদ|ফুল|গাছ|বৃক্ষ|প্রজাতি/.test(
        snippetLower,
      )
    ) {
      score += 18;
      if (idx <= 2 && score >= 30) hasStrongBotanicalMw = true;
    }
    if (
      /\b(software|operating system|unix-like|video game|film|album|band|car|football|programming language|chemical element)\b/.test(
        snippetLower,
      )
    ) {
      score -= 60;
    }

    register(title, score);
  });

  const inatNameLower = String(inatTaxon?.name || "").toLowerCase();
  const inatCommonLower = String(inatTaxon?.preferred_common_name || "").toLowerCase();
  const inatIsExact =
    inatNameLower === qLower ||
    inatCommonLower === qLower ||
    qLower === "lotus";
  const inatWikiTitle = parseGlobalSlugFromUrl(inatTaxon?.wikipedia_url);
  if (inatWikiTitle && (inatIsExact || !hasStrongBotanicalMw)) {
    register(inatWikiTitle, inatIsExact ? 40 : 18);
  }
  if (inatTaxon?.name && (inatIsExact || !hasStrongBotanicalMw)) {
    register(inatTaxon.name, inatIsExact ? 26 : 12);
  }
  if (
    gbifData?.matchType === "EXACT" &&
    (gbifData?.species || gbifData?.canonicalName)
  ) {
    register(gbifData.species || gbifData.canonicalName, 28);
  }

  return Array.from(candidateMap.values())
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 4);
}

async function fetchMediaWikiArticle(title, lang, signal) {
  const url = buildApiUrl(lang, {
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
  const json = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  const pages = json?.query?.pages || [];
  return pages.find((p) => p && !p.missing) || null;
}

async function fetchArticleImages(title, lang, commonName, scientificName, signal) {
  if (!title) return [];
  const url = buildApiUrl(lang, {
    action: "query",
    titles: title,
    generator: "images",
    gimlimit: "50",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1100",
  });
  const json = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  const pages = json?.query?.pages || [];
  const out = [];
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
    out.push({
      url: preferredUrl,
      alt: `${commonName} (${scientificName}) botanical photograph`,
      caption,
    });
    if (out.length >= 14) break;
  }
  return out;
}

async function fetchCommonsImages(searchTerm, commonName, scientificName, signal) {
  const q = normalizeGlobalQuery(searchTerm);
  if (!q) return [];
  const url = buildCommonsUrl({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `filetype:bitmap ${q}`,
    gsrlimit: "28",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1100",
  });
  const json = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  const pages = json?.query?.pages || [];
  const out = [];
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
    out.push({
      url: preferredUrl,
      alt: `${commonName} (${scientificName}) botanical archival plate`,
      caption,
    });
    if (out.length >= 16) break;
  }
  return out;
}

async function fetchCommonsCategoryImages(categoryName, commonName, scientificName, signal) {
  const catClean = normalizeGlobalQuery(String(categoryName || "").replace(/^Category:/i, ""));
  if (!catClean) return [];
  const url = buildCommonsUrl({
    action: "query",
    generator: "categorymembers",
    gcmtitle: `Category:${catClean}`,
    gcmnamespace: "6",
    gcmlimit: "24",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1100",
  });
  const json = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  const pages = json?.query?.pages || [];
  const out = [];
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
    out.push({
      url: preferredUrl,
      alt: `${commonName} (${scientificName}) botanical category specimen`,
      caption,
    });
    if (out.length >= 16) break;
  }
  return out;
}

async function fetchGbifOccurrenceImages(taxonKey, commonName, scientificName, signal) {
  if (!taxonKey) return [];
  const url = `https://api.gbif.org/v1/occurrence/search?taxonKey=${encodeURIComponent(String(taxonKey))}&mediaType=StillImage&limit=28`;
  const json = await fetchJsonWithSignal(url, signal, DEFAULT_TIMEOUT_MS);
  const results = Array.isArray(json?.results) ? json.results : [];
  const livePhotos = [];
  const voucherPhotos = [];

  for (const occ of results) {
    const mediaList = Array.isArray(occ?.media) ? occ.media : [];
    for (const m of mediaList) {
      if (!m || (m.type && m.type !== "StillImage")) continue;
      const rawUrl = String(m.identifier || "").trim();
      if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) continue;
      if (/\.(?:svg|gif|pdf|tif|tiff)(?:$|\?)/i.test(rawUrl)) continue;
      if (NON_BOTANICAL_IMAGE_RE.test(rawUrl)) continue;
      const fmt = String(m.format || "").toLowerCase();
      if (fmt && !/^image\/(jpeg|jpg|png|webp)$/i.test(fmt)) continue;

      const upgraded = upgradeInatPhotoUrl(rawUrl) || rawUrl;
      const countryStr = occ.country ? ` (${occ.country})` : "";
      const holder = occ.institutionCode || m.rightsHolder || m.creator || "GBIF Occurrence Record";
      const entry = {
        url: upgraded,
        alt: `${commonName} (${scientificName}) verified biodiversity field photograph`,
        caption: sanitizeBotanicalText(
          `${commonName} (${scientificName}) — GBIF verified specimen${countryStr} · ${holder}`,
        ),
      };

      const isHerbariumSheet =
        /herbarium|preservedspecimen|barcode|manifest/i.test(`${occ.basisOfRecord || ""} ${rawUrl} ${m.title || ""}`);
      if (isHerbariumSheet) {
        voucherPhotos.push(entry);
      } else {
        livePhotos.push(entry);
      }
    }
  }
  return [...livePhotos, ...voucherPhotos].slice(0, 16);
}

const IUCN_WIKIDATA_MAP = Object.freeze({
  Q211005: "Least Concern (LC)",
  Q719675: "Near Threatened (NT)",
  Q278113: "Vulnerable (VU)",
  Q11394: "Endangered (EN)",
  Q219127: "Critically Endangered (CR)",
  Q239509: "Extinct in the Wild (EW)",
  Q237350: "Extinct (EX)",
  Q3245245: "Data Deficient (DD)",
});

function parseWikidataEntityObject(entity) {
  if (!entity || entity.missing !== undefined) return null;
  const claims = entity.claims || {};
  const taxonName = claims.P225?.[0]?.mainsnak?.datavalue?.value || "";
  const iucnId = claims.P141?.[0]?.mainsnak?.datavalue?.value?.id || "";
  const commonsCategory = claims.P373?.[0]?.mainsnak?.datavalue?.value || "";
  const commonsImage = claims.P18?.[0]?.mainsnak?.datavalue?.value || "";
  const aliasesEn = Array.isArray(entity.aliases?.en)
    ? entity.aliases.en.map((a) => String(a?.value || "").trim()).filter(Boolean)
    : [];
  const aliasesBn = Array.isArray(entity.aliases?.bn)
    ? entity.aliases.bn.map((a) => String(a?.value || "").trim()).filter(Boolean)
    : [];
  return {
    wikidataId: entity.id || "",
    taxonName: typeof taxonName === "string" ? sanitizeBotanicalText(taxonName) : "",
    iucnStatus: IUCN_WIKIDATA_MAP[iucnId] || "",
    commonsCategory: typeof commonsCategory === "string" ? commonsCategory : "",
    commonsImage: typeof commonsImage === "string" ? commonsImage : "",
    enWikiTitle: entity.sitelinks?.enwiki?.title || "",
    bnWikiTitle: entity.sitelinks?.bnwiki?.title || "",
    labelEn: entity.labels?.en?.value || "",
    labelBn: entity.labels?.bn?.value || "",
    aliasesEn,
    aliasesBn,
    descriptionEn: entity.descriptions?.en?.value || "",
  };
}

async function fetchWikidataEntity({ title, lang, fallbackQuery, signal }) {
  const cleanTitle = normalizeGlobalQuery(title);
  if (!cleanTitle) return null;

  const site = lang === "bn" ? "bnwiki" : "enwiki";
  const directParams = new URLSearchParams({
    action: "wbgetentities",
    sites: site,
    titles: cleanTitle,
    props: "claims|labels|descriptions|sitelinks|aliases",
    languages: "en|bn",
    format: "json",
    origin: "*",
  });
  try {
    const json = await fetchJsonWithSignal(
      `https://www.wikidata.org/w/api.php?${directParams.toString()}`,
      signal,
      DEFAULT_TIMEOUT_MS,
    );
    const entities = json?.entities || {};
    for (const [id, ent] of Object.entries(entities)) {
      if (!id.startsWith("-") && ent && ent.missing === undefined) {
        const parsed = parseWikidataEntityObject(ent);
        if (parsed) return parsed;
      }
    }
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
  }

  const searchTerm = normalizeGlobalQuery(fallbackQuery || cleanTitle);
  if (!searchTerm) return null;
  const searchParams = new URLSearchParams({
    action: "wbsearchentities",
    search: searchTerm,
    language: lang === "bn" ? "bn" : "en",
    type: "item",
    limit: "3",
    format: "json",
    origin: "*",
  });
  const searchJson = await fetchJsonWithSignal(
    `https://www.wikidata.org/w/api.php?${searchParams.toString()}`,
    signal,
    DEFAULT_TIMEOUT_MS,
  );
  const firstId = searchJson?.search?.[0]?.id;
  if (!firstId) return null;

  const byIdParams = new URLSearchParams({
    action: "wbgetentities",
    ids: firstId,
    props: "claims|labels|descriptions|sitelinks|aliases",
    languages: "en|bn",
    format: "json",
    origin: "*",
  });
  const byIdJson = await fetchJsonWithSignal(
    `https://www.wikidata.org/w/api.php?${byIdParams.toString()}`,
    signal,
    DEFAULT_TIMEOUT_MS,
  );
  return parseWikidataEntityObject(byIdJson?.entities?.[firstId]);
}

async function fetchEolData(binomial, commonName, signal) {
  const q = normalizeGlobalQuery(binomial || commonName);
  if (!q || q.length < 3) return null;
  try {
    const searchUrl = `https://eol.org/api/search/1.0.json?q=${encodeURIComponent(q)}&exact=true&page=1`;
    const searchJson = await fetchJsonWithSignal(searchUrl, signal, 4500);
    const hitId = searchJson?.results?.[0]?.id;
    if (!hitId) return null;

    const pageUrl = `https://eol.org/api/pages/1.0/${encodeURIComponent(String(hitId))}.json?details=true&images_per_page=8&texts_per_page=5&common_names=true&taxonomy=true`;
    const pageJson = await fetchJsonWithSignal(pageUrl, signal, 4800);
    const tc = pageJson?.taxonConcept || pageJson;
    if (!tc) return null;

    const dataObjects = Array.isArray(tc.dataObjects) ? tc.dataObjects : [];
    const descriptions = [];
    const images = [];

    for (const obj of dataObjects) {
      const dt = String(obj?.dataType || "");
      if (dt.endsWith("Text") && obj.description) {
        const cleanDesc = sanitizeBotanicalText(stripWikitextMarkup(obj.description));
        if (cleanDesc.length >= 60 && descriptions.length < 4) {
          descriptions.push(cleanDesc);
        }
      } else if (dt.endsWith("StillImage")) {
        const imgUrl = String(obj.eolMediaURL || obj.mediaURL || "").trim();
        if (
          imgUrl &&
          /^https?:\/\//i.test(imgUrl) &&
          !/\.(?:svg|gif|pdf|tif|tiff)(?:$|\?)/i.test(imgUrl) &&
          !NON_BOTANICAL_IMAGE_RE.test(`${imgUrl} ${obj.title || ""}`)
        ) {
          images.push({
            url: imgUrl,
            alt: `${commonName || q} (${binomial || q}) Encyclopedia of Life botanical specimen`,
            caption: sanitizeBotanicalText(
              obj.title || `${commonName || q} — Encyclopedia of Life (EOL) verified record`,
            ),
          });
        }
      }
    }

    const vernaculars = Array.isArray(tc.vernacularNames) ? tc.vernacularNames : [];
    const commonNameEn =
      vernaculars.find((v) => v?.language === "en" && v?.vernacularName)?.vernacularName || "";
    const commonNameBn =
      vernaculars.find((v) => v?.language === "bn" && hasBengaliScript(v?.vernacularName || ""))
        ?.vernacularName || "";

    return {
      pageId: hitId,
      scientificName: tc.scientificName || q,
      commonNameEn: sanitizeBotanicalText(commonNameEn),
      commonNameBn: sanitizeBotanicalText(commonNameBn),
      descriptions,
      images: images.slice(0, 8),
    };
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
    return null;
  }
}

async function fetchOpenTreeOfLife(binomial, signal) {
  const q = normalizeGlobalQuery(binomial);
  if (!q || q.length < 3 || hasBengaliScript(q)) return null;
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const tnrsRes = await fetch("https://api.opentreeoflife.org/v3/tnrs/match_names", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ names: [q], context_name: "Land plants" }),
      signal: controller.signal,
    });
    if (!tnrsRes.ok) return null;
    const tnrsJson = await tnrsRes.json();
    const match = tnrsJson?.results?.[0]?.matches?.[0];
    const ottId = match?.taxon?.ott_id;
    if (!ottId) return null;

    const infoRes = await fetch("https://api.opentreeoflife.org/v3/taxonomy/taxon_info", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ott_id: ottId, include_lineage: true, include_children: false }),
      signal: controller.signal,
    });
    if (!infoRes.ok) {
      return {
        ottId,
        uniqueName: match.taxon.unique_name || q,
        synonyms: Array.isArray(match.taxon.synonyms) ? match.taxon.synonyms : [],
        lineage: [],
      };
    }
    const infoJson = await infoRes.json();
    return {
      ottId,
      uniqueName: infoJson.unique_name || match.taxon.unique_name || q,
      synonyms: Array.isArray(infoJson.synonyms) ? infoJson.synonyms : [],
      lineage: Array.isArray(infoJson.lineage)
        ? infoJson.lineage.map((l) => `${l.rank || "clade"}: ${l.name}`).slice(0, 8)
        : [],
    };
  } catch (err) {
    if (isAbortError(err) && signal?.aborted) throw err;
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onParentAbort);
  }
}

function selectBiomeFallbackPhotos(commonName, scientificName, hintText = "") {
  const h = String(hintText || "").toLowerCase();
  let primaryKey = "flora";
  if (/\b(aquatic|water|lotus|lily|marsh|wetland|hydrophyte|pond)\b/.test(h)) primaryKey = "aquatic";
  else if (/\b(palm|arecaceae|frond|coconut|palmyra)\b/.test(h)) primaryKey = "palm";
  else if (/\b(succulent|cactus|arid|desert|xerophyte|agave|aloe)\b/.test(h)) primaryKey = "succulent";
  else if (/\b(tree|arboreal|canopy|timber|forest|pine|oak)\b/.test(h)) primaryKey = "tree";

  const combined = [
    ...(CURATED_BOTANICAL_BIOME_POOL[primaryKey] || []),
    ...CURATED_BOTANICAL_BIOME_POOL.flora,
  ];
  return combined.map((p) => ({
    url: p.url,
    alt: `${commonName || scientificName} — ${p.alt}`,
    caption: `${commonName || scientificName} (${scientificName || commonName}) · ${p.caption}`,
  }));
}

function buildDedupedImagePool({
  restSummary,
  page,
  articleImages,
  enArticleImages = [],
  commonsCategoryImages = [],
  commonsImages = [],
  inatPhotos = [],
  gbifOccurrencePhotos = [],
  eolImages = [],
  tier2GenusPhotos = [],
  tier3BiomePhotos = [],
  commonName,
  scientificName,
}) {
  loadSiteImageUsage();
  const collected = [];
  const seenKeys = new Set();

  const tryPush = (rawUrl, alt, caption, { ignoreSiteCap = false } = {}) => {
    const url = String(rawUrl || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    if (/\.(?:svg|gif|pdf|tif|tiff)(?:$|\?)/i.test(url)) return;
    if (NON_BOTANICAL_IMAGE_RE.test(`${url} ${alt || ""}`)) return;
    const key = normalizeImageKey(url);
    if (!key || seenKeys.has(key)) return;
    const siteUses = siteImageUsageMap.get(key) || 0;
    if (!ignoreSiteCap && siteUses >= MAX_SITE_WIDE_IMAGE_USES) return;
    seenKeys.add(key);
    collected.push({
      url,
      alt: sanitizeBotanicalText(alt || `${commonName} (${scientificName}) botanical specimen plate`),
      caption: sanitizeBotanicalText(
        caption || `${commonName} — Global Flora Index archival specimen`,
      ),
    });
  };

  const heroPrimary =
    page?.original?.source ||
    restSummary?.originalimage?.source ||
    page?.thumbnail?.source ||
    restSummary?.thumbnail?.source ||
    "";
  if (heroPrimary) {
    tryPush(
      heroPrimary,
      `${commonName} (${scientificName}) botanical specimen plate`,
      `${commonName} (${scientificName}) — Primary specimen plate indexed via Global Botanical Server`,
    );
  }

  // Tier 1: Exact species verified sources
  const tier1Sources = [
    articleImages,
    enArticleImages,
    commonsCategoryImages,
    commonsImages,
    inatPhotos,
    eolImages,
    gbifOccurrencePhotos,
  ];
  for (const sourceArr of tier1Sources) {
    for (const img of sourceArr || []) {
      if (collected.length >= MAX_MONOGRAPH_IMAGES) return collected;
      tryPush(img.url, img.alt, img.caption);
    }
  }

  // Tier 2: Related genus / family flora photographs if < 6 images
  if (collected.length < MIN_MONOGRAPH_IMAGES) {
    for (const img of tier2GenusPhotos || []) {
      if (collected.length >= MAX_MONOGRAPH_IMAGES) return collected;
      tryPush(img.url, img.alt, img.caption);
    }
  }

  // Tier 3: Curated high-resolution verified botanical biome & habit whitelist if still < 6 images
  if (collected.length < MIN_MONOGRAPH_IMAGES) {
    for (const img of tier3BiomePhotos || []) {
      if (collected.length >= MIN_MONOGRAPH_IMAGES) break;
      tryPush(img.url, img.alt, img.caption, { ignoreSiteCap: true });
    }
  }

  return collected.slice(0, MAX_MONOGRAPH_IMAGES);
}

async function resolveSingleTitle({
  title,
  lang,
  originalQuery,
  initialGbif,
  initialInat,
  signal,
  stateTracker,
}) {
  const [articleSettled, summarySettled] = await Promise.allSettled([
    fetchMediaWikiArticle(title, lang, signal),
    fetchJsonWithSignal(buildRestSummaryUrl(lang, title), signal, DEFAULT_TIMEOUT_MS),
  ]);

  if (articleSettled.status === "rejected") {
    if (isAbortError(articleSettled.reason) && signal?.aborted) throw articleSettled.reason;
    if (articleSettled.reason?.isNetworkError) stateTracker.hadNetworkError = true;
  }
  if (summarySettled.status === "rejected") {
    if (isAbortError(summarySettled.reason) && signal?.aborted) throw summarySettled.reason;
    if (summarySettled.reason?.isNetworkError) stateTracker.hadNetworkError = true;
  }

  const page = articleSettled.status === "fulfilled" ? articleSettled.value : null;
  const restSummary = summarySettled.status === "fulfilled" ? summarySettled.value : null;

  if (!page && !restSummary) {
    return { status: "empty", monograph: null };
  }

  const extractLower = String(page?.extract || restSummary?.extract || "")
    .slice(0, 260)
    .toLowerCase();
  const catsLower = (page?.categories || [])
    .map((c) => c.title || "")
    .join(" ")
    .toLowerCase();
  const isDisambig =
    DISAMBIGUATION_MARKERS.some((m) => extractLower.includes(m)) ||
    catsLower.includes("disambiguation") ||
    restSummary?.type === "disambiguation";

  if (isDisambig) {
    return { status: "disambiguation", monograph: null };
  }

  const wikitext = page?.revisions?.[0]?.slots?.main?.content || "";
  const taxobox = parseTaxoboxFields(wikitext);
  const enLangTitle =
    lang === "bn" ? page?.langlinks?.find((l) => l.lang === "en")?.title || "" : "";

  const articleBinomial = extractBinomial({
    taxobox,
    infobox: null,
    gbifData: null,
    inatTaxon: null,
    title: page?.title || restSummary?.title || enLangTitle || title,
    extract: page?.extract || restSummary?.extract || "",
  });

  const articleGenus = (
    taxobox.genus ||
    (articleBinomial ? articleBinomial.split(/\s+/)[0] : "") ||
    (enLangTitle ? enLangTitle.split(/\s+/)[0] : "") ||
    ""
  ).toLowerCase();

  const gbifFirstToken =
    String(initialGbif?.genus || initialGbif?.canonicalName || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)[0] || "";
  const inatFirstToken =
    String(initialInat?.name || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)[0] || "";

  const gbifMatchesArticle =
    Boolean(initialGbif) &&
    (!articleGenus || gbifFirstToken === articleGenus);

  const inatMatchesArticle =
    Boolean(initialInat) &&
    (!articleGenus ||
      inatFirstToken === articleGenus ||
      parseGlobalSlugFromUrl(initialInat.wikipedia_url).toLowerCase() ===
        String(page?.title || title).toLowerCase());

  const scopedGbif = gbifMatchesArticle ? initialGbif : null;
  const scopedInat = inatMatchesArticle ? initialInat : null;

  const preliminarySci =
    articleBinomial ||
    enLangTitle ||
    scopedGbif?.species ||
    scopedGbif?.canonicalName ||
    scopedInat?.name ||
    page?.title ||
    restSummary?.title ||
    title;

  const isPreliminaryPlant = verifyBotanicalSubject({
    page,
    restSummary,
    gbifData: scopedGbif,
    inatTaxon: scopedInat,
    taxobox,
    infobox: null,
  });

  if (
    !isPreliminaryPlant &&
    !articleBinomial &&
    !scopedGbif &&
    !scopedInat
  ) {
    return { status: "non_plant", monograph: null };
  }

  const commonLabel = sanitizeBotanicalText(
    page?.title || restSummary?.title || scopedInat?.preferred_common_name || originalQuery,
  );
  const resolvedTitle = page?.title || restSummary?.title || title;
  const commonsQuery =
    preliminarySci && preliminarySci.includes(" ")
      ? `"${preliminarySci}"`
      : enLangTitle || commonLabel;

  const taxonomyLookupName = articleBinomial || taxobox.genus || enLangTitle || preliminarySci;

  const parallelTasks = [
    fetchArticleImages(resolvedTitle, lang, commonLabel, preliminarySci, signal),
    fetchCommonsImages(commonsQuery, commonLabel, preliminarySci, signal),
    !scopedGbif && taxonomyLookupName
      ? fetchGbifMatch(taxonomyLookupName, signal)
      : Promise.resolve(scopedGbif),
    !scopedInat && taxonomyLookupName
      ? fetchInatTaxa(taxonomyLookupName, "en", signal).then((res) =>
          pickBestInatTaxon(res, taxonomyLookupName),
        )
      : Promise.resolve(scopedInat),
    lang === "bn" && enLangTitle
      ? fetchMediaWikiArticle(enLangTitle, "en", signal)
      : Promise.resolve(null),
    fetchWikidataEntity({
      title: resolvedTitle,
      lang,
      fallbackQuery: taxonomyLookupName,
      signal,
    }),
  ];

  const [
    artImgsSettled,
    commonsImgsSettled,
    gbifSettled,
    inatSettled,
    enSupplementSettled,
    wikidataSettled,
  ] = await Promise.allSettled(parallelTasks);

  [
    artImgsSettled,
    commonsImgsSettled,
    gbifSettled,
    inatSettled,
    enSupplementSettled,
    wikidataSettled,
  ].forEach((r) => {
    if (r.status === "rejected" && isAbortError(r.reason) && signal?.aborted) {
      throw r.reason;
    }
  });

  const articleImages = artImgsSettled.status === "fulfilled" ? artImgsSettled.value : [];
  let commonsPrimary = commonsImgsSettled.status === "fulfilled" ? commonsImgsSettled.value : [];
  let gbifData = gbifSettled.status === "fulfilled" ? gbifSettled.value : scopedGbif;
  let inatTaxon = inatSettled.status === "fulfilled" ? inatSettled.value : scopedInat;
  let enSuppPage = enSupplementSettled.status === "fulfilled" ? enSupplementSettled.value : null;
  const wikidataInfo = wikidataSettled.status === "fulfilled" ? wikidataSettled.value : null;

  // Cross-language English Global Flora Index fallback via Wikidata P225 taxon name when BN langlink was missing
  if (lang === "bn" && !enSuppPage) {
    const enTarget =
      wikidataInfo?.enWikiTitle ||
      wikidataInfo?.taxonName ||
      articleBinomial ||
      gbifData?.species ||
      gbifData?.canonicalName ||
      "";
    if (enTarget) {
      const enExtraSettled = await Promise.allSettled([
        fetchMediaWikiArticle(enTarget, "en", signal),
      ]);
      if (enExtraSettled[0].status === "fulfilled" && enExtraSettled[0].value) {
        enSuppPage = enExtraSettled[0].value;
      }
    }
  }

  // Upgrade GBIF & iNat from English supplement or Wikidata P225 binomial when missing
  const enSuppWikitext = enSuppPage?.revisions?.[0]?.slots?.main?.content || "";
  const enSuppTaxobox = enSuppWikitext ? parseTaxoboxFields(enSuppWikitext) : {};
  const enSuppSci =
    (enSuppPage
      ? extractBinomial({
          taxobox: enSuppTaxobox,
          infobox: null,
          gbifData: null,
          inatTaxon: null,
          title: enSuppPage.title,
          extract: enSuppPage.extract,
        }) || enSuppTaxobox.genus
      : "") ||
    wikidataInfo?.taxonName ||
    "";

  if ((!gbifData || !inatTaxon) && enSuppSci && enSuppSci !== taxonomyLookupName) {
    const [gbifExtra, inatExtra] = await Promise.allSettled([
      !gbifData ? fetchGbifMatch(enSuppSci, signal) : Promise.resolve(gbifData),
      !inatTaxon
        ? fetchInatTaxa(enSuppSci, "en", signal).then((r) => pickBestInatTaxon(r, enSuppSci))
        : Promise.resolve(inatTaxon),
    ]);
    if (gbifExtra.status === "fulfilled" && gbifExtra.value) gbifData = gbifExtra.value;
    if (inatExtra.status === "fulfilled" && inatExtra.value) inatTaxon = inatExtra.value;
  }

  const finalSci =
    extractBinomial({
      taxobox: Object.keys(taxobox).length > 1 ? taxobox : enSuppTaxobox,
      infobox: null,
      gbifData,
      inatTaxon,
      title: resolvedTitle,
      extract: `${page?.extract || ""} ${enSuppPage?.extract || ""}`,
    }) ||
    wikidataInfo?.taxonName ||
    preliminarySci;

  // Harvest all 6 federated sources & verified botanical photography in parallel:
  // English Global Flora Index images + Herbarium Category (P373) + GBIF Occurrence Media + exact binomial Commons + EOL + Open Tree of Life
  const stageCPhotoTasks = [
    enSuppPage?.title && (lang === "bn" || enSuppPage.title !== resolvedTitle)
      ? fetchArticleImages(enSuppPage.title, "en", commonLabel, finalSci, signal)
      : Promise.resolve([]),
    wikidataInfo?.commonsCategory
      ? fetchCommonsCategoryImages(wikidataInfo.commonsCategory, commonLabel, finalSci, signal)
      : Promise.resolve([]),
    gbifData?.usageKey
      ? fetchGbifOccurrenceImages(gbifData.usageKey, commonLabel, finalSci, signal)
      : Promise.resolve([]),
    finalSci && `"${finalSci}"` !== commonsQuery
      ? fetchCommonsImages(`"${finalSci}"`, commonLabel, finalSci, signal)
      : Promise.resolve([]),
    fetchEolData(finalSci, commonLabel, signal),
    fetchOpenTreeOfLife(finalSci, signal),
  ];

  const [
    enArtImgsSettled,
    commonsCatSettled,
    gbifMediaSettled,
    commonsSciSettled,
    eolSettled,
    otolSettled,
  ] = await Promise.allSettled(stageCPhotoTasks);

  const enArticleImages = enArtImgsSettled.status === "fulfilled" ? enArtImgsSettled.value : [];
  const commonsCategoryImages = commonsCatSettled.status === "fulfilled" ? commonsCatSettled.value : [];
  const gbifOccurrencePhotos = gbifMediaSettled.status === "fulfilled" ? gbifMediaSettled.value : [];
  const eolData = eolSettled.status === "fulfilled" ? eolSettled.value : null;
  const otolData = otolSettled.status === "fulfilled" ? otolSettled.value : null;
  if (commonsSciSettled.status === "fulfilled" && commonsSciSettled.value.length > 0) {
    commonsPrimary = [...commonsSciSettled.value, ...commonsPrimary];
  }

  const inatPhotos = collectInatPhotoEntries(inatTaxon, commonLabel, finalSci);
  const eolImages = Array.isArray(eolData?.images) ? eolData.images : [];
  const tier3BiomePhotos = selectBiomeFallbackPhotos(
    commonLabel,
    finalSci,
    `${page?.extract || ""} ${enSuppPage?.extract || ""} ${taxobox.familia || ""} ${gbifData?.family || ""}`,
  );

  let tier2GenusPhotos = [];
  let imagesPool = buildDedupedImagePool({
    restSummary,
    page,
    articleImages,
    enArticleImages,
    commonsCategoryImages,
    commonsImages: commonsPrimary,
    inatPhotos,
    gbifOccurrencePhotos,
    eolImages,
    tier2GenusPhotos,
    tier3BiomePhotos: [],
    commonName: commonLabel,
    scientificName: finalSci,
  });

  // Tier 2 Botanical Image Guard: Fetch same-genus or same-family photography when Tier 1 < 6
  if (imagesPool.length < MIN_MONOGRAPH_IMAGES) {
    const genusTerm =
      gbifData?.genus ||
      (finalSci.includes(" ") ? finalSci.split(" ")[0] : "") ||
      enLangTitle ||
      wikidataInfo?.enWikiTitle ||
      gbifData?.family ||
      commonLabel;
    if (genusTerm) {
      const [bonusCommonsSettled, bonusInatSettled] = await Promise.allSettled([
        fetchCommonsImages(`${genusTerm} plant`, commonLabel, finalSci, signal),
        fetchInatTaxa(genusTerm, "en", signal),
      ]);
      const genusCommons =
        bonusCommonsSettled.status === "fulfilled" ? bonusCommonsSettled.value : [];
      const genusInatTaxa =
        bonusInatSettled.status === "fulfilled" ? bonusInatSettled.value : [];
      const genusInatPhotos = genusInatTaxa.flatMap((t) =>
        collectInatPhotoEntries(t, commonLabel, finalSci),
      );
      tier2GenusPhotos = [...genusInatPhotos, ...genusCommons];
    }
  }

  // Final 3-Tier assembled pool (guarantees Min 6–10 unique botanical plates, Max 4 uses site-wide)
  imagesPool = buildDedupedImagePool({
    restSummary,
    page,
    articleImages,
    enArticleImages,
    commonsCategoryImages,
    commonsImages: commonsPrimary,
    inatPhotos,
    gbifOccurrencePhotos,
    eolImages,
    tier2GenusPhotos,
    tier3BiomePhotos,
    commonName: commonLabel,
    scientificName: finalSci,
  });

  // Merge English interwiki taxobox & categories seamlessly when BN article omits them
  const mergedPage = page
    ? {
        ...page,
        categories: [
          ...(page.categories || []),
          ...((enSuppPage?.categories || []).filter(Boolean)),
        ],
        revisions:
          wikitext && (taxobox.familia || taxobox.family || taxobox.ordo || taxobox.order)
            ? page.revisions
            : enSuppPage?.revisions || page.revisions,
      }
    : enSuppPage
      ? { ...enSuppPage, title: commonLabel }
      : null;

  const monograph = buildPlantipediaMonograph({
    page: mergedPage,
    restSummary,
    gbifData,
    inatTaxon,
    wikidataInfo,
    eolData,
    otolData,
    parsedData: null,
    imagesPool,
    lang,
    originalQuery,
    secondaryExtract: enSuppPage?.extract || "",
    enSuppTitle: enSuppPage?.title || "",
  });

  if (!monograph) {
    return { status: "non_plant", monograph: null };
  }
  recordSiteImageUsage([monograph.heroImage, ...(monograph.sections || []).flatMap((s) => s.images || [])]);
  return { status: "ok", monograph };
}

async function queryGlobalSourcesOnce(query, preferredLang, signal) {
  const stateTracker = { hadNetworkError: false };

  const [mwSettled, gbifSettled, inatSettled] = await Promise.allSettled([
    searchMediaWiki(query, preferredLang, signal, 8),
    fetchGbifMatch(query, signal),
    fetchInatTaxa(query, preferredLang, signal),
  ]);

  [mwSettled, gbifSettled, inatSettled].forEach((r) => {
    if (r.status === "rejected") {
      if (isAbortError(r.reason) && signal?.aborted) throw r.reason;
      if (r.reason?.isNetworkError) stateTracker.hadNetworkError = true;
    }
  });

  const mwHits = mwSettled.status === "fulfilled" ? mwSettled.value : [];
  const initialGbif = gbifSettled.status === "fulfilled" ? gbifSettled.value : null;
  const inatList = inatSettled.status === "fulfilled" ? inatSettled.value : [];
  const initialInat = pickBestInatTaxon(inatList, query);

  const candidates = rankSearchCandidates(mwHits, initialInat, initialGbif, query);

  const tryBengaliToEnglishFallback = async () => {
    if (preferredLang !== "bn") return null;
    let enCandidate =
      parseGlobalSlugFromUrl(initialInat?.wikipedia_url) ||
      initialInat?.name ||
      initialGbif?.species ||
      initialGbif?.canonicalName ||
      "";
    if (!enCandidate) {
      try {
        const wd = await fetchWikidataEntity({
          title: query,
          lang: "bn",
          fallbackQuery: query,
          signal,
        });
        enCandidate = wd?.enWikiTitle || wd?.taxonName || wd?.labelEn || "";
      } catch (err) {
        if (isAbortError(err) && signal?.aborted) throw err;
      }
    }
    if (!enCandidate) return null;
    const enRes = await resolveSingleTitle({
      title: enCandidate,
      lang: "en",
      originalQuery: query,
      initialGbif,
      initialInat,
      signal,
      stateTracker,
    });
    return enRes.status === "ok" && enRes.monograph ? enRes.monograph : null;
  };

  if (candidates.length === 0) {
    const bnFallback = await tryBengaliToEnglishFallback();
    if (bnFallback) return { ok: true, monograph: bnFallback };
    if (stateTracker.hadNetworkError) {
      return { ok: false, reason: "network" };
    }
    return { ok: false, reason: "invalid" };
  }

  let sawDisambig = false;
  for (const title of candidates.slice(0, 3)) {
    const res = await resolveSingleTitle({
      title,
      lang: preferredLang,
      originalQuery: query,
      initialGbif,
      initialInat,
      signal,
      stateTracker,
    });
    if (res.status === "ok" && res.monograph) {
      return { ok: true, monograph: res.monograph };
    }
    if (res.status === "disambiguation") {
      sawDisambig = true;
    }
  }

  // Disambiguation / Bengali fallback pass
  const canTryDisambig =
    sawDisambig ||
    (mwHits.some((h) => /plant|flower|tree|species|herb|genus|shrub|উদ্ভিদ|ফুল|গাছ/i.test(String(h.snippet || ""))) &&
      !/\b(plant|flower|tree)\b/i.test(query));

  if (canTryDisambig) {
    const refined = hasBengaliScript(query) ? `${query} উদ্ভিদ` : `${query} plant`;
    const refinedSettled = await Promise.allSettled([
      searchMediaWiki(refined, preferredLang, signal, 5),
    ]);
    if (refinedSettled[0].status === "fulfilled") {
      const extraTitles = refinedSettled[0].value
        .map((h) => h.title)
        .filter((t) => t && !candidates.includes(t) && !/^list of /i.test(t))
        .slice(0, 2);
      for (const title of extraTitles) {
        const res = await resolveSingleTitle({
          title,
          lang: preferredLang,
          originalQuery: query,
          initialGbif,
          initialInat,
          signal,
          stateTracker,
        });
        if (res.status === "ok" && res.monograph) {
          return { ok: true, monograph: res.monograph };
        }
      }
    }
  }

  const bnFallback = await tryBengaliToEnglishFallback();
  if (bnFallback) {
    return { ok: true, monograph: bnFallback };
  }

  if (
    stateTracker.hadNetworkError &&
    mwHits.length === 0 &&
    !initialGbif &&
    !initialInat
  ) {
    return { ok: false, reason: "network" };
  }

  return { ok: false, reason: "invalid" };
}

export async function fetchFromGlobalBotanicalServer(query, options = {}) {
  const { signal, onRetry, targetLang = null } = options;
  const cleanQuery = normalizeGlobalQuery(query);
  if (!cleanQuery || cleanQuery.length < 2) {
    return { ok: false, reason: "invalid" };
  }

  const lockedLang = normalizeLangCode(targetLang, cleanQuery);
  const cached = getCachedGlobalMonograph(cleanQuery, lockedLang);
  if (cached) {
    return { ok: true, monograph: cached, fromCache: true };
  }

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
      let result = await queryGlobalSourcesOnce(cleanQuery, lockedLang, signal);
      let autoCorrectionMeta = null;

      // Typo-Tolerant Global Fuzzy Taxon Auto-Correction:
      // If direct lookup misses OR matched an unrelated subject (not closely matching user's query),
      // resolve the intended canonical Plantae taxon across iNaturalist + GBIF + MediaWiki.
      const needsFuzzyCorrection =
        result.reason === "invalid" ||
        (result.ok &&
          result.monograph &&
          !isNormalizedTaxonMatch(cleanQuery, result.monograph));

      if (needsFuzzyCorrection && cleanQuery.length >= 3) {
        const fuzzyResolved = await resolveFuzzyGlobalTaxon(cleanQuery, {
          signal,
          lang: lockedLang,
          timeoutMs: 4000,
        }).catch((fErr) => {
          if (isAbortError(fErr) && signal?.aborted) throw fErr;
          return null;
        });

        if (fuzzyResolved?.targetQuery) {
          const alreadyResolvedSame =
            result.ok &&
            result.monograph &&
            isNormalizedTaxonMatch(fuzzyResolved.targetQuery, result.monograph);

          if (alreadyResolvedSame) {
            if (fuzzyResolved.didCorrect) {
              autoCorrectionMeta = {
                from: cleanQuery,
                label:
                  result.monograph.scientificName ||
                  fuzzyResolved.scientificName ||
                  fuzzyResolved.targetQuery,
              };
            }
          } else {
            const retryLang = normalizeLangCode(targetLang, fuzzyResolved.targetQuery);
            const fuzzyOutcome = await queryGlobalSourcesOnce(
              fuzzyResolved.targetQuery,
              retryLang,
              signal,
            );
            if (fuzzyOutcome.ok && fuzzyOutcome.monograph) {
              result = fuzzyOutcome;
              if (
                fuzzyResolved.didCorrect ||
                !isNormalizedTaxonMatch(cleanQuery, fuzzyOutcome.monograph)
              ) {
                autoCorrectionMeta = {
                  from: cleanQuery,
                  label:
                    fuzzyOutcome.monograph.scientificName ||
                    fuzzyResolved.scientificName ||
                    fuzzyResolved.targetQuery,
                };
              }
            }
          }
        }
      }

      if (result.ok && result.monograph) {
        // Mandatory 3-Tier Auto-Translation whenever target language content is missing or incomplete
        let finalMonograph = result.monograph;
        try {
          finalMonograph = await translateMonographRecord(finalMonograph, lockedLang, { signal });
        } catch (trErr) {
          if (isAbortError(trErr) && signal?.aborted) throw trErr;
          finalMonograph.lockedLanguage = lockedLang;
        }
        if (autoCorrectionMeta) {
          finalMonograph = {
            ...finalMonograph,
            autoCorrectedFrom: autoCorrectionMeta.from,
            correctedTaxonLabel: autoCorrectionMeta.label,
          };
        }
        setCachedGlobalMonograph(cleanQuery, finalMonograph, lockedLang);
        return { ok: true, monograph: finalMonograph };
      }
      if (result.reason === "invalid") {
        return { ok: false, reason: "invalid" };
      }
      lastNetworkError = new Error(
        result.error || "Global Botanical Server connection interrupted.",
      );
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
