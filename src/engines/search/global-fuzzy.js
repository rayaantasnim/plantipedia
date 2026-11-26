/**
 * Federated Typo-Tolerant Global Fuzzy Suggestion & Resolution Engine
 * - Queries 3 parallel zero-key global botanical endpoints with 4s AbortController timeout:
 *     1. iNaturalist Global Plant Autocomplete (taxon_id=47126, Plantae)
 *     2. GBIF Backbone Fuzzy Suggest (highertaxonKey=6, Plantae)
 *     3. MediaWiki Fuzzy Search & Prefix/Suggestion (EN + BN)
 * - Performs typo-recovery fallback (GBIF species/match, MediaWiki search suggestion,
 *   grapheme prefix slice) when mid-word transpositions bypass strict prefixes.
 * - Normalizes, merges family metadata across genus matches, and ranks Plantae taxa
 *   via Levenshtein & Bengali phonetic proximity.
 */

import {
  getFuzzyTolerance,
  levenshteinDistance,
  normalizeBengaliPhonetic,
  normalizeSearchText,
} from "./fuzzy-matcher.js";

const GLOBAL_FUZZY_TIMEOUT_MS = 4000;
const BENGALI_CHAR_RE = /[\u0980-\u09FF]/;
const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("bn", { granularity: "grapheme" })
    : null;

const NON_PLANT_TITLE_RE =
  /^(?:list of|index of|outline of|history of|order of)\b|\(disambiguation\)|দ্ব্যর্থতা নিরসন|\b(airport|cipher|prize|award|album|film|song|novel|company|software|municipality|district|division|upazila|station|murder|murders|homicide|crime|trial|case)\b/i;

const NON_PLANT_SNIPPET_RE =
  /\b(operating system|software|programming language|video game|film|album|football club|band|automobile|airport|railway|cipher|novel|politician|murder|homicide|crime|trial|disappeared|botanist|naturalist|explored|was a [a-z]+ botanist)\b/i;

const BOTANICAL_SNIPPET_RE =
  /\b(flowering plant|vascular plant|species of plant|genus of flowering|genus of plants|botanical family|plant family|carnivorous plant|parasitic plant|aquatic plant|succulent plant|monotypic genus|species of tree|species of palm|flora of|plantae|angiosperm|gymnosperm|monocot|eudicot|binomial)\b|উদ্ভিদ|গাছ|ফুল|বৃক্ষ|প্রজাতি|বৈজ্ঞানিক নাম|গোত্র/i;

const BINOMIAL_RE = /\b([A-Z][a-z]{2,}\s+[a-z][a-z-]{2,})\b/;

const suggestionCache = new Map();

