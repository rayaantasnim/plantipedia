/**
 * Centralized JSON Data Fetching, Schema Validation & Request Deduplication Layer.
 * Uses strict relative paths resolved safely for root and GitHub Pages subpath hosting.
 */

const SITE_ROOT_URL = new URL("../", import.meta.url);

export const DATASET_ENDPOINTS = Object.freeze({
  siteShell: "./data/site-shell.json",
  catalog: "./data/plants.json",
  "page:home": "./data/pages/home.json",
  "page:species": "./data/pages/species.json",
  "page:plant": "./data/pages/plant.json",
  featured: "./data/featured-species.json",
  taxonomy: "./data/taxonomy.json",
  trivia: "./data/trivia.json",
  highlights: "./data/highlights.json",
});

export const SECTION_ENDPOINTS = Object.freeze({
  featured: DATASET_ENDPOINTS.featured,
  taxonomy: DATASET_ENDPOINTS.taxonomy,
  trivia: DATASET_ENDPOINTS.trivia,
  highlights: DATASET_ENDPOINTS.highlights,
});

export const CATALOG_ENDPOINT = DATASET_ENDPOINTS.catalog;

const inFlightCache = new Map();

function resolveDatasetHref(relativePath) {
  const clean = relativePath.replace(/^\.\//, "");
  return new URL(clean, SITE_ROOT_URL).href;
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Malformed ${label} payload: expected a JSON object.`);
  }
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Malformed dataset entry: missing "${fieldName}".`);
  }
}

function assertImageObject(imageObj, contextLabel) {
  assertObject(imageObj, `${contextLabel}.image`);
  assertNonEmptyString(
    imageObj.imageUrl || imageObj.url,
    `${contextLabel}.image.imageUrl`,
  );
  assertNonEmptyString(
    imageObj.imageAlt || imageObj.alt,
    `${contextLabel}.image.imageAlt`,
  );
}

function validateSiteShellPayload(payload) {
  assertObject(payload, "site-shell");
  assertObject(payload.brand, "site-shell.brand");
  assertObject(payload.navbar, "site-shell.navbar");
  assertObject(payload.footer, "site-shell.footer");
  return payload;
}

function validateCatalogPayload(payload) {
  assertObject(payload, "plants");
  if (!Array.isArray(payload.species)) {
    throw new Error('Malformed plants.json payload: "species" must be an array.');
  }
  return payload.species;
}

function validateHomePagePayload(payload) {
  assertObject(payload, "pages/home");
  assertObject(payload.hero, "pages/home.hero");
  assertObject(payload.about, "pages/home.about");
  assertNonEmptyString(payload.hero.headline, "hero.headline");
  assertNonEmptyString(payload.about.heading, "about.heading");
  return payload;
}

function validateSpeciesPagePayload(payload) {
  assertObject(payload, "pages/species");
  assertObject(payload.banner, "pages/species.banner");
  assertObject(payload.explorer, "pages/species.explorer");
  assertNonEmptyString(payload.banner.headline, "banner.headline");
  return payload;
}

function validatePlantPagePayload(payload) {
  assertObject(payload, "pages/plant");
  assertObject(payload.sectionMap, "pages/plant.sectionMap");
  assertObject(payload.monograph, "pages/plant.monograph");
  return payload;
}

function validateFeaturedPayload(payload) {
  assertObject(payload, "featured-species");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed featured-species payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `featured-species.items[${idx}]`);
    assertNonEmptyString(item.id || item.slug, "id/slug");
    assertNonEmptyString(item.commonName, "commonName");
    assertNonEmptyString(item.scientificName, "scientificName");
    assertNonEmptyString(item.category, "category");
    assertNonEmptyString(item.family, "family");
    assertNonEmptyString(item.shortSummary, "shortSummary");
    assertImageObject(item.image, `featured-species.items[${idx}]`);
  });
  return payload;
}

function validateTaxonomyPayload(payload) {
  assertObject(payload, "taxonomy");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed taxonomy payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `taxonomy.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    assertNonEmptyString(item.href, "href");
    if (item.image) {
      assertImageObject(item.image, `taxonomy.items[${idx}]`);
    }
  });
  return payload;
}

function validateTriviaPayload(payload) {
  assertObject(payload, "trivia");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed trivia payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `trivia.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    assertNonEmptyString(item.taxonLabel, "taxonLabel");
    if (item.image) {
      assertImageObject(item.image, `trivia.items[${idx}]`);
    }
  });
  return payload;
}

function validateHighlightsPayload(payload) {
  assertObject(payload, "highlights");
  if (!Array.isArray(payload.items)) {
    throw new Error('Malformed highlights payload: "items" must be an array.');
  }
  payload.items.forEach((item, idx) => {
    assertObject(item, `highlights.items[${idx}]`);
    assertNonEmptyString(item.id, "id");
    assertNonEmptyString(item.title, "title");
    assertNonEmptyString(item.description, "description");
    if (item.image) {
      assertImageObject(item.image, `highlights.items[${idx}]`);
    }
  });
  return payload;
}

const VALIDATORS = {
  siteShell: validateSiteShellPayload,
  catalog: validateCatalogPayload,
  "page:home": validateHomePagePayload,
  "page:species": validateSpeciesPagePayload,
  "page:plant": validatePlantPagePayload,
  featured: validateFeaturedPayload,
  taxonomy: validateTaxonomyPayload,
  trivia: validateTriviaPayload,
  highlights: validateHighlightsPayload,
};

async function fetchJsonResource(url, label) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label} (HTTP ${response.status}).`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`Invalid JSON syntax in ${label}.`);
  }
}

export function fetchDataset(datasetKey, { forceRefresh = false } = {}) {
  const relPath = DATASET_ENDPOINTS[datasetKey];
  const validator = VALIDATORS[datasetKey];
  if (!relPath || !validator) {
    return Promise.reject(new Error(`Unknown dataset key: "${datasetKey}".`));
  }

  if (!forceRefresh && inFlightCache.has(datasetKey)) {
    return inFlightCache.get(datasetKey);
  }

  const requestPromise = fetchJsonResource(resolveDatasetHref(relPath), relPath)
    .then((raw) => validator(raw))
    .catch((err) => {
      inFlightCache.delete(datasetKey);
      throw err;
    });

  inFlightCache.set(datasetKey, requestPromise);
  return requestPromise;
}

export async function fetchDatasetsConcurrently(datasetKeys, { forceRefresh = false } = {}) {
  const uniqueKeys = Array.from(new Set(datasetKeys)).filter(Boolean);
  const settled = await Promise.allSettled(
    uniqueKeys.map((key) =>
      fetchDataset(key, { forceRefresh }).then((data) => ({ key, data })),
    ),
  );

  const map = new Map();
  settled.forEach((outcome, idx) => {
    const key = uniqueKeys[idx];
    if (outcome.status === "fulfilled") {
      map.set(key, { ok: true, data: outcome.value.data, error: null });
    } else {
      map.set(key, {
        ok: false,
        data: null,
        error: outcome.reason || new Error(`Failed to load dataset "${key}".`),
      });
    }
  });
  return map;
}

export function clearDatasetCache(datasetKey) {
  if (datasetKey) {
    inFlightCache.delete(datasetKey);
  } else {
    inFlightCache.clear();
  }
}
