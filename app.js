(() => {
  const snapRoot = document.getElementById("snapRoot");

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* =========================================================
     Intro overlay (PNG fly-past)
     - Plays on page load
     - After finish: display:none (prevents permanent blur/dim)
     ========================================================= */

  const introOverlay = document.getElementById("introOverlay");
  const introCanvas = document.getElementById("introCanvas");

  function showIntro() {
    if (!introOverlay) return;
    introOverlay.classList.remove("gone");
    requestAnimationFrame(() => {
      introOverlay.classList.remove("hidden");
    });
  }

  function hideIntro() {
    if (!introOverlay) return;
    introOverlay.classList.add("hidden");
    window.setTimeout(() => {
      introOverlay.classList.add("gone"); // IMPORTANT: removes blur/tint effect entirely
    }, 680);
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

  function drawFlyPastFrame(ctx, img, cw, ch, dir, t) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    // Fill-ish, but not absurdly zoomed
    const base = Math.max(cw / iw, ch / ih) * 0.90;
    const scale = base * (0.92 + 0.20 * t);
    const dw = iw * scale;
    const dh = ih * scale;

    const maxOffset = cw * 0.60;

    // Start and end positions (off-screen travel)
    const xFrom = (dir === "left") ? (cw + maxOffset) : (-dw - maxOffset);
    const xTo   = (dir === "left") ? (-dw - maxOffset) : (cw + maxOffset);

    const x = xFrom + (xTo - xFrom) * t;

    // Slight vertical “arc” to feel 3D
    const y = (ch - dh) / 2 + Math.sin(t * Math.PI) * (-ch * 0.03);

    // Fade in/out per frame
    const fadeIn = t < 0.12 ? (t / 0.12) : 1;
    const fadeOut = t > 0.88 ? ((1 - t) / 0.12) : 1;
    const alpha = clamp01(Math.min(fadeIn, fadeOut));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
  }

  async function runIntroFrames() {
    if (!introOverlay || !introCanvas) return;

    showIntro();

    const ctx = introCanvas.getContext("2d", { alpha: true });
    if (!ctx) return hideIntro();

    // Frame list
    const frames = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);

    // Slower intro: ~15–16 seconds total
    const frameMs = 1300;
    const totalMs = frames.length * frameMs;

    // Preload
    const images = await Promise.all(frames.map(src => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    })));

    const usable = images.filter(Boolean);
    if (usable.length < 3) {
      hideIntro();
      return;
    }

    let rafId = 0;
    const start = performance.now();

    function render(now) {
      const elapsed = now - start;

      const { w, h } = resizeCanvasForDpr(introCanvas);
      ctx.clearRect(0, 0, w, h);

      const idx = Math.min(usable.length - 1, Math.floor(elapsed / frameMs));
      const t = clamp01((elapsed - idx * frameMs) / frameMs);

      // Alternate directions
      const dir = (idx % 2 === 0) ? "left" : "right";

      const img = usable[idx];
      if (img) drawFlyPastFrame(ctx, img, w, h, dir, t);

      if (elapsed < totalMs) {
        rafId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(rafId);
        window.setTimeout(hideIntro, 250);
      }
    }

    rafId = requestAnimationFrame(render);

    // Safety: never trap the page
    window.setTimeout(() => {
      hideIntro();
      cancelAnimationFrame(rafId);
    }, totalMs + 1500);
  }

  // Play intro immediately (unless user prefers reduced motion)
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    window.addEventListener("load", () => {
      runIntroFrames().catch(() => hideIntro());
    }, { once: true });
  } else {
    // Ensure it’s removed completely
    hideIntro();
  }

  /* =========================================================
     Music (single track)
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

    if (bgMusic.paused) {
      try {
        await bgMusic.play();
      } catch {
        // No toast/nag (per your request). If play fails, UI stays OFF.
      }
    } else {
      bgMusic.pause();
    }

    syncMusicUI();
  }

  if (musicToggle) {
    musicToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMusic();
    });
  }

  // Initial label
  syncMusicUI();

  /* =========================================================
     Scroll snapping: click cue + arrow
     Fix: scroll inside snapRoot explicitly (not document)
     ========================================================= */

  const sections = Array.from(document.querySelectorAll(".snapSection"));
  const navLinks = Array.from(document.querySelectorAll(".sectionNav__link"));

  function scrollToSection(section) {
    if (!section) return;

    if (!snapRoot) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Deterministic: scroll snapRoot to section's offsetTop
    snapRoot.scrollTo({
      top: section.offsetTop,
      behavior: "smooth"
    });
  }

  function scrollToNext(fromSection) {
    const nextSel = fromSection.getAttribute("data-next");
    if (!nextSel) return;
    const next = document.querySelector(nextSel);
    if (!next) return;
    scrollToSection(next);
  }

  document.querySelectorAll("[data-scroll-next]").forEach(el => {
    const section = el.closest(".snapSection");
    if (!section) return;

    el.addEventListener("click", () => scrollToNext(section));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        scrollToNext(section);
      }
    });
  });

  // Make nav anchors scroll inside snapRoot (instead of document)
  navLinks.forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      scrollToSection(target);

      // Keep URL updated without jumping the page
      history.replaceState(null, "", href);
    });
  });

  /* =========================================================
     Background parallax (~50% slower than content)
     - updates per section using --bgOffset
     ========================================================= */

  let parallaxTicking = false;

  function updateParallax() {
    if (!snapRoot) return;

    const st = snapRoot.scrollTop;

    // 50% “lag” feel. Clamp so it never gets ridiculous.
    sections.forEach(sec => {
      const rel = st - sec.offsetTop;     // 0 when perfectly snapped
      const offset = clamp(rel * 0.5, -360, 360);
      sec.style.setProperty("--bgOffset", `${offset}px`);
    });

    parallaxTicking = false;
  }

  if (snapRoot) {
    snapRoot.addEventListener("scroll", () => {
      if (parallaxTicking) return;
      parallaxTicking = true;
      requestAnimationFrame(updateParallax);
    }, { passive: true });

    // Initial
    updateParallax();
  }

  /* =========================================================
     Active section highlighting + Experience background swap
     ========================================================= */

  function setActiveNav(id) {
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
  }

  const swapTimers = new WeakMap();

  function clearSwap(section) {
    section.classList.remove("swapBg");
    const t = swapTimers.get(section);
    if (t) window.clearTimeout(t);
    swapTimers.delete(section);
  }

  function scheduleSwap(section) {
    // Only sections that have bgB should swap
    const hasBgB = getComputedStyle(section).getPropertyValue("--bgB").trim().length > 0;
    const flagged = section.hasAttribute("data-bg2");
    if (!hasBgB || !flagged) return;

    const t = window.setTimeout(() => {
      section.classList.add("swapBg");
    }, 650);

    swapTimers.set(section, t);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const section = entry.target;
      if (!section || !section.id) return;

      if (entry.isIntersecting) {
        setActiveNav(section.id);
        clearSwap(section);
        scheduleSwap(section);
      } else {
        clearSwap(section);
      }
    });
  }, { root: snapRoot || null, threshold: 0.60 });

  sections.forEach(s => io.observe(s));

  /* =========================================================
     Hidden Screensaver Sequence (Easter egg)
     - Hidden hotspot only
     - videos: assets/video/Screensaver_#.mp4
     - audio:  assets/audio/*.mp3
     ========================================================= */

  const eggBtn = document.getElementById("easterEgg");
  const modal = document.getElementById("screensaverModal");
  const ssVideo = document.getElementById("ssVideo");
  const ssAudio = document.getElementById("ssAudio");

  const qsAll = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function openModal() {
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    stopScreensaver();
  }

  if (modal) {
    qsAll("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  function fadeOpacity(el, from, to, ms) {
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now) {
        const t = clamp01((now - start) / ms);
        el.style.opacity = String(from + (to - from) * t);
        if (t >= 1) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function fadeAudio(audio, from, to, ms) {
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now) {
        const t = clamp01((now - start) / ms);
        audio.volume = clamp01(from + (to - from) * t);
        if (t >= 1) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function waitForEvent(el, evt, timeoutMs = 2500) {
    return new Promise((resolve) => {
      let done = false;

      const onDone = () => {
        if (done) return;
        done = true;
        el.removeEventListener(evt, onDone);
        resolve(true);
      };

      el.addEventListener(evt, onDone, { once: true });

      window.setTimeout(() => {
        if (done) return;
        done = true;
        el.removeEventListener(evt, onDone);
        resolve(false);
      }, timeoutMs);
    });
  }

  let screensaverRunning = false;

  // Duck background music during screensaver playback (prevents overlap)
  let bgMusicWasPlaying = false;
  let bgMusicPrevVol = 0.25;

  async function duckBgMusic(on) {
    if (!bgMusic) return;

    if (on) {
      bgMusicWasPlaying = !bgMusic.paused;
      bgMusicPrevVol = bgMusic.volume;

      if (bgMusicWasPlaying) {
        await fadeAudio(bgMusic, bgMusic.volume, 0, 220);
        bgMusic.pause();
        bgMusic.volume = bgMusicPrevVol;
      }
    } else {
      if (bgMusicWasPlaying) {
        try { await bgMusic.play(); } catch {}
        bgMusic.volume = bgMusicPrevVol;
        bgMusicWasPlaying = false;
      }
      syncMusicUI();
    }
  }

  async function playStep({
    videoSrc,
    audioSrc,
    videoFadeInMs,
    audioFadeInMs,
    fadeOutMs,
    audioLeadMs = 0,
    videoFadeInDelayMs = 0,
    maxFallbackMs = 9000
  }) {
    if (!ssVideo || !ssAudio) return;

    ssVideo.pause();
    ssAudio.pause();

    ssVideo.muted = true;
    ssVideo.loop = false;

    ssVideo.src = videoSrc;
    ssVideo.load();

    ssAudio.src = audioSrc;
    ssAudio.load();

    ssVideo.currentTime = 0;
    ssAudio.currentTime = 0;
    ssVideo.style.opacity = "0";
    ssAudio.volume = 0;

    await waitForEvent(ssVideo, "loadedmetadata", 2500);

    // Audio first if requested
    await ssAudio.play().catch(() => {});
    if (audioLeadMs > 0) {
      await fadeAudio(ssAudio, 0, 0.85, audioFadeInMs);
      await new Promise(r => setTimeout(r, audioLeadMs));
    }

    // Video start
    await ssVideo.play().catch(() => {});
    if (videoFadeInDelayMs > 0) await new Promise(r => setTimeout(r, videoFadeInDelayMs));

    // Fade in
    if (audioLeadMs === 0) {
      await Promise.all([
        fadeOpacity(ssVideo, 0, 1, videoFadeInMs),
        fadeAudio(ssAudio, 0, 0.85, audioFadeInMs),
      ]);
    } else {
      await fadeOpacity(ssVideo, 0, 1, videoFadeInMs);
    }

    // Hold until near end, then fade out
    const safetyMs = 240;
    const durationMs =
      Number.isFinite(ssVideo.duration) && ssVideo.duration > 0
        ? (ssVideo.duration * 1000)
        : maxFallbackMs;

    const waitMs = Math.max(0, durationMs - fadeOutMs - safetyMs);
    await new Promise(r => setTimeout(r, waitMs));

    await Promise.all([
      fadeOpacity(ssVideo, 1, 0, fadeOutMs),
      fadeAudio(ssAudio, ssAudio.volume, 0, fadeOutMs),
    ]);

    ssVideo.pause();
    ssAudio.pause();
  }

  async function runScreensaverSequence() {
    if (screensaverRunning) return;
    screensaverRunning = true;

    await duckBgMusic(true);
    openModal();

    await playStep({
      videoSrc: "assets/video/Screensaver_1.mp4",
      audioSrc: "assets/audio/Travel_through_space.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });
    if (!screensaverRunning) return;

    await playStep({
      videoSrc: "assets/video/Screensaver_2.mp4",
      audioSrc: "assets/audio/Blender_Hyperspace_Jump.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });
    if (!screensaverRunning) return;

    await playStep({
      videoSrc: "assets/video/Screensaver_3.mp4",
      audioSrc: "assets/audio/Alien_Beach_Waves.mp3",
      videoFadeInMs: 5000,     // slow visual reveal
      audioFadeInMs: 380,      // fast audio reveal
      fadeOutMs: 650,
      audioLeadMs: 900,        // audio heard BEFORE beach is seen
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
  }

  if (eggBtn) {
    eggBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      runScreensaverSequence();
    });
  }
})();
