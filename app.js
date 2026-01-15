(() => {
  const snapRoot = document.getElementById("snapRoot");

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // --- Intro overlay (PNG fly-to-user) ---

  const introOverlay = document.getElementById("introOverlay");
  const introCanvas = document.getElementById("introCanvas");

  // Only play intro when triggered
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
      introOverlay.classList.add("gone");
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

  // Helper for lerp
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Draw a single image with scale and alpha
  function drawImageScaledAlpha(ctx, img, cw, ch, scale, alpha) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const dw = iw * scale;
    const dh = ih * scale;
    const x = (cw - dw) / 2;
    const y = (ch - dh) / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, dw, dh);
    ctx.restore();
  }

  // Crossfade logic: each image is 3.5s, fade in at 5% scale, fade out at 70% scale
  async function runIntroFrames() {
    if (!introOverlay || !introCanvas) return;

    showIntro();

    const ctx = introCanvas.getContext("2d", { alpha: true });
    if (!ctx) return hideIntro();

    const frames = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);
    const frameMs = 3500;
    const fadeFrac = 0.18; // 18% of duration for fade in/out
    const fadeMs = frameMs * fadeFrac;

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
    const totalMs = usable.length * frameMs;
    const start = performance.now();

    function render(now) {
      const elapsed = now - start;
      const { w, h } = resizeCanvasForDpr(introCanvas);
      ctx.clearRect(0, 0, w, h);

      // Which frame are we in?
      const idx = Math.floor(elapsed / frameMs);
      const tFrame = (elapsed % frameMs) / frameMs;

      // Draw current and next for crossfade
      for (let i = 0; i < 2; ++i) {
        const imgIdx = idx + i;
        if (imgIdx >= usable.length) continue;
        const img = usable[imgIdx];

        // For current image (i==0), t = tFrame; for next (i==1), t = tFrame-1
        let t = tFrame - i;
        if (t < 0 || t > 1) continue;

        // Scale: from 5% to 70%
        const scale = lerp(0.05, 0.70, t);

        // Alpha: fade in at start, fade out at end
        let alpha = 1;
        if (t < fadeFrac) {
          alpha = t / fadeFrac;
        } else if (t > 1 - fadeFrac) {
          alpha = (1 - t) / fadeFrac;
        }

        alpha = clamp01(alpha);

        drawImageScaledAlpha(ctx, img, w, h, scale, alpha);
      }

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

  // --- REMOVE: auto-play on page load ---
  // const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // if (!reduceMotion) {
  //   window.addEventListener("load", () => {
  //     runIntroFrames().catch(() => hideIntro());
  //   }, { once: true });
  // } else {
  //   hideIntro();
  // }

  // Instead, play intro when music button is clicked
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) hideIntro();

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

  // Track if intro video only plays once per page load
  let introPlayed = false;

  async function runIntroFramesOnce() {
    if (introPlayed) return;
    introPlayed = true;
    await runIntroFrames();
  }

  async function toggleMusic() {
    if (!bgMusic) return;

    // Play intro animation only once per page load
    await runIntroFramesOnce();

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
