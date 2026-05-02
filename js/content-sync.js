/* ==========================================================================
   Anchora Apartments — Content sync
   --------------------------------------------------------------------------
   Reads /data/content.json (single source of truth) and updates the DOM.
   The HTML ships with content baked in for SEO; this layer keeps the live
   site in sync with the JSON the owner edits via /admin.html.
   ========================================================================== */
(function () {
  "use strict";

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
      const val = getPath(content, path);
      if (val == null) return;
      // If element has data-strip-html, strip tags from HTML strings
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
      const val = getPath(content, path);
      if (val == null) return;
      el.innerHTML = String(val);
    });
  }

  function applyAttrs(content) {
    // data-attr-src, data-attr-href, data-attr-alt, data-attr-content (for meta), etc.
    const attrPattern = /^data-attr-(.+)$/;
    $$("*").forEach(el => {
      for (const a of Array.from(el.attributes)) {
        const m = a.name.match(attrPattern);
        if (!m) continue;
        const targetAttr = m[1];
        const path = a.value;
        const val = getPath(content, path);
        if (val == null) continue;
        el.setAttribute(targetAttr, String(val));
      }
    });

    // Alias: data-gallery-pick acts like data-attr-src
    $$("[data-gallery-pick]").forEach(el => {
      const path = el.getAttribute("data-gallery-pick");
      const val = getPath(content, path);
      if (val == null) return;
      if (el.tagName === "IMG") el.src = String(val);
      else el.setAttribute("src", String(val));
    });
  }

  function applyParagraphs(content) {
    $$("[data-paragraphs]").forEach(el => {
      const path = el.getAttribute("data-paragraphs");
      const arr = getPath(content, path);
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
      const arr = getPath(content, path);
      if (!Array.isArray(arr)) return;

      // Capture existing items as templates (for icons), then re-render
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
      const arr = getPath(content, path);
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
      const arr = getPath(content, path);
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
      const arr = getPath(content, path);
      if (!Array.isArray(arr)) return;
      const doubled = arr.concat(arr); // seamless loop
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
      const arr = getPath(content, path);
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
        card.innerHTML =
          '<div class="apt-card__media">' +
            '<span class="apt-card__numeral">' + idStr + '</span>' +
            '<img src="' + a.thumbImage + '" alt="' + stripHtml(a.name) + ' — ' + a.subtitle + '" loading="lazy">' +
          '</div>' +
          '<div class="apt-card__head">' +
            '<h3 class="apt-card__title">' + a.name + '</h3>' +
            '<span class="numeral" aria-hidden="true">' + idStr + '</span>' +
          '</div>' +
          '<p class="apt-card__meta">' +
            '<span class="apt-card__meta-item">' + a.subtitle + '</span>' +
            '<span class="apt-card__meta-item">' + stripHtml(a.facts.guests) + ' guests</span>' +
            '<span class="apt-card__meta-item">' + a.facts.size + '</span>' +
          '</p>' +
          '<span class="apt-card__cta">View Suite <span class="arrow" aria-hidden="true"></span></span>';
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
        const idStr = String(a.id).padStart(2, "0");
        const card = document.createElement("a");
        card.className = "apt-card";
        card.href = a.url;
        card.innerHTML =
          '<div class="apt-card__media">' +
            '<span class="apt-card__numeral">' + idStr + '</span>' +
            '<img src="' + a.thumbImage + '" alt="' + stripHtml(a.name) + ' — ' + a.subtitle + '" loading="lazy">' +
          '</div>' +
          '<div class="apt-card__head"><h3 class="apt-card__title">' + a.name + '</h3></div>' +
          '<p class="apt-card__meta">' +
            '<span class="apt-card__meta-item">' + a.subtitle + '</span>' +
            '<span class="apt-card__meta-item">' + stripHtml(a.facts.guests) + ' guests</span>' +
          '</p>';
        el.appendChild(card);
      });
    });
  }

  function applyContactDetails(content) {
    // The 3 contact rows have data-key wired already; this is a no-op placeholder
    // for future: rendering full list dynamically. Currently rows are baked.
  }

  function applyNav(content) {
    $$("[data-list-nav]").forEach(el => {
      const path = el.getAttribute("data-list-nav");
      const arr = getPath(content, path);
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

  function stripHtml(s) {
    return String(s == null ? "" : s).replace(/<[^>]*>/g, "");
  }

  /* ==========================================================================
     Boot
     ========================================================================== */

  function applyAll(content) {
    if (!content) return;
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
    } catch (e) {
      console.warn("[Anchora content-sync] error applying content:", e);
    }

    document.dispatchEvent(new CustomEvent("anchora:content-applied", { detail: content }));
  }

  // Path is relative; works for nested pages too because they live at root.
  const CONTENT_URL = "data/content.json";

  function fetchAndApply() {
    // Add cache-buster only when explicitly forced (e.g. ?refresh=1)
    const bust = new URL(window.location.href).searchParams.get("refresh") ? ("?t=" + Date.now()) : "";
    fetch(CONTENT_URL + bust, { credentials: "same-origin" })
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(applyAll)
      .catch(err => {
        // If fetch fails (e.g. opened via file://), fall back to baked HTML.
        // Still emit the applied event so other modules (e.g. lightbox) can boot.
        console.info("[Anchora] content.json not loadable (likely file:// without server). Using baked content.", err);
        document.dispatchEvent(new CustomEvent("anchora:content-applied", { detail: null }));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchAndApply, { once: true });
  } else {
    fetchAndApply();
  }

  // Expose for debugging
  window.AnchoraContent = { fetchAndApply, applyAll };
})();
