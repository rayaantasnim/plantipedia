/**
 * PLANTIPEDIA — 3-TIER ZERO-KEY BOTANICAL TRANSLATION ENGINE
 * Tier 1: Google Translate Free GTX Endpoint (paragraph-chunked + cached)
 * Tier 2: MyMemory Public Translation API Fallback
 * Tier 3: Curated EN ↔ বাংলা Botanical Glossary & Post-Processor
 *
 * Strictly protects Latin binomial nomenclature & italicized scientific names.
 */

const BENGALI_SCRIPT_RE = /[\u0980-\u09FF]/;
const LATIN_BINOMIAL_RE =
  /\b([A-Z][a-z]{2,}\s+[a-z]{3,}(?:\s+(?:var\.|subsp\.|f\.)\s+[a-z]{2,})?)\b/g;

const SESSION_CACHE_PREFIX = "plantipedia_tr_v1_";
const MAX_SESSION_ENTRIES = 180;
const memoryCache = new Map();

const EN_TO_BN_GLOSSARY = [
  ["Hero & Botanical Classification", "পরিচিতি ও উদ্ভিদতাত্ত্বিক শ্রেণিবিন্যাস"],
  ["Morphology & Vegetative Anatomy", "অঙ্গসংস্থান ও উদ্ভিদ-শারীরস্থান"],
  ["Taxonomy & Phylogenetic Lineage", "শ্রেণিবিন্যাস ও জাতিজনিক ধারা"],
  ["Native Distribution & Geography", "উৎপত্তি, বাসস্থান ও ভৌগোলিক বিস্তার"],
  ["Pollination & Ecological Guilds", "পরাগায়ন ও বাস্তুতান্ত্রিক ভূমিকা"],
  ["Economic & Cultural Significance", "অর্থনৈতিক, কৃষি ও সাংস্কৃতিক গুরুত্ব"],
  ["Phytochemistry & Medicinal Uses", "উদ্ভিদ-রসায়ন ও ভেষজ ব্যবহার"],
  ["Soil, Water & Monsoon Care", "মাটি, জলসেচ ও মৌসুমি পরিচর্যা"],
  ["Phenology & Seasonal Cycles", "ঋতুভিত্তিক পুষ্পায়ন ও বৃদ্ধিচক্র"],
  ["Propagation & Seed Biology", "বংশবিস্তার, বীজ ও অঙ্কুরোদগম"],
  ["Pathology, Pests & IPM Defense", "রোগবালাই, পোকামাকড় ও জৈব সুরক্ষা"],
  ["Conservation & Climate Resilience", "সংরক্ষণ অবস্থা ও জলবায়ু সহনশীলতা"],
  ["Cultivation Specs & Live Telemetry", "চাষাবাদ নির্দেশিকা ও পরিবেশগত পরিমিতি"],
  ["Evolutionary Genetics & Ploidy", "বিবর্তনীয় জিনতত্ত্ব ও ক্রোমোজোম বিন্যাস"],
  ["Field Identification & Diagnostic Key", "মাঠপর্যায়ে শনাক্তকরণ ও বৈশিষ্ট্যসূচক চাবি"],
  ["Scientific Name", "বৈজ্ঞানিক নাম"],
  ["Plant Group", "উদ্ভিদ গোষ্ঠী"],
  ["Plant Family", "উদ্ভিদ গোত্র"],
  ["Growth Form", "বৃদ্ধির ধরন"],
  ["Native Origin", "আদি উৎস ও বিস্তার"],
  ["Common Uses", "প্রচলিত ব্যবহার"],
  ["Kingdom", "জগৎ"],
  ["Phylum", "পর্ব"],
  ["Class", "শ্রেণি"],
  ["Order", "বর্গ"],
  ["Family", "গোত্র"],
  ["Genus", "গণ"],
  ["Species", "প্রজাতি"],
  ["Angiosperms", "আবৃতবীজী উদ্ভিদ"],
  ["Gymnosperms", "নগ্নবীজী উদ্ভিদ"],
  ["Eudicots", "দ্বিবীজপত্রী"],
  ["Monocots", "একবীজপত্রী"],
  ["Flowering Plant", "সপুষ্পক উদ্ভিদ"],
  ["Herbaceous Perennial", "বহুবর্ষজীবী বিরুৎ"],
  ["Perennial Shrub", "বহুবর্ষজীবী গুল্ম"],
  ["Evergreen Tree", "চিরসবুজ বৃক্ষ"],
  ["Deciduous Tree", "পর্ণমোচী বৃক্ষ"],
  ["Full Sun", "পূর্ণ সূর্যালোক"],
  ["Partial Shade", "আংশিক ছায়া"],
  ["Bright Indirect Light", "উজ্জ্বল পরোক্ষ আলো"],
  ["Moderate Watering", "পরিমিত জলসেচ"],
  ["Low Watering", "স্বল্প জলসেচ"],
  ["High Moisture", "উচ্চ আর্দ্রতা ও জলসেচ"],
  ["Well-drained Loam", "সুনিষ্কাশিত দোআঁশ মাটি"],
  ["Medicinal & Ornamental", "ভেষজ ও আলংকারিক ব্যবহার"],
  ["Tropical & Subtropical", "গ্রীষ্মমণ্ডলীয় ও উপ-গ্রীষ্মমণ্ডলীয়"],
];

