/**
 * Typo-Tolerant Botanical Fuzzy Search & Levenshtein Edit-Distance Engine
 * - Normalizes whitespace, hyphens, apostrophes, punctuation & letter case
 * - Matches joined words seamlessly ("Aloevera" -> "Aloe Vera")
 * - Bounded Levenshtein edit-distance tolerance:
 *     - 4–6 chars -> up to 1 edit
 *     - 7+ chars  -> up to 2 edits
 * - Supports Bengali Unicode & phonetic proximity across commonName, commonNameBn,
 *   bengaliName, localName, scientificName, family, category, and tags
 * - Ranks strictly: Exact/Prefix (100) > Substring (85) > Fuzzy Levenshtein (60–75)
 */

const BENGALI_CHAR_RE = /[\u0980-\u09FF]/;
const PUNCT_TO_SPACE_RE = /[\-_'"’`()[\]{}.,:;!?/\\|·•]+/g;

export function normalizeSearchText(rawValue) {
  return String(rawValue || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(PUNCT_TO_SPACE_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactSearchText(rawValue) {
  return normalizeSearchText(rawValue).replace(/\s+/g, "");
}

export function normalizeBengaliPhonetic(rawValue) {
  const norm = normalizeSearchText(rawValue);
  if (!BENGALI_CHAR_RE.test(norm)) return norm;
  return norm
    .replace(/ড়/g, "র")
    .replace(/ঢ়/g, "র")
    .replace(/য়/g, "য")
    .replace(/ী/g, "ি")
    .replace(/ূ/g, "ু")
    .replace(/ৈ/g, "ে")
    .replace(/ৌ/g, "ো")
    .replace(/[শষ]/g, "স")
    .replace(/ণ/g, "ন")
    .replace(/ৎ/g, "ত")
    .replace(/ং/g, "ঙ")
    .replace(/্য/g, "য")
    .replace(/্ব/g, "ব")
    .replace(/\s+/g, "");
}

export function getFuzzyTolerance(queryLength) {
  const len = Number(queryLength) || 0;
  if (len >= 7) return 2;
  if (len >= 4) return 1;
  return 0;
}

export function levenshteinDistance(source, target, maxAllowed = Infinity) {
  const a = String(source || "");
  const b = String(target || "");
  const lenA = a.length;
  const lenB = b.length;

  if (a === b) return 0;
  if (Math.abs(lenA - lenB) > maxAllowed) return maxAllowed + 1;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Keep shorter string as inner array for O(min(m,n)) memory
  let s1 = a;
  let s2 = b;
  if (s1.length > s2.length) {
    s1 = b;
    s2 = a;
  }

  const m = s1.length;
  const n = s2.length;
  let prev = new Array(m + 1);
  let curr = new Array(m + 1);

  for (let i = 0; i <= m; i += 1) {
    prev[i] = i;
  }

  for (let j = 1; j <= n; j += 1) {
    curr[0] = j;
    let rowMin = curr[0];
    const ch2 = s2.charCodeAt(j - 1);

    for (let i = 1; i <= m; i += 1) {
      const cost = s1.charCodeAt(i - 1) === ch2 ? 0 : 1;
      const val = Math.min(
        prev[i] + 1,
        curr[i - 1] + 1,
        prev[i - 1] + cost,
      );
      curr[i] = val;
      if (val < rowMin) rowMin = val;
    }

    if (rowMin > maxAllowed) {
      return maxAllowed + 1;
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[m];
}

function collectCandidateFields(sp) {
  if (!sp || typeof sp !== "object") return [];

  const rawPrimary = [
    sp.commonName,
    sp.commonNameBn,
    sp.bengaliName,
    sp.localName,
    sp.scientificName,
    sp.slug,
    ...(Array.isArray(sp.tags) ? sp.tags : []),
  ];

  const rawSecondary = [
    sp.family || sp.overview?.family,
    sp.familyBn,
    sp.category,
    ...(Array.isArray(sp.categories) ? sp.categories : []),
    sp.plantGroup || sp.overview?.plantGroup,
    sp.taxonomicDomain,
  ];

  const rawTertiary = [sp.summaryBn];

  const candidates = [];
  const pushFields = (arr, tier) => {
    for (const val of arr) {
      if (!val) continue;
      const text = String(val).trim();
      if (!text) continue;
      candidates.push({ raw: text, tier });
    }
  };

  pushFields(rawPrimary, "primary");
  pushFields(rawSecondary, "secondary");
  pushFields(rawTertiary, "tertiary");
  return candidates;
}

function evaluateSingleField(fieldText, fieldTier, queryCtx) {
  const fieldNorm = normalizeSearchText(fieldText);
  if (!fieldNorm) return null;
  const fieldCompact = fieldNorm.replace(/\s+/g, "");
  const tokens = fieldNorm.split(" ").filter(Boolean);

  const { qNorm, qCompact, qTokens, qPhonetic, isBengaliQuery } = queryCtx;
  const tierBonus = fieldTier === "primary" ? 2 : fieldTier === "secondary" ? 1 : 0;

  // 1. Exact & Prefix Matches -> 100
  if (
    fieldNorm === qNorm ||
    fieldCompact === qCompact ||
    fieldNorm.startsWith(qNorm) ||
    fieldCompact.startsWith(qCompact) ||
    tokens.some((tok) => tok.startsWith(qCompact) || tok.startsWith(qNorm))
  ) {
    const exactMatch = fieldNorm === qNorm || fieldCompact === qCompact;
    return {
      score: 100,
      tieBreaker: (exactMatch ? 20 : 10) + tierBonus,
      isFuzzy: false,
      editDistance: 0,
      matchType: exactMatch ? "exact" : "prefix",
      matchedField: fieldText,
    };
  }

  // 2. Exact Substring Matches -> 85
  if (
    fieldNorm.includes(qNorm) ||
    fieldCompact.includes(qCompact) ||
    (qTokens.length > 1 && qTokens.every((qt) => fieldNorm.includes(qt)))
  ) {
    return {
      score: 85,
      tieBreaker: 5 + tierBonus,
      isFuzzy: false,
      editDistance: 0,
      matchType: "substring",
      matchedField: fieldText,
    };
  }

  // Skip noisy fuzzy checks on long tertiary summary blobs
  if (fieldTier === "tertiary") return null;

  // 2b. Bengali Phonetic Proximity Match (e.g., শ/ষ/স, ড়/র, ী/ি)
  if (isBengaliQuery && BENGALI_CHAR_RE.test(fieldNorm)) {
    const fPhonetic = normalizeBengaliPhonetic(fieldNorm);
    if (
      fPhonetic &&
      qPhonetic &&
      (fPhonetic === qPhonetic ||
        fPhonetic.startsWith(qPhonetic) ||
        fPhonetic.includes(qPhonetic))
    ) {
      return {
        score: 74,
        tieBreaker: 6 + tierBonus,
        isFuzzy: true,
        editDistance: 1,
        matchType: "fuzzy-phonetic",
        matchedField: fieldText,
      };
    }
  }

  // 3. Fuzzy Levenshtein Matches -> 60–75 based on edit distance
  const compactTolerance = getFuzzyTolerance(qCompact.length);
  if (compactTolerance === 0 && qTokens.every((t) => getFuzzyTolerance(t.length) === 0)) {
    return null;
  }

  let bestFuzzy = null;

  const considerFuzzy = (dist, targetLen) => {
    if (dist <= 0) return;
    // Map edit distance cleanly onto [60, 75]
    let fuzzyScore = dist === 1 ? 75 : 64;
    if (fieldTier === "secondary") {
      fuzzyScore -= 4;
    }
    // Slight tie-breaker preferring closer length match on primary fields
    const lengthGap = Math.abs(targetLen - qCompact.length);
    const tie = Math.max(0, 10 - lengthGap) + tierBonus;
    if (
      !bestFuzzy ||
      fuzzyScore > bestFuzzy.score ||
      (fuzzyScore === bestFuzzy.score && dist < bestFuzzy.editDistance) ||
      (fuzzyScore === bestFuzzy.score && dist === bestFuzzy.editDistance && tie > bestFuzzy.tieBreaker)
    ) {
      bestFuzzy = {
        score: Math.max(60, Math.min(75, fuzzyScore)),
        tieBreaker: tie,
        isFuzzy: true,
        editDistance: dist,
        matchType: "fuzzy",
        matchedField: fieldText,
      };
    }
  };

  if (compactTolerance > 0) {
    // Full compact string match (handles "Aloevera", "Bouganvilla", "Krisnochura")
    const fullDist = levenshteinDistance(qCompact, fieldCompact, compactTolerance);
    if (fullDist <= compactTolerance) {
      considerFuzzy(fullDist, fieldCompact.length);
    }

    // Also evaluate Bengali phonetic Levenshtein proximity
    if (isBengaliQuery && BENGALI_CHAR_RE.test(fieldNorm)) {
      const fPhonetic = normalizeBengaliPhonetic(fieldNorm);
      const phTol = getFuzzyTolerance(qPhonetic.length);
      if (fPhonetic && phTol > 0) {
        const phDist = levenshteinDistance(qPhonetic, fPhonetic, phTol);
        if (phDist <= phTol) {
          considerFuzzy(phDist, fPhonetic.length);
        }
      }
    }

    // Individual token comparisons (handles multi-word botanical binomials & local names)
    for (const tok of tokens) {
      if (tok.length < 3) continue;
      const tokTol = Math.min(
        compactTolerance,
        getFuzzyTolerance(Math.max(qCompact.length, tok.length)),
      );
      if (tokTol > 0) {
        const tokDist = levenshteinDistance(qCompact, tok, tokTol);
        if (tokDist <= tokTol) {
          considerFuzzy(tokDist, tok.length);
        }
      }
      // Guarded prefix-slice fuzzy check for long queries (>= 7 chars) on primary fields
      if (fieldTier === "primary" && qCompact.length >= 7 && tok.length > qCompact.length) {
        const slice = tok.slice(0, qCompact.length);
        const sliceDist = levenshteinDistance(qCompact, slice, 1);
        if (sliceDist <= 1) {
          considerFuzzy(sliceDist, slice.length);
        }
      }
    }
  }

  // Multi-word fuzzy fallback (e.g. "aloe vra" -> tokens "aloe" + "vra")
  if (qTokens.length >= 2 && tokens.length >= qTokens.length) {
    let totalEdits = 0;
    let allMatched = true;
    for (const qt of qTokens) {
      const qtTol = getFuzzyTolerance(qt.length);
      let minTokenDist = Infinity;
      for (const ft of tokens) {
        if (ft.startsWith(qt)) {
          minTokenDist = 0;
          break;
        }
        if (qtTol > 0) {
          const d = levenshteinDistance(qt, ft, qtTol);
          if (d < minTokenDist) minTokenDist = d;
        }
      }
      if (minTokenDist > qtTol) {
        allMatched = false;
        break;
      }
      totalEdits += minTokenDist;
    }
    if (allMatched && totalEdits > 0 && totalEdits <= 2) {
      considerFuzzy(totalEdits, fieldCompact.length);
    }
  }

  return bestFuzzy;
}

export function scoreSpeciesFuzzy(species, rawQuery) {
  const qNorm = normalizeSearchText(rawQuery);
  const qCompact = qNorm.replace(/\s+/g, "");
  if (!qCompact) return null;

  const queryCtx = {
    qNorm,
    qCompact,
    qTokens: qNorm.split(" ").filter(Boolean),
    isBengaliQuery: BENGALI_CHAR_RE.test(qNorm),
    qPhonetic: normalizeBengaliPhonetic(qNorm),
  };

  const fields = collectCandidateFields(species);
  let best = null;

  for (const { raw, tier } of fields) {
    const res = evaluateSingleField(raw, tier, queryCtx);
    if (!res) continue;
    if (
      !best ||
      res.score > best.score ||
      (res.score === best.score && res.isFuzzy !== best.isFuzzy && !res.isFuzzy) ||
      (res.score === best.score && res.tieBreaker > best.tieBreaker)
    ) {
      best = res;
    }
  }

  if (!best) return null;
  return {
    item: species,
    ...best,
  };
}

export function searchSpeciesFuzzy(speciesList, rawQuery, { limit = 10 } = {}) {
  const list = Array.isArray(speciesList) ? speciesList : [];
  const qCompact = compactSearchText(rawQuery);
  if (!qCompact) return [];

  const results = [];
  for (const sp of list) {
    const scored = scoreSpeciesFuzzy(sp, rawQuery);
    if (scored) {
      results.push(scored);
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.isFuzzy !== b.isFuzzy) return a.isFuzzy ? 1 : -1;
    if (b.tieBreaker !== a.tieBreaker) return b.tieBreaker - a.tieBreaker;
    return String(a.item?.commonName || "").localeCompare(
      String(b.item?.commonName || ""),
    );
  });

  return limit > 0 ? results.slice(0, limit) : results;
}

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const GRAPHEME_SEGMENTER =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("bn", { granularity: "grapheme" })
    : null;

export function escapeHtml(rawText) {
  return String(rawText ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

function escapeRegExpLiteral(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getGraphemeRanges(text) {
  if (!text) return [];
  if (GRAPHEME_SEGMENTER) {
    const ranges = [];
    for (const seg of GRAPHEME_SEGMENTER.segment(text)) {
      ranges.push({
        start: seg.index,
        end: seg.index + seg.segment.length,
      });
    }
    return ranges;
  }

  // Fallback for environments without Intl.Segmenter: keep Bengali conjuncts/matras & combining marks intact
  const ranges = [];
  const fallbackRe =
    /[\u0980-\u09FF][\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u09E2\u09E3]*(?:\u09CD[\u0980-\u09FF][\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u09E2\u09E3]*)*|[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\u0300-\u036F\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7\u09E2\u09E3][\u0300-\u036F]*/g;
  let match = fallbackRe.exec(text);
  while (match) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
    match = fallbackRe.exec(text);
  }
  return ranges;
}

function snapRangeToGraphemes(start, end, graphemeRanges) {
  if (graphemeRanges.length === 0) return { start, end };
  let snappedStart = start;
  let snappedEnd = end;

  for (let i = 0; i < graphemeRanges.length; i += 1) {
    const g = graphemeRanges[i];
    if (g.start <= start && start < g.end) {
      snappedStart = g.start;
    }
    if (g.start < end && end <= g.end) {
      snappedEnd = g.end;
      break;
    }
  }
  return { start: snappedStart, end: snappedEnd };
}

function extractHighlightTerms(rawQuery) {
  const clean = String(rawQuery ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
  if (!clean) return [];

  const tokens = clean.split(" ").filter(Boolean);
  const candidates = tokens.length > 1 ? [clean, ...tokens] : tokens;
  const seen = new Set();
  const unique = [];

  for (const term of candidates) {
    const key = term.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(term);
    }
  }

  unique.sort((a, b) => b.length - a.length);
  return unique;
}

export function computeHighlightSegments(rawText, rawQuery) {
  const source = String(rawText ?? "").normalize("NFC");
  if (!source) return [];

  const terms = extractHighlightTerms(rawQuery);
  if (terms.length === 0) {
    return [{ text: source, highlighted: false }];
  }

  const pattern = terms.map(escapeRegExpLiteral).join("|");
  if (!pattern) {
    return [{ text: source, highlighted: false }];
  }

  const regex = new RegExp(pattern, "gi");
  const rawMatches = [];
  let match = regex.exec(source);
  while (match) {
    if (match[0].length === 0) {
      regex.lastIndex += 1;
    } else {
      rawMatches.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    match = regex.exec(source);
  }

  if (rawMatches.length === 0) {
    return [{ text: source, highlighted: false }];
  }

  const graphemeRanges = getGraphemeRanges(source);
  const snapped = rawMatches
    .map((m) => snapRangeToGraphemes(m.start, m.end, graphemeRanges))
    .sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - a.end));

  const merged = [];
  for (const interval of snapped) {
    const prev = merged[merged.length - 1];
    if (prev && interval.start <= prev.end) {
      prev.end = Math.max(prev.end, interval.end);
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }

  const segments = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (start > cursor) {
      segments.push({ text: source.slice(cursor, start), highlighted: false });
    }
    segments.push({ text: source.slice(start, end), highlighted: true });
    cursor = end;
  }
  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), highlighted: false });
  }

  return segments;
}

export function highlightSearchHtml(rawText, rawQuery) {
  const segments = computeHighlightSegments(rawText, rawQuery);
  return segments
    .map((seg) =>
      seg.highlighted
        ? `<mark class="search-hl">${escapeHtml(seg.text)}</mark>`
        : escapeHtml(seg.text),
    )
    .join("");
}

export function createHighlightedFragment(rawText, rawQuery) {
  const frag = document.createDocumentFragment();
  const segments = computeHighlightSegments(rawText, rawQuery);
  for (const seg of segments) {
    if (!seg.text) continue;
    if (seg.highlighted) {
      const mark = document.createElement("mark");
      mark.className = "search-hl";
      mark.textContent = seg.text;
      frag.appendChild(mark);
    } else {
      frag.appendChild(document.createTextNode(seg.text));
    }
  }
  return frag;
}

export function setHighlightedContent(element, rawText, rawQuery) {
  if (!element) return element;
  element.replaceChildren(createHighlightedFragment(rawText, rawQuery));
  return element;
}

