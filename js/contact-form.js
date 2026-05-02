/* ==========================================================================
   Anchora Apartments — Contact form (mailto fallback, no backend)
   --------------------------------------------------------------------------
   On submit, builds a clean reservation request and opens the user's mail
   client pre-filled. Validates name + email inline.
   ========================================================================== */
(function () {
  "use strict";

  const form = document.getElementById("contact-form");
  if (!form) return;

  const TO = "anchorapartmentshn@gmail.com";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(field, msg) {
    let hint = field.parentElement.querySelector(".field__hint");
    if (!hint) {
      hint = document.createElement("span");
      hint.className = "field__hint";
      field.parentElement.appendChild(hint);
    }
    hint.textContent = msg || "";
    hint.style.color = msg ? "var(--color-error)" : "";
    if (msg) field.style.borderColor = "var(--color-error)";
    else field.style.borderColor = "";
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const checkin = form.elements.checkin.value;
    const checkout = form.elements.checkout.value;
    const guests = form.elements.guests.value;
    const apartment = form.elements.apartment.value;
    const message = form.elements.message.value.trim();

    let bad = false;
    if (!name) { setError(form.elements.name, "Please tell us your name."); bad = true; } else setError(form.elements.name, "");
    if (!email || !EMAIL_RE.test(email)) { setError(form.elements.email, "Please enter a valid email address."); bad = true; } else setError(form.elements.email, "");
    if (bad) return;

    const lines = [];
    lines.push("Hello Anchora team,");
    lines.push("");
    lines.push("I'd like to enquire about staying with you.");
    lines.push("");
    if (checkin)   lines.push("Check-in:   " + checkin);
    if (checkout)  lines.push("Check-out:  " + checkout);
    if (guests)    lines.push("Guests:     " + guests);
    if (apartment) lines.push("Preferred apartment: " + apartment);
    lines.push("");
    if (message) {
      lines.push(message);
      lines.push("");
    }
    lines.push("Kind regards,");
    lines.push(name);
    lines.push(email);

    const subject = "Reservation enquiry · " + name + (apartment ? " · " + apartment : "");
    const body = lines.join("\r\n");

    const href = "mailto:" + TO +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    window.location.href = href;

    // Show a small "sent" feedback (the mail client will open shortly)
    const btn = form.querySelector("button[type=submit]");
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = "Opening your email…";
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
      }, 3000);
    }
  });

  // Reset error on input
  Array.from(form.querySelectorAll("input, textarea, select")).forEach(el => {
    el.addEventListener("input", () => setError(el, ""));
  });
})();