const BN_TO_EN_GLOSSARY = EN_TO_BN_GLOSSARY.map(([en, bn]) => [bn, en]);

export function detectLanguage(text) {
  return BENGALI_SCRIPT_RE.test(String(text || "")) ? "bn" : "en";
}

export function normalizeLangCode(lang, fallbackText = "") {
  const clean = String(lang || "").trim().toLowerCase();
  if (clean === "bn" || clean === "en") return clean;
  return detectLanguage(fallbackText);
}

function getCacheKey(text, sourceLang, targetLang) {
  return `${sourceLang}->${targetLang}::${text}`;
}

function readCachedTranslation(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    if (typeof sessionStorage !== "undefined") {
      const val = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key.slice(0, 120)}_${hashString(key)}`);
      if (val) {
        memoryCache.set(key, val);
        return val;
      }
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
  return null;
}

function writeCachedTranslation(key, value) {
  memoryCache.set(key, value);
  try {
    if (typeof sessionStorage !== "undefined" && value && value.length < 4000) {
      if (memoryCache.size > MAX_SESSION_ENTRIES) {
        const firstKey = memoryCache.keys().next().value;
        if (firstKey) memoryCache.delete(firstKey);
      }
      sessionStorage.setItem(
        `${SESSION_CACHE_PREFIX}${key.slice(0, 120)}_${hashString(key)}`,
        value,
      );
    }
  } catch {
    // Non-blocking cache write
  }
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function protectLatinBinomials(text, extraNames = []) {
  const input = String(text || "");
  if (!input) return { maskedText: "", tokens: [] };

  const tokens = [];
  const tokenMap = new Map();
  const stashToken = (raw) => {
    const clean = String(raw || "").trim();
    if (!clean) return raw;
    if (tokenMap.has(clean)) return tokenMap.get(clean);
    const placeholder = `[[PTX_${tokens.length}]]`;
    tokens.push({ placeholder, value: clean });
    tokenMap.set(clean, placeholder);
    return placeholder;
  };

  let working = input;

  const uniqueExtra = [...new Set((extraNames || []).map((n) => String(n || "").trim()).filter((n) => n.length >= 4))]
    .sort((a, b) => b.length - a.length);

  uniqueExtra.forEach((name) => {
    if (!name || BENGALI_SCRIPT_RE.test(name)) return;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "g");
    working = working.replace(re, (match) => stashToken(match));
  });

  working = working.replace(LATIN_BINOMIAL_RE, (match) => {
    // Only protect genuine binomial-looking pairs, avoiding plain English capitalized headers
    const words = match.split(/\s+/);
    const first = words[0];
    const second = words[1] || "";
    const commonCapWords = new Set([
      "The", "This", "That", "These", "Those", "Native", "Global", "South", "East", "West", "North",
      "Plant", "Plants", "Leaf", "Leaves", "Flower", "Flowers", "Fruit", "Fruits", "Seed", "Seeds",
      "Botanical", "Section", "Chapter", "Cultivation", "Soil", "Water", "Full", "Partial", "Moderate",
      "Bengal", "India", "Asia", "Tropical", "Subtropical", "Common", "Economic", "Medicinal",
    ]);
    if (commonCapWords.has(first) || !/^[a-z]{3,}$/.test(second)) {
      return match;
    }
    return stashToken(match);
  });

  return { maskedText: working, tokens };
}

function restoreProtectedTokens(text, tokens) {
  let out = String(text || "");
  (tokens || []).forEach(({ placeholder, value }) => {
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fuzzy = escaped.replace("\\[\\[", "\\[\\s*\\[").replace("\\]\\]", "\\]\\s*\\]");
    out = out.replace(new RegExp(fuzzy, "g"), value);
  });
  return out;
}

export function applyGlossaryFallback(text, targetLang) {
  let out = String(text || "");
  const pairs = targetLang === "bn" ? EN_TO_BN_GLOSSARY : BN_TO_EN_GLOSSARY;
  pairs.forEach(([src, dest]) => {
    if (!src || !dest) return;
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = targetLang === "bn" ? new RegExp(`\\b${escaped}\\b`, "gi") : new RegExp(escaped, "g");
    out = out.replace(re, dest);
  });
  return out;
}

function splitTextIntoChunks(text, maxLen = 780) {
  const clean = String(text || "").trim();
  if (!clean || clean.length <= maxLen) return clean ? [clean] : [];

  const sentences = clean.match(/[^.!?।\n]+[.!?।\n]*/g) || [clean];
  const chunks = [];
  let buf = "";

  sentences.forEach((sentence) => {
    if ((buf + sentence).length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = sentence;
    } else {
      buf += sentence;
    }
  });
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

async function fetchGoogleTranslateChunk(chunk, sourceLang, targetLang, signal) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
    sourceLang,
  )}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(chunk)}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5500);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`GTX HTTP ${res.status}`);
    const json = await res.json();
    const segments = Array.isArray(json?.[0]) ? json[0] : [];
    const combined = segments.map((s) => (Array.isArray(s) ? s[0] || "" : "")).join("").trim();
    if (!combined) throw new Error("Empty GTX response");
    return { text: combined, tier: "google-gtx" };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function fetchMyMemoryChunk(chunk, sourceLang, targetLang, signal) {
  const clipped = chunk.slice(0, 480);
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    clipped,
  )}&langpair=${encodeURIComponent(`${sourceLang}|${targetLang}`)}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 5500);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);
    const json = await res.json();
    const translated = String(json?.responseData?.translatedText || "").trim();
    if (!translated || /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(translated)) {
      throw new Error("MyMemory unavailable");
    }
    return { text: translated, tier: "mymemory" };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function translateText(
  text,
  targetLang,
  { sourceLang = null, protectedTerms = [], signal = null } = {},
) {
  const raw = String(text || "").trim();
  if (!raw) return { text: "", tier: "passthrough" };

  const target = normalizeLangCode(targetLang, raw);
  const detectedSource = sourceLang ? normalizeLangCode(sourceLang, raw) : detectLanguage(raw);

  // If already predominantly in target language, skip translation
  if (target === "bn" && BENGALI_SCRIPT_RE.test(raw)) {
    const bnChars = (raw.match(/[\u0980-\u09FF]/g) || []).length;
    const latinWords = (raw.match(/\b[A-Za-z]{4,}\b/g) || []).length;
    if (bnChars > 18 && latinWords < 8) {
      return { text: raw, tier: "native" };
    }
  } else if (target === "en" && !BENGALI_SCRIPT_RE.test(raw)) {
    return { text: raw, tier: "native" };
  }

  const effectiveSource = detectedSource === target ? (target === "bn" ? "en" : "bn") : detectedSource;
  const cacheKey = getCacheKey(raw, effectiveSource, target);
  const cached = readCachedTranslation(cacheKey);
  if (cached) return { text: cached, tier: "cache" };

  const { maskedText, tokens } = protectLatinBinomials(raw, protectedTerms);
  const chunks = splitTextIntoChunks(maskedText, 760);
  const translatedChunks = [];
  let usedTier = "glossary";

  for (const chunk of chunks) {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    try {
      const res = await fetchGoogleTranslateChunk(chunk, effectiveSource, target, signal);
      translatedChunks.push(res.text);
      usedTier = res.tier;
    } catch {
      if (signal?.aborted) throw new Error("Aborted");
      try {
        const res2 = await fetchMyMemoryChunk(chunk, effectiveSource, target, signal);
        translatedChunks.push(res2.text);
        usedTier = res2.tier;
      } catch {
        translatedChunks.push(applyGlossaryFallback(chunk, target));
        usedTier = "glossary";
      }
    }
  }

  let finalOut = restoreProtectedTokens(translatedChunks.join(" "), tokens);
  finalOut = applyGlossaryFallback(finalOut, target).replace(/\s{2,}/g, " ").trim();

  if (finalOut) {
    writeCachedTranslation(cacheKey, finalOut);
  }
  return { text: finalOut || raw, tier: usedTier };
}

export async function translateBatch(
  texts,
  targetLang,
  { sourceLang = null, protectedTerms = [], signal = null, concurrency = 4 } = {},
) {
  const list = Array.isArray(texts) ? texts : [];
  const results = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      if (signal?.aborted) return;
      const idx = cursor;
      cursor += 1;
      const item = list[idx];
      if (!item || !String(item).trim()) {
        results[idx] = { text: item || "", tier: "empty" };
        continue;
      }
      results[idx] = await translateText(item, targetLang, {
        sourceLang,
        protectedTerms,
        signal,
      });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, list.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}

function collectLatinProtectionList(monograph) {
  const list = [];
  if (monograph?.scientificName) list.push(monograph.scientificName);
  if (monograph?.overview?.species) list.push(monograph.overview.species);
  if (monograph?.overview?.genus) list.push(monograph.overview.genus);
  if (Array.isArray(monograph?.synonyms)) {
    monograph.synonyms.slice(0, 6).forEach((s) => list.push(s));
  }
  return list.filter(Boolean);
}

function textNeedsTranslation(str, targetLang) {
  const s = String(str || "").trim();
  if (!s) return false;
  if (targetLang === "bn") {
    const bnChars = (s.match(/[\u0980-\u09FF]/g) || []).length;
    const latinChars = (s.match(/[A-Za-z]/g) || []).length;
    return bnChars === 0 || latinChars > bnChars * 0.9;
  }
  return BENGALI_SCRIPT_RE.test(s);
}

/**
 * Translates all narrative & label slots of a Plantipedia monograph record
 * strictly into `targetLang` ("en" or "bn") while preserving italicized Latin binomials.
 */
export async function translateMonographRecord(monograph, targetLang = "en", { signal = null } = {}) {
  if (!monograph || typeof monograph !== "object") return monograph;
  const target = normalizeLangCode(targetLang, monograph.commonName || "");
  const clone = structuredClone ? structuredClone(monograph) : JSON.parse(JSON.stringify(monograph));
  const protectedTerms = collectLatinProtectionList(clone);
  const refs = [];

  const queueField = (holder, key) => {
    const val = holder?.[key];
    if (typeof val === "string" && textNeedsTranslation(val, target)) {
      refs.push({ holder, key, text: val });
    }
  };

  const queueArray = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((val, idx) => {
      if (typeof val === "string" && textNeedsTranslation(val, target)) {
        refs.push({ holder: arr, key: idx, text: val });
      }
    });
  };

  if (target === "bn") {
    const bnLocalMatch = String(clone.localName || "").match(/[\u0980-\u09FF][\u0980-\u09FF\s-]*/);
    const preferredBn =
      (clone.commonNameBn && BENGALI_SCRIPT_RE.test(clone.commonNameBn) && clone.commonNameBn !== "বৈশ্বিক উদ্ভিদ নমুনা")
        ? clone.commonNameBn
        : (bnLocalMatch ? bnLocalMatch[0].trim() : "");
    if (preferredBn) {
      clone.commonName = preferredBn;
      clone.commonNameBn = preferredBn;
    } else {
      queueField(clone, "commonName");
    }
  } else if (BENGALI_SCRIPT_RE.test(clone.commonName || "")) {
    queueField(clone, "commonName");
  }

  queueField(clone, "leadOverview");
  queueField(clone, "shortSummary");
  queueField(clone, "safetyWarning");
  queueField(clone, "category");

  if (clone.heroImage) {
    queueField(clone.heroImage, "caption");
  }

  if (clone.specimenMetadata) {
    queueField(clone.specimenMetadata, "collectionZone");
    queueField(clone.specimenMetadata, "taxonRank");
    queueField(clone.specimenMetadata, "archiveCollection");
  }

  if (clone.overview) {
    queueField(clone.overview, "plantGroup");
    queueField(clone.overview, "family");
    queueField(clone.overview, "growthForm");
    queueField(clone.overview, "nativeOrigin");
    queueField(clone.overview, "commonUses");
    queueField(clone.overview, "biomeGuild");
    queueField(clone.overview, "sunlight");
    queueField(clone.overview, "lifespan");
  }

  if (clone.cultivationTelemetry) {
    queueField(clone.cultivationTelemetry, "sunlightLabel");
    queueField(clone.cultivationTelemetry, "irrigationLabel");
    queueField(clone.cultivationTelemetry, "soilDrainageLabel");
  }

  if (clone.telemetryHints?.ph) {
    queueField(clone.telemetryHints.ph, "subtext");
  }

  const sectionList = Array.isArray(clone.sections)
    ? clone.sections
    : Array.isArray(clone.chapters)
      ? clone.chapters
      : [];

  sectionList.forEach((sec) => {
    queueField(sec, "title");
    queueField(sec, "subtitle");
    queueField(sec, "summary");
    queueArray(sec.paragraphs);
    queueArray(sec.highlights);
    if (Array.isArray(sec.subblocks)) {
      sec.subblocks.forEach((sb) => {
        queueField(sb, "heading");
        queueField(sb, "text");
      });
    }
    if (Array.isArray(sec.subBlocks)) {
      sec.subBlocks.forEach((sb) => {
        queueField(sb, "heading");
        queueField(sb, "body");
      });
    }
    if (Array.isArray(sec.images)) {
      sec.images.forEach((img) => {
        queueField(img, "caption");
      });
    }
  });

  if (refs.length === 0) {
    clone.lockedLanguage = target;
    return clone;
  }

  const batchResults = await translateBatch(
    refs.map((r) => r.text),
    target,
    {
      protectedTerms,
      signal,
      concurrency: 5,
    },
  );

  const tierCounts = {};
  refs.forEach((ref, i) => {
    const out = batchResults[i];
    if (out && out.text) {
      ref.holder[ref.key] = out.text;
      tierCounts[out.tier] = (tierCounts[out.tier] || 0) + 1;
    }
  });

  if (target === "bn" && clone.commonName && BENGALI_SCRIPT_RE.test(clone.commonName)) {
    clone.commonNameBn = clone.commonName;
  }

  clone.lockedLanguage = target;
  clone.translationMeta = {
    targetLang: target,
    translatedFields: refs.length,
    tiers: tierCounts,
  };
  return clone;
}
