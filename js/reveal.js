/* ==========================================================================
   Anchora Apartments — Scroll-reveal observer
   --------------------------------------------------------------------------
   Adds .is-visible to .reveal and .reveal-stagger when they enter viewport.
   ========================================================================== */
(function () {
  "use strict";

  const supportsIO = "IntersectionObserver" in window;

  function showAll() {
    document.querySelectorAll(".reveal, .reveal-stagger").forEach(el => el.classList.add("is-visible"));
  }

  function bind() {
    const els = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!els.length) return;

    if (!supportsIO) {
      showAll();
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08
    });

    els.forEach(el => io.observe(el));

    // Honor reduced-motion: reveal immediately
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
    }
  }

  // Re-bind after content-sync re-renders (because some .reveal nodes
  // are produced by content-sync itself).
  function rebindLater() {
    document.addEventListener("anchora:content-applied", () => {
      // Tiny defer so layout settles
      setTimeout(bind, 30);
    }, { once: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { bind(); rebindLater(); });
  } else {
    bind();
    rebindLater();
  }
})();
