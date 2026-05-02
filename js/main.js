/* ==========================================================================
   Anchora Apartments — Main behaviors
   --------------------------------------------------------------------------
   - Sticky header scrolled state
   - Mobile menu open/close
   - Year stamp
   - Smooth in-page anchor scrolling (with header offset)
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Sticky header scrolled state ---- */
  const header = document.getElementById("site-header");
  if (header) {
    let last = 0;
    const setScrolled = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      if (y > 12) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
      last = y;
    };
    setScrolled();
    window.addEventListener("scroll", setScrolled, { passive: true });
  }

  /* ---- Mobile menu ---- */
  const navOpen = document.getElementById("nav-toggle");
  const navClose = document.getElementById("nav-toggle-close");
  const drawer = document.getElementById("mobile-menu");

  function openMenu() {
    if (!drawer) return;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    navOpen && navOpen.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
  }
  function closeMenu() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    navOpen && navOpen.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    setTimeout(() => { drawer.hidden = true; }, 600);
  }

  if (navOpen) navOpen.addEventListener("click", openMenu);
  if (navClose) navClose.addEventListener("click", closeMenu);

  if (drawer) {
    drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) closeMenu();
  });

  /* ---- Year stamp ---- */
  const yearEl = document.getElementById("copy-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Smooth anchor scroll with header offset ---- */
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]:not([href="#"])');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const headerH = header ? header.offsetHeight : 0;
    const y = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
    window.scrollTo({ top: y, behavior: "smooth" });
  });

})();
