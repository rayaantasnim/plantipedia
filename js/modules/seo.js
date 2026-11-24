/**
 * Dynamic Document Head & Structured Schema.org JSON-LD Hydration
 * Updates title, meta tags, canonical URL, OpenGraph, Twitter Cards, and JSON-LD from JSON configs.
 */

function setMetaTag(attrName, attrValue, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonicalHref(href) {
  if (!href) return;
  let canonicalEl = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", href);
}

function setJsonLdScript(id, schemaData) {
  if (!schemaData) return;
  let ldScript = document.getElementById(id);
  if (!ldScript) {
    ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.id = id;
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(schemaData, null, 2);
}

export function applyPageSeo(seoConfig) {
  if (!seoConfig || typeof seoConfig !== "object") return;

  if (seoConfig.title) {
    document.title = seoConfig.title;
  }

  const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
  setCanonicalHref(canonicalUrl);

  setMetaTag("name", "description", seoConfig.description);
  setMetaTag("name", "keywords", seoConfig.keywords);
  setMetaTag("name", "author", seoConfig.author);
  setMetaTag("property", "og:type", seoConfig.ogType || "website");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", seoConfig.ogTitle || seoConfig.title);
  setMetaTag(
    "property",
    "og:description",
    seoConfig.ogDescription || seoConfig.description,
  );
  setMetaTag("property", "og:url", canonicalUrl);
  setMetaTag("property", "og:image", seoConfig.ogImage);
  setMetaTag("property", "og:image:alt", seoConfig.ogImageAlt);

  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", seoConfig.ogTitle || seoConfig.title);
  setMetaTag(
    "name",
    "twitter:description",
    seoConfig.ogDescription || seoConfig.description,
  );
  setMetaTag("name", "twitter:image", seoConfig.ogImage);

  if (seoConfig.jsonLd) {
    setJsonLdScript("dynamic-page-jsonld", seoConfig.jsonLd);
  }
}

export function applyPlantMonographSeo(plant) {
  if (!plant || typeof plant !== "object") return;

  const origin = window.location.origin;
  const basePath = window.location.pathname.replace(/[^/]*$/, "");
  const baseUrl = origin + basePath;
  const homeUrl = `${baseUrl}index.html`;
  const directoryUrl = `${baseUrl}species.html`;
  const categoryUrl = `${baseUrl}species.html?category=${encodeURIComponent(plant.category)}`;
  const pageUrl = `${window.location.origin}${window.location.pathname}?species=${encodeURIComponent(plant.slug)}`;

  const seoTitle = `${plant.commonName} (${plant.scientificName}) | Plantipedia`;
  const seoDesc = plant.shortSummary;
  const heroImgUrl = plant.heroImage?.url || "";
  const heroImgAlt = plant.heroImage?.alt || plant.commonName;
  const ov = plant.overview || {};

  document.title = seoTitle;
  setCanonicalHref(pageUrl);

  setMetaTag("name", "description", seoDesc);
  setMetaTag(
    "name",
    "keywords",
    [
      plant.commonName,
      plant.scientificName,
      ov.family,
      ov.genus,
      plant.category,
      "Plantipedia",
      "botanical monograph",
    ]
      .filter(Boolean)
      .join(", "),
  );

  setMetaTag("property", "og:type", "article");
  setMetaTag("property", "og:site_name", "Plantipedia");
  setMetaTag("property", "og:title", seoTitle);
  setMetaTag("property", "og:description", seoDesc);
  setMetaTag("property", "og:url", pageUrl);
  if (heroImgUrl) {
    setMetaTag("property", "og:image", heroImgUrl);
    setMetaTag("property", "og:image:alt", heroImgAlt);
    setMetaTag("name", "twitter:image", heroImgUrl);
  }
  setMetaTag("name", "twitter:card", "summary_large_image");
  setMetaTag("name", "twitter:title", seoTitle);
  setMetaTag("name", "twitter:description", seoDesc);

  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: seoTitle,
        description: seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        author: [
          { "@type": "Person", "name": "Jalees Habib" },
          { "@type": "Person", "name": "Rayaan Tasnim" },
        ],
        publisher: {
          "@type": "EducationalOrganization",
          name: "Plantipedia",
          url: homeUrl,
        },
        about: { "@id": `${pageUrl}#taxon` },
      },
      {
        "@type": "Taxon",
        "@id": `${pageUrl}#taxon`,
        name: plant.schemaOrg?.name || plant.scientificName,
        alternateName: plant.schemaOrg?.alternateName || plant.commonName,
        taxonRank: plant.schemaOrg?.taxonRank || "Species",
        description: plant.leadOverview || seoDesc,
        image: heroImgUrl,
        url: pageUrl,
        parentTaxon: plant.schemaOrg?.parentTaxon || {
          "@type": "Taxon",
          name: ov.genus || plant.scientificName.split(" ")[0],
          taxonRank: "Genus",
          parentTaxon: {
            "@type": "Taxon",
            name: ov.family || "",
            taxonRank: "Family",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Available Species",
            item: directoryUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: plant.category,
            item: categoryUrl,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: plant.commonName,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  setJsonLdScript("dynamic-plant-jsonld", schemaData);
}
