(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var toggleBtn = document.getElementById("theme-toggle");
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var effectiveDark = current ? current === "dark" : prefersDark;
      var next = effectiveDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- Back to top ---------- */
  // Plain #anchor scrolling silently does nothing when the target (the fixed
  // header on hero pages) is already fully visible in the viewport — the
  // browser sees it as "already in view" and skips the scroll. Force it instead.
  var backTop = document.getElementById("back-top");
  if (backTop) {
    backTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- Header scroll transition ---------- */
  var header = document.getElementById("masthead");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Scroll-reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Tamaño de letra del ensayo ---------- */
  var fontSteps = [0.9, 1, 1.15, 1.3];
  var fontButtons = document.querySelectorAll(".font-size-control button");
  if (fontButtons.length) {
    var currentStep = 1; // índice en fontSteps, arranca en 1 = tamaño normal
    try {
      var saved = parseInt(localStorage.getItem("font-step"), 10);
      if (!isNaN(saved) && saved >= 0 && saved < fontSteps.length) currentStep = saved;
    } catch (e) {}

    var applyFontStep = function () {
      document.documentElement.style.setProperty("--font-scale", fontSteps[currentStep]);
      try { localStorage.setItem("font-step", currentStep); } catch (e) {}
    };
    applyFontStep();

    fontButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var delta = parseInt(btn.getAttribute("data-font-step"), 10);
        currentStep = Math.min(fontSteps.length - 1, Math.max(0, currentStep + delta));
        applyFontStep();
      });
    });
  }

  /* ---------- Compartir frase seleccionada ---------- */
  var quoteShare = document.getElementById("quote-share");
  var postBody = document.querySelector(".post-body[data-post-url]");
  if (quoteShare && postBody) {
    var qsX = document.getElementById("qs-x");
    var qsLinkedin = document.getElementById("qs-linkedin");
    var qsWhatsapp = document.getElementById("qs-whatsapp");
    var postUrl = postBody.getAttribute("data-post-url");

    var hideQuoteShare = function () {
      quoteShare.classList.remove("is-visible");
      quoteShare.hidden = true;
    };

    document.addEventListener("mouseup", function (e) {
      if (quoteShare.contains(e.target)) return; // don't hide when clicking the popup itself
      var selection = window.getSelection();
      var text = selection ? selection.toString().trim() : "";

      if (!text || text.length < 8 || !postBody.contains(selection.anchorNode)) {
        hideQuoteShare();
        return;
      }

      var range = selection.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      var quote = text.length > 280 ? text.slice(0, 277) + "…" : text;

      qsX.href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent('"' + quote + '"') + "&url=" + encodeURIComponent(postUrl);
      qsLinkedin.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(postUrl);
      qsWhatsapp.href = "https://wa.me/?text=" + encodeURIComponent('"' + quote + '" ' + postUrl);

      quoteShare.hidden = false;
      quoteShare.style.left = (rect.left + rect.width / 2 + window.scrollX) + "px";
      quoteShare.style.top = (rect.top + window.scrollY) + "px";
      requestAnimationFrame(function () { quoteShare.classList.add("is-visible"); });
    });

    document.addEventListener("scroll", hideQuoteShare, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideQuoteShare();
    });
  }

  /* ---------- Filtro de categoría (archivo de ensayos) ---------- */
  var filterPills = document.querySelectorAll(".filter-pill");
  if (filterPills.length) {
    var rows = document.querySelectorAll("#archive-list .essay-row");
    var emptyMsg = document.getElementById("archive-empty");
    filterPills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        filterPills.forEach(function (p) { p.classList.remove("is-active"); });
        pill.classList.add("is-active");
        var filter = pill.getAttribute("data-filter");
        var visibleCount = 0;
        rows.forEach(function (row) {
          var match = filter === "todos" || row.getAttribute("data-category") === filter;
          row.style.display = match ? "" : "none";
          if (match) visibleCount++;
        });
        if (emptyMsg) emptyMsg.hidden = visibleCount > 0;
      });
    });
  }

  /* ---------- Fragmentos lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxCaption = document.getElementById("lightbox-caption");
    var lastFocused = null;

    var openLightbox = function (src, caption) {
      lastFocused = document.activeElement;
      lightboxImg.src = src;
      lightboxImg.alt = caption || "";
      lightboxCaption.textContent = caption || "";
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      document.getElementById("lightbox-close").focus();
    };
    var closeLightbox = function () {
      lightbox.hidden = true;
      lightboxImg.src = "";
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    };

    document.querySelectorAll(".fragment-img-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openLightbox(btn.getAttribute("data-lightbox-src"), btn.getAttribute("data-lightbox-caption"));
      });
    });
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  /* ---------- Reading progress bar (post pages) ---------- */
  var progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    var updateProgress = function () {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progressBar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  /* ---------- Hero parallax ---------- */
  var heroBg = document.querySelector(".hero-photo, .hero-canvas");
  var heroSection = document.querySelector(".hero");
  if (heroBg && heroSection && !reduceMotion) {
    var onHeroScroll = function () {
      var h = heroSection.offsetHeight;
      if (window.scrollY > h) return; // hero is off-screen, stop paying for it
      heroBg.style.transform = "translateY(" + (window.scrollY * 0.18) + "px)";
    };
    window.addEventListener("scroll", onHeroScroll, { passive: true });
  }

  /* ---------- Hero canvas: slow drifting blue field ---------- */
  var canvas = document.getElementById("hero-canvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    var blobs = [
      { x: 0.22, y: 0.30, r: 0.55, c: "#2952E3", vx: 0.010, vy: 0.006, p: 0 },
      { x: 0.75, y: 0.55, r: 0.62, c: "#10B8D6", vx: -0.008, vy: 0.009, p: 2.1 },
      { x: 0.50, y: 0.85, r: 0.50, c: "#5C7CF0", vx: 0.007, vy: -0.008, p: 4.2 }
    ];

    function frame(t) {
      var sec = t / 1000;
      var diag = Math.sqrt(w * w + h * h); // blob radius scales with the diagonal, not just one axis

      // Base wash first — guarantees full-bleed color on any aspect ratio (tall phone
      // screens included), the blobs on top add movement and richer texture.
      var wash = ctx.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, "#0B1E4A");
      wash.addColorStop(0.55, "#081638");
      wash.addColorStop(1, "#050F2C");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "screen";
      blobs.forEach(function (b) {
        var cx = (b.x + Math.sin(sec * b.vx + b.p) * 0.10) * w;
        var cy = (b.y + Math.cos(sec * b.vy + b.p) * 0.10) * h;
        var r = b.r * diag * 0.9;
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, b.c + "99");
        grad.addColorStop(1, b.c + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      if (!reduceMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
