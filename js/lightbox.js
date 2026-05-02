/* ==========================================================================
   Anchora Apartments — Lightbox
   --------------------------------------------------------------------------
   Click on any [data-lightbox-trigger] (gallery item) to open a fullscreen
   viewer. Keyboard: ←/→ navigate, ESC closes. Backdrop click closes.
   ========================================================================== */
(function () {
  "use strict";

  const lb = document.getElementById("lightbox");
  if (!lb) return;

  const lbImg = document.getElementById("lb-img");
  const lbCounter = document.getElementById("lb-counter");
  const btnPrev = document.getElementById("lb-prev");
  const btnNext = document.getElementById("lb-next");
  const btnClose = document.getElementById("lb-close");

  let images = [];      // [{src, alt}]
  let activeIndex = 0;
  let lastFocused = null;

  function gatherImages(scopeEl) {
    const triggers = Array.from((scopeEl || document).querySelectorAll("[data-lightbox-trigger]"));
    return triggers.map(el => {
      const src = el.getAttribute("data-lightbox-src") || (el.querySelector("img") && el.querySelector("img").src);
      const alt = (el.querySelector("img") && el.querySelector("img").alt) || "";
      return { src, alt, el };
    }).filter(x => x.src);
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function setIndex(i) {
    if (!images.length) return;
    if (i < 0) i = images.length - 1;
    if (i >= images.length) i = 0;
    activeIndex = i;
    const it = images[i];
    lbImg.style.opacity = "0";
    // Defer src swap to next frame for smooth fade
    requestAnimationFrame(() => {
      lbImg.src = it.src;
      lbImg.alt = it.alt;
      lbImg.onload = () => { lbImg.style.opacity = "1"; };
    });
    lbCounter.textContent = pad(activeIndex + 1) + " / " + pad(images.length);
  }

  function open(i) {
    images = gatherImages();
    if (!images.length) return;
    lastFocused = document.activeElement;
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add("is-open"));
    setIndex(i || 0);
    document.documentElement.style.overflow = "hidden";
    btnClose && btnClose.focus();
  }

  function close() {
    lb.classList.remove("is-open");
    setTimeout(() => { lb.hidden = true; lbImg.src = ""; }, 320);
    document.documentElement.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function prev() { setIndex(activeIndex - 1); }
  function next() { setIndex(activeIndex + 1); }

  /* ---- Bindings ---- */
  document.addEventListener("click", e => {
    const trig = e.target.closest && e.target.closest("[data-lightbox-trigger]");
    if (!trig) return;
    e.preventDefault();
    const all = gatherImages();
    const idx = all.findIndex(x => x.el === trig);
    open(idx >= 0 ? idx : 0);
  });

  if (btnPrev) btnPrev.addEventListener("click", prev);
  if (btnNext) btnNext.addEventListener("click", next);
  if (btnClose) btnClose.addEventListener("click", close);

  // Backdrop click closes (but not inner clicks)
  lb.addEventListener("click", e => {
    if (e.target === lb || e.target.classList.contains("lightbox__inner")) close();
  });

  document.addEventListener("keydown", e => {
    if (lb.hidden || !lb.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
  });

  // Touch swipe
  let touchX = 0;
  lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    const dx = (e.changedTouches[0].clientX - touchX);
    if (Math.abs(dx) > 50) {
      if (dx < 0) next(); else prev();
    }
  });

  window.AnchoraLightbox = { open, close };
})();
