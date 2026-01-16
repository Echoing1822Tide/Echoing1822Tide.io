(() => {
  const snapRoot = document.getElementById("snapRoot");

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

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
      bgMusic.play();
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

    snapRoot.scrollTo({
      top: section.offsetTop,
      behavior: "smooth",
    });
  }

  function scrollToNext(fromSection) {
    const nextSel = fromSection.getAttribute("data-next");
    if (!nextSel) return;
    const next = document.querySelector(nextSel);
    if (!next) return;
    scrollToSection(next);
  }

  document.querySelectorAll("[data-scroll-next]").forEach((el) => {
    const section = el.closest(".snapSection");
    if (!section) return;

    el.addEventListener("click", () => scrollToNext(section));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        scrollToNext(section);
      }
    });
  });

  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      scrollToSection(target);

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

    sections.forEach((sec) => {
      const rel = st - sec.offsetTop;
      const offset = clamp(rel * 0.5, -360, 360);
      sec.style.setProperty("--bgOffset", `${offset}px`);
    });

    parallaxTicking = false;
  }

  if (snapRoot) {
    snapRoot.addEventListener(
      "scroll",
      () => {
        if (parallaxTicking) return;
        parallaxTicking = true;
        requestAnimationFrame(updateParallax);
      },
      { passive: true },
    );

    updateParallax();
  }

  /* =========================================================
     Active section highlighting + Experience background swap
     ========================================================= */

  function setActiveNav(id) {
    navLinks.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === `#${id}`),
    );
  }

  const swapTimers = new WeakMap();

  function clearSwap(section) {
    section.classList.remove("swapBg");
    const t = swapTimers.get(section);
    if (t) window.clearTimeout(t);
    swapTimers.delete(section);
  }

  function scheduleSwap(section) {
    const hasBgB =
      getComputedStyle(section).getPropertyValue("--bgB").trim().length > 0;
    const flagged = section.hasAttribute("data-bg2");
    if (!hasBgB || !flagged) return;

    const t = window.setTimeout(() => {
      section.classList.add("swapBg");
    }, 650);

    swapTimers.set(section, t);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const section = entry.target;
        if (!section || !section.id) return;

        if (entry.isIntersecting) {
          setActiveNav(section.id);
          scheduleSwap(section);
        } else {
          clearSwap(section);
        }
      });
    },
    { root: snapRoot || null, threshold: 0.6 },
  );

  sections.forEach((s) => io.observe(s));

  // === Rotating hero word ===
  const rotatingWords = [
    "Structure",
    "Clarity",
    "Systems",
    "Reliability",
    "Focus",
    "Solutions",
    "Order",
    "Results",
    "Simplicity",
    "Momentum",
  ];
  const rotatingWordSpan = document.getElementById("rotatingWord");
  let rotatingIdx = 0;

  function rotateHeroWord() {
    if (!rotatingWordSpan) return;
    rotatingWordSpan.style.opacity = 0;
    setTimeout(() => {
      rotatingIdx = (rotatingIdx + 1) % rotatingWords.length;
      rotatingWordSpan.textContent = rotatingWords[rotatingIdx];
      rotatingWordSpan.style.opacity = 1;
    }, 350);
  }

  if (rotatingWordSpan) {
    setInterval(rotateHeroWord, 1800);
  }

  // === Image Gallery ===
  const galleryImages = Array.from({ length: 12 }, (_, i) => `assets/beats/${i + 1}_Website.png`);
  let galleryIdx = 0;

  const galleryImg = document.getElementById("galleryImg");
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");
  const imageGallery = document.getElementById("imageGallery");

  let galleryInterval = null;
  let galleryPaused = false;

  // Preload image before showing to avoid flash
  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  async function showGalleryImg(idx) {
    if (!galleryImg) return;
    galleryImg.style.opacity = 0;
    const src = galleryImages[idx];
    await preloadImage(src);
    galleryImg.src = src;
    setTimeout(() => {
      galleryImg.style.opacity = 1;
    }, 30); // Short delay to ensure src is set before fade in
  }

  function nextGalleryImg() {
    galleryIdx = (galleryIdx + 1) % galleryImages.length;
    showGalleryImg(galleryIdx);
  }

  function prevGalleryImg() {
    galleryIdx = (galleryIdx - 1 + galleryImages.length) % galleryImages.length;
    showGalleryImg(galleryIdx);
  }

  function startGalleryAutoScroll() {
    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
      if (!galleryPaused) nextGalleryImg();
    }, 5000); // was 2000, now 5000 ms (5 seconds)
  }

  function pauseGalleryAutoScroll() {
    galleryPaused = true;
  }

  function resumeGalleryAutoScroll() {
    galleryPaused = false;
  }

  if (galleryPrev && galleryNext && galleryImg) {
    galleryPrev.addEventListener("click", () => {
      prevGalleryImg();
      pauseGalleryAutoScroll();
    });
    galleryNext.addEventListener("click", () => {
      nextGalleryImg();
      pauseGalleryAutoScroll();
    });

    // Pause auto-scroll on hover/focus, resume on leave/blur
    [galleryImg, galleryPrev, galleryNext, imageGallery].forEach((el) => {
      if (!el) return;
      el.addEventListener("mouseenter", pauseGalleryAutoScroll);
      el.addEventListener("mouseleave", resumeGalleryAutoScroll);
      el.addEventListener("focusin", pauseGalleryAutoScroll);
      el.addEventListener("focusout", resumeGalleryAutoScroll);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        prevGalleryImg();
        pauseGalleryAutoScroll();
      } else if (e.key === "ArrowRight") {
        nextGalleryImg();
        pauseGalleryAutoScroll();
      }
    });

    showGalleryImg(galleryIdx);
    startGalleryAutoScroll();
  }

  // ---------------------------------------------------------
  // Screensaver (Easter Egg)
  // ---------------------------------------------------------

  const eggBtn = document.getElementById("easterEgg");
  const ssModal = document.getElementById("screensaverModal");
  const ssClose = document.getElementById("closeScreensaver");
  const ssVideo = document.getElementById("ssVideo");
  const ssAudio = document.getElementById("ssAudio");

  let screensaverRunning = false;

  function openModal() {
    if (!ssModal) return;
    ssModal.classList.add("open");
    ssModal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!ssModal) return;
    ssModal.classList.remove("open");
    ssModal.setAttribute("aria-hidden", "true");
    stopScreensaver();
    screensaverRunning = false; // <-- Reset here so you can re-trigger
  }

  if (ssClose) ssClose.addEventListener("click", closeModal);
  if (ssModal) ssModal.addEventListener("click", (e) => {
    // click outside content closes
    if (e.target.classList.contains("modal__backdrop")) closeModal();
  });

  function fadeOpacity(el, from, to, ms) {
    if (!el) return Promise.resolve();
    el.style.opacity = String(from);
    el.style.transition = `opacity ${ms}ms ease`;
    requestAnimationFrame(() => (el.style.opacity = String(to)));
    return new Promise((r) => setTimeout(r, ms));
  }

  function fadeAudio(audio, from, to, ms) {
    if (!audio) return Promise.resolve();
    const start = performance.now();
    audio.volume = from;

    return new Promise((resolve) => {
      function tick(now) {
        const t = Math.min(1, (now - start) / ms);
        audio.volume = from + (to - from) * t;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  async function playStep({
    videoSrc,
    audioSrc,
    fadeInMs = 450,
    fadeOutMs = 450,
    audioLeadMs = 0,
    videoFadeInDelayMs = 0,
  }) {
    if (!ssVideo || !ssAudio) return;

    // Reset
    ssVideo.pause();
    ssAudio.pause();

    ssVideo.style.opacity = "0";
    ssAudio.volume = 0;

    ssVideo.src = videoSrc;
    ssVideo.load();

    ssAudio.src = audioSrc;
    ssAudio.load();

    // Always keep video muted for autoplay compatibility
    ssVideo.muted = true;

    // Ensure modal is visible before playing
    if (ssModal && !ssModal.classList.contains("open")) {
      ssModal.classList.add("open");
      ssModal.setAttribute("aria-hidden", "false");
    }

    // Wait for video to be ready before playing
    await new Promise((resolve) => {
      if (ssVideo.readyState >= 2) return resolve();
      ssVideo.oncanplay = () => resolve();
      setTimeout(resolve, 1000); // fallback after 1s
    });

    // Start video first (muted) so it can buffer
    try {
      await ssVideo.play();
    } catch (e) {
      // If play fails, skip this step or show a fallback
      console.warn("Screensaver video failed to play", e);
      return;
    }

    // Optional: start audio slightly before video becomes visible
    if (audioLeadMs > 0) {
      try {
        ssAudio.currentTime = 0;
        await ssAudio.play();
      } catch (_) {}
      await fadeAudio(ssAudio, 0, 0.85, Math.min(600, fadeInMs));
      await new Promise((r) => setTimeout(r, audioLeadMs));
    } else {
      try {
        ssAudio.currentTime = 0;
        await ssAudio.play();
      } catch (_) {}
    }

    // Fade in video (and audio if not already done)
    if (videoFadeInDelayMs > 0) {
      await new Promise((r) => setTimeout(r, videoFadeInDelayMs));
    }

    if (audioLeadMs <= 0) {
      await Promise.all([
        fadeOpacity(ssVideo, 0, 1, fadeInMs),
        fadeAudio(ssAudio, 0, 0.85, fadeInMs),
      ]);
    } else {
      await fadeOpacity(ssVideo, 0, 1, fadeInMs);
    }

    // Wait near end of video, then fade out
    const safetyMs = 250;
    const durationMs = isFinite(ssVideo.duration) ? (ssVideo.duration * 1000) : 8000;
    const waitMs = Math.max(0, durationMs - fadeOutMs - safetyMs);
    await new Promise((r) => setTimeout(r, waitMs));

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

    openModal();

    try {
      // Step 1
      await playStep({
        videoSrc: "assets/screensavers/Screensaver_1.mp4",
        audioSrc: "assets/screensavers/Travel_through_space.mp3",
        fadeInMs: 450,
        fadeOutMs: 450,
      });
      if (!screensaverRunning) return;

      // Step 2
      await playStep({
        videoSrc: "assets/screensavers/Screensaver_2.mp4",
        audioSrc: "assets/screensavers/Blender_Hyperspace_Jump.mp3",
        fadeInMs: 450,
        fadeOutMs: 450,
      });
      if (!screensaverRunning) return;

      // Step 3 (slow video fade, audio leads a bit)
      await playStep({
        videoSrc: "assets/screensavers/Screensaver_3.mp4",
        audioSrc: "assets/screensavers/Alien_Beach_Waves.mp3",
        fadeInMs: 5000,
        fadeOutMs: 650,
        audioLeadMs: 700,
        videoFadeInDelayMs: 0,
      });
    } finally {
      closeModal();
      screensaverRunning = false; // <-- Always reset at the end
    }
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
  }

  if (eggBtn) {
    eggBtn.addEventListener("click", () => {
      // Always allow running again
      if (!screensaverRunning) runScreensaverSequence();
    });
  }
})();
