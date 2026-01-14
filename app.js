(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const els = {
    toast: $("#toast"),
    btnTheme: $("#btnTheme"),
    btnAutoScroll: $("#btnAutoScroll"),
    btnMusic: $("#btnMusic"),
    btnTrack: $("#btnTrack"),
    volRange: $("#volRange"),
    btnScreensavers: $("#btnScreensavers"),
    btnClosePicker: $("#btnClosePicker"),
    picker: $("#picker"),
    bgVideo: $("#bgVideo"),
    bgAudio: $("#bgAudio"),
    snapshotGrid: $("#snapshotGrid"),
    lightbox: $("#lightbox"),
    btnCloseLightbox: $("#btnCloseLightbox"),
    lightboxImg: $("#lightboxImg"),
    lightboxTitle: $("#lightboxTitle"),
    btnTop: $("#btnTop"),
    navLinks: $$(".nav-link"),
  };

  const state = {
    theme: localStorage.getItem("theme") || "night",
    autoscroll: (localStorage.getItem("autoscroll") || "on") === "on",
    music: (localStorage.getItem("music") || "on"),
    volume: clamp(parseFloat(localStorage.getItem("volume") || "0.20"), 0, 1),
    trackIndex: clampInt(parseInt(localStorage.getItem("trackIndex") || "0", 10), 0, 3),
    autoScrollRunning: false,
  };

  // --- Music playlist (your files) ---
  const tracks = [
    { title: "I Am Me", src: "assets/audio/I_am_me.mp3" },
    { title: "Alien Beach Waves", src: "assets/audio/Alien-Beach-Waves.mp3" },
    { title: "Travel Through Space", src: "assets/audio/Travel-through-space.mp3" },
    { title: "Blender Hyperspace Jump", src: "assets/audio/Blender-Hyperspace-Jump.mp3" },
  ];

  init();

  function init() {
    document.body.dataset.theme = state.theme;

    // UI wiring
    els.btnTheme.addEventListener("click", toggleTheme);
    els.btnAutoScroll.addEventListener("click", toggleAutoScroll);
    els.btnMusic.addEventListener("click", toggleMusic);
    els.btnTrack.addEventListener("click", nextTrack);

    els.volRange.value = String(state.volume);
    els.volRange.addEventListener("input", onVolumeChange);

    els.btnScreensavers.addEventListener("click", openPicker);
    els.btnClosePicker.addEventListener("click", closePicker);
    els.picker.addEventListener("click", (e) => {
      if (e.target === els.picker) closePicker();
    });

    $$(".picker-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-video");
        if (src) setBackgroundVideo(src);
        closePicker();
        toast(`Screensaver set: ${src.split("/").pop()}`);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "v") {
        const isOpen = els.picker.getAttribute("aria-hidden") === "false";
        isOpen ? closePicker() : openPicker();
      }
    });

    // Back to top
    els.btnTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // Active nav highlighting
    initNavSpy();

    // Build snapshots grid (1..12)
    buildSnapshots();

    // Lightbox close
    els.btnCloseLightbox.addEventListener("click", closeLightbox);
    els.lightbox.addEventListener("click", (e) => {
      if (e.target === els.lightbox) closeLightbox();
    });

    // Music init
    setTrack(state.trackIndex, { autoplayTry: false });
    applyVolume(state.volume);

    // Attempt autoplay ON load (may be blocked)
    if (state.music !== "off") {
      attemptAutoplayAudio();
    } else {
      updateMusicUI(false);
    }

    // Auto scroll starts automatically (unless reduced motion)
    if (state.autoscroll && !prefersReducedMotion) startAutoScroll();
    updateAutoScrollUI();

    // Stop auto-scroll on deliberate user interaction (don’t fight the user)
    ["wheel", "touchstart", "keydown"].forEach(evt => {
      window.addEventListener(evt, () => {
        if (state.autoScrollRunning) stopAutoScroll(false);
      }, { passive: true });
    });

    // Make sure controls reflect saved state
    updateTrackUI();
  }

  // ----------------------------
  // Theme
  // ----------------------------
  function toggleTheme() {
    state.theme = (state.theme === "night") ? "day" : "night";
    document.body.dataset.theme = state.theme;
    localStorage.setItem("theme", state.theme);
    toast(`Theme: ${state.theme}`);
  }

  // ----------------------------
  // Auto Scroll
  // ----------------------------
  let rafId = 0;
  let lastT = 0;

  function toggleAutoScroll() {
    state.autoscroll = !state.autoscroll;
    localStorage.setItem("autoscroll", state.autoscroll ? "on" : "off");

    if (state.autoscroll && !prefersReducedMotion) {
      startAutoScroll();
      toast("Auto-scroll enabled");
    } else {
      stopAutoScroll(true);
      toast(prefersReducedMotion ? "Auto-scroll disabled (reduced motion)" : "Auto-scroll disabled");
    }
    updateAutoScrollUI();
  }

  function startAutoScroll() {
    if (prefersReducedMotion) return;
    if (state.autoScrollRunning) return;

    state.autoScrollRunning = true;
    lastT = performance.now();

    const pxPerSec = 28; // steady pace

    const step = (t) => {
      if (!state.autoScrollRunning) return;

      const dt = (t - lastT) / 1000;
      lastT = t;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxScroll - 2) {
        stopAutoScroll(false);
        updateAutoScrollUI();
        return;
      }

      window.scrollBy(0, pxPerSec * dt);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    updateAutoScrollUI();
  }

  function stopAutoScroll(updateStorage) {
    state.autoScrollRunning = false;
    cancelAnimationFrame(rafId);

    // If the user interrupts it, we keep the toggle ON, but it’s paused.
    // If they toggle it OFF, we store it OFF.
    if (updateStorage) {
      state.autoscroll = false;
      localStorage.setItem("autoscroll", "off");
    }
  }

  function updateAutoScrollUI() {
    const on = state.autoscroll && state.autoScrollRunning;
    els.btnAutoScroll.setAttribute("aria-pressed", String(!!on));
    els.btnAutoScroll.textContent = `Auto Scroll: ${on ? "ON" : "OFF"}`;

    // If autoscroll is toggled ON but paused due to user input:
    if (state.autoscroll && !state.autoScrollRunning && !prefersReducedMotion) {
      els.btnAutoScroll.textContent = "Auto Scroll: PAUSED";
    }
  }

  // ----------------------------
  // Music
  // ----------------------------
  function onVolumeChange() {
    const v = clamp(parseFloat(els.volRange.value), 0, 1);
    state.volume = v;
    localStorage.setItem("volume", String(v));
    applyVolume(v);
  }

  function applyVolume(v) {
    els.bgAudio.volume = clamp(v, 0, 1);
  }

  function toggleMusic() {
    const audio = els.bgAudio;

    if (state.music === "off") {
      state.music = "on";
      localStorage.setItem("music", "on");
      attemptAutoplayAudio(true);
      return;
    }

    // If playing, pause
    if (!audio.paused) {
      audio.pause();
      state.music = "off";
      localStorage.setItem("music", "off");
      updateMusicUI(false);
      toast("Music: OFF");
      return;
    }

    // If paused, try play
    state.music = "on";
    localStorage.setItem("music", "on");
    attemptAutoplayAudio(true);
  }

  function attemptAutoplayAudio(userInitiated = false) {
    const audio = els.bgAudio;

    applyVolume(state.volume);

    // Attempt play. Browsers may block autoplay; if blocked we show a toast.
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        updateMusicUI(true);
        toast(`Music: ON (${tracks[state.trackIndex].title})`);
      }).catch(() => {
        updateMusicUI(false);

        // Explain once, cleanly.
        // Autoplay restrictions are browser policy; user can click Music once to enable.
        if (!userInitiated) {
          toast("Audio autoplay was blocked by your browser. Click “Music: ON” once to enable sound.");
        } else {
          toast("Audio blocked. Try clicking Music again (browser policy).");
        }
      });
    } else {
      // Older browsers (rare)
      updateMusicUI(!audio.paused);
    }
  }

  function updateMusicUI(isOn) {
    els.btnMusic.setAttribute("aria-pressed", String(!!isOn));
    els.btnMusic.textContent = `Music: ${isOn ? "ON" : "OFF"}`;
  }

  function nextTrack() {
    const next = (state.trackIndex + 1) % tracks.length;
    setTrack(next, { autoplayTry: true });
  }

  function setTrack(index, { autoplayTry } = { autoplayTry: true }) {
    state.trackIndex = clampInt(index, 0, tracks.length - 1);
    localStorage.setItem("trackIndex", String(state.trackIndex));

    const t = tracks[state.trackIndex];
    els.bgAudio.src = t.src;

    updateTrackUI();

    if (autoplayTry && state.music !== "off") {
      attemptAutoplayAudio(true);
    }
  }

  function updateTrackUI() {
    els.btnTrack.textContent = `Track: ${state.trackIndex + 1}/${tracks.length}`;
  }

  // ----------------------------
  // Screensavers
  // ----------------------------
  function openPicker() {
    els.picker.setAttribute("aria-hidden", "false");
  }
  function closePicker() {
    els.picker.setAttribute("aria-hidden", "true");
  }
  function setBackgroundVideo(src) {
    // swap source cleanly
    const v = els.bgVideo;
    v.pause();
    v.innerHTML = "";

    const s = document.createElement("source");
    s.src = src;
    s.type = "video/mp4";
    v.appendChild(s);

    v.load();
    // muted autoplay should work reliably
    v.muted = true;
    v.play().catch(() => { /* ignore */ });
  }

  // ----------------------------
  // Snapshots grid (beats 1..12)
  // ----------------------------
  function buildSnapshots() {
    const grid = els.snapshotGrid;
    if (!grid) return;

    const frag = document.createDocumentFragment();

    for (let i = 1; i <= 12; i++) {
      const src = `assets/beats/${i}_Website.png`;

      const card = document.createElement("div");
      card.className = "snapshot";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Open snapshot ${i}`);

      const img = document.createElement("img");
      img.src = src;
      img.alt = `Website snapshot ${i}`;
      img.loading = "lazy"; // performance win
      img.addEventListener("error", () => {
        // If a file is missing, hide the tile (prevents “broken image” clutter)
        card.style.display = "none";
      });

      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = `Snapshot ${i}`;

      card.appendChild(img);
      card.appendChild(cap);

      card.addEventListener("click", () => openLightbox(i, src));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(i, src);
        }
      });

      frag.appendChild(card);
    }

    grid.appendChild(frag);
  }

  function openLightbox(i, src) {
    els.lightboxTitle.textContent = `Snapshot ${i}`;
    els.lightboxImg.src = src;
    els.lightboxImg.alt = `Website snapshot ${i}`;
    els.lightbox.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    els.lightbox.setAttribute("aria-hidden", "true");
    els.lightboxImg.src = "";
    els.lightboxImg.alt = "";
  }

  // ----------------------------
  // Nav Spy
  // ----------------------------
  function initNavSpy() {
    const sections = ["about","projects","experience","education","contact"]
      .map(id => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return;

    const io = new IntersectionObserver((entries) => {
      // choose the most visible section
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (!best) return;

      const id = best.target.id;
      els.navLinks.forEach(a => {
        const match = (a.getAttribute("href") === `#${id}`);
        if (match) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }, { threshold: [0.25, 0.4, 0.55, 0.7] });

    sections.forEach(s => io.observe(s));
  }

  // ----------------------------
  // Toast
  // ----------------------------
  let toastTimer = 0;
  function toast(msg) {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.style.display = "block";
    toastTimer = window.setTimeout(() => {
      els.toast.style.display = "none";
      els.toast.textContent = "";
    }, 4200);
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  function clamp(n, a, b) {
    if (Number.isNaN(n)) return a;
    return Math.max(a, Math.min(b, n));
  }
  function clampInt(n, a, b) {
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n | 0));
  }
})();
