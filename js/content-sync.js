/* ==========================================================================
   Anchora Apartments — Content sync
   --------------------------------------------------------------------------
   Reads /data/content.json (single source of truth) and updates the DOM.
   The HTML ships with content baked in for SEO; this layer keeps the live
   site in sync with the JSON the owner edits via /admin.html.

   i18n: Serbian translations live in content.translations.sr as a flat
   path-keyed map. The active language is resolved from
   localStorage.anchora_lang → navigator.language → 'en'. resolveValue()
   transparently picks the SR override when available, falling back to EN.
   ========================================================================== */
(function () {
  "use strict";

  const STORAGE_KEY = "anchora_lang";
  const SUPPORTED_LANGS = ["en", "sr"];
  const DEFAULT_LANG = "en";

  /* ---------- Path resolution (e.g. "apartments[0].facts.size") ---------- */
  function getPath(obj, path) {
    if (!path) return undefined;
    const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".").filter(Boolean);
    let cur = obj;
    for (const k of keys) {
      if (cur == null) return undefined;
      cur = cur[k];
    }
    return cur;
  }

  /* ---------- Language ---------- */
  function detectInitialLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
    } catch (e) { /* private mode */ }
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (nav.startsWith("sr") || nav.startsWith("bs") || nav.startsWith("hr") || nav.startsWith("me")) return "sr";
    return DEFAULT_LANG;
  }

  let currentLang = detectInitialLang();
  let currentContent = null;

  function applyHtmlLang(lang) {
    try {
      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("data-locale", lang);
    } catch (e) {}
  }

  /* ---------- Translation resolver ----------
     For any path, return the SR-translated value if present, else the EN value.
     Lookup order:
       1. Exact path in translations[lang]
       2. Walk up parent prefixes (e.g. "nav") and descend into the value
          (so "nav[0].label" can be resolved from a translated full "nav" array)
       3. Fall back to the English path on the root object.
  */
  function keysToPath(keys) {
    let out = "";
    keys.forEach((k, i) => {
      if (/^\d+$/.test(k)) out += "[" + k + "]";
      else out += (i === 0 ? "" : ".") + k;
    });
    return out;
  }
  function isMeaningful(v) {
    if (v == null) return false;
    if (typeof v === "string" && v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }
  function resolveValue(content, path) {
    if (!content) return undefined;
    if (currentLang !== DEFAULT_LANG) {
      const tr = content.translations && content.translations[currentLang];
      if (tr) {
        if (Object.prototype.hasOwnProperty.call(tr, path) && isMeaningful(tr[path])) {
          return tr[path];
        }
        const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".").filter(Boolean);
        for (let i = keys.length - 1; i > 0; i--) {
          const parentPath = keysToPath(keys.slice(0, i));
          if (Object.prototype.hasOwnProperty.call(tr, parentPath)) {
            let cur = tr[parentPath];
            for (const k of keys.slice(i)) {
              if (cur == null) break;
              cur = cur[k];
            }
            if (isMeaningful(cur)) return cur;
          }
        }
      }
    }
    return getPath(content, path);
  }

  /* ---------- DOM helpers ---------- */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }

  /* ---------- Bento gallery sizing pattern ---------- */
  const BENTO_PATTERN = [
    "lg", "md", "sm", "sm", "wide", "sm",
    "tall", "md", "sm", "lg", "md", "sm",
    "wide", "sm", "tall", "md", "sm", "sm",
    "lg", "sm", "md", "sm", "wide", "sm"
  ];
  function bentoSize(i) { return BENTO_PATTERN[i % BENTO_PATTERN.length]; }

  /* ==========================================================================
     Apply functions — each handles a category of declarative attributes
     ========================================================================== */

  function applyText(content) {
    $$("[data-key]").forEach(el => {
      const path = el.getAttribute("data-key");
      const val = resolveValue(content, path);
      if (val == null) return;
      if (el.hasAttribute("data-strip-html")) {
        el.textContent = String(val).replace(/<[^>]*>/g, "");
      } else {
        el.textContent = String(val);
      }
    });
  }

  function applyHtml(content) {
    $$("[data-key-html]").forEach(el => {
      const path = el.getAttribute("data-key-html");
      const val = resolveValue(content, path);
      if (val == null) return;
      el.innerHTML = String(val);
    });
  }

  function applyAttrs(content) {
    const attrPattern = /^data-attr-(.+)$/;
    $$("*").forEach(el => {
      for (const a of Array.from(el.attributes)) {
        const m = a.name.match(attrPattern);
        if (!m) continue;
        const targetAttr = m[1];
        const path = a.value;
        const val = resolveValue(content, path);
        if (val == null) continue;
        el.setAttribute(targetAttr, String(val));
      }
    });

    $$("[data-gallery-pick]").forEach(el => {
      const path = el.getAttribute("data-gallery-pick");
      const val = resolveValue(content, path);
      if (val == null) return;
      if (el.tagName === "IMG") el.src = String(val);
      else el.setAttribute("src", String(val));
    });
  }

  function applyParagraphs(content) {
    $$("[data-paragraphs]").forEach(el => {
      const path = el.getAttribute("data-paragraphs");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;
      el.innerHTML = "";
      arr.forEach(text => {
        const p = document.createElement("p");
        p.innerHTML = String(text);
        el.appendChild(p);
      });
    });
  }

  function applyAmenityList(content) {
    $$("[data-amenity-list]").forEach(el => {
      const path = el.getAttribute("data-amenity-list");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;

      const existing = Array.from(el.children);
      const iconTemplates = existing.map(item => {
        const svg = item.querySelector("svg");
        return svg ? svg.outerHTML : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="6"/></svg>';
      });

      el.innerHTML = "";
      arr.forEach((label, i) => {
        const li = document.createElement("li");
        li.className = "apt-amenities__item";
        li.innerHTML = (iconTemplates[i % iconTemplates.length] || iconTemplates[0] || "") + " " + label;
        el.appendChild(li);
      });
    });
  }

  function applyMetaList(content) {
    $$("[data-meta-list]").forEach(el => {
      const path = el.getAttribute("data-meta-list");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;
      el.innerHTML = "";
      arr.forEach(text => {
        const li = document.createElement("li");
        li.className = "duo__meta-item";
        li.textContent = String(text);
        el.appendChild(li);
      });
    });
  }

  function applyDistances(content) {
    $$("[data-distances]").forEach(el => {
      const path = el.getAttribute("data-distances");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;
      el.innerHTML = "";
      arr.forEach(d => {
        const li = document.createElement("li");
        li.className = "distance-row";
        li.innerHTML =
          '<span class="distance-row__name">' + d.name + '</span>' +
          '<span class="distance-row__rule" aria-hidden="true"></span>' +
          '<span class="distance-row__value">' + d.value + '</span>';
        el.appendChild(li);
      });
    });
  }

  function applyMarquee(content) {
    $$("[data-marquee]").forEach(el => {
      const path = el.getAttribute("data-marquee");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;
      const doubled = arr.concat(arr);
      el.innerHTML = "";
      doubled.forEach(word => {
        const div = document.createElement("div");
        div.className = "marquee__item";
        div.textContent = String(word);
        el.appendChild(div);
      });
    });
  }

  function applyGallery(content) {
    $$("[data-gallery]").forEach(el => {
      const path = el.getAttribute("data-gallery");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;

      const altBase = el.getAttribute("data-gallery-alt") || "Photo";
      el.innerHTML = "";
      arr.forEach((src, i) => {
        const div = document.createElement("div");
        div.className = "apt-gallery__item apt-gallery__item--" + bentoSize(i);
        div.setAttribute("data-lightbox-trigger", "true");
        div.setAttribute("data-lightbox-src", src);
        div.setAttribute("data-lightbox-index", String(i));
        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = altBase + " " + (i + 1);
        img.src = src;
        div.appendChild(img);
        el.appendChild(div);
      });
    });
  }

  /* ----- Per-apartment field translation helper -----
     Returns localized values for translatable per-card fields (name, subtitle,
     facts.guests, facts.size, etc.). Falls back to the apartment object when
     no SR override is registered for the path.
  */
  function aptField(content, idx, fieldPath) {
    return resolveValue(content, "apartments[" + idx + "]." + fieldPath);
  }

  function applyApartmentsGrid(content) {
    $$("[data-apartments-grid]").forEach(el => {
      const apts = (content && content.apartments) || [];
      if (!apts.length) return;
      el.innerHTML = "";
      apts.forEach((a, i) => {
        const card = document.createElement("a");
        card.className = "apt-card reveal";
        card.href = a.url;
        card.setAttribute("data-apt-card", String(i));

        const idStr = String(a.id).padStart(2, "0");
        const name = aptField(content, i, "name") || a.name;
        const subtitle = aptField(content, i, "subtitle") || a.subtitle;
        const guests = aptField(content, i, "facts.guests") || a.facts.guests;
        const size = aptField(content, i, "facts.size") || a.facts.size;
        const guestsLabel = currentLang === "sr" ? "gostiju" : "guests";
        const cta = currentLang === "sr" ? "Pogledaj Apartman" : "View Suite";

        card.innerHTML =
          '<div class="apt-card__media">' +
            '<span class="apt-card__numeral">' + idStr + '</span>' +
            '<img src="' + a.thumbImage + '" alt="' + stripHtml(name) + ' — ' + subtitle + '" loading="lazy">' +
          '</div>' +
          '<div class="apt-card__head">' +
            '<h3 class="apt-card__title">' + name + '</h3>' +
            '<span class="numeral" aria-hidden="true">' + idStr + '</span>' +
          '</div>' +
          '<p class="apt-card__meta">' +
            '<span class="apt-card__meta-item">' + subtitle + '</span>' +
            '<span class="apt-card__meta-item">' + stripHtml(guests) + ' ' + guestsLabel + '</span>' +
            '<span class="apt-card__meta-item">' + size + '</span>' +
          '</p>' +
          '<span class="apt-card__cta">' + cta + ' <span class="arrow" aria-hidden="true"></span></span>';
        el.appendChild(card);
      });
    });
  }

  function applyOtherApartments(content) {
    $$("[data-other-apartments]").forEach(el => {
      const currentId = parseInt(el.getAttribute("data-other-apartments"), 10);
      const apts = (content && content.apartments) || [];
      const others = apts.filter(a => a.id !== currentId).slice(0, 3);
      el.innerHTML = "";
      others.forEach(a => {
        const i = apts.indexOf(a);
        const idStr = String(a.id).padStart(2, "0");
        const name = aptField(content, i, "name") || a.name;
        const subtitle = aptField(content, i, "subtitle") || a.subtitle;
        const guests = aptField(content, i, "facts.guests") || a.facts.guests;
        const guestsLabel = currentLang === "sr" ? "gostiju" : "guests";

        const card = document.createElement("a");
        card.className = "apt-card";
        card.href = a.url;
        card.innerHTML =
          '<div class="apt-card__media">' +
            '<span class="apt-card__numeral">' + idStr + '</span>' +
            '<img src="' + a.thumbImage + '" alt="' + stripHtml(name) + ' — ' + subtitle + '" loading="lazy">' +
          '</div>' +
          '<div class="apt-card__head"><h3 class="apt-card__title">' + name + '</h3></div>' +
          '<p class="apt-card__meta">' +
            '<span class="apt-card__meta-item">' + subtitle + '</span>' +
            '<span class="apt-card__meta-item">' + stripHtml(guests) + ' ' + guestsLabel + '</span>' +
          '</p>';
        el.appendChild(card);
      });
    });
  }

  function applyContactDetails(content) {
    // Contact rows are baked with data-key — applyText/applyAttrs handle them.
    // SR override (full array under translations.sr["contact.details"]) is
    // resolved transparently via the parent-walk in resolveValue().
  }

  function applyNav(content) {
    $$("[data-list-nav]").forEach(el => {
      const path = el.getAttribute("data-list-nav");
      const arr = resolveValue(content, path);
      if (!Array.isArray(arr)) return;
      el.innerHTML = "";
      arr.forEach(item => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "nav-primary__link";
        a.href = item.href;
        a.textContent = item.label;
        li.appendChild(a);
        el.appendChild(li);
      });
    });
  }

  /* ----- Static UI strings (small bits not stored in content.json) ----- */
  const UI_STRINGS = {
    en: {
      "ui.viewSuite": "View Suite",
      "ui.guests": "guests",
      "ui.langSwitch": "Language",
      "ui.langEn": "EN",
      "ui.langSr": "SR"
    },
    sr: {
      "ui.viewSuite": "Pogledaj Apartman",
      "ui.guests": "gostiju",
      "ui.langSwitch": "Jezik",
      "ui.langEn": "EN",
      "ui.langSr": "SR"
    }
  };
  function applyUiStrings() {
    const dict = UI_STRINGS[currentLang] || UI_STRINGS.en;
    $$("[data-ui]").forEach(el => {
      const key = el.getAttribute("data-ui");
      const v = dict[key];
      if (v != null) el.textContent = v;
    });
  }

  function stripHtml(s) {
    return String(s == null ? "" : s).replace(/<[^>]*>/g, "");
  }

  /* ==========================================================================
     Boot & re-apply on language change
     ========================================================================== */

  function applyAll(content) {
    if (!content) return;
    currentContent = content;
    applyHtmlLang(currentLang);
    try {
      applyText(content);
      applyHtml(content);
      applyAttrs(content);
      applyParagraphs(content);
      applyAmenityList(content);
      applyMetaList(content);
      applyDistances(content);
      applyMarquee(content);
      applyGallery(content);
      applyApartmentsGrid(content);
      applyOtherApartments(content);
      applyContactDetails(content);
      applyNav(content);
      applyUiStrings();
      syncLangSwitchUi();
    } catch (e) {
      console.warn("[Anchora content-sync] error applying content:", e);
    }

    document.dispatchEvent(new CustomEvent("anchora:content-applied", { detail: { content, lang: currentLang } }));
  }

  function syncLangSwitchUi() {
    $$("[data-lang-switch]").forEach(group => {
      $$("[data-lang]", group).forEach(btn => {
        btn.classList.toggle("is-active", btn.getAttribute("data-lang") === currentLang);
        btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === currentLang ? "true" : "false");
      });
    });
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    if (currentContent) applyAll(currentContent);
    document.dispatchEvent(new CustomEvent("anchora:lang-changed", { detail: { lang } }));
  }

  /* ----- Wire up any [data-lang] buttons on the page ----- */
  function wireLangSwitches() {
    document.addEventListener("click", e => {
      const btn = e.target && e.target.closest && e.target.closest("[data-lang]");
      if (!btn) return;
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;
      e.preventDefault();
      setLanguage(lang);
    });
  }

  const CONTENT_URL = "data/content.json";

  function fetchAndApply() {
    const bust = new URL(window.location.href).searchParams.get("refresh") ? ("?t=" + Date.now()) : "";
    fetch(CONTENT_URL + bust, { credentials: "same-origin" })
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(applyAll)
      .catch(err => {
        console.info("[Anchora] content.json not loadable (likely file:// without server). Using baked content.", err);
        applyHtmlLang(currentLang);
        applyUiStrings();
        syncLangSwitchUi();
        document.dispatchEvent(new CustomEvent("anchora:content-applied", { detail: { content: null, lang: currentLang } }));
      });
  }

  applyHtmlLang(currentLang);
  wireLangSwitches();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchAndApply, { once: true });
  } else {
    fetchAndApply();
  }

  window.AnchoraContent = {
    fetchAndApply,
    applyAll,
    setLanguage,
    getLanguage: () => currentLang
  };
})();
