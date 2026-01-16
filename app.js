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

  async function syncMusicUI() {
    if (!bgMusic || !musicToggle) return;
    const on = !bgMusic.paused;
    musicToggle.textContent = on ? "Music: ON" : "Music: OFF";
    musicToggle.setAttribute("aria-pressed", on ? "true" : "false");

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
      } catch (_) {
        // autoplay restrictions can block; UI will stay OFF
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
        e.preventDefault();
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
      rotatingWordSpan.style.color = "#145a32"; // dark green representing money
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
    }, 2000);
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

  // ---------------------------------------------------------
  // Screensaver (Easter Egg)
  // ---------------------------------------------------------

  const eggBtn = document.getElementById("easterEgg");
  const ssModal = document.getElementById("screensaverModal");
  const ssClose = document.getElementById("closeScreensaver");
  const ssVideo = document.getElementById("ssVideo");
  const ssAudio = document.getElementById("ssAudio");

  let screensaverRunning = false;

  // Try multiple likely folders so path mistakes don’t kill the feature.
// Put these near the top of your screensaver section (or near playStep)
const VIDEO_DIR = "assets/screensavers/"; // adjust if yours is different
const AUDIO_DIR = "assets/screensavers/"; // adjust if yours is different

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Wait until the first frame is actually available.
// This is the #1 fix for "flash then disappear" / black frame peeks.
async function waitForFirstFrame(video, timeoutMs = 2500) {
  if (!video) return false;

  // If requestVideoFrameCallback exists, it's the cleanest signal
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

  // Fallback: loadeddata usually means the first frame is decoded
  if (video.readyState >= 2) return true;
  return waitForEvent(video, "loadeddata", timeoutMs);
}

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
      const t = Math.min(1, (now - start) / ms);
      audio.volume = from + (to - from) * t;
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

