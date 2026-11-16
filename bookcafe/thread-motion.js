const padThreadClockNumber = (n) => String(n).padStart(2, "0");
/* ===== "the thread is alive": board auto-play + eyebrow typewriter + timeline draw + hero ambience =====
All motion below is gated on prefers-reduced-motion (reduce => static fallbacks) and uses
IntersectionObserver only (no scroll handlers). It never touches the existing addOkaPost wiring:
auto posts carry data-oka-post and derive their number from the live post count, so manual
writes keep numbering correctly afterward. */
(function () {
  const reduce = !!(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const hasIO = "IntersectionObserver" in window;
  let tries = 0;

  function boot() {
    const board = document.querySelector(".lp-thread-ui");
    if (!board) {
      if (tries++ < 250) {
        setTimeout(boot, 40);
      }
      return;
    }
    try {
      setupBoard(board);
    } catch (_error) {}
    try {
      setupTypewriter();
    } catch (_error) {}
    try {
      setupTimeline();
    } catch (_error) {}
    try {
      setupHeroAmbience();
    } catch (_error) {}
  }

  function rid() {
    return "ID:" + Math.random().toString(36).slice(2, 10);
  }
  function nowClock() {
    const d = new Date();
    return (
      padThreadClockNumber(d.getHours()) +
      ":" +
      padThreadClockNumber(d.getMinutes()) +
      ":" +
      padThreadClockNumber(d.getSeconds())
    );
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  const AUTO_POSTS = [
    { body: "マジで店内から出れないんだけど" },
    { body: "ｷﾀ━━(ﾟ∀ﾟ)━━!! 本物じゃん" },
    { body: ">>2 本棚の奥、よく見ろ" },
    { body: "助けて…クレメンス…", glitch: true },
  ];

  function buildPost(list, data) {
    const no = list.querySelectorAll("[data-oka-post]").length + 1;
    const item = document.createElement("div");
    item.setAttribute("data-oka-post", "");
    item.className = "lp-thread-post";
    item.setAttribute("data-post-id", "lp-oka-auto-" + no);
    const bodyClass = "lp-thread-body" + (data.glitch ? " lp-oka-glitch" : "");
    item.innerHTML =
      '<div class="lp-thread-meta"><span class="lp-thread-no">' +
      no +
      "</span>" +
      '<div style="flex:1; min-width:0;"><span class="lp-thread-badge">名無しさん＠お腹いっぱい。</span> ' +
      '<span class="lp-thread-date">' +
      nowClock() +
      "</span></div></div>" +
      '<div class="' +
      bodyClass +
      '">' +
      data.body +
      "</div>" +
      '<div class="lp-thread-id">' +
      rid() +
      "</div>";
    return item;
  }

  function nearBottom(list) {
    return list.scrollHeight - list.scrollTop - list.clientHeight < 44;
  }

  function setupBoard(board) {
    const list = board.querySelector("[data-oka-posts]");
    if (!list) {
      return;
    }

    if (reduce || !hasIO) {
      AUTO_POSTS.forEach(function (d) {
        list.appendChild(buildPost(list, d));
      });
      return;
    }

    let started = false;
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !started) {
            started = true;
            io.disconnect();
            play(list);
          }
        });
      },
      { threshold: 0.35 }
    );
    io.observe(board);
  }

  function play(list) {
    // The list starts pre-filled (~270px) inside a 188px window, so scrollTop is 0 and the
    // newest posts sit below the fold. Jump to the bottom first, then keep following the latest
    // post unless the user has taken over scrolling of the board. Programmatic scrollTop writes
    // don't fire wheel/touch/pointer, so following never trips the manual-scroll flag.
    let userScrolled = false;
    function markScrolled() {
      userScrolled = true;
    }
    list.addEventListener("wheel", markScrolled, { passive: true });
    list.addEventListener("touchstart", markScrolled, { passive: true });
    list.addEventListener("pointerdown", markScrolled, { passive: true });
    function toBottom() {
      list.scrollTop = list.scrollHeight;
    }
    function shouldFollow() {
      return !userScrolled || nearBottom(list);
    }

    toBottom();

    let i = 0;
    function next() {
      if (i >= AUTO_POSTS.length) {
        return;
      }
      const data = AUTO_POSTS[i];
      const follow = shouldFollow();
      const ind = document.createElement("div");
      ind.className = "lp-oka-typing";
      ind.setAttribute("data-oka-typing", "");
      ind.innerHTML =
        '<span>名無しさんが入力中</span><span class="lp-dot">.</span><span class="lp-dot">.</span><span class="lp-dot">.</span>';
      list.appendChild(ind);
      if (follow) {
        toBottom();
      }

      setTimeout(
        function () {
          if (ind.parentNode) {
            ind.parentNode.removeChild(ind);
          }
          const follow2 = shouldFollow();
          const post = buildPost(list, data);
          post.classList.add("lp-oka-enter");
          list.appendChild(post);
          if (follow2) {
            toBottom();
          }
          i++;
          if (i < AUTO_POSTS.length) {
            setTimeout(next, rand(700, 1500));
          }
        },
        rand(750, 1250)
      );
    }
    setTimeout(next, 500);
  }

  function setupTypewriter() {
    if (reduce || !hasIO) {
      return;
    } // labels stay fully visible
    // Eyebrow labels are the wide-tracked DotGothic16 leaf-text elements. We match on
    // computed letter-spacing (>=3px ~ .34em) rather than the raw style string, because the
    // reveal script re-serializes inline styles (.34em -> 0.34em) once it touches them.
    const cand = document.querySelectorAll('[style*="DotGothic16"]');
    const labels = Array.prototype.filter.call(cand, function (el) {
      if (el.children.length !== 0) {
        return false;
      }
      if (!el.textContent || !el.textContent.trim()) {
        return false;
      }
      const ls = parseFloat(getComputedStyle(el).letterSpacing);
      return !isNaN(ls) && ls >= 3;
    });
    if (!labels.length) {
      return;
    }
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) {
            return;
          }
          typeLabel(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 1, rootMargin: "0px 0px -6% 0px" }
    );
    labels.forEach(function (el) {
      el.classList.add("lp-type");
      io.observe(el);
    });
  }
  function typeLabel(el) {
    const full = el.getBoundingClientRect().width;
    if (!full) {
      return;
    }
    const chars = (el.textContent || "").replace(/\s+/g, "").length || 1;
    el.style.setProperty("--lp-w", full + "px");
    el.style.setProperty("--lp-steps", chars);
    el.style.setProperty("--lp-dur", Math.min(chars * 0.05, 0.9).toFixed(2) + "s");
    el.classList.add("is-typing");
  }

  function setupTimeline() {
    const lines = document.querySelectorAll(".lp-tl-line");
    if (!lines.length) {
      return;
    }
    if (reduce) {
      return;
    } // CSS reduce block shows them at full scale
    if (!hasIO) {
      Array.prototype.forEach.call(lines, function (l) {
        l.classList.add("is-drawn");
      });
      return;
    }
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-drawn");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    Array.prototype.forEach.call(lines, function (l) {
      io.observe(l);
    });
  }

  function setupHeroAmbience() {
    if (reduce) {
      return;
    }
    const hero = document.querySelector('section[data-screen-label="Hero C"]');
    if (!hero) {
      return;
    }
    const amb = document.createElement("div");
    amb.className = "lp-hero-amb";
    for (let k = 0; k < 5; k++) {
      const s = document.createElement("span");
      const size = rand(3, 6);
      s.style.left = rand(8, 92).toFixed(1) + "%";
      s.style.width = size.toFixed(1) + "px";
      s.style.height = size.toFixed(1) + "px";
      s.style.animationDuration = rand(9, 16).toFixed(1) + "s";
      s.style.animationDelay = (-rand(0, 12)).toFixed(1) + "s";
      amb.appendChild(s);
    }
    hero.appendChild(amb);
  }

  boot();
})();
