(function () {
  "use strict";

  const CATEGORIES = [
    "All",
    "Flowers",
    "Fruit Trees",
    "Medicinal",
    "Shrubs & Herbs",
    "Trees & Palms",
    "Aquatic",
  ];

  const BATCH_SIZE = 24;

  const SECTION_MAP_DESCRIPTIONS = {
    "00": "Botanical overview card, hero plate, and structured classification table",
    "01": "Detailed anatomy of stems, leaves, inflorescences, fruits, and root systems",
    "02": "Linnaean hierarchy, phylogenetic lineage, and diagnostic family traits",
    "03": "Native biomes, global cultivation belts, and South Asian distribution",
    "04": "Pollinator guilds, nectar rewards, seed dispersal, and trophic relationships",
    "05": "Agricultural trade, culinary traditions, handicrafts, and cultural symbolism",
    "06": "Bioactive phytochemicals, ethnomedicine, and clinical safety guidance",
    "07": "Sunlight, soil pH, propagation, irrigation, pruning, pests, and containers",
  };

  let allPlants = [];

  /* ================= ESCAPING & SAFE HELPERS ================= */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.__plantipediaImgFallback = function (imgEl, label) {
    if (!imgEl || !imgEl.parentNode) return;
    const plate = document.createElement("div");
    plate.className = "image-fallback-plate";
    plate.innerHTML =
      '<svg viewBox="0 0 48 48" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      '<path d="M24 42V22M24 22C24 13 31 7 40 7c0 9-6 15-16 15ZM24 26C24 18 17 12 8 12c0 9 6 14 16 14Z"/>' +
      '<circle cx="24" cy="11" r="3" fill="currentColor" opacity="0.5"/>' +
      "</svg>" +
      '<span class="image-fallback-label">' +
      escapeHtml(label || "Botanical Illustration Plate") +
      "</span>";
    imgEl.parentNode.replaceChild(plate, imgEl);
  };

  function renderImgTag(src, alt, fallbackLabel, eager) {
    const safeSrc = escapeHtml(src);
    const safeAlt = escapeHtml(alt);
    const safeLabel = escapeHtml(fallbackLabel || alt).replace(/'/g, "&#39;");
    const loadingAttr = eager ? "eager" : "lazy";
    return (
      '<img src="' +
      safeSrc +
      '" alt="' +
      safeAlt +
      '" loading="' +
      loadingAttr +
      '" ' +
      'referrerpolicy="no-referrer" ' +
      "onerror=\"window.__plantipediaImgFallback(this, '" +
      safeLabel +
      "')\">"
    );
  }

  function renderSpeciesCard(plant) {
    const href = "plant.html?species=" + encodeURIComponent(plant.slug);
    return (
      '<a href="' +
      href +
      '" class="species-card" aria-label="Read monograph for ' +
      escapeHtml(plant.commonName) +
      '">' +
      '<div class="species-card-media">' +
      renderImgTag(
        plant.heroImage.url,
        plant.heroImage.alt,
        plant.commonName + " — " + plant.scientificName,
        false,
      ) +
      "</div>" +
      '<div class="species-card-body">' +
      '<div class="species-card-meta">' +
      "<span>" +
      escapeHtml(plant.category) +
      "</span>" +
      '<span class="meta-sep" aria-hidden="true">&middot;</span>' +
      "<span>" +
      escapeHtml(plant.overview.family) +
      "</span>" +
      "</div>" +
      '<h3 class="species-card-title">' +
      escapeHtml(plant.commonName) +
      "</h3>" +
      '<p class="species-card-sci">' +
      escapeHtml(plant.scientificName) +
      "</p>" +
      '<p class="species-card-excerpt">' +
      escapeHtml(plant.shortSummary) +
      "</p>" +
      '<div class="species-card-cta">' +
      "<span>Explore Monograph</span>" +
      '<span class="species-card-cta-arrow" aria-hidden="true">&rarr;</span>' +
      "</div>" +
      "</div>" +
      "</a>"
    );
  }

  function plantMatchesQuery(plant, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      plant.commonName.toLowerCase().includes(q) ||
      plant.scientificName.toLowerCase().includes(q) ||
      plant.overview.family.toLowerCase().includes(q) ||
      plant.category.toLowerCase().includes(q) ||
      plant.overview.plantGroup.toLowerCase().includes(q)
    );
  }

  function plantMatchesCategory(plant, category) {
    if (!category || category === "All") return true;
    if (Array.isArray(plant.categories)) {
      return plant.categories.includes(category) || plant.category === category;
    }
    return plant.category === category;
  }

  /* ================= GSAP 3 + SCROLLTRIGGER CHOREOGRAPHY ENGINE ================= */
  let gsapPluginRegistered = false;
  let activeGsapMatchMedia = null;
  let fallbackRevealObserver = null;

  function ensureGsapRegistered() {
    if (typeof window.gsap === "undefined") return false;
    if (!gsapPluginRegistered && typeof window.ScrollTrigger !== "undefined") {
      window.gsap.registerPlugin(window.ScrollTrigger);
      gsapPluginRegistered = true;
    }
    return true;
  }

  function initOfflineCssRevealFallback(rootScope) {
    const scope = rootScope || document;
    const targets = scope.querySelectorAll(
      ".mission-stat-card, .highlight-card, .domain-card, .curiosity-strip, .species-card, .chapter-card, .pager-link",
    );
    if (!targets.length) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      targets.forEach(function (el) {
        el.classList.add("is-revealed");
      });
      return;
    }

    document.documentElement.classList.add("css-reveal-fallback");
    if (!fallbackRevealObserver) {
      fallbackRevealObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -28px 0px" },
      );
    }

    targets.forEach(function (el, idx) {
      if (el.classList.contains("is-revealed")) return;
      el.classList.add("reveal-on-scroll");
      el.style.setProperty("--reveal-delay", (idx % 3) * 65 + "ms");
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96) {
        requestAnimationFrame(function () {
          el.classList.add("is-revealed");
        });
      } else {
        fallbackRevealObserver.observe(el);
      }
    });
  }

  function animateDynamicSpeciesGrid(gridScope) {
    if (!gridScope) return;
    if (!ensureGsapRegistered()) {
      initOfflineCssRevealFallback(gridScope);
      return;
    }
    const gsap = window.gsap;
    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gridScope.querySelectorAll(".species-card");
    if (prefersReduced || !cards.length) {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      return;
    }

    gsap.killTweensOf(cards);
    gsap.from(cards, {
      y: 26,
      opacity: 0,
      duration: 0.62,
      ease: "power3.out",
      stagger: 0.06,
      clearProps: "transform,opacity",
      overwrite: true,
    });
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  }

  function initGsapExperience(pageType) {
    if (
      !ensureGsapRegistered() ||
      typeof window.ScrollTrigger === "undefined"
    ) {
      initOfflineCssRevealFallback(document);
      return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    if (activeGsapMatchMedia) {
      activeGsapMatchMedia.revert();
    }

    activeGsapMatchMedia = gsap.matchMedia();

    activeGsapMatchMedia.add(
      "(prefers-reduced-motion: no-preference)",
      function () {
        // 1. Top Reading Progress Indicator (all pages)
        const progressBar = document.getElementById("scrollProgressBar");
        if (progressBar) {
          gsap.to(progressBar, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.documentElement,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.2,
            },
          });
        }

        // Helper for staggered ScrollTrigger card batches
        function revealStaggered(containerSelector, itemSelector) {
          const container = document.querySelector(containerSelector);
          if (!container) return;
          const items = container.querySelectorAll(itemSelector);
          if (!items.length) return;

          gsap.from(items, {
            y: 28,
            opacity: 0,
            duration: 0.72,
            ease: "power3.out",
            stagger: 0.1,
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: container,
              start: "top 86%",
              once: true,
            },
          });
        }

        function revealHeading(selector) {
          document.querySelectorAll(selector).forEach(function (el) {
            gsap.from(el, {
              y: 24,
              opacity: 0,
              duration: 0.7,
              ease: "power3.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: el,
                start: "top 86%",
                once: true,
              },
            });
          });
        }

        if (pageType === "home") {
          // Hero Entrance Timeline
          const heroEls = document.querySelectorAll(
            ".home-hero .hero-kicker, .home-hero .hero-headline, .home-hero .hero-subcopy, .home-hero .home-search-shell, .home-hero .hero-summary-strip",
          );
          if (heroEls.length) {
            gsap.from(heroEls, {
              y: 28,
              opacity: 0,
              duration: 0.75,
              ease: "power3.out",
              stagger: 0.1,
              clearProps: "transform,opacity",
            });
          }

          // Subtle Hero Vertical Parallax Scrub
          const heroSection = document.querySelector(".home-hero");
          const heroInner = document.querySelector(".home-hero-inner");
          if (heroSection && heroInner) {
            gsap.fromTo(
              heroInner,
              { yPercent: -2 },
              {
                yPercent: 6,
                ease: "none",
                scrollTrigger: {
                  trigger: heroSection,
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.4,
                },
              },
            );
          }

          revealHeading(
            ".mission-copy-col, .showcase-header, .domains-header, .curiosities-header, .highlights-header",
          );
          revealStaggered(".mission-stats-col", ".mission-stat-card");
          revealStaggered("#featuredSpeciesGrid", ".species-card");
          revealStaggered(".domains-grid", ".domain-card");
          revealStaggered(".curiosities-list", ".curiosity-strip");
          revealStaggered(".highlights-grid", ".highlight-card");
        } else if (pageType === "species") {
          const dirEls = document.querySelectorAll(
            ".directory-banner .breadcrumb-bar, .directory-banner .section-eyebrow, .directory-headline, .directory-subcopy, .directory-stat-pill, .directory-filter-panel",
          );
          if (dirEls.length) {
            gsap.from(dirEls, {
              y: 24,
              opacity: 0,
              duration: 0.68,
              ease: "power3.out",
              stagger: 0.08,
              clearProps: "transform,opacity",
            });
          }
          revealStaggered("#directorySpeciesGrid", ".species-card");
        } else if (pageType === "plant") {
          const detailHeroEls = document.querySelectorAll(
            ".detail-breadcrumb-row, .overview-title-block > *, .overview-hero-figure, .classification-table-wrap",
          );
          if (detailHeroEls.length) {
            gsap.from(detailHeroEls, {
              y: 26,
              opacity: 0,
              duration: 0.72,
              ease: "power3.out",
              stagger: 0.09,
              clearProps: "transform,opacity",
            });
          }

          // Hero Plate Vertical Parallax Scrub
          const overviewHeroCard = document.querySelector(
            ".overview-hero-card",
          );
          const heroPlateImg = document.querySelector(
            ".overview-hero-media img",
          );
          if (overviewHeroCard && heroPlateImg) {
            gsap.set(heroPlateImg, { scale: 1.12 });
            gsap.fromTo(
              heroPlateImg,
              { yPercent: -6 },
              {
                yPercent: 6,
                ease: "none",
                scrollTrigger: {
                  trigger: overviewHeroCard,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.35,
                },
              },
            );
          }

          // Chapters 01–07 Scroll-Triggered Reveals
          document.querySelectorAll(".chapter-card").forEach(function (card) {
            gsap.from(card, {
              y: 28,
              opacity: 0,
              duration: 0.74,
              ease: "power3.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: card,
                start: "top 86%",
                once: true,
              },
            });

            const figures = card.querySelectorAll(
              ".chapter-figure-single, .gallery-figure",
            );
            if (figures.length) {
              gsap.from(figures, {
                scale: 0.95,
                opacity: 0,
                duration: 0.75,
                ease: "power3.out",
                stagger: 0.1,
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: card,
                  start: "top 84%",
                  once: true,
                },
              });
            }

            const subblocks = card.querySelectorAll(".subblock-item");
            if (subblocks.length) {
              gsap.from(subblocks, {
                y: 20,
                opacity: 0,
                duration: 0.65,
                ease: "power3.out",
                stagger: 0.08,
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: card.querySelector(".chapter-subblocks") || card,
                  start: "top 86%",
                  once: true,
                },
              });
            }
          });

          revealStaggered(".species-pager", ".pager-link");
        }

        ScrollTrigger.refresh();
      },
    );
  }

  /* ================= SHARED LIVE SPECIES SEARCH & MOBILE OVERLAY ================= */
  function bindLiveSpeciesSearch(config) {
    const form = document.getElementById(config.formId);
    const input = document.getElementById(config.inputId);
    const clearBtn = document.getElementById(config.clearId);
    const suggestionsEl = document.getElementById(config.suggestionsId);

    if (!form || !input || !suggestionsEl) return;

    let activeIndex = -1;
    let currentMatches = [];

    function hideSuggestions() {
      suggestionsEl.hidden = true;
      suggestionsEl.innerHTML = "";
      activeIndex = -1;
    }

    function renderSuggestions(query) {
      const q = query.trim();
      if (clearBtn) clearBtn.hidden = q.length === 0;

      if (!q) {
        currentMatches = [];
        hideSuggestions();
        return;
      }

      currentMatches = allPlants
        .filter(function (plant) {
          return plantMatchesQuery(plant, q);
        })
        .slice(0, 8);

      activeIndex = -1;

      if (currentMatches.length === 0) {
        suggestionsEl.innerHTML =
          '<div class="nav-suggestion-empty">No species matched "' +
          escapeHtml(q) +
          '"</div>';
        suggestionsEl.hidden = false;
        return;
      }

      suggestionsEl.innerHTML = currentMatches
        .map(function (p, idx) {
          return (
            '<a href="plant.html?species=' +
            encodeURIComponent(p.slug) +
            '" ' +
            'class="nav-suggestion-item" role="option" data-nav-idx="' +
            idx +
            '">' +
            "<div>" +
            '<span class="nav-suggestion-title">' +
            escapeHtml(p.commonName) +
            "</span>" +
            '<span class="nav-suggestion-sci">' +
            escapeHtml(p.scientificName) +
            "</span>" +
            "</div>" +
            '<span class="nav-suggestion-family">' +
            escapeHtml(p.overview.family) +
            "</span>" +
            "</a>"
          );
        })
        .join("");
      suggestionsEl.hidden = false;
    }

    function syncActiveSuggestion() {
      const items = suggestionsEl.querySelectorAll(".nav-suggestion-item");
      items.forEach(function (el, idx) {
        el.classList.toggle("is-active", idx === activeIndex);
      });
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: "nearest" });
      }
    }

    function navigateToSpecies(slug) {
      if (typeof config.onNavigate === "function") {
        config.onNavigate();
      }
      window.location.href = "plant.html?species=" + encodeURIComponent(slug);
    }

    input.addEventListener("input", function () {
      renderSuggestions(input.value);
    });

    input.addEventListener("focus", function () {
      if (input.value.trim()) {
        renderSuggestions(input.value);
      }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        hideSuggestions();
        input.blur();
        return;
      }
      if (suggestionsEl.hidden || currentMatches.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % currentMatches.length;
        syncActiveSuggestion();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex =
          (activeIndex - 1 + currentMatches.length) % currentMatches.length;
        syncActiveSuggestion();
      } else if (
        e.key === "Enter" &&
        activeIndex >= 0 &&
        currentMatches[activeIndex]
      ) {
        e.preventDefault();
        navigateToSpecies(currentMatches[activeIndex].slug);
      }
    });

    suggestionsEl.addEventListener("click", function (e) {
      if (e.target.closest("a") && typeof config.onNavigate === "function") {
        config.onNavigate();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        clearBtn.hidden = true;
        hideSuggestions();
        input.focus();
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (activeIndex >= 0 && currentMatches[activeIndex]) {
        navigateToSpecies(currentMatches[activeIndex].slug);
        return;
      }
      if (currentMatches.length === 1) {
        navigateToSpecies(currentMatches[0].slug);
        return;
      }
      const q = input.value.trim();
      if (q) {
        if (typeof config.onNavigate === "function") {
          config.onNavigate();
        }
        window.location.href = "species.html?q=" + encodeURIComponent(q);
      }
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(config.wrapSelector)) {
        hideSuggestions();
      }
    });
  }

  function initNavbarSearch() {
    bindLiveSpeciesSearch({
      formId: "navbarSearchForm",
      inputId: "navbarSearchInput",
      clearId: "navbarSearchClear",
      suggestionsId: "navbarSuggestions",
      wrapSelector: "#navbarSearchWrap",
    });
  }

  function initMobileNavOverlay() {
    const toggleBtn = document.getElementById("mobileMenuToggle");
    const overlay = document.getElementById("mobileNavOverlay");
    const closeBtn = document.getElementById("mobileMenuClose");
    const searchInput = document.getElementById("mobileSearchInput");

    if (!toggleBtn || !overlay || !closeBtn) return;

    function openOverlay() {
      overlay.hidden = false;
      overlay.scrollTop = 0;
      const overlayBody = overlay.querySelector(".mobile-overlay-body");
      if (overlayBody) overlayBody.scrollTop = 0;
      toggleBtn.classList.add("is-open");
      toggleBtn.setAttribute("aria-expanded", "true");
      toggleBtn.setAttribute("aria-label", "Close navigation menu");
      document.documentElement.classList.add("overlay-locked");
      document.body.classList.add("overlay-locked");
      if (searchInput) {
        setTimeout(function () {
          searchInput.focus();
        }, 60);
      }
    }

    function closeOverlay(restoreFocus) {
      if (overlay.hidden) return;
      overlay.hidden = true;
      toggleBtn.classList.remove("is-open");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.setAttribute("aria-label", "Open navigation menu");
      document.documentElement.classList.remove("overlay-locked");
      document.body.classList.remove("overlay-locked");
      if (restoreFocus) {
        toggleBtn.focus();
      }
    }

    toggleBtn.addEventListener("click", function () {
      if (overlay.hidden) {
        openOverlay();
      } else {
        closeOverlay(true);
      }
    });

    closeBtn.addEventListener("click", function () {
      closeOverlay(true);
    });

    overlay
      .querySelectorAll(
        ".mobile-nav-card, .mobile-overlay-brand, .mobile-quick-chip, .mobile-category-pill",
      )
      .forEach(function (link) {
        link.addEventListener("click", function (e) {
          const dirCat = link.getAttribute("data-directory-category");
          closeOverlay(false);
          if (
            dirCat &&
            typeof window.__plantipediaSelectDirectoryCategory === "function"
          ) {
            e.preventDefault();
            window.__plantipediaSelectDirectoryCategory(dirCat);
          }
        });
      });

    bindLiveSpeciesSearch({
      formId: "mobileSearchForm",
      inputId: "mobileSearchInput",
      clearId: "mobileSearchClear",
      suggestionsId: "mobileSuggestions",
      wrapSelector: "#mobileSearchWrap",
      onNavigate: function () {
        closeOverlay(false);
      },
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) {
        closeOverlay(true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768 && !overlay.hidden) {
        closeOverlay(false);
      }
    });
  }

  /* ================= HOME PAGE CONTROLLER (index.html) ================= */
  function initHomePage() {
    const searchForm = document.getElementById("homeSearchForm");
    const searchInput = document.getElementById("homeSearchInput");
    const searchClear = document.getElementById("homeSearchClear");
    const suggestionsBox = document.getElementById("homeSuggestions");
    const featuredGridEl = document.getElementById("featuredSpeciesGrid");
    const featuredCountEl = document.getElementById("featuredCount");
    const totalStatEl = document.getElementById("homeStatSpeciesCount");

    const homeCanonicalUrl = window.location.origin + window.location.pathname;
    const homeCanonicalEl = document.head.querySelector(
      'link[rel="canonical"]',
    );
    if (homeCanonicalEl) homeCanonicalEl.setAttribute("href", homeCanonicalUrl);
    setMetaTag("property", "og:url", homeCanonicalUrl);

    if (totalStatEl) {
      totalStatEl.textContent = String(allPlants.length);
    }

    const featuredPlants = allPlants
      .filter(function (p) {
        return p.featured === true;
      })
      .slice(0, 3);

    const flagshipList =
      featuredPlants.length > 0 ? featuredPlants : allPlants.slice(0, 3);

    if (featuredCountEl) {
      featuredCountEl.textContent =
        "Showing " +
        flagshipList.length +
        " flagship monographs of " +
        allPlants.length +
        " indexed species";
    }

    if (featuredGridEl) {
      featuredGridEl.innerHTML = flagshipList.map(renderSpeciesCard).join("");
    }

    function updateSuggestions(query) {
      if (!suggestionsBox) return;
      const q = query.trim();
      if (!q) {
        suggestionsBox.hidden = true;
        suggestionsBox.innerHTML = "";
        return;
      }

      const matches = allPlants
        .filter(function (p) {
          return plantMatchesQuery(p, q);
        })
        .slice(0, 7);

      if (matches.length === 0) {
        suggestionsBox.innerHTML =
          '<div class="suggestion-row"><span>No matching species found for "' +
          escapeHtml(q) +
          '"</span></div>';
        suggestionsBox.hidden = false;
        return;
      }

      suggestionsBox.innerHTML = matches
        .map(function (p) {
          return (
            '<a href="plant.html?species=' +
            encodeURIComponent(p.slug) +
            '" class="suggestion-row" role="option">' +
            "<div>" +
            '<span class="suggestion-main">' +
            escapeHtml(p.commonName) +
            "</span>" +
            '<span class="suggestion-sci">' +
            escapeHtml(p.scientificName) +
            "</span>" +
            "</div>" +
            '<span class="suggestion-family">' +
            escapeHtml(p.overview.family) +
            "</span>" +
            "</a>"
          );
        })
        .join("");
      suggestionsBox.hidden = false;
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const q = searchInput.value.trim();
        if (searchClear) searchClear.hidden = q.length === 0;
        updateSuggestions(q);
      });

      searchInput.addEventListener("focus", function () {
        if (searchInput.value.trim()) {
          updateSuggestions(searchInput.value.trim());
        }
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener("click", function () {
        searchInput.value = "";
        searchClear.hidden = true;
        if (suggestionsBox) suggestionsBox.hidden = true;
        searchInput.focus();
      });
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) {
          window.location.href = "species.html";
          return;
        }
        const matches = allPlants.filter(function (p) {
          return plantMatchesQuery(p, q);
        });
        if (matches.length === 1) {
          window.location.href =
            "plant.html?species=" + encodeURIComponent(matches[0].slug);
          return;
        }
        window.location.href = "species.html?q=" + encodeURIComponent(q);
      });
    }

    document.addEventListener("click", function (e) {
      if (suggestionsBox && !e.target.closest(".home-search-shell")) {
        suggestionsBox.hidden = true;
      }
    });
  }

  /* ================= SPECIES DIRECTORY CONTROLLER (species.html) ================= */
  function initSpeciesDirectoryPage() {
    const searchForm = document.getElementById("directorySearchForm");
    const searchInput = document.getElementById("directorySearchInput");
    const searchClear = document.getElementById("directorySearchClear");
    const sortSelect = document.getElementById("directorySortSelect");
    const categoryTabsEl = document.getElementById("directoryCategoryTabs");
    const azStripEl = document.getElementById("directoryAzStrip");
    const gridEl = document.getElementById("directorySpeciesGrid");
    const countEl = document.getElementById("directoryExplorerCount");
    const totalStatEl = document.getElementById("directoryTotalCount");
    const filteredNumEl = document.getElementById("directoryFilteredNum");
    const resetAllBtn = document.getElementById("directoryResetAllBtn");
    const loadMoreWrap = document.getElementById("directoryLoadMoreWrap");
    const loadMoreBtn = document.getElementById("directoryLoadMoreBtn");
    const loadMoreLabel = document.getElementById("directoryLoadMoreLabel");

    const dirCanonicalUrl = window.location.origin + window.location.pathname;
    const dirCanonicalEl = document.head.querySelector('link[rel="canonical"]');
    if (dirCanonicalEl) dirCanonicalEl.setAttribute("href", dirCanonicalUrl);
    setMetaTag("property", "og:url", dirCanonicalUrl);

    if (totalStatEl) {
      totalStatEl.textContent = String(allPlants.length);
    }

    const params = new URLSearchParams(window.location.search);
    const paramCat = params.get("category");
    const paramQuery = params.get("q");
    const paramLetter = params.get("letter");

    let activeCategory =
      paramCat && CATEGORIES.includes(paramCat) ? paramCat : "All";
    let activeQuery = paramQuery ? paramQuery.trim() : "";
    let activeLetter =
      paramLetter && /^[A-Z]$/i.test(paramLetter.trim())
        ? paramLetter.trim().toUpperCase()
        : "All";
    let activeSort = "az";
    let visibleLimit = BATCH_SIZE;

    if (searchInput && activeQuery) {
      searchInput.value = activeQuery;
      if (searchClear) searchClear.hidden = false;
    }

    const availableLetters = new Set(
      allPlants.map(function (p) {
        return p.commonName ? p.commonName.charAt(0).toUpperCase() : "";
      }),
    );

    function renderAzStrip() {
      if (!azStripEl) return;
      const letters = ["All"].concat("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      azStripEl.innerHTML = letters
        .map(function (ltr) {
          const isAll = ltr === "All";
          const hasEntries = isAll || availableLetters.has(ltr);
          const isActive = activeLetter === ltr;
          return (
            '<button type="button" class="az-letter-btn' +
            (isActive ? " active" : "") +
            '" ' +
            'data-letter="' +
            ltr +
            '" ' +
            (!hasEntries ? 'disabled aria-disabled="true"' : "") +
            ">" +
            ltr +
            "</button>"
          );
        })
        .join("");
    }

    function syncCategoryTabs() {
      if (!categoryTabsEl) return;
      categoryTabsEl
        .querySelectorAll("[data-category]")
        .forEach(function (tab) {
          const isActive = tab.getAttribute("data-category") === activeCategory;
          tab.classList.toggle("active", isActive);
          tab.setAttribute("aria-selected", String(isActive));
        });
    }

    function getFilteredAndSorted() {
      const filtered = allPlants.filter(function (plant) {
        const matchesCat = plantMatchesCategory(plant, activeCategory);
        const matchesQ = plantMatchesQuery(plant, activeQuery);
        const matchesLtr =
          activeLetter === "All" ||
          (plant.commonName &&
            plant.commonName.charAt(0).toUpperCase() === activeLetter);
        return matchesCat && matchesQ && matchesLtr;
      });

      return filtered.slice().sort(function (a, b) {
        if (activeSort === "za") {
          return b.commonName.localeCompare(a.commonName);
        }
        if (activeSort === "family") {
          const famCmp = (a.overview.family || "").localeCompare(
            b.overview.family || "",
          );
          return famCmp !== 0
            ? famCmp
            : a.commonName.localeCompare(b.commonName);
        }
        return a.commonName.localeCompare(b.commonName);
      });
    }

    function resetAllFilters() {
      activeCategory = "All";
      activeQuery = "";
      activeLetter = "All";
      activeSort = "az";
      visibleLimit = BATCH_SIZE;
      if (searchInput) searchInput.value = "";
      if (searchClear) searchClear.hidden = true;
      if (sortSelect) sortSelect.value = "az";
      syncCategoryTabs();
      renderAzStrip();
      renderDirectory();
    }

    function renderDirectory() {
      const sorted = getFilteredAndSorted();
      const totalMatched = sorted.length;
      const sliced = sorted.slice(0, visibleLimit);
      const hasFilters =
        activeCategory !== "All" ||
        activeQuery !== "" ||
        activeLetter !== "All";

      if (filteredNumEl) {
        filteredNumEl.textContent = String(totalMatched);
      }

      if (countEl) {
        countEl.textContent =
          "Displaying " +
          sliced.length +
          " of " +
          totalMatched +
          " matching species (" +
          allPlants.length +
          " total in archive)";
      }

      if (resetAllBtn) {
        resetAllBtn.hidden = !hasFilters;
      }

      if (!gridEl) return;

      if (totalMatched === 0) {
        gridEl.innerHTML =
          '<div class="empty-search-state">' +
          "<h3>No matching botanical species found</h3>" +
          "<p>Try clearing the letter filter, selecting a broader taxonomic category, or searching another plant name.</p>" +
          '<button type="button" class="empty-reset-btn" id="dirEmptyResetBtn">Reset All Filters</button>' +
          "</div>";
        if (loadMoreWrap) loadMoreWrap.hidden = true;

        const emptyBtn = document.getElementById("dirEmptyResetBtn");
        if (emptyBtn) {
          emptyBtn.addEventListener("click", resetAllFilters);
        }
        return;
      }

      gridEl.innerHTML = sliced.map(renderSpeciesCard).join("");
      if (isUserInteraction) {
        animateDynamicSpeciesGrid(gridEl);
      }

      if (loadMoreWrap && loadMoreLabel) {
        const remaining = totalMatched - sliced.length;
        if (remaining > 0) {
          loadMoreWrap.hidden = false;
          loadMoreLabel.textContent =
            "Load More Species (" +
            Math.min(BATCH_SIZE, remaining) +
            " more of " +
            remaining +
            " remaining)";
        } else {
          loadMoreWrap.hidden = true;
        }
      }
    }

    let isUserInteraction = false;

    if (categoryTabsEl) {
      categoryTabsEl.addEventListener("click", function (e) {
        const tab = e.target.closest("[data-category]");
        if (!tab) return;
        activeCategory = tab.getAttribute("data-category");
        visibleLimit = BATCH_SIZE;
        isUserInteraction = true;
        syncCategoryTabs();
        renderDirectory();
      });
    }

    if (azStripEl) {
      azStripEl.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-letter]");
        if (!btn || btn.disabled) return;
        activeLetter = btn.getAttribute("data-letter");
        visibleLimit = BATCH_SIZE;
        isUserInteraction = true;
        renderAzStrip();
        renderDirectory();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        activeQuery = searchInput.value.trim();
        visibleLimit = BATCH_SIZE;
        isUserInteraction = true;
        if (searchClear) searchClear.hidden = activeQuery.length === 0;
        renderDirectory();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener("click", function () {
        searchInput.value = "";
        activeQuery = "";
        visibleLimit = BATCH_SIZE;
        isUserInteraction = true;
        searchClear.hidden = true;
        renderDirectory();
        searchInput.focus();
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        isUserInteraction = true;
        renderDirectory();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        activeSort = sortSelect.value;
        visibleLimit = BATCH_SIZE;
        isUserInteraction = true;
        renderDirectory();
      });
    }

    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", function () {
        isUserInteraction = true;
        resetAllFilters();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        visibleLimit += BATCH_SIZE;
        isUserInteraction = true;
        renderDirectory();
      });
    }

    window.__plantipediaSelectDirectoryCategory = function (category) {
      if (!CATEGORIES.includes(category)) return;
      activeCategory = category;
      visibleLimit = BATCH_SIZE;
      isUserInteraction = true;
      syncCategoryTabs();
      renderDirectory();
    };

    syncCategoryTabs();
    renderAzStrip();
    renderDirectory();
  }

  /* ================= DYNAMIC SEO, JSON-LD & BREADCRUMB HELPER ================= */
  function setMetaTag(attrName, attrValue, content) {
    let tag = document.head.querySelector(
      "meta[" + attrName + '="' + attrValue + '"]',
    );
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attrName, attrValue);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);
  }

  function injectPlantSeoAndSchema(plant) {
    const origin = window.location.origin;
    const basePath = window.location.pathname.replace(/[^/]*$/, "");
    const baseUrl = origin + basePath;
    const homeUrl = baseUrl + "index.html";
    const directoryUrl = baseUrl + "species.html";
    const categoryUrl =
      baseUrl + "species.html?category=" + encodeURIComponent(plant.category);
    const pageUrl =
      window.location.origin +
      window.location.pathname +
      "?species=" +
      encodeURIComponent(plant.slug);

    const seoTitle =
      plant.commonName + " (" + plant.scientificName + ") | Plantipedia";
    const seoDesc = plant.shortSummary;
    const heroImgUrl =
      plant.heroImage && plant.heroImage.url ? plant.heroImage.url : "";
    const heroImgAlt =
      plant.heroImage && plant.heroImage.alt
        ? plant.heroImage.alt
        : plant.commonName;
    const ov = plant.overview || {};

    document.title = seoTitle;

    let canonicalEl = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", pageUrl);

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
          "@id": pageUrl + "#article",
          headline: seoTitle,
          description: seoDesc,
          image: heroImgUrl,
          url: pageUrl,
          mainEntityOfPage: pageUrl,
          author: [
            { "@type": "Person", name: "Jalees Habib" },
            { "@type": "Person", name: "Rayaan Tasnim" },
          ],
          publisher: {
            "@type": "EducationalOrganization",
            name: "Plantipedia",
            url: homeUrl,
          },
          about: { "@id": pageUrl + "#taxon" },
        },
        {
          "@type": "Taxon",
          "@id": pageUrl + "#taxon",
          name: plant.scientificName,
          alternateName: plant.commonName,
          taxonRank: "Species",
          description: plant.leadOverview || seoDesc,
          image: heroImgUrl,
          url: pageUrl,
          parentTaxon: {
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
          "@id": pageUrl + "#breadcrumb",
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

    let ldScript = document.getElementById("dynamic-plant-jsonld");
    if (!ldScript) {
      ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.id = "dynamic-plant-jsonld";
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(schemaData, null, 2);
  }

  /* ================= DETAIL PAGE CONTROLLER (plant.html) ================= */
  function getTargetSlug() {
    const params = new URLSearchParams(window.location.search);
    const querySlug = params.get("species");
    if (querySlug) return querySlug.trim().toLowerCase();

    const hash = window.location.hash || "";
    const match = hash.match(/^#\/plant\/([^/?#]+)/i);
    if (match && match[1]) return decodeURIComponent(match[1]).toLowerCase();

    return allPlants.length > 0 ? allPlants[0].slug : "";
  }

  function renderTextbookChapter(section) {
    const images = Array.isArray(section.images) ? section.images : [];

    const paragraphsHtml = (section.paragraphs || [])
      .map(function (p) {
        return "<p>" + escapeHtml(p) + "</p>";
      })
      .join("");

    let subblocksHtml = "";
    if (Array.isArray(section.subblocks) && section.subblocks.length > 0) {
      subblocksHtml =
        '<div class="chapter-subblocks">' +
        section.subblocks
          .map(function (sub) {
            return (
              '<div class="subblock-item">' +
              "<h4>" +
              escapeHtml(sub.heading) +
              "</h4>" +
              "<p>" +
              escapeHtml(sub.text) +
              "</p>" +
              "</div>"
            );
          })
          .join("") +
        "</div>";
    }

    let safetyHtml = "";
    if (section.safetyNote) {
      safetyHtml =
        '<div class="safety-notice-box" role="note">' +
        '<span class="safety-notice-title">Botanical &amp; Clinical Safety Advisory</span>' +
        escapeHtml(section.safetyNote) +
        "</div>";
    }

    let bodyContentHtml = "";

    if (images.length === 1) {
      const fig = images[0];
      bodyContentHtml =
        '<div class="chapter-split-grid">' +
        '<div class="chapter-prose-col">' +
        paragraphsHtml +
        safetyHtml +
        "</div>" +
        '<figure class="chapter-figure-single">' +
        '<div class="figure-media-box">' +
        renderImgTag(fig.url, fig.alt || fig.caption, fig.caption, false) +
        "</div>" +
        '<figcaption><span class="figcaption-fig">Fig. ' +
        escapeHtml(section.number) +
        ".1</span>" +
        escapeHtml(fig.caption) +
        "</figcaption>" +
        "</figure>" +
        "</div>" +
        subblocksHtml;
    } else if (images.length >= 2) {
      const galleryHtml =
        '<div class="chapter-gallery-two">' +
        images
          .map(function (img, idx) {
            const figCode = "Fig. " + section.number + "." + (idx + 1);
            return (
              '<figure class="gallery-figure">' +
              '<div class="figure-media-box">' +
              renderImgTag(
                img.url,
                img.alt || img.caption,
                img.caption,
                false,
              ) +
              "</div>" +
              '<figcaption><span class="figcaption-fig">' +
              escapeHtml(figCode) +
              "</span>" +
              escapeHtml(img.caption) +
              "</figcaption>" +
              "</figure>"
            );
          })
          .join("") +
        "</div>";

      bodyContentHtml =
        paragraphsHtml + galleryHtml + subblocksHtml + safetyHtml;
    } else {
      bodyContentHtml = paragraphsHtml + subblocksHtml + safetyHtml;
    }

    return (
      '<article class="chapter-card" id="section-' +
      escapeHtml(section.number) +
      '">' +
      '<header class="chapter-header">' +
      '<div class="chapter-title-group">' +
      '<span class="chapter-num">' +
      escapeHtml(section.number) +
      "</span>" +
      '<h2 class="chapter-title">' +
      escapeHtml(section.title) +
      "</h2>" +
      "</div>" +
      '<span class="chapter-subtitle">' +
      escapeHtml(section.subtitle || "") +
      "</span>" +
      "</header>" +
      '<div class="chapter-body">' +
      bodyContentHtml +
      "</div>" +
      "</article>"
    );
  }

  function initSectionMapOverlay(plant) {
    const trigger = document.getElementById("sectionMapTrigger");
    const overlay = document.getElementById("sectionMapOverlay");
    const closeBtn = document.getElementById("sectionMapClose");
    const grid = document.getElementById("sectionMapGrid");
    const speciesLabel = document.getElementById("sectionMapSpeciesLabel");

    if (!trigger || !overlay || !closeBtn || !grid) return;

    if (speciesLabel) {
      speciesLabel.textContent =
        plant.commonName + " (" + plant.scientificName + ")";
    }

    const mapItems = [
      {
        number: "00",
        title: "Hero & Botanical Classification",
        desc: SECTION_MAP_DESCRIPTIONS["00"],
        targetId: "section-00",
      },
    ].concat(
      (plant.sections || []).map(function (sec) {
        return {
          number: sec.number,
          title: sec.title,
          desc:
            sec.summary ||
            SECTION_MAP_DESCRIPTIONS[sec.number] ||
            sec.subtitle ||
            "",
          targetId: "section-" + sec.number,
        };
      }),
    );

    grid.innerHTML = mapItems
      .map(function (item) {
        return (
          '<button type="button" class="section-map-card" data-jump-target="' +
          escapeHtml(item.targetId) +
          '">' +
          '<div class="section-map-card-top">' +
          '<span class="section-map-badge">' +
          escapeHtml(item.number) +
          "</span>" +
          '<span class="section-map-arrow" aria-hidden="true">&rarr;</span>' +
          "</div>" +
          "<div>" +
          '<h3 class="section-map-card-title">' +
          escapeHtml(item.title) +
          "</h3>" +
          '<p class="section-map-card-desc">' +
          escapeHtml(item.desc) +
          "</p>" +
          "</div>" +
          "</button>"
        );
      })
      .join("");

    function openOverlay() {
      overlay.hidden = false;
      document.body.classList.add("overlay-locked");
      trigger.setAttribute("aria-expanded", "true");
      closeBtn.focus();
    }

    function closeOverlay() {
      overlay.hidden = true;
      document.body.classList.remove("overlay-locked");
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", openOverlay);
    closeBtn.addEventListener("click", function () {
      closeOverlay();
      trigger.focus();
    });

    overlay.addEventListener("click", function (e) {
      const card = e.target.closest("[data-jump-target]");
      if (card) {
        const targetId = card.getAttribute("data-jump-target");
        closeOverlay();
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      if (e.target === overlay) {
        closeOverlay();
        trigger.focus();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) {
        closeOverlay();
        trigger.focus();
      }
    });
  }

  function initPlantDetailPage() {
    const root = document.getElementById("plantDetailRoot");
    if (!root) return;

    const slug = getTargetSlug();
    const plantIdx = allPlants.findIndex(function (p) {
      return p.slug === slug;
    });

    if (plantIdx === -1) {
      document.title = "Species Not Found | Plantipedia";
      root.innerHTML =
        '<div class="detail-container">' +
        '<div class="app-error-state">' +
        "<h1>Species Monograph Not Found</h1>" +
        "<p>No plant entry matched the requested species identifier. Browse all documented monographs in the directory.</p>" +
        '<a href="species.html" class="empty-reset-btn empty-reset-link">Browse Available Species</a>' +
        "</div>" +
        "</div>";
      const dock = document.getElementById("sectionMapDock");
      if (dock) dock.hidden = true;
      return;
    }

    const plant = allPlants[plantIdx];
    const prevPlant =
      allPlants[(plantIdx - 1 + allPlants.length) % allPlants.length];
    const nextPlant = allPlants[(plantIdx + 1) % allPlants.length];

    injectPlantSeoAndSchema(plant);

    const ov = plant.overview;
    const overviewRows = [
      { key: "Scientific Name", val: plant.scientificName, italic: true },
      { key: "Plant Group", val: ov.plantGroup, italic: false },
      { key: "Plant Family", val: ov.family, italic: false },
      { key: "Genus", val: ov.genus, italic: true },
      { key: "Species", val: ov.species, italic: true },
      { key: "Growth Form", val: ov.growthForm, italic: false },
      { key: "Native Origin", val: ov.nativeOrigin, italic: false },
      { key: "Common Uses", val: ov.commonUses, italic: false },
    ];

    const tableHtml = overviewRows
      .map(function (row) {
        return (
          '<div class="classification-row">' +
          '<span class="classification-key">' +
          escapeHtml(row.key) +
          "</span>" +
          '<span class="classification-val' +
          (row.italic ? " is-italic" : "") +
          '">' +
          escapeHtml(row.val) +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    const chaptersHtml = (plant.sections || [])
      .map(function (sec, idx) {
        return renderTextbookChapter(sec, idx + 1);
      })
      .join("");

    const categoryHref =
      "species.html?category=" + encodeURIComponent(plant.category);

    root.innerHTML =
      '<div class="detail-container">' +
      '<div class="detail-breadcrumb-row">' +
      '<nav class="breadcrumb-bar" aria-label="Breadcrumb">' +
      '<ol class="breadcrumb-list">' +
      '<li class="breadcrumb-item"><a href="index.html" class="breadcrumb-link">Home</a></li>' +
      '<li class="breadcrumb-item"><span class="breadcrumb-sep" aria-hidden="true">/</span><a href="species.html" class="breadcrumb-link">Available Species</a></li>' +
      '<li class="breadcrumb-item"><span class="breadcrumb-sep" aria-hidden="true">/</span><a href="' +
      categoryHref +
      '" class="breadcrumb-link">' +
      escapeHtml(plant.category) +
      "</a></li>" +
      '<li class="breadcrumb-item"><span class="breadcrumb-sep" aria-hidden="true">/</span><span class="breadcrumb-current" aria-current="page">' +
      escapeHtml(plant.commonName) +
      "</span></li>" +
      "</ol>" +
      "</nav>" +
      '<div class="detail-taxonomy-trail">' +
      escapeHtml(ov.family) +
      " &middot; <em>" +
      escapeHtml(plant.scientificName) +
      "</em>" +
      "</div>" +
      "</div>" +
      '<section class="overview-hero-card" id="section-00">' +
      '<div class="overview-header-grid">' +
      '<div class="overview-title-block">' +
      '<span class="section-index-label">SECTION 00 &middot; BOTANICAL PROFILE</span>' +
      '<h1 class="overview-plant-title">' +
      escapeHtml(plant.commonName) +
      "</h1>" +
      '<p class="overview-scientific-name">' +
      escapeHtml(plant.scientificName) +
      "</p>" +
      '<p class="overview-lead-summary">' +
      escapeHtml(plant.leadOverview) +
      "</p>" +
      "</div>" +
      '<figure class="overview-hero-figure">' +
      '<div class="overview-hero-media">' +
      renderImgTag(
        plant.heroImage.url,
        plant.heroImage.alt,
        plant.commonName + " Botanical Plate",
        true,
      ) +
      "</div>" +
      "<figcaption>Plate 00 &mdash; " +
      escapeHtml(plant.heroImage.caption) +
      "</figcaption>" +
      "</figure>" +
      "</div>" +
      '<div class="classification-table-wrap">' +
      '<div class="classification-table-caption">Botanical Classification &amp; Taxonomic Summary</div>' +
      '<div class="classification-table" role="table" aria-label="Botanical Classification Table">' +
      tableHtml +
      "</div>" +
      "</div>" +
      "</section>" +
      '<div class="encyclopedia-chapters">' +
      chaptersHtml +
      "</div>" +
      '<nav class="species-pager" aria-label="Adjacent plant species">' +
      '<a href="plant.html?species=' +
      encodeURIComponent(prevPlant.slug) +
      '" class="pager-link prev">' +
      '<span class="pager-direction">&larr; Previous Monograph</span>' +
      '<span class="pager-species-name">' +
      escapeHtml(prevPlant.commonName) +
      "</span>" +
      '<span class="pager-species-sci">' +
      escapeHtml(prevPlant.scientificName) +
      "</span>" +
      "</a>" +
      '<a href="plant.html?species=' +
      encodeURIComponent(nextPlant.slug) +
      '" class="pager-link next">' +
      '<span class="pager-direction">Next Monograph &rarr;</span>' +
      '<span class="pager-species-name">' +
      escapeHtml(nextPlant.commonName) +
      "</span>" +
      '<span class="pager-species-sci">' +
      escapeHtml(nextPlant.scientificName) +
      "</span>" +
      "</a>" +
      "</nav>" +
      "</div>";

    initSectionMapOverlay(plant);
  }

  /* ================= BOOTSTRAP ================= */
  async function bootstrap() {
    const pageType = document.body.getAttribute("data-page") || "home";
    try {
      const response = await fetch("plants.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(
          "Failed to load plants.json (HTTP " + response.status + ")",
        );
      }
      const payload = await response.json();
      allPlants = Array.isArray(payload.species) ? payload.species : [];

      initNavbarSearch();
      initMobileNavOverlay();

      if (pageType === "plant") {
        initPlantDetailPage();
      } else if (pageType === "species") {
        initSpeciesDirectoryPage();
      } else {
        initHomePage();
      }

      initGsapExperience(pageType);
    } catch (err) {
      const target =
        document.getElementById("featuredSpeciesGrid") ||
        document.getElementById("directorySpeciesGrid") ||
        document.getElementById("plantDetailRoot");
      if (target) {
        target.innerHTML =
          '<div class="app-error-state">' +
          "<h2>Unable to Load Botanical Archive</h2>" +
          "<p>" +
          escapeHtml(err.message) +
          "</p>" +
          "</div>";
      }
      initGsapExperience(pageType);
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
  window.addEventListener("load", function () {
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  });
})();
