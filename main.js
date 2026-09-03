/* AV Rentall — site interactions */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var header = document.getElementById("site-header");
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("nav-links");
  var themeToggle = document.getElementById("theme-toggle");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     Dark / light theme — a quiet, user-driven feature. Defaults to the
     visitor's OS preference or light, never forces itself.
     ------------------------------------------------------------------ */
  var THEME_KEY = "avr-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (!themeToggle) return;
    var dark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
    themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    var label = themeToggle.querySelector(".theme-label");
    if (label) label.textContent = dark ? "Light" : "Dark";
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  (function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* private mode */ }
    var preferred = stored;
    if (!preferred && window.matchMedia) {
      preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(preferred || "light");
  })();

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ------------------------------------------------------------------
     Buttery, eased anchor scrolling (with smooth cancelling)
     ------------------------------------------------------------------ */
  var scrollRaf = null;

  function cancelSmoothScroll() {
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY) {
    cancelSmoothScroll();
    var startY = window.pageYOffset || document.documentElement.scrollTop;
    var delta = targetY - startY;
    if (Math.abs(delta) < 2) { window.scrollTo(0, targetY); return; }

    var duration = Math.min(1100, Math.max(500, Math.abs(delta) * 0.45));
    var start = performance.now();

    function step(now) {
      var progress = Math.min(1, (now - start) / duration);
      window.scrollTo(0, Math.round(startY + delta * easeInOutCubic(progress)));
      scrollRaf = progress < 1 ? requestAnimationFrame(step) : null;
    }
    scrollRaf = requestAnimationFrame(step);
  }

  /* Interrupt a glide if the visitor starts scrolling themselves */
  document.addEventListener("wheel", cancelSmoothScroll, { passive: true });
  document.addEventListener("touchstart", cancelSmoothScroll, { passive: true });

  var navHeight = function () { return header ? header.offsetHeight : 72; };

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (link.id === "send-email-alt") return; // handled by the form module
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight() - 8;
      top = Math.max(0, top);

      if (reducedMotion) {
        window.scrollTo(0, top);
      } else {
        smoothScrollTo(top);
      }
      if (history && history.replaceState && href !== "#top") {
        history.replaceState(null, "", href);
      }
    });
  });

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  function closeNav() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  if (nav) {
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && !e.target.closest(".theme-toggle")) closeNav();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) closeNav();
  });

  /* ------------------------------------------------------------------
     Active section highlighting in the nav
     ------------------------------------------------------------------ */
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            var active = link.getAttribute("href") === "#" + id;
            link.classList.toggle("active", active);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------------
     Reveal-on-scroll (skipped entirely for reduced motion; content is
     never hidden when JS is unavailable)
     ------------------------------------------------------------------ */
  var revealTargets = [
    ".section-head",
    ".overview-grid",
    ".mix-panel",
    ".cards-3 .card",
    ".note",
    ".band",
    ".market-grid",
    ".split",
    ".process-step",
    ".contact-channels",
    ".enquiry-form",
    ".site-footer .footer-grid"
  ];
  var targets = [];
  revealTargets.forEach(function (sel) {
    Array.prototype.push.apply(targets, document.querySelectorAll(sel));
  });

  if (!reducedMotion && "IntersectionObserver" in window && targets.length) {
    targets.forEach(function (el, i) {
      var parent = el.parentElement;
      var siblings = parent ? parent.children.length : 1;
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min((i % siblings) * 70, 210) + "ms";
    });

    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach(function (el) { revealer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Enquiry form.
     Validates the fields, then compiles the answers into a ready-to-send
     WhatsApp message (primary) or a pre-filled email draft (alternative).
     Includes a hidden honeypot and a short throttle to slow bots down.
     ------------------------------------------------------------------ */
  var form = document.getElementById("enquiry-form");
  var RECIPIENT_WA = "27645520890";
  var RECIPIENT_EMAIL = "info@avrentall.com";
  var lastSentAt = 0;

  function collectEnquiry() {
    return {
      name: form.name.value.trim(),
      company: form.company.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      type: form["event-type"].value,
      date: form["event-date"].value,
      details: form.details.value.trim()
    };
  }

  function compileMessage(data) {
    var lines = [
      "NEW ENQUIRY — AV Rentall website",
      "",
      "Name: " + data.name,
      "Company: " + (data.company || "—"),
      "Email: " + data.email,
      "Phone: " + (data.phone || "—"),
      "Event type: " + (data.type || "—"),
      "Event date: " + (data.date || "—"),
      "",
      "Project details:",
      data.details
    ];
    return lines.join("\n");
  }

  function openWhatsApp(text) {
    var url = "https://wa.me/" + RECIPIENT_WA + "?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");
  }

  function openEmailDraft(data, subject, body) {
    var url =
      "mailto:" + RECIPIENT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);
    window.location.href = url;
  }

  function setError(input, message) {
    var wrap = input.closest(".field");
    if (!wrap) return input;
    var msg = wrap.querySelector(".error-msg");
    if (!msg) {
      msg = document.createElement("span");
      msg.className = "error-msg";
      wrap.appendChild(msg);
    }
    msg.textContent = message;
    input.setAttribute("aria-invalid", "true");
    input.style.borderColor = "#e0a86c";
    return input;
  }

  function clearError(input) {
    input.removeAttribute("aria-invalid");
    input.style.borderColor = "";
    var wrap = input.closest(".field");
    if (!wrap) return;
    var msg = wrap.querySelector(".error-msg");
    if (msg) msg.remove();
  }

  function flag(input, message, firstInvalid) {
    setError(input, message);
    return firstInvalid || input;
  }

  function submitEnquiry(destination) {
    var statusEl = document.getElementById("form-status");
    if (statusEl) statusEl.textContent = "";

    var data = collectEnquiry();
    var now = Date.now();

    /* Bots filling the hidden honeypot get a silent fake success */
    var honeypot = document.getElementById("f-website");
    if (honeypot && honeypot.value.trim() !== "") {
      if (statusEl) statusEl.textContent = "Thanks — your enquiry has been received.";
      form.reset();
      return;
    }

    /* Light rate-limit against spam / double-clicks */
    if (now - lastSentAt < 8000) {
      if (statusEl) statusEl.textContent = "Please wait a moment before sending another enquiry.";
      return;
    }

    /* --- validate --- */
    var firstInvalid = null;
    clearError(form.name);
    clearError(form.email);
    clearError(form.details);

    if (!data.name) firstInvalid = flag(form.name, "Please tell us your name.", firstInvalid);
    if (!data.email) {
      firstInvalid = flag(form.email, "Please provide an email address.", firstInvalid);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      firstInvalid = flag(form.email, "That email address doesn't look right.", firstInvalid);
    }
    if (!data.details) firstInvalid = flag(form.details, "Please outline your project.", firstInvalid);

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    lastSentAt = now;

    if (destination === "whatsapp") {
      openWhatsApp(compileMessage(data));
      if (statusEl) {
        statusEl.textContent =
          "Thanks, " + data.name + " — WhatsApp should open with your compiled enquiry ready to send. " +
          "If it didn't open, email us at " + RECIPIENT_EMAIL + ".";
      }
    } else {
      var subject = "Website enquiry — " + data.name + (data.type ? " (" + data.type + ")" : "");
      openEmailDraft(data, subject, compileMessage(data));
      if (statusEl) {
        statusEl.textContent =
          "Thanks, " + data.name + " — your email draft has opened. " +
          "If it didn't, email us directly at " + RECIPIENT_EMAIL + ".";
      }
    }
    form.reset();
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitEnquiry("whatsapp");
    });

    var emailAlt = document.getElementById("send-email-alt");
    if (emailAlt) {
      emailAlt.addEventListener("click", function (e) {
        e.preventDefault();
        submitEnquiry("email");
      });
    }
  }

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