function stripHtmlTags(str) {
  return String(str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCaseClean(str) {
  return String(str || "")
    .trim()
    .replace(/(^|\s)([a-z\u00e0-\u00ff])/g, (m, lead, ch) => lead + ch.toUpperCase());
}

function normalizeQuery(raw) {
  return String(raw || "").trim().replace(/\s+/g, " ");
}

function sliceGraphemePrefix(text, ratio = 0.6, minGraphemes = 3) {
  const clean = normalizeQuery(text);
  if (!clean) return "";
  const firstWord = clean.split(/\s+/)[0] || clean;
  if (GRAPHEME_SEGMENTER) {
    const segs = [...GRAPHEME_SEGMENTER.segment(firstWord)].map((s) => s.segment);
    if (segs.length <= minGraphemes) return firstWord;
    const take = Math.max(minGraphemes, Math.min(segs.length - 1, Math.floor(segs.length * ratio)));
    return segs.slice(0, take).join("");
  }
  if (firstWord.length <= minGraphemes) return firstWord;
  return firstWord.slice(0, Math.max(minGraphemes, Math.floor(firstWord.length * ratio)));
}

async function fetchJsonBounded(url, signal) {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function queryInatAutocomplete(query, locale, signal, perPage = 5) {
  const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&taxon_id=47126&per_page=${perPage}&locale=${locale}`;
  const data = await fetchJsonBounded(url, signal);
  return Array.isArray(data?.results) ? data.results : [];
}

async function queryGbifSuggest(query, signal, limit = 5) {
  const url = `https://api.gbif.org/v1/species/suggest?q=${encodeURIComponent(query)}&highertaxonKey=6&limit=${limit}`;
  const data = await fetchJsonBounded(url, signal);
  return Array.isArray(data) ? data : [];
}

async function queryGbifFuzzyMatch(query, signal) {
  const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(query)}&kingdom=Plantae&verbose=false`;
  const data = await fetchJsonBounded(url, signal);
  if (!data || data.matchType === "NONE") return null;
  if (data.kingdom && data.kingdom !== "Plantae") return null;
  if (data.rank === "KINGDOM") return null;
  const conf = Number(data.confidence || 0);
  if (conf < 72) return null;
  if (!data.canonicalName && !data.species && !data.genus) return null;
  return data;
}

async function queryMediaWikiSearch(query, isBn, signal, limit = 4) {
  const host = isBn ? "https://bn.wikipedia.org/w/api.php" : "https://en.wikipedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    srinfo: "suggestion",
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const data = await fetchJsonBounded(`${host}?${params.toString()}`, signal);
  return {
    hits: Array.isArray(data?.query?.search) ? data.query.search : [],
    suggestion: stripHtmlTags(data?.query?.searchinfo?.suggestion || ""),
  };
}

async function queryMediaWikiPrefix(prefix, isBn, signal, limit = 6) {
  const host = isBn ? "https://bn.wikipedia.org/w/api.php" : "https://en.wikipedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    list: "prefixsearch",
    pssearch: prefix,
    pslimit: String(limit),
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  const data = await fetchJsonBounded(`${host}?${params.toString()}`, signal);
  return Array.isArray(data?.query?.prefixsearch) ? data.query.prefixsearch : [];
}

function extractInatFamily(taxon) {
  if (!taxon) return "";
  if (taxon.rank === "family") return taxon.name || "";
  if (Array.isArray(taxon.ancestors)) {
    const fam = taxon.ancestors.find((a) => a?.rank === "family");
    if (fam?.name) return fam.name;
  }
  return "";
}

function scoreSimilarityToQuery(rawQuery, primaryFields, secondaryFields = []) {
  const qNorm = normalizeSearchText(rawQuery);
  const qCompact = qNorm.replace(/\s+/g, "");
  const qPhonetic = normalizeBengaliPhonetic(qNorm);
  const isBn = BENGALI_CHAR_RE.test(qNorm);
  const qTokens = qNorm.split(" ").filter(Boolean);

  let bestScore = 0;

  const evaluate = (field, weightScale = 1) => {
    const fNorm = normalizeSearchText(field);
    if (!fNorm) return;
    const fCompact = fNorm.replace(/\s+/g, "");
    const fTokens = fNorm.split(" ").filter(Boolean);

    if (fNorm === qNorm || fCompact === qCompact) {
      bestScore = Math.max(bestScore, Math.round(105 * weightScale));
      return;
    }
    if (fNorm.startsWith(qNorm) || fCompact.startsWith(qCompact)) {
      bestScore = Math.max(bestScore, Math.round(92 * weightScale));
      return;
    }
    if (fTokens.some((t, i) => t.startsWith(qCompact) && i === 0)) {
      bestScore = Math.max(bestScore, Math.round(88 * weightScale));
      return;
    }
    if (fNorm.includes(qNorm) || fCompact.includes(qCompact)) {
      bestScore = Math.max(bestScore, Math.round(76 * weightScale));
      return;
    }

    if (isBn && BENGALI_CHAR_RE.test(fNorm)) {
      const fPhonetic = normalizeBengaliPhonetic(fNorm);
      if (fPhonetic && qPhonetic) {
        if (fPhonetic === qPhonetic || fPhonetic.startsWith(qPhonetic)) {
          bestScore = Math.max(bestScore, Math.round(76 * weightScale));
        } else {
          const tol = Math.max(2, getFuzzyTolerance(qPhonetic.length));
          const d = levenshteinDistance(qPhonetic, fPhonetic, tol);
          if (d <= tol) {
            bestScore = Math.max(bestScore, Math.round((74 - d * 6) * weightScale));
          }
        }
      }
    }

    const targets = [
      { tok: fCompact, isLead: true },
      ...fTokens
        .filter((t) => t.length >= 3)
        .map((t, idx) => ({ tok: t, isLead: idx === 0 })),
    ];
    const maxTol = Math.max(2, getFuzzyTolerance(qCompact.length));

    for (const { tok, isLead } of targets) {
      const lenRatio = Math.min(qCompact.length, tok.length) / Math.max(qCompact.length, tok.length);
      if (lenRatio < 0.45 && !(qTokens.length === 1 && tok.length > qCompact.length)) continue;

      const dFull = levenshteinDistance(qCompact, tok, maxTol);
      if (dFull <= maxTol) {
        const leadBonus = isLead ? 10 : 0;
        const pts = (78 - dFull * 10 + leadBonus) * weightScale;
        bestScore = Math.max(bestScore, Math.round(pts));
      }

      if (tok.length >= qCompact.length && qCompact.length >= 4 && isLead) {
        const dPref = levenshteinDistance(qCompact, tok.slice(0, qCompact.length), 2);
        if (dPref <= 2) {
          bestScore = Math.max(bestScore, Math.round((68 - dPref * 8) * weightScale));
        }
      }
    }
  };

  for (const f of primaryFields) evaluate(f, 1.0);
  for (const f of secondaryFields) evaluate(f, 0.72);
  return bestScore;
}

function mergeCandidatesFromSources({
  query,
  inatResults = [],
  gbifSuggestResults = [],
  gbifMatchResult = null,
  mwHits = [],
  mwPrefixHits = [],
  mwSuggestion = "",
}) {
  const byKey = new Map();
  const genusFamilyMap = new Map();

  const noteGenusFamily = (sciName, family) => {
    const cleanFam = String(family || "").trim();
    if (!cleanFam || cleanFam === "Plantae") return;
    const genus = String(sciName || "").trim().split(/\s+/)[0]?.toLowerCase();
    if (genus && genus.length >= 3 && !genusFamilyMap.has(genus)) {
      genusFamilyMap.set(genus, cleanFam);
    }
  };

  const registerCandidate = (cand) => {
    const sci = String(cand.scientificName || "").trim();
    const common = String(cand.commonName || "").trim();
    const keyBase = sci || common;
    if (!keyBase) return;
    const key = keyBase.toLowerCase();

    noteGenusFamily(sci, cand.family);

    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...cand });
      return;
    }

    if (
      !prev.commonName ||
      (cand.commonName && cand.commonName !== cand.scientificName && prev.commonName === prev.scientificName)
    ) {
      prev.commonName = cand.commonName || prev.commonName;
    }
    if (!prev.scientificName && cand.scientificName) {
      prev.scientificName = cand.scientificName;
    }
    if ((!prev.family || prev.family === "Plantae") && cand.family && cand.family !== "Plantae") {
      prev.family = cand.family;
    }
    if (!prev.rank && cand.rank) {
      prev.rank = cand.rank;
    }
    prev.matchScore = Math.max(prev.matchScore, cand.matchScore) + 6;
    prev.sourceCount = (prev.sourceCount || 1) + 1;
  };

  // 1. iNaturalist Plantae taxa
  for (const t of inatResults) {
    if (!t || (t.iconic_taxon_name && t.iconic_taxon_name !== "Plantae")) continue;
    const rankLevel = Number(t.rank_level || 100);
    if (rankLevel > 40) continue;

    const sci = String(t.name || "").trim();
    const commonRaw = String(t.preferred_common_name || "").trim();
    const common = commonRaw ? toTitleCaseClean(commonRaw) : sci;
    const family = extractInatFamily(t);
    const sim = scoreSimilarityToQuery(query, [sci, commonRaw], [t.matched_term]);

    if (sim < 40) continue;

    let score = sim + 20;
    if (t.rank === "species") score += 10;
    else if (t.rank === "genus") score += 7;
    if (Number(t.observations_count || 0) > 100) score += 4;

    registerCandidate({
      commonName: common,
      scientificName: sci,
      family: family || "",
      rank: t.rank || "species",
      matchScore: score,
    });
  }

  // 2. GBIF Backbone Suggest taxa
  for (const g of gbifSuggestResults) {
    if (!g || (g.kingdom && g.kingdom !== "Plantae")) continue;
    const rank = String(g.rank || "").toLowerCase();
    if (rank && !["species", "genus", "subspecies", "variety", "family"].includes(rank)) continue;

    const sci = String(g.canonicalName || g.species || g.scientificName || "").trim();
    if (!sci) continue;
    const vernacularEn = Array.isArray(g.vernacularNames)
      ? g.vernacularNames.find((v) => v?.language === "eng" && v?.vernacularName)?.vernacularName || ""
      : "";
    const sim = scoreSimilarityToQuery(query, [sci, vernacularEn], [g.family]);

    if (sim < 40) continue;

    let score = sim + 18;
    if (rank === "species") score += 10;
    else if (rank === "genus") score += 7;
    if (g.status === "ACCEPTED") score += 4;

    registerCandidate({
      commonName: vernacularEn ? toTitleCaseClean(vernacularEn) : sci,
      scientificName: sci,
      family: g.family || "",
      rank: rank || "species",
      matchScore: score,
    });
  }

  // 3. GBIF Fuzzy Match
  if (gbifMatchResult) {
    const sci = String(
      gbifMatchResult.species || gbifMatchResult.canonicalName || gbifMatchResult.genus || "",
    ).trim();
    if (sci) {
      const conf = Number(gbifMatchResult.confidence || 80);
      const sim = scoreSimilarityToQuery(query, [sci], [gbifMatchResult.family]);
      const score = Math.max(sim, Math.round(conf * 0.9)) + 26;
      registerCandidate({
        commonName: sci,
        scientificName: sci,
        family: gbifMatchResult.family || "",
        rank: String(gbifMatchResult.rank || "genus").toLowerCase(),
        matchScore: score,
      });
    }
  }

  // 4. MediaWiki botanical hits & prefixsearch hits
  const combinedMw = [
    ...mwHits.map((h) => ({ title: h?.title, snippet: stripHtmlTags(h?.snippet || ""), isPrefix: false })),
    ...mwPrefixHits.map((h) => ({ title: h?.title, snippet: "", isPrefix: true })),
  ];

  for (const hit of combinedMw) {
    const title = String(hit.title || "").trim();
    if (!title || NON_PLANT_TITLE_RE.test(title)) continue;
    if (hit.snippet && NON_PLANT_SNIPPET_RE.test(hit.snippet) && !BOTANICAL_SNIPPET_RE.test(hit.snippet)) {
      continue;
    }

    const isBotanical =
      BOTANICAL_SNIPPET_RE.test(hit.snippet) ||
      Boolean(mwSuggestion && title.toLowerCase().includes(mwSuggestion.toLowerCase())) ||
      hit.isPrefix;

    if (!isBotanical) continue;

    const binomialMatch = hit.snippet.match(BINOMIAL_RE) || title.match(BINOMIAL_RE);
    const extractedSci = binomialMatch ? binomialMatch[1] : "";
    const sim = scoreSimilarityToQuery(query, [title, extractedSci]);
    if (sim < 46) continue;

    registerCandidate({
      commonName: title,
      scientificName: extractedSci || title,
      family: "",
      rank: extractedSci ? "species" : "taxon",
      matchScore: sim + (BOTANICAL_SNIPPET_RE.test(hit.snippet) ? 16 : 6),
    });
  }

  // Propagate known family by genus across merged candidates
  return Array.from(byKey.values())
    .map((item) => {
      if (!item.family) {
        const genus = String(item.scientificName || "").trim().split(/\s+/)[0]?.toLowerCase();
        const inferredFam = genus ? genusFamilyMap.get(genus) : "";
        return { ...item, family: inferredFam || "Plantae" };
      }
      return item;
    })
    .filter((c) => c.matchScore >= 46)
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function isNormalizedTaxonMatch(rawQuery, plant) {
  if (!rawQuery || !plant) return false;
  const qNorm = normalizeSearchText(rawQuery);
  const qCompact = qNorm.replace(/\s+/g, "");
  if (!qCompact) return false;

  const candidates = [
    plant.commonName,
    plant.commonNameBn,
    plant.bengaliName,
    plant.scientificName,
    plant.genus,
    plant.overview?.family,
  ].filter(Boolean);

  for (const cand of candidates) {
    const cNorm = normalizeSearchText(cand);
    const cCompact = cNorm.replace(/\s+/g, "");
    if (!cCompact) continue;
    if (cNorm === qNorm || cCompact === qCompact) return true;
    const cWords = cNorm.split(" ").filter(Boolean);
    if (cWords.some((w) => w === qNorm || w === qCompact)) return true;
  }
  return false;
}

/**
 * Queries 3 parallel zero-key global botanical endpoints (4s timeout)
 * and returns ranked Plantae fuzzy suggestions.
 */
export async function fetchGlobalFuzzySuggestions(
  rawQuery,
  { signal = null, limit = 3, lang = "auto", timeoutMs = GLOBAL_FUZZY_TIMEOUT_MS } = {},
) {
  const query = normalizeQuery(rawQuery);
  if (!query || query.length < 3) {
    return { ok: true, query, suggestions: [], didCorrect: false };
  }

  const isBn = lang === "bn" || BENGALI_CHAR_RE.test(query);
  const locale = isBn ? "bn" : "en";
  const cacheKey = `${locale}::${query.toLowerCase()}::${limit}`;

  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey);
  }

  const timeoutController = new AbortController();
  const onParentAbort = () => timeoutController.abort();
  if (signal) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onParentAbort, { once: true });
  }
  const timerId = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    const mergedSignal = timeoutController.signal;

    // Pass 1: 3 parallel zero-key global fuzzy endpoints
    const [inatSettled, gbifSettled, mwSettled] = await Promise.allSettled([
      queryInatAutocomplete(query, locale, mergedSignal, 5),
      queryGbifSuggest(query, mergedSignal, 5),
      queryMediaWikiSearch(query, isBn, mergedSignal, 4),
    ]);

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    let inatResults = inatSettled.status === "fulfilled" ? inatSettled.value : [];
    let gbifSuggestResults = gbifSettled.status === "fulfilled" ? gbifSettled.value : [];
    const mwPayload = mwSettled.status === "fulfilled" ? mwSettled.value : { hits: [], suggestion: "" };
    let mwHits = mwPayload.hits || [];
    const mwSuggestion = mwPayload.suggestion || "";
    let gbifMatchResult = null;
    let mwPrefixHits = [];

    let ranked = mergeCandidatesFromSources({
      query,
      inatResults,
      gbifSuggestResults,
      gbifMatchResult,
      mwHits,
      mwSuggestion,
    });

    // Pass 2: Typo-recovery pass when mid-word misspellings return < 2 strong hits
    if (ranked.length < 2 && !mergedSignal.aborted) {
      const gbifFirst = !isBn
        ? await queryGbifFuzzyMatch(query, mergedSignal).catch(() => null)
        : null;
      gbifMatchResult = gbifFirst;

      const gbifTarget = gbifFirst?.canonicalName || gbifFirst?.species || gbifFirst?.genus || "";
      const prefixSlice = sliceGraphemePrefix(query, 0.6, 3);
      const validMwSug =
        mwSuggestion &&
        levenshteinDistance(query.toLowerCase(), mwSuggestion.toLowerCase(), 2) <= 2
          ? mwSuggestion
          : "";
      const recoveryQuery = validMwSug || gbifTarget || prefixSlice;

      const recoveryTasks = [
        recoveryQuery && recoveryQuery !== query
          ? queryInatAutocomplete(recoveryQuery, locale, mergedSignal, 6)
          : Promise.resolve([]),
        prefixSlice && prefixSlice !== recoveryQuery
          ? queryInatAutocomplete(prefixSlice, locale, mergedSignal, 5)
          : Promise.resolve([]),
        isBn && prefixSlice
          ? queryMediaWikiPrefix(prefixSlice, true, mergedSignal, 6)
          : validMwSug && validMwSug !== query
            ? queryMediaWikiSearch(validMwSug, false, mergedSignal, 4).then((r) => r.hits || [])
            : Promise.resolve([]),
      ];

      const [recInatA, recInatB, recExtra] = await Promise.allSettled(recoveryTasks);
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      if (recInatA.status === "fulfilled" && recInatA.value.length > 0) {
        inatResults = [...inatResults, ...recInatA.value];
      }
      if (recInatB.status === "fulfilled" && recInatB.value.length > 0) {
        inatResults = [...inatResults, ...recInatB.value];
      }
      if (recExtra.status === "fulfilled" && Array.isArray(recExtra.value)) {
        if (isBn) {
          mwPrefixHits = recExtra.value;
        } else {
          mwHits = [...mwHits, ...recExtra.value];
        }
      }

      ranked = mergeCandidatesFromSources({
        query,
        inatResults,
        gbifSuggestResults,
        gbifMatchResult,
        mwHits,
        mwPrefixHits,
        mwSuggestion: validMwSug,
      });
    }

    const qNorm = normalizeSearchText(query);
    const formatted = ranked.slice(0, limit).map((item) => {
      const commonNorm = normalizeSearchText(item.commonName);
      const sciNorm = normalizeSearchText(item.scientificName);
      const exactHit = commonNorm === qNorm || sciNorm === qNorm;
      return {
        commonName: item.commonName || item.scientificName,
        scientificName: item.scientificName || item.commonName,
        family: item.family || "Plantae",
        rank: item.rank || "species",
        matchScore: item.matchScore,
        isFuzzyCorrected: !exactHit,
      };
    });

    const result = {
      ok: true,
      query,
      suggestions: formatted,
      didCorrect: Boolean(formatted[0]?.isFuzzyCorrected),
    };

    if (formatted.length > 0) {
      suggestionCache.set(cacheKey, result);
      if (suggestionCache.size > 60) {
        const oldestKey = suggestionCache.keys().next().value;
        suggestionCache.delete(oldestKey);
      }
    }

    return result;
  } catch (err) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return { ok: false, query, suggestions: [], didCorrect: false, error: err?.message || "Timeout" };
  } finally {
    clearTimeout(timerId);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Resolves the single best canonical Plantae taxon for misspelled global queries
 * submitted directly to /plant/live/ or /compare/.
 */
export async function resolveFuzzyGlobalTaxon(
  rawQuery,
  { signal = null, lang = "auto", timeoutMs = GLOBAL_FUZZY_TIMEOUT_MS } = {},
) {
  const res = await fetchGlobalFuzzySuggestions(rawQuery, {
    signal,
    limit: 5,
    lang,
    timeoutMs,
  });
  if (!res.ok || !Array.isArray(res.suggestions) || res.suggestions.length === 0) {
    return null;
  }

  // Prefer suggestions that have a valid Linnaean binomial or species/genus rank
  const preferred =
    res.suggestions.find((s) => s.scientificName && s.scientificName.includes(" ")) ||
    res.suggestions[0];

  if (!preferred) return null;

  const targetQuery = preferred.scientificName || preferred.commonName;
  const didCorrect =
    normalizeSearchText(rawQuery) !== normalizeSearchText(targetQuery) &&
    normalizeSearchText(rawQuery) !== normalizeSearchText(preferred.commonName);

  return {
    ...preferred,
    targetQuery,
    originalQuery: normalizeQuery(rawQuery),
    didCorrect,
  };
}
