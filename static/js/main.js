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