// UPDATED playStep (supports videoFile/audioFile OR videoSrc/audioSrc)
async function playStep({
  videoFile,
  audioFile,
  videoSrc,
  audioSrc,

  fadeInMs = 450,
  fadeOutMs = 450,

  // audioLeadMs: start audio before showing video (dramatic build)
  audioLeadMs = 0,

  // videoFadeInDelayMs: extra wait before fading video in
  videoFadeInDelayMs = 0,

  // seekToMs: skip black intro frames (per-video tuning)
  seekToMs = 0,

  // endHoldMs: hold a bit before fading out (lets moments breathe)
  endHoldMs = 0,

  // audioTarget: target volume after fade-in
  audioTarget = 0.85,
} = {}) {
  if (!ssVideo || !ssAudio) return;

  const vSrc = videoSrc || (VIDEO_DIR + videoFile);
  const aSrc = audioSrc || (AUDIO_DIR + audioFile);

  // Reset state
  ssVideo.pause();
  ssAudio.pause();

  ssVideo.style.opacity = "0";
  ssAudio.volume = 0;

  ssVideo.src = vSrc;
  ssVideo.load();

  ssAudio.src = aSrc;
  ssAudio.load();

  // Autoplay safety
  ssVideo.muted = true;
  ssVideo.playsInline = true;

  // Ensure media metadata is available (duration, seeking, etc.)
  await waitForEvent(ssVideo, "loadedmetadata", 2500);
  await waitForEvent(ssAudio, "canplay", 2500);

  // Seek past black/empty intro if requested
  if (seekToMs > 0 && isFinite(ssVideo.duration) && ssVideo.duration > 0) {
    try {
      ssVideo.currentTime = Math.min(ssVideo.duration - 0.05, seekToMs / 1000);
    } catch (_) {}
  }

  // Start playback (video first, muted)
  try {
    await ssVideo.play();
  } catch (e) {
    console.warn("Screensaver video failed to play:", e);
    return;
  }

  // Wait for first decoded frame before showing anything
  await waitForFirstFrame(ssVideo, 2500);

  // Optional: start audio early for drama
  try {
    ssAudio.currentTime = 0;
    await ssAudio.play();
  } catch (_) {
    // If audio is blocked, we still show video; user gesture usually prevents this anyway
  }

  if (audioLeadMs > 0) {
    await fadeAudio(ssAudio, 0, audioTarget, Math.min(650, fadeInMs));
    await sleep(audioLeadMs);
  }

  if (videoFadeInDelayMs > 0) {
    await sleep(videoFadeInDelayMs);
  }

  // Fade in video + audio (if not already faded)
  if (audioLeadMs > 0) {
    await fadeOpacity(ssVideo, 0, 1, fadeInMs);
  } else {
    await Promise.all([
      fadeOpacity(ssVideo, 0, 1, fadeInMs),
      fadeAudio(ssAudio, 0, audioTarget, fadeInMs),
    ]);
  }

  if (endHoldMs > 0) {
    await sleep(endHoldMs);
  }

  // Fade out near end of video (more accurate than guessing)
  const safetyMs = 250;
  const durationMs =
    isFinite(ssVideo.duration) && ssVideo.duration > 0
      ? ssVideo.duration * 1000
      : 8000;

  const fadeStartMs = Math.max(0, durationMs - fadeOutMs - safetyMs);
  await sleep(fadeStartMs);

  await Promise.all([
    fadeOpacity(ssVideo, 1, 0, fadeOutMs),
    fadeAudio(ssAudio, ssAudio.volume, 0, fadeOutMs),
  ]);

  ssVideo.pause();
  ssAudio.pause();
}
    // Build candidate paths if we were given file names
    const videoCandidates = videoSrc
      ? [videoSrc]
      : (videoFile ? SS_VIDEO_DIRS.map((d) => `${d}/${videoFile}`) : []);

    const audioCandidates = audioSrc
      ? [audioSrc]
      : (audioFile ? SS_AUDIO_DIRS.map((d) => `${d}/${audioFile}`) : []);

    // Pick working sources
    const chosenVideo = await pickWorkingSrc(ssVideo, videoCandidates);
    if (!chosenVideo) {
      console.warn("Screensaver: video not found. Tried:", videoCandidates);
      return;
    }

    const chosenAudio = await pickWorkingSrc(ssAudio, audioCandidates);
    if (!chosenAudio) {
      console.warn("Screensaver: audio not found. Tried:", audioCandidates);
      // We can still play video-only if audio is missing
      ssAudio.removeAttribute("src");
      ssAudio.load();
    }

    // Start video (muted)
    try {
      await ssVideo.play();
    } catch (e) {
      console.warn("Screensaver video failed to play:", e);
      return;
    }

    // Start audio (best effort)
    if (chosenAudio) {
      try {
        ssAudio.currentTime = 0;
        await ssAudio.play();
      } catch (_) {
        // autoplay policies may block audio; ignore
      }
    }

    // Fade in
    if (audioLeadMs > 0 && chosenAudio) {
      await fadeAudio(ssAudio, 0, 0.85, Math.min(600, fadeInMs));
      await new Promise((r) => setTimeout(r, audioLeadMs));
    }

    if (videoFadeInDelayMs > 0) {
      await new Promise((r) => setTimeout(r, videoFadeInDelayMs));
    }

    if (chosenAudio && audioLeadMs <= 0) {
      await Promise.all([
        fadeOpacity(ssVideo, 0, 1, fadeInMs),
        fadeAudio(ssAudio, 0, 0.85, fadeInMs),
      ]);
    } else {
      await fadeOpacity(ssVideo, 0, 1, fadeInMs);
    }

    // Wait near end of video, then fade out
    const safetyMs = 250;
    const durationMs =
      Number.isFinite(ssVideo.duration) && ssVideo.duration > 0
        ? ssVideo.duration * 1000
        : 8000;

    const waitMs = Math.max(0, durationMs - fadeOutMs - safetyMs);
    await new Promise((r) => setTimeout(r, waitMs));

    await Promise.all([
      fadeOpacity(ssVideo, 1, 0, fadeOutMs),
      chosenAudio ? fadeAudio(ssAudio, ssAudio.volume, 0, fadeOutMs) : Promise.resolve(),
    ]);

    ssVideo.pause();
    ssAudio.pause();
  }

async function runScreensaverSequence() {
  screensaverRunning = true;
  openModal();

  try {
    // Step 1 — clean, confident intro
    await playStep({
      videoFile: "Screensaver_1.mp4",
      audioFile: "Travel_through_space.mp3",
      fadeInMs: 550,
      fadeOutMs: 550,
      audioLeadMs: 0,
      videoFadeInDelayMs: 0,
      seekToMs: 0,
      endHoldMs: 150,
    });
    if (!screensaverRunning) return;

    // Step 2 — “jump” moment: tighter sync, skip black lead-in if present
    await playStep({
      videoFile: "Screensaver_2.mp4",
      audioFile: "Blender_Hyperspace_Jump.mp3",
      fadeInMs: 650,
      fadeOutMs: 650,
      audioLeadMs: 120,         // tiny lead makes the jump feel intentional
      videoFadeInDelayMs: 0,    // no need now that we wait for first frame
      seekToMs: 80,             // adjust 60–120 if you still see a black start
      endHoldMs: 120,
    });
    if (!screensaverRunning) return;

    // Step 3 — dreamy, slow reveal
    await playStep({
      videoFile: "Screensaver_3.mp4",
      audioFile: "Alien_Beach_Waves.mp3",
      fadeInMs: 6000,
      fadeOutMs: 750,
      audioLeadMs: 700,
      videoFadeInDelayMs: 0,
      seekToMs: 0,
      endHoldMs: 350,
    });
  } finally {
    closeModal();
    screensaverRunning = false;
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
  eggBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!screensaverRunning) runScreensaverSequence();
  });
}
})();
