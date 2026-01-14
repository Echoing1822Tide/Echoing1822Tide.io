/* =========================================================
   James Gill portfolio — cleaned rebuild
   - No Theme button
   - No Auto Scroll (removed completely)
   - Music toggle fixed (single track)
   - Track UI removed (only I_am_me.mp3)
   - Screensavers button removed; hidden bottom-right hotspot restored
   - Scroll-snap “locked” sections + down arrows
   - Per-section backgrounds + Experience background switch
   - Projects rendered as cards (no snapshot grid)
   - Intro fly-past overlay using assets/beats/1_Website.png … 12_Website.png
   ========================================================= */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const snapRoot = $("#snapRoot");

  // ---------------------------
  // 1) Background wiring
  // ---------------------------
  function initSectionBackgrounds() {
    $$(".panel").forEach(panel => {
      const primary = panel.dataset.bgPrimary;
      const alt = panel.dataset.bgAlt;

      const bgPrimary = $(".bgPrimary", panel);
      const bgAlt = $(".bgAlt", panel);

      if (primary) bgPrimary.style.backgroundImage = `url("${primary}")`;
      if (alt) bgAlt.style.backgroundImage = `url("${alt}")`;
    });
  }

  // Experience: switch to alt after delay while active
  function initExperienceBgSwitch() {
    const panel = $("#experience");
    if (!panel) return;

    const alt = panel.dataset.bgAlt;
    if (!alt) return;

    const delay = Number(panel.dataset.bgAltDelay || 900);
    const bgAlt = $(".bgAlt", panel);

    let timer = null;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        clearTimeout(timer);
        // start with primary visible
        bgAlt.style.opacity = "0";
        timer = setTimeout(() => {
          bgAlt.style.opacity = "1";
        }, delay);
      } else {
        clearTimeout(timer);
        bgAlt.style.opacity = "0";
      }
    }, { root: snapRoot, threshold: 0.65 });

    obs.observe(panel);
  }

  // ---------------------------
  // 2) Scroll “lock” behavior
  //    - CSS scroll-snap already does most of the work
  //    - This adds wheel throttling so it behaves like “page sections”
  // ---------------------------
  function initWheelPaging() {
    const panels = $$(".panel");
    let isAnimating = false;
    let lastWheelAt = 0;

    function currentIndex() {
      const top = snapRoot.scrollTop;
      let best = 0;
      let bestDist = Infinity;
      panels.forEach((p, i) => {
        const dist = Math.abs(p.offsetTop - top);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }

    function goTo(idx) {
      if (idx < 0 || idx >= panels.length) return;
      isAnimating = true;
      panels[idx].scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => { isAnimating = false; }, 650);
    }

    snapRoot.addEventListener("wheel", (e) => {
      const now = Date.now();
      if (isAnimating) { e.preventDefault(); return; }
      if (now - lastWheelAt < 550) { e.preventDefault(); return; }
      lastWheelAt = now;

      const delta = e.deltaY;
      const idx = currentIndex();

      if (Math.abs(delta) < 8) return;

      e.preventDefault();
      if (delta > 0) goTo(idx + 1);
      else goTo(idx - 1);
    }, { passive: false });

    // Arrow click
    $$(".scrollCue").forEach(cue => {
      const next = cue.dataset.next;
      const arrow = $(".arrow", cue);
      if (!arrow || !next) return;
      arrow.addEventListener("click", () => {
        const target = $(next);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ---------------------------
  // 3) Music toggle (single track)
  //    - Removed autoplay toast logic per request
  // ---------------------------
  function initMusic() {
    const musicBtn = $("#musicBtn");
    const vol = $("#musicVol");

    const audio = new Audio("assets/audio/I_am_me.mp3");
    audio.loop = true;
    audio.volume = (Number(vol.value) || 25) / 100;

    let playing = false;

    function setLabel() {
      musicBtn.textContent = playing ? "Music: ON" : "Music: OFF";
      musicBtn.setAttribute("aria-pressed", String(playing));
    }

    musicBtn.addEventListener("click", async () => {
      try {
        if (!playing) {
          await audio.play();
          playing = true;
        } else {
          audio.pause();
          playing = false;
        }
      } catch {
        // No toast. No drama. Browser policy is browser policy.
        playing = false;
      }
      setLabel();
    });

    vol.addEventListener("input", () => {
      audio.volume = (Number(vol.value) || 0) / 100;
    });

    setLabel();
  }

  // ---------------------------
  // 4) Projects list (cards)
  //    - Snapshot grid removed
  //    - Repo/Demo/Live/Design links kept as fields, but NOT shown
  //      (you can enable later)
  // ---------------------------
  function renderProjects() {
    const grid = $("#projectsGrid");
    if (!grid) return;

    const projects = [
      {
        name: "GazeShot v1.0 (stable)",
        tags: ["WPF", "Win32", "Speech"],
        description: "Windows tray utility with multi-monitor awareness and voice-controlled screenshot capture using WPF, Win32 APIs, and speech recognition.",
        linkLabel: "Project (add link)",
        linkUrl: "",

        // Keep these for later (per request), but not displayed right now:
        // repoUrl: "",
        // demoUrl: "",
      },
      {
        name: "Battleship Web Game",
        tags: ["HTML", "CSS", "JS"],
        description: "Browser-based Battleship with turn-based logic, responsive layout, and local storage for game state.",
        linkLabel: "Project (add link)",
        linkUrl: "",

        // repoUrl: "",
        // liveUrl: "",
      },
      {
        name: "Gift Helper App",
        tags: ["C#", ".NET"],
        description: "Gift recommendation tool: user inputs recipient preferences and the app suggests ideas with simple storage.",
        linkLabel: "Project (add link)",
        linkUrl: "",

        // repoUrl: "",
      },
      {
        name: "(True Free) AI Image Upscaler",
        tags: ["Open-source AI", "On-device"],
        description: "Free image upscaling app using open-source models to enhance resolution and clarity; UI-first, on-device processing.",
        linkLabel: "Project (add link)",
        linkUrl: "",

        // repoUrl: "",
      },
      {
        name: "MSSA Training Tracker",
        tags: ["C#", ".NET", "MAUI", "Azure"],
        description: "Internal tool to track assignments/milestones with progress dashboards and reminders; designed for long-term maintainability.",
        linkLabel: "Project (add link)",
        linkUrl: "",

        // repoUrl: "",
      },
      {
        name: "Bolt Master Game (concept)",
        tags: ["Unity (or similar)"],
        description: "Mobile physics puzzle concept: assemble and launch bolts to solve challenges; designed with app-store standards in mind.",
        linkLabel: "Design notes (add link)",
        linkUrl: "",

        // designNotesUrl: "",
      },
    ];

    grid.innerHTML = projects.map(p => {
      const safeUrl = (p.linkUrl && p.linkUrl.trim().length) ? p.linkUrl.trim() : "";
      const linkClass = safeUrl ? "" : "linkDisabled";

      return `
        <article class="card projectCard">
          <div class="metaTop">
            <h3 class="title">${escapeHtml(p.name)}</h3>
          </div>

          <div class="tagRow">
            ${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>

          <p class="desc">${escapeHtml(p.description)}</p>

          <div class="links">
            <a class="${linkClass}" href="${safeUrl || "#"}" target="_blank" rel="noreferrer noopener">${escapeHtml(p.linkLabel)}</a>

            <!-- Per your request: keep these in code but commented out for now -->
            <!-- <a href="${escapeHtml(p.repoUrl || "")}" target="_blank" rel="noreferrer noopener">Repo</a> -->
            <!-- <a href="${escapeHtml(p.demoUrl || "")}" target="_blank" rel="noreferrer noopener">Demo</a> -->
            <!-- <a href="${escapeHtml(p.liveUrl || "")}" target="_blank" rel="noreferrer noopener">Live</a> -->
            <!-- <a href="${escapeHtml(p.designNotesUrl || "")}" target="_blank" rel="noreferrer noopener">Design notes</a> -->
          </div>
        </article>
      `;
    }).join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------
  // 5) Intro fly-past (uses beats images)
  //    - “Transparent image fly-past video” effect
  //    - Main page slightly visible behind (overlay is semi-transparent)
  // ---------------------------
  async function playIntroFlyPast() {
    const intro = $("#intro");
    const canvas = $("#introCanvas");
    const label = $(".introLabel", intro);
    if (!intro || !canvas) return;

    const ctx = canvas.getContext("2d");
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const files = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    label.textContent = "Loading…";

    const imgs = await preloadImages(files);
    label.textContent = "";

    const durationMs = 2600;
    const start = performance.now();

    function frame(now) {
      const t = now - start;
      const p = Math.min(1, t / durationMs);

      ctx.clearRect(0, 0, canvas.width / DPR, canvas.height / DPR);

      // Underlay: faint vignette for “cinematic” feel
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(0, 0, w, h);

      // Fly-past: show 2–3 images layered with different offsets
      const idx = Math.floor(p * (imgs.length - 1));
      const picks = [idx, Math.min(idx + 1, imgs.length - 1), Math.min(idx + 2, imgs.length - 1)];

      picks.forEach((pi, layer) => {
        const img = imgs[pi];
        const depth = 1 + layer * 0.18;
        const x = lerp(-w * 0.35, w * 1.15, p) + Math.sin(p * 8 + layer) * 22;
        const y = h * (0.18 + layer * 0.18) + Math.cos(p * 6 + layer) * 18;
        const scale = lerp(0.65, 1.05, p) * depth;
        const alpha = 0.55 - layer * 0.14;

        drawCover(ctx, img, x, y, w * 0.55 * scale, h * 0.35 * scale, alpha);
      });

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        // Fade out intro
        intro.classList.add("isDone");
        window.setTimeout(() => {
          intro.remove();
          window.removeEventListener("resize", resize);
        }, 700);
      }
    }

    requestAnimationFrame(frame);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function drawCover(ctx, img, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // soft shadow
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 18;

    // draw centered
    const dx = x - w / 2;
    const dy = y - h / 2;

    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();
  }

  function preloadImages(srcs) {
    return new Promise((resolve) => {
      const imgs = [];
      let loaded = 0;

      srcs.forEach(src => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          imgs.push(img);
          if (loaded === srcs.length) resolve(imgs);
        };
        img.onerror = () => {
          loaded++;
          // Still push a 1x1 fallback to keep animation alive
          const fallback = document.createElement("canvas");
          fallback.width = 1; fallback.height = 1;
          const fImg = new Image();
          fImg.src = fallback.toDataURL();
          imgs.push(fImg);
          if (loaded === srcs.length) resolve(imgs);
        };
        img.src = src;
      });
    });
  }

  // ---------------------------
  // 6) Hidden screensaver (bottom-right)
  //    - Videos: Screensaver_1.mp4 → 2 → 3 (loop)
  //    - Audio overlays:
  //      1) Travel_through_space.mp3
  //      2) Blender_Hyperspace_Jump.mp3
  //      3) Alien_Beach_Waves.mp3 (audio starts BEFORE beach is seen)
  // ---------------------------
  function initScreensaver() {
    const hotspot = $("#secretScreensaver");
    const overlay = $("#screensaverOverlay");
    const closeBtn = $("#screensaverClose");
    const videoA = $("#ssVideoA");
    const videoB = $("#ssVideoB");

    if (!hotspot || !overlay || !closeBtn || !videoA || !videoB) return;

    const audio = new Audio();
    audio.loop = false;

    const steps = [
      {
        video: "assets/video/Screensaver_1.mp4",
        audio: "assets/audio/Travel_through_space.mp3",
        fadeOutMs: 700,
        fadeInMs: 500,
      },
      {
        video: "assets/video/Screensaver_2.mp4",
        audio: "assets/audio/Blender_Hyperspace_Jump.mp3",
        fadeOutMs: 700,
        fadeInMs: 400,
      },
      {
        video: "assets/video/Screensaver_3.mp4",
        audio: "assets/audio/Alien_Beach_Waves.mp3",
        // Special: 5 second video fade-in, audio starts first
        audioLeadMs: 0,
        videoDelayMs: 5000,
        videoFadeInMs: 5000,
        fadeOutMs: 900,
      }
    ];

    let running = false;
    let idx = 0;
    let top = videoA;
    let back = videoB;

    function setTop(el) {
      videoA.classList.toggle("isTop", el === videoA);
      videoB.classList.toggle("isTop", el === videoB);
    }

    async function start() {
      if (running) return;
      running = true;
      overlay.hidden = false;

      // reset state
      idx = 0;
      top = videoA;
      back = videoB;
      top.classList.add("isTop");
      back.classList.remove("isTop");

      await playStep(idx, true);
    }

    function stop() {
      running = false;
      overlay.hidden = true;

      [videoA, videoB].forEach(v => {
        try { v.pause(); } catch {}
        v.removeAttribute("src");
        v.load();
      });

      try { audio.pause(); } catch {}
      audio.removeAttribute("src");
    }

    async function playStep(i, isFirst) {
      if (!running) return;

      const s = steps[i];

      // prep back video
      back.src = s.video;
      back.load();
      await waitFor(back, "loadedmetadata");

      back.currentTime = 0;
      back.playbackRate = 1;

      // Always mute videos; audio comes from mp3 overlays
      back.muted = true;

      // Start audio with fade rules
      await fadeAudioTo(0, 180);
      audio.src = s.audio;
      audio.currentTime = 0;
      audio.volume = 0;

      // user gesture comes from clicking hotspot, so audio should be allowed
      try { await audio.play(); } catch {}

      // default audio fade in
      await fadeAudioTo(0.9, 260);

      // Swap to back video (crossfade)
      // For step 3: audio before video seen
      if (i === 2) {
        // Start playing video immediately but keep hidden, then fade in after delay
        back.style.transitionDuration = `${s.videoFadeInMs}ms`;
        top.style.transitionDuration = `900ms`;

        // Begin playing
        try { await back.play(); } catch {}

        // Hide back video initially
        back.classList.remove("isTop");
        setTop(top);

        // Fade out current top quickly
        if (!isFirst) {
          await fadeVideoTo(top, 0, 650);
        }

        // Wait 5 seconds, then fade in video over 5 seconds
        await sleep(s.videoDelayMs || 5000);
        setTop(back);
        // ensure it becomes visible
        await sleep(50);

      } else {
        // Normal crossfade
        back.style.transitionDuration = `${s.fadeInMs || 500}ms`;
        top.style.transitionDuration = `${s.fadeOutMs || 700}ms`;

        try { await back.play(); } catch {}

        setTop(back);
      }

      // Wire the end event on the active video
      const active = back;
      const nextIndex = (i + 1) % steps.length;

      const onEnded = async () => {
        active.removeEventListener("ended", onEnded);
        if (!running) return;

        // Fade out video+audio, then swap and continue
        await fadeAudioTo(0, 380);

        // swap roles
        const oldTop = top;
        top = active;
        back = oldTop;

        // Reset opacity states (top is already visible)
        setTop(top);

        await playStep(nextIndex, false);
      };

      active.addEventListener("ended", onEnded);
    }

    function waitFor(el, evt) {
      return new Promise(resolve => {
        const done = () => {
          el.removeEventListener(evt, done);
          resolve();
        };
        el.addEventListener(evt, done, { once: true });
      });
    }

    function sleep(ms) {
      return new Promise(r => setTimeout(r, ms));
    }

    async function fadeAudioTo(target, ms) {
      const start = audio.volume || 0;
      const t0 = performance.now();
      const dur = Math.max(1, ms);

      return new Promise(resolve => {
        function tick(now) {
          const p = Math.min(1, (now - t0) / dur);
          audio.volume = start + (target - start) * p;
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
    }

    async function fadeVideoTo(videoEl, targetOpacity, ms) {
      // set transition duration for that element
      videoEl.style.transitionDuration = `${ms}ms`;
      // (opacity is controlled by class isTop; we can force via inline if needed)
      videoEl.style.opacity = String(targetOpacity);
      await sleep(ms + 30);
      // clear inline opacity so class-based control resumes
      videoEl.style.opacity = "";
    }

    hotspot.addEventListener("click", start);
    closeBtn.addEventListener("click", stop);

    document.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.key === "Escape") stop();
    });

    // Click anywhere closes (optional “screensaver” behavior)
    overlay.addEventListener("click", (e) => {
      // avoid closing when clicking the close button (already handled)
      if (e.target === overlay) stop();
    });
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function init() {
    initSectionBackgrounds();
    initExperienceBgSwitch();
    initWheelPaging();
    initMusic();
    renderProjects();
    initScreensaver();
    playIntroFlyPast();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
