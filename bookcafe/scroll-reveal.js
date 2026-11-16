/* ===== intro loader + scroll reveal =====
The DC runtime renders  asynchronously (loadReactUmd().then(init)),
so we poll until the rendered DOM appears before wiring anything up. We do
NOT removeChild the loader — React owns that subtree — we only fade it. */
(function () {
  let started = false,
    tries = 0;
  function rendered() {
    return (
      document.getElementById("bc-loader") || document.querySelector("section[data-screen-label]")
    );
  }
  function visibleBlocks(parent) {
    return Array.prototype.filter.call(parent.children, function (el) {
      const t = el.tagName;
      if (t === "STYLE" || t === "SCRIPT" || t === "IMG") {
        return false;
      }
      const cs = getComputedStyle(el);
      return cs.position !== "absolute" && cs.position !== "fixed";
    });
  }
  function start() {
    if (started) {
      return;
    }
    if (!rendered()) {
      if (tries++ < 250) {
        setTimeout(start, 40);
      }
      return;
    }
    started = true;

    // --- worldview loader: hold ~1s from first paint, then fade ---
    const loader = document.getElementById("bc-loader");
    if (loader) {
      setTimeout(function () {
        loader.classList.add("is-done");
      }, 1000);
    }

    // --- scroll reveal (staggered per section) ---
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      return;
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    const secs = document.querySelectorAll("section[data-screen-label], footer[data-screen-label]");
    Array.prototype.forEach.call(secs, function (sec) {
      const label = sec.getAttribute("data-screen-label") || "";
      if (label.indexOf("Hero") === 0) {
        return;
      } // hero is above the fold — show instantly
      let targets = visibleBlocks(sec);
      // if the section wraps everything in one positioned container, reveal its children for finer stagger
      if (targets.length === 1 && targets[0].children.length > 1) {
        const inner = visibleBlocks(targets[0]);
        if (inner.length > 1) {
          targets = inner;
        }
      }
      targets.forEach(function (el, i) {
        el.classList.add("reveal");
        el.style.transitionDelay = Math.min(i, 6) * 0.07 + "s";
        io.observe(el);
      });
    });
  }
  start();
})();
