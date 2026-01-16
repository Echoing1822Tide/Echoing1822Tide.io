(() => {
  "use strict";

  /* =========================================================
     Core elements
     ========================================================= */
  const snapRoot = document.getElementById("snapRoot");
  const sections = Array.from(document.querySelectorAll(".snapSection"));
  const navLinks = Array.from(document.querySelectorAll(".sectionNav__link"));

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  async function toggleMusic() {
    if (!bgMusic) return;

    try {
      if (bgMusic.paused) {
        await bgMusic.play(); // may reject if not user-initiated
      } else {
        bgMusic.pause();
      }
    } catch (err) {
      // iOS/Safari can block autoplay unless user clicks.
      console.warn("Music toggle blocked by browser policy:", err);
    } finally {
      syncMusicUI();
    }
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

  if (musicToggle) {
    musicToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMusic();
    });
  }

  syncMusicUI();

  /* =========================================================
     Scroll snapping helpers (scroll inside snapRoot)
     ========================================================= */
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
    if (!fromSection) return;
    const nextSel = fromSection.getAttribute("data-next");
    if (!nextSel) return;
    const next = document.querySelector(nextSel);
    if (!next) return;
    scrollToSection(next);
  }

  // Scroll cue buttons (hero bubble + arrow-only buttons)
  document.querySelectorAll("[data-scroll-next]").forEach((el) => {
    const section = el.closest(".snapSection");
    if (!section) return;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      scrollToNext(section);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        scrollToNext(section);
      }
    });
  });

  // Left-side nav links
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
     Background parallax (slower than content)
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
      { passive: true }
    );

    updateParallax();
  }

  /* =========================================================
     Active section highlighting + optional background swap hook
     ========================================================= */
  function setActiveNav(id) {
    navLinks.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
    });
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
    { root: snapRoot || null, threshold: 0.6 }
  );

  sections.forEach((s) => io.observe(s));

  /* =========================================================
     Rotating hero word
     ========================================================= */
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
    rotatingWordSpan.style.opacity = "0";
    window.setTimeout(() => {
      rotatingIdx = (rotatingIdx + 1) % rotatingWords.length;
      rotatingWordSpan.textContent = rotatingWords[rotatingIdx];
      rotatingWordSpan.style.opacity = "1";
    }, 350);
  }

  if (rotatingWordSpan) {
    window.setInterval(rotateHeroWord, 1800);
  }

  /* =========================================================
     Image Gallery
     ========================================================= */
  const galleryImages = Array.from(
    { length: 12 },
    (_, i) => `assets/beats/${i + 1}_Website.png`
  );

  let galleryIdx = 0;

  const galleryImg = document.getElementById("galleryImg");
  const galleryPrev = document.getElementById("galleryPrev");
  const galleryNext = document.getElementById("galleryNext");
  const imageGallery = document.getElementById("imageGallery");

  let galleryInterval = null;
  let galleryPaused = false;

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async function showGalleryImg(idx) {
    if (!galleryImg) return;
    galleryImg.style.opacity = "0";
    const src = galleryImages[idx];
    await preloadImage(src);
    galleryImg.src = src;
    window.setTimeout(() => {
      galleryImg.style.opacity = "1";
    }, 30);
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
    }, 5000);
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

  /* =========================================================
     Screensaver (Easter Egg)
     Uses:
       - video files in /assets/screensavers/
       - audio files in /assets/screensavers/
     ========================================================= */
  const VIDEO_DIR = "assets/screensavers/";
  const AUDIO_DIR = "assets/screensavers/";

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

  function closeModal() {
    if (!ssModal) return;
    ssModal.classList.remove("open");
    ssModal.setAttribute("aria-hidden", "true");
    stopScreensaver();
  }

  if (ssClose) ssClose.addEventListener("click", closeModal);

  if (ssModal) {
    ssModal.addEventListener("click", (e) => {
      if (e.target && e.target.classList && e.target.classList.contains("modal__backdrop")) {
        closeModal();
      }
    });
  }

  // ESC closes the screensaver
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ssModal && ssModal.classList.contains("open")) {
      closeModal();
    }
  });

  function fadeOpacity(el, from, to, ms) {
    if (!el) return Promise.resolve();
    el.style.opacity = String(from);
    el.style.transition = `opacity ${ms}ms ease`;
    requestAnimationFrame(() => (el.style.opacity = String(to)));
    return sleep(ms);
  }

  function fadeAudio(audio, from, to, ms) {
    if (!audio) return Promise.resolve();
    const start = performance.now();
    audio.volume = from;

    return new Promise((resolve) => {
      function tick(now) {
        if (!screensaverRunning) return resolve();
        const t = Math.min(1, (now - start) / ms);
        audio.volume = from + (to - from) * t;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function waitForEvent(el, eventName, timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!el) return resolve(false);

      let done = false;
      const onDone = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve(true);
      };

      const t = window.setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      const cleanup = () => {
        window.clearTimeout(t);
        el.removeEventListener(eventName, onDone);
      };

      el.addEventListener(eventName, onDone, { once: true });
    });
  }

  async function waitForFirstFrame(video, timeoutMs = 2500) {
    if (!video) return false;

    if (typeof video.requestVideoFrameCallback === "function") {
      return new Promise((resolve) => {
        let done = false;

        const t = window.setTimeout(() => {
          if (done) return;
          done = true;
          resolve(false);
        }, timeoutMs);

        video.requestVideoFrameCallback(() => {
          if (done) return;
          done = true;
          window.clearTimeout(t);
          resolve(true);
        });
      });
    }

    if (video.readyState >= 2) return true;
    return waitForEvent(video, "loadeddata", timeoutMs);
  }

  async function playStep({
    videoFile,
    audioFile,
    fadeInMs = 450,
    fadeOutMs = 450,
    audioLeadMs = 0,
    videoFadeInDelayMs = 0,
    seekToMs = 0,
    endHoldMs = 0,
    audioTarget = 0.85,
    cutMs = 0, // <-- add this line
  } = {}) {
    if (!ssVideo || !ssAudio) return;
    if (!screensaverRunning) return;

    const vSrc = VIDEO_DIR + videoFile;
    const aSrc = AUDIO_DIR + audioFile;

    // Reset
    ssVideo.pause();
    ssAudio.pause();
    ssVideo.style.opacity = "0";
    ssAudio.volume = 0;

    ssVideo.src = vSrc;
    ssVideo.load();

    ssAudio.src = aSrc;
    ssAudio.load();

    ssVideo.muted = true;
    ssVideo.playsInline = true;

    // Ensure metadata ready
    await waitForEvent(ssVideo, "loadedmetadata", 2500);
    await waitForEvent(ssAudio, "canplay", 2500);

    if (!screensaverRunning) return;

    // Skip black intro frames if needed
    if (seekToMs > 0 && isFinite(ssVideo.duration) && ssVideo.duration > 0) {
      try {
        ssVideo.currentTime = Math.min(ssVideo.duration - 0.05, seekToMs / 1000);
      } catch (_) {}
    }

    // Start video (muted)
    try {
      await ssVideo.play();
    } catch (e) {
      console.warn("Screensaver video failed to play:", e);
      return;
    }

    await waitForFirstFrame(ssVideo, 2500);

    if (!screensaverRunning) return;

    // Start audio
    try {
      ssAudio.currentTime = 0;
      await ssAudio.play();
    } catch (e) {
      // If audio fails (policy), we still continue with video
      console.warn("Screensaver audio failed to play:", e);
    }

    // Optional audio lead for drama
    if (audioLeadMs > 0) {
      await fadeAudio(ssAudio, 0, audioTarget, Math.min(650, fadeInMs));
      await sleep(audioLeadMs);
    }

    if (!screensaverRunning) return;

    // Optional video fade delay
    if (videoFadeInDelayMs > 0) {
      await sleep(videoFadeInDelayMs);
    }

    if (!screensaverRunning) return;

    // Fade in
    if (audioLeadMs > 0) {
      await fadeOpacity(ssVideo, 0, 1, fadeInMs);
    } else {
      await Promise.all([
        fadeOpacity(ssVideo, 0, 1, fadeInMs),
        fadeAudio(ssAudio, 0, audioTarget, fadeInMs),
      ]);
    }

    if (!screensaverRunning) return;

    if (endHoldMs > 0) {
      await sleep(endHoldMs);
    }

    if (!screensaverRunning) return;

    // Fade out near end
    const safetyMs = 250;
    const durationMs =
      isFinite(ssVideo.duration) && ssVideo.duration > 0
        ? ssVideo.duration * 1000
        : 8000;

    // --- MODIFIED LINE ---
    const fadeStartMs = Math.max(0, durationMs - fadeOutMs - safetyMs - (cutMs || 0));
    await sleep(fadeStartMs);

    if (!screensaverRunning) return;

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
        videoFile: "Screensaver_1.mp4",
        audioFile: "Travel_through_space.mp3",
        fadeInMs: 0,
        fadeOutMs: 0,
        endHoldMs: 0,
      });
      if (!screensaverRunning) return;

      // Step 2
      await playStep({
        videoFile: "Screensaver_2.mp4",
        audioFile: "Blender_Hyperspace_Jump.mp3",
        fadeInMs: 0,
        fadeOutMs: 650,
        audioLeadMs: 120,
        videoFadeInDelayMs: 0,
        seekToMs: 80,  // tweak 60–120 if you see a black start
        endHoldMs: 120,
        cutMs: 3000,   // <-- add this line to cut last 3 seconds
      });
      if (!screensaverRunning) return;

      // Step 3
      await playStep({
        videoFile: "Screensaver_3.mp4",
        audioFile: "Alien_Beach_Waves.mp3",
        fadeInMs: 6000,
        fadeOutMs: 650,
        audioLeadMs: 700,
        videoFadeInDelayMs: 0,
        endHoldMs: 350,
      });
    } finally {
      // Always close cleanly
      screensaverRunning = false;
      closeModal();
    }
  }

  if (eggBtn) {
    eggBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      runScreensaverSequence();
    });
  }
})();
