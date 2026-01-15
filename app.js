(() => {
  const snapRoot = document.getElementById("snapRoot");

  /* =========================================================
     Intro overlay (PNG frame sequence)
     - Uses your existing frames: assets/beats/1_Website.png … 12_Website.png
     - Keeps the page visible behind it (alpha PNGs + transparent overlay)
     ========================================================= */

  const introOverlay = document.getElementById("introOverlay");
  const introCanvas = document.getElementById("introCanvas");

  function hideIntro() {
    if (!introOverlay) return;
    introOverlay.classList.add("hidden");
    window.setTimeout(() => {
      if (introOverlay && introOverlay.parentNode) introOverlay.parentNode.removeChild(introOverlay);
    }, 700);
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function resizeCanvasForDpr(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr, w, h };
  }

  function drawContain(ctx, img, cw, ch, frameIdx, totalFrames) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const scale = Math.min(cw / iw, ch / ih) * 1.1; // Slightly zoomed for effect
    const dw = iw * scale;
    const dh = ih * scale;

    // Calculate horizontal fly-by offset: -40% to +40% of canvas width
    const flyPct = (frameIdx / (totalFrames - 1)) * 2 - 1; // -1 to +1
    const maxOffset = cw * 0.40;
    const dx = (cw - dw) / 2 + flyPct * maxOffset;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  async function runIntroFrames() {
    if (!introOverlay || !introCanvas) return;

    const ctx = introCanvas.getContext("2d", { alpha: true });
    if (!ctx) return hideIntro();

    // 12-frame fly-past sequence (adjust FPS if you want a longer/shorter intro)
    const frames = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);
    const fps = 3;              // SLOWER: 3fps = ~4 seconds for 12 frames
    const frameMs = 1000 / fps;

    // Preload images
    const images = await Promise.all(frames.map(src => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    })));

    const usable = images.filter(Boolean);
    if (usable.length < 3) {
      // If frames are missing, fail open quickly (don’t block the site).
      return hideIntro();
    }

    let rafId = 0;
    let start = performance.now();

    function render(now) {
      const { w, h } = resizeCanvasForDpr(introCanvas);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const elapsed = now - start;
      const idx = Math.min(images.length - 1, Math.floor(elapsed / frameMs));
      const img = images[idx];

      if (img) drawContain(ctx, img, w, h, idx, images.length);

      ctx.restore();

      if (idx >= images.length - 1) {
        // tiny hold so the last frame “lands” before fade out
        window.setTimeout(hideIntro, 120);
        cancelAnimationFrame(rafId);
        return;
      }

      rafId = requestAnimationFrame(render);
    }

    function onResize() {
      // Just forces a clean redraw next frame; canvas is resized in render()
      start = performance.now(); // restart timing so resize doesn’t “jump”
    }

    window.addEventListener("resize", onResize, { passive: true });
    rafId = requestAnimationFrame(render);

    // Safety: never let intro trap the page
    window.setTimeout(() => {
      if (document.body.contains(introOverlay)) hideIntro();
    }, 6000); // slightly longer for slower intro
  }

  // Kick it off ASAP.
  if (introOverlay && introCanvas) {
    runIntroFrames().catch(hideIntro);
  }

  /* =========================================================
     Music (single track: I_am_me.mp3)
     - No track selector
     - Button text always reflects true play state
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

    // Ensure the element is ready to play (some browsers are picky)
    bgMusic.load();

    if (bgMusic.paused) {
      try {
        await bgMusic.play();
      } catch {
        // No autoplay nag/toast (per your request). The button stays accurate.
      }
    } else {
      bgMusic.pause();
    }

    syncMusicUI();
  }

  if (musicToggle) {
    musicToggle.addEventListener("click", toggleMusic);
  }

  /* =========================================================
     Scroll snap backgrounds + arrows
     - Per-section backgrounds via CSS vars (--bgA / --bgB)
     - Experience section swaps AirForce -> CADdets while staying in the same section
     ========================================================= */

  const sections = Array.from(document.querySelectorAll(".snapSection"));
  const navLinks = Array.from(document.querySelectorAll(".sectionNav__link"));

  function setSectionBackgroundVars(section) {
    const bgA = section.getAttribute("data-bg");
    const bgB = section.getAttribute("data-bg2");

    section.style.setProperty("--bgA", bgA ? `url("${bgA}")` : "none");
    section.style.setProperty("--bgB", bgB ? `url("${bgB}")` : "none");
  }

  sections.forEach(setSectionBackgroundVars);

  function setActiveNav(id) {
    navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const section = entry.target;
      const id = section.id;
      setActiveNav(id);

      // Background swap behavior for any section with data-bg2
      const hasBg2 = Boolean(section.getAttribute("data-bg2"));
      section.classList.remove("swapBg");

      if (hasBg2) {
        window.setTimeout(() => {
          // Still in DOM; add the swap class
          section.classList.add("swapBg");
        }, 650);
      }
    });
  }, { root: snapRoot, threshold: 0.6 });

  sections.forEach(s => io.observe(s));

  function scrollToNext(fromSection) {
    const nextSel = fromSection.getAttribute("data-next");
    if (!nextSel) return;
    const next = document.querySelector(nextSel);
    if (!next) return;
    next.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Click/keyboard handlers for cue/arrow
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

  /* =========================================================
     Hidden Screensaver Sequence (Easter egg)
     - Hidden hotspot only (no visible “Screensavers” button)
     - Correct asset paths:
       videos: assets/video/Screensaver_#.mp4
       audio:  assets/audio/*.mp3
     ========================================================= */

  const eggBtn = document.getElementById("easterEgg");
  const modal = document.getElementById("screensaverModal");
  const ssVideo = document.getElementById("ssVideo");
  const ssAudio = document.getElementById("ssAudio");

  function qsAll(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  const CLOSE_SELECTORS = "[data-close]";

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
    qsAll(CLOSE_SELECTORS, modal).forEach(el => el.addEventListener("click", closeModal));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  function fadeOpacity(el, from, to, ms) {
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now) {
        const t = clamp01((now - start) / ms);
        const v = from + (to - from) * t;
        el.style.opacity = String(v);
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
        const v = from + (to - from) * t;
        audio.volume = clamp01(v);
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

  // Optional: duck background music during screensaver playback (prevents audio overlap).
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

    // Load sources cleanly
    ssVideo.pause();
    ssAudio.pause();

    ssVideo.muted = true; // audio is handled by ssAudio
    ssVideo.loop = false;

    ssVideo.src = videoSrc;
    ssVideo.load();

    ssAudio.src = audioSrc;
    ssAudio.load();

    ssVideo.currentTime = 0;
    ssAudio.currentTime = 0;
    ssVideo.style.opacity = "0";
    ssAudio.volume = 0;

    // Wait for metadata so duration is real (best effort)
    await waitForEvent(ssVideo, "loadedmetadata", 2500);

    // Start audio first if requested
    await ssAudio.play().catch(() => {});
    if (audioLeadMs > 0) {
      await fadeAudio(ssAudio, 0, 0.85, audioFadeInMs);
      await new Promise(r => setTimeout(r, audioLeadMs));
    }

    // Start video
    await ssVideo.play().catch(() => {});
    if (videoFadeInDelayMs > 0) await new Promise(r => setTimeout(r, videoFadeInDelayMs));

    // Fade in video + (if not already) audio
    if (audioLeadMs === 0) {
      await Promise.all([
        fadeOpacity(ssVideo, 0, 1, videoFadeInMs),
        fadeAudio(ssAudio, 0, 0.85, audioFadeInMs),
      ]);
    } else {
      await fadeOpacity(ssVideo, 0, 1, videoFadeInMs);
    }

    // Wait until near the end, then fade out
    const safetyMs = 240;
    const durationMs = Number.isFinite(ssVideo.duration) && ssVideo.duration > 0 ? (ssVideo.duration * 1000) : maxFallbackMs;
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

    // Step 1: Screensaver_1.mp4 + Travel_through_space.mp3 (quick fades)
    await playStep({
      videoSrc: "assets/video/Screensaver_1.mp4",
      audioSrc: "assets/audio/Travel_through_space.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });
    if (!screensaverRunning) return;

    // Step 2: Screensaver_2.mp4 + Blender_Hyperspace_Jump.mp3 (quick fades)
    await playStep({
      videoSrc: "assets/video/Screensaver_2.mp4",
      audioSrc: "assets/audio/Blender_Hyperspace_Jump.mp3",
      videoFadeInMs: 450,
      audioFadeInMs: 450,
      fadeOutMs: 450,
    });
    if (!screensaverRunning) return;

    // Step 3: 5s video fade-in; FAST audio fade-in; audio is heard BEFORE beach is seen
    await playStep({
      videoSrc: "assets/video/Screensaver_3.mp4",
      audioSrc: "assets/audio/Alien_Beach_Waves.mp3",
      videoFadeInMs: 5000,     // slow visual reveal
      audioFadeInMs: 380,      // fast audio reveal
      fadeOutMs: 650,
      audioLeadMs: 900,        // audio comes first
      videoFadeInDelayMs: 650  // keep the video invisible a moment after audio starts
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
    eggBtn.addEventListener("click", runScreensaverSequence);
  }
})();
