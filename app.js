(() => {
  const snapRoot = document.getElementById("snapRoot");
  const sections = Array.from(document.querySelectorAll(".snapSection"));
  const navLinks = Array.from(document.querySelectorAll(".sectionNav__link"));

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  /* =========================================================
     GLOBAL PARALLAX BACKGROUND (50% slower than content)
     - Solves background bleeding (sections no longer own backgrounds)
     - Adds “3D” depth
     ========================================================= */

  const bgA = document.getElementById("bgLayerA");
  const bgB = document.getElementById("bgLayerB");

  let front = bgA;
  let back = bgB;
  let currentBg = "";

  // 50% speed requirement
  const PARALLAX_SPEED = 0.5;

  // Safety clamp (prevents extreme background shifts on tall screens)
  const PARALLAX_CLAMP_PX = 260;

  let sectionTops = [];
  let activeIndex = 0;
  let isPaging = false;

  const cssUrl = (src) => `url("${src}")`;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rebuildSectionTops() {
    // offsetTop is relative to snapRoot because sections are direct children
    sectionTops = sections.map((s) => s.offsetTop);
  }

  function crossfadeBackgroundTo(src) {
    if (!front || !back) return;
    if (!src) return;
    if (src === currentBg) return;

    currentBg = src;

    if (prefersReducedMotion) {
      front.style.backgroundImage = cssUrl(src);
      front.style.opacity = "1";
      back.style.opacity = "0";
      return;
    }

    back.style.backgroundImage = cssUrl(src);
    back.style.opacity = "1";
    front.style.opacity = "0";

    // After the fade finishes, swap the roles
    window.setTimeout(() => {
      const tmp = front;
      front = back;
      back = tmp;
      back.style.opacity = "0";
    }, 540);
  }

  function setActiveNavById(id) {
    if (!id) return;
    navLinks.forEach((a) => {
      const target = (a.getAttribute("href") || "").replace("#", "");
      a.classList.toggle("active", target === id);
    });
  }

  function scrollToSectionIndex(idx) {
    const i = clamp(idx, 0, sections.length - 1);
    const top = sectionTops[i] ?? sections[i].offsetTop ?? 0;
    snapRoot.scrollTo({
      top,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  function getSegmentInfo(scrollTop) {
    // Find current segment (between section i and i+1)
    let i = 0;
    for (let k = 0; k < sectionTops.length - 1; k++) {
      if (scrollTop >= sectionTops[k] && scrollTop < sectionTops[k + 1]) {
        i = k;
        break;
      }
      if (scrollTop >= sectionTops[sectionTops.length - 1]) {
        i = sectionTops.length - 1;
      }
    }

    const start = sectionTops[i] ?? 0;
    const end = sectionTops[i + 1] ?? (start + snapRoot.clientHeight);
    const range = Math.max(1, end - start);
    const delta = scrollTop - start;
    const t = clamp(delta / range, 0, 1);

    return { i, start, end, range, delta, t };
  }

  function applyParallax() {
    if (!front || !back || !snapRoot) return;

    const st = snapRoot.scrollTop;
    const { delta, t } = getSegmentInfo(st);

    // Background moves at 50% of content delta (clamped)
    const rawY = -(delta * PARALLAX_SPEED);
    const y = clamp(rawY, -PARALLAX_CLAMP_PX, PARALLAX_CLAMP_PX);

    // Small horizontal drift adds depth without being obnoxious
    const rawX = (t - 0.5) * 140;
    const x = clamp(rawX, -120, 120);

    const pos = `calc(50% + ${x}px) calc(50% + ${y}px)`;
    front.style.backgroundPosition = pos;
    back.style.backgroundPosition = pos;
  }

  function initBackgroundFromFirstSection() {
    const first = sections[0];
    const bg = first?.dataset?.bg || "";
    if (front) {
      front.style.backgroundImage = cssUrl(bg);
      front.style.opacity = "1";
    }
    if (back) back.style.opacity = "0";
    currentBg = bg;
    setActiveNavById(first?.id || "hero");
    applyParallax();
  }

  /* =========================================================
     “LOCKED” SNAP / PAGING (wheel)
     - Prevents half-stops (the main reason you see background seams)
     ========================================================= */

  function onWheel(e) {
    // Let browser zoom gestures pass through
    if (e.ctrlKey) return;

    // If the user is on a touchpad, small deltas happen constantly; ignore tiny motion.
    if (Math.abs(e.deltaY) < 18) return;

    // Only lock/paging if we have multiple sections and snapping container exists
    if (!snapRoot || sections.length < 2) return;

    // This gives the “page-by-page” feel and stops mid-stops.
    e.preventDefault();

    if (isPaging) return;
    isPaging = true;

    const dir = e.deltaY > 0 ? 1 : -1;
    scrollToSectionIndex(activeIndex + dir);

    window.setTimeout(() => {
      isPaging = false;
    }, 680);
  }

  /* =========================================================
     Scroll cues + Section nav (scroll inside snapRoot, not window)
     ========================================================= */

  function wireScrollNextButtons() {
    const nextButtons = Array.from(document.querySelectorAll("[data-scroll-next]"));
    nextButtons.forEach((btn) => {
      const activate = () => scrollToSectionIndex(activeIndex + 1);

      btn.addEventListener("click", activate);

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      });
    });
  }

  function wireSectionNavLinks() {
    navLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href") || "";
        if (!href.startsWith("#")) return;

        const id = href.slice(1);
        const target = document.getElementById(id);
        if (!target) return;

        e.preventDefault();
        const idx = sections.findIndex((s) => s === target);
        if (idx >= 0) scrollToSectionIndex(idx);
      });
    });
  }

  /* =========================================================
     Observe active section:
     - updates background image
     - updates nav highlight
     ========================================================= */

  function observeSections() {
    if (!snapRoot) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Choose the most-visible entry
        let best = null;
        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          if (!best || ent.intersectionRatio > best.intersectionRatio) best = ent;
        }
        if (!best) return;

        const sec = best.target;
        const idx = sections.indexOf(sec);
        if (idx >= 0) activeIndex = idx;

        const bg = sec.dataset?.bg || "";
        crossfadeBackgroundTo(bg);
        setActiveNavById(sec.id);
      },
      {
        root: snapRoot,
        threshold: [0.55, 0.65, 0.75],
      }
    );

    sections.forEach((s) => io.observe(s));
  }

  /* =========================================================
     Intro overlay (PNG fly-past sequence)
     - Your existing frames: assets/beats/1_Website.png … 12_Website.png
     ========================================================= */

  const introOverlay = document.getElementById("introOverlay");
  const introCanvas = document.getElementById("introCanvas");

  function hideIntro() {
    if (!introOverlay) return;
    introOverlay.classList.add("hidden");
  }

  function resizeCanvasForDpr(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h };
  }

  function drawStarfieldFlyPast(ctx, images, cw, ch, now, startTime, duration, imgDuration, directions) {
    ctx.clearRect(0, 0, cw, ch);

    for (let i = 0; i < images.length; ++i) {
      const img = images[i];
      if (!img) continue;

      const imgStart = startTime + i * ((duration - imgDuration) / (images.length - 1));
      const t = (now - imgStart) / imgDuration;

      if (t < 0 || t > 1) continue;

      const dir = directions[i % directions.length];
      const scale = 0.25 + 0.85 * t;

      let opacity = 1;
      if (t < 0.15) opacity = t / 0.15;
      else if (t > 0.85) opacity = (1 - t) / 0.15;

      ctx.save();
      ctx.globalAlpha = opacity;

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const dw = iw * scale;
      const dh = ih * scale;

      let x;
      if (dir === "left") {
        x = cw + dw - (cw + dw + dw) * t;
      } else {
        x = -dw + (cw + dw + dw) * t;
      }
      const y = ch / 2 - dh / 2;

      ctx.drawImage(img, x, y, dw, dh);
      ctx.restore();
    }
  }

  let introAnimationRunning = false;
  let introRafId = 0;

  async function runIntroFrames() {
    if (!introOverlay || !introCanvas) return;

    introOverlay.classList.remove("hidden");
    introAnimationRunning = true;

    const ctx = introCanvas.getContext("2d", { alpha: true });
    if (!ctx) return hideIntro();

    const frames = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);
    const duration = 32000;
    const imgDuration = 12000;
    const directions = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "left" : "right"));

    const images = await Promise.all(frames.map(src => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    })));

    const usable = images.filter(Boolean);
    if (usable.length < 3) return hideIntro();

    const start = performance.now();

    function render(now) {
      if (!introAnimationRunning) return;

      const { w, h } = resizeCanvasForDpr(introCanvas);
      drawStarfieldFlyPast(ctx, usable, w, h, now, start, duration, imgDuration, directions);

      if (now - start < duration) {
        introRafId = requestAnimationFrame(render);
      } else {
        window.setTimeout(hideIntro, 400);
        introAnimationRunning = false;
        cancelAnimationFrame(introRafId);
      }
    }

    introRafId = requestAnimationFrame(render);

    window.setTimeout(() => {
      hideIntro();
      introAnimationRunning = false;
      cancelAnimationFrame(introRafId);
    }, duration + 1200);
  }

  /* =========================================================
     Music (single track: I_am_me.mp3)
     ========================================================= */

  const bgMusic = document.getElementById("bgMusic");
  const musicToggle = document.getElementById("musicToggle");
  const musicVol = document.getElementById("musicVol");

  function syncMusicUI() {
    if (!bgMusic || !musicToggle) return;
    const on = !bgMusic.paused;
    musicToggle.textContent = on ? "Music: ON" : "Music: OFF";
    musicToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }

  if (bgMusic && musicVol) {
    bgMusic.volume = Number(musicVol.value || 0.25);

    musicVol.addEventListener("input", () => {
      bgMusic.volume = Number(musicVol.value);
    });

    bgMusic.addEventListener("play", syncMusicUI);
    bgMusic.addEventListener("pause", syncMusicUI);
    bgMusic.addEventListener("ended", syncMusicUI);
  }

  async function toggleMusic() {
    if (!bgMusic) return;
    if (!bgMusic.paused) {
      bgMusic.pause();
      return;
    }
    try {
      await bgMusic.play();
    } catch {
      // No autoplay nag message by request; user can click again if blocked.
    }
  }

  if (musicToggle) {
    musicToggle.addEventListener("click", toggleMusic);
  }

  /* =========================================================
     Hidden screensaver sequence (your polished 3-step)
     ========================================================= */

  const eggBtn = document.getElementById("easterEgg");
  const modal = document.getElementById("screensaverModal");
  const ssVideo = document.getElementById("ssVideo");
  const ssAudio = document.getElementById("ssAudio");

  let screensaverRunning = false;

  function openModal() {
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function sleep(ms) {
    return new Promise((r) => window.setTimeout(r, ms));
  }

  function setElOpacity(el, value) {
    if (!el) return;
    el.style.opacity = String(value);
  }

  async function fadeAudioTo(audio, target, ms) {
    if (!audio) return;
    const start = audio.volume;
    const delta = target - start;
    const steps = Math.max(1, Math.floor(ms / 16));
    for (let i = 0; i <= steps; i++) {
      audio.volume = start + (delta * (i / steps));
      await sleep(16);
    }
    audio.volume = target;
  }

  async function duckBgMusic(duckOn) {
    if (!bgMusic || bgMusic.paused) return;
    if (duckOn) await fadeAudioTo(bgMusic, 0.08, 220);
    else await fadeAudioTo(bgMusic, Number(musicVol?.value || 0.25), 260);
  }

  async function playStep({
    videoSrc,
    audioSrc,
    videoFadeInMs,
    audioFadeInMs,
    fadeOutMs,
    audioLeadMs = 0,
    videoFadeInDelayMs = 0
  }) {
    if (!ssVideo || !ssAudio) return;

    ssVideo.pause();
    ssAudio.pause();

    ssVideo.src = videoSrc;
    ssAudio.src = audioSrc;

    ssVideo.load();
    ssAudio.load();

    ssAudio.volume = 0;
    ssVideo.style.transition = "none";
    setElOpacity(ssVideo, 0);

    // Start audio first if needed
    await ssAudio.play().catch(() => {});
    if (audioLeadMs > 0) await sleep(audioLeadMs);

    // Optionally delay the video becoming visible (audio-before-beach requirement)
    await ssVideo.play().catch(() => {});
    if (videoFadeInDelayMs > 0) await sleep(videoFadeInDelayMs);

    // Fade in
    ssVideo.style.transition = `opacity ${videoFadeInMs}ms ease`;
    setElOpacity(ssVideo, 1);
    await fadeAudioTo(ssAudio, 1, audioFadeInMs);

    // Let it run until near the end, then fade out
    // (If metadata isn't ready, just do a safe timed window)
    let holdMs = 6000;
    if (!Number.isNaN(ssVideo.duration) && ssVideo.duration > 0) {
      holdMs = Math.max(1500, (ssVideo.duration * 1000) - (fadeOutMs + 900));
    }
    await sleep(holdMs);

    // Fade out both
    ssVideo.style.transition = `opacity ${fadeOutMs}ms ease`;
    setElOpacity(ssVideo, 0);
    await fadeAudioTo(ssAudio, 0, fadeOutMs);

    // Stop
    ssVideo.pause();
    ssAudio.pause();
  }

  async function runScreensaverSequence() {
    if (screensaverRunning) return;
    screensaverRunning = true;

    await duckBgMusic(true);
    openModal();

    // Step 1
    await playStep({
      videoSrc: "assets/video/Screensaver_1.mp4",
      audioSrc: "assets/audio/Travel_through_space.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });

    if (!screensaverRunning) return;

    // Step 2
    await playStep({
      videoSrc: "assets/video/Screensaver_2.mp4",
      audioSrc: "assets/audio/Blender_Hyperspace_Jump.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });

    if (!screensaverRunning) return;

    // Step 3 (audio BEFORE beach is seen)
    await playStep({
      videoSrc: "assets/video/Screensaver_3.mp4",
      audioSrc: "assets/audio/Alien_Beach_Waves.mp3",
      videoFadeInMs: 5000,
      audioFadeInMs: 380,
      fadeOutMs: 650,
      audioLeadMs: 900,
      videoFadeInDelayMs: 650
    });

    closeModal();
    await duckBgMusic(false);
    screensaverRunning = false;
  }

  function stopScreensaver() {
    screensaverRunning = false;

    if (ssVideo) {
      ssVideo.pause();
      ssVideo.removeAttribute("src");
      ssVideo.load();
      ssVideo.style.opacity = "0";
    }

    if (ssAudio) {
      ssAudio.pause();
      ssAudio.removeAttribute("src");
      ssAudio.load();
      ssAudio.volume = 0;
    }

    duckBgMusic(false).catch(() => {});
    closeModal();
  }

  function wireModalClose() {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("[data-close]")) {
        stopScreensaver();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) {
        stopScreensaver();
      }
    });
  }

  if (eggBtn) {
    eggBtn.addEventListener("click", runScreensaverSequence);
  }

  /* =========================================================
     Boot
     ========================================================= */

  function boot() {
    if (!snapRoot) return;

    rebuildSectionTops();
    initBackgroundFromFirstSection();

    observeSections();
    wireScrollNextButtons();
    wireSectionNavLinks();
    wireModalClose();

    // Wheel paging lock (prevents half-stops)
    snapRoot.addEventListener("wheel", onWheel, { passive: false });

    // Parallax updates
    snapRoot.addEventListener("scroll", () => {
      applyParallax();
    }, { passive: true });

    window.addEventListener("resize", () => {
      rebuildSectionTops();
      applyParallax();
    }, { passive: true });

    // Run intro as soon as possible
    runIntroFrames().catch(() => hideIntro());

    // Sync UI state
    syncMusicUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
