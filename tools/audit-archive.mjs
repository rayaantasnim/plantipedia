#!/usr/bin/env node
/**
 * Plantipedia Archive, Relative-Path & Image-Quota Audit Script
 * Verifies:
 *  1. Every HTML route has zero broken relative links, scripts, manifests, or stylesheets
 *  2. Every ES module relative import resolves to a real file
 *  3. Every Service Worker CORE_SHELL_PATHS entry resolves cleanly
 *  4. Every curated monograph (data/monographs/*.json) has 14 chapters (01-14)
 *     and obeys strict image-quota uniqueness (Max 1 normalized image URL per monograph)
 *  5. Documentation files (README.md, docs/*.md) contain zero hardcoded live domain URLs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

function normalizeImageKey(url) {
  let str = String(url || "").trim();
  if (!str) return "";
  try {
    const nestedHttpMatch = str.match(/\/cache\/[^/]+\/(https?(?::|%3a).*)$/i);
    if (nestedHttpMatch) {
      try {
        str = decodeURIComponent(nestedHttpMatch[1]);
      } catch {
        str = nestedHttpMatch[1];
      }
    }
    const u = new URL(str);
    const inatMatch = u.pathname.match(/\/photos\/(\d+)\//i);
    if (inatMatch) return `inat:${inatMatch[1]}`;
    const pexelsMatch = u.pathname.match(/pexels-photo-(\d+)/i);
    if (pexelsMatch) return `pexels:${pexelsMatch[1]}`;
    const decodedPath = decodeURIComponent(u.pathname);
    const parts = decodedPath.split("/").filter(Boolean);
    const lastSeg = parts[parts.length - 1] || decodedPath;
    const baseFile = lastSeg.replace(/^\d+px-/, "");
    return `${u.hostname.toLowerCase()}:${baseFile.toLowerCase()}`;
  } catch {
    return str.toLowerCase().split("?")[0];
  }
}

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function auditHtmlLinks() {
  const errors = [];
  const htmlFiles = walkFiles(ROOT_DIR).filter((f) => f.endsWith(".html"));

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const dir = path.dirname(file);
    const matches = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)];
    for (const [, rawRef] of matches) {
      if (
        rawRef.startsWith("http://") ||
        rawRef.startsWith("https://") ||
        rawRef.startsWith("#") ||
        rawRef.startsWith("mailto:") ||
        rawRef.startsWith("tel:") ||
        rawRef.startsWith("data:") ||
        rawRef.startsWith("javascript:")
      ) {
        continue;
      }
      const clean = rawRef.split("?")[0].split("#")[0];
      if (!clean) continue;
      const target = clean.startsWith("/")
        ? path.join(ROOT_DIR, clean)
        : path.resolve(dir, clean);
      if (!fs.existsSync(target)) {
        errors.push(`Broken HTML ref in ${path.relative(ROOT_DIR, file)}: ${rawRef}`);
      }
    }
  }
  return { count: htmlFiles.length, errors };
}

function auditJsImports() {
  const errors = [];
  const jsFiles = walkFiles(path.join(ROOT_DIR, "src")).filter((f) =>
    f.endsWith(".js"),
  );

  for (const file of jsFiles) {
    const code = fs.readFileSync(file, "utf8");
    const dir = path.dirname(file);
    const imports = [
      ...code.matchAll(/(?:import|from)\s+["'](\.[^"']+)["']/g),
    ].map((m) => m[1]);

    for (const rel of imports) {
      const resolved = path.resolve(dir, rel);
      if (!fs.existsSync(resolved)) {
        errors.push(`Broken JS import in ${path.relative(ROOT_DIR, file)}: ${rel}`);
      }
    }
  }
  return { count: jsFiles.length, errors };
}

function auditServiceWorker() {
  const errors = [];
  const swPath = path.join(ROOT_DIR, "sw.js");
  const swCode = fs.readFileSync(swPath, "utf8");
  const listMatch = swCode.match(/CORE_SHELL_PATHS\s*=\s*\[([\s\S]*?)\]/);
  if (!listMatch) {
    return { count: 0, errors: ["Missing CORE_SHELL_PATHS array in sw.js"] };
  }
  const entries = [...listMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const entry of entries) {
    const clean = entry.split("?")[0];
    const target =
      clean === "./" || clean.endsWith("/")
        ? path.join(ROOT_DIR, clean, "index.html")
        : path.join(ROOT_DIR, clean);
    if (!fs.existsSync(target)) {
      errors.push(`Missing sw.js cache asset: ${entry}`);
    }
  }
  return { count: entries.length, errors };
}

const SUSPICIOUS_IMAGE_URL_RE =
  /\.(?:svg|gif)(?:\?|$)|locator|range_map|distribution_map|cladogram|diagram|chart|flag_of|coat_of_arms/i;

function auditMonographsAndImageQuota() {
  const errors = [];
  const monographsDir = path.join(ROOT_DIR, "data", "monographs");
  const files = fs
    .readdirSync(monographsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const siteWideCounts = new Map();

  for (const file of files) {
    const full = path.join(monographsDir, file);
    const data = JSON.parse(fs.readFileSync(full, "utf8"));
    const sections = Array.isArray(data.sections) ? data.sections : [];
    if (sections.length !== 14) {
      errors.push(`${file}: expected 14 chapters (01-14), found ${sections.length}`);
    }

    const pageKeys = new Set();
    const urls = [];
    if (data.heroImage?.url) urls.push(data.heroImage.url);
    if (data.image?.imageUrl) urls.push(data.image.imageUrl);
    for (const sec of sections) {
      if (Array.isArray(sec.images)) {
        for (const img of sec.images) {
          if (img?.url) urls.push(img.url);
        }
      }
    }

    for (const u of urls) {
      if (SUSPICIOUS_IMAGE_URL_RE.test(u)) {
        errors.push(`${file}: suspicious non-botanical image URL (${u})`);
      }
      const key = normalizeImageKey(u);
      if (!key) continue;
      if (pageKeys.has(key)) {
        errors.push(`${file}: duplicate normalized image on page (${key})`);
      }
      pageKeys.add(key);
      siteWideCounts.set(key, (siteWideCounts.get(key) || 0) + 1);
    }

    if (pageKeys.size < 6 || pageKeys.size > 10) {
      errors.push(
        `${file}: expected 6-10 unique botanical images, found ${pageKeys.size}`,
      );
    }
  }

  const overQuota = [];
  for (const [key, count] of siteWideCounts.entries()) {
    if (count > 4) {
      overQuota.push(`${key} (${count}x)`);
      errors.push(`Site-wide >4 image quota exceeded: ${key} (${count}x)`);
    }
  }

  return {
    count: files.length,
    uniqueImages: siteWideCounts.size,
    overQuota,
    errors,
  };
}

function auditDocsNoLiveDomain() {
  const errors = [];
  const docFiles = [
    path.join(ROOT_DIR, "README.md"),
    ...walkFiles(path.join(ROOT_DIR, "docs")).filter((f) => f.endsWith(".md")),
  ];
  const domainRe = /https?:\/\/[a-z0-9.-]*workers\.dev[^\s)"'>]*/gi;

  for (const file of docFiles) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(domainRe);
    if (matches && matches.length > 0) {
      errors.push(
        `Hardcoded live domain URL in ${path.relative(ROOT_DIR, file)}: ${matches.join(", ")}`,
      );
    }
  }
  return { count: docFiles.length, errors };
}

function main() {
  const htmlRes = auditHtmlLinks();
  const jsRes = auditJsImports();
  const swRes = auditServiceWorker();
  const monoRes = auditMonographsAndImageQuota();
  const docRes = auditDocsNoLiveDomain();

  const allErrors = [
    ...htmlRes.errors,
    ...jsRes.errors,
    ...swRes.errors,
    ...monoRes.errors,
    ...docRes.errors,
  ];

  console.log(
    JSON.stringify(
      {
        htmlFilesChecked: htmlRes.count,
        jsModulesChecked: jsRes.count,
        swAssetsChecked: swRes.count,
        monographsChecked: monoRes.count,
        uniqueCuratedImages: monoRes.uniqueImages,
        siteWideOver4QuotaImages: monoRes.overQuota,
        docsChecked: docRes.count,
        errors: allErrors,
      },
      null,
      2,
    ),
  );

  if (allErrors.length > 0) {
    process.exit(1);
  }
}

main();
