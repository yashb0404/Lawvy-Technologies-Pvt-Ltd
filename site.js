/* Lawvy — page interactions: scroll reveals, nav state, 3D card tilt */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* current year in the footer */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── scroll reveals ─────────────────────────── */
  var reveals = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

    reveals.forEach(function (el) { io.observe(el); });

    // Safety net: content must never be left invisible. If the observer hasn't
    // fired for anything shortly after load, show everything outright.
    window.setTimeout(function () {
      if (document.querySelector(".reveal.is-in")) return;
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    }, 1500);
  }

  /* ── nav background once scrolled ───────────── */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── card tilt + cursor glow ────────────────── */
  if (!reduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".tilt").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;

        card.style.transform =
          "perspective(900px) rotateY(" + (px - 0.5) * 9 +
          "deg) rotateX(" + (0.5 - py) * 9 + "deg) translateZ(6px)";
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
      });

      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }
})();
