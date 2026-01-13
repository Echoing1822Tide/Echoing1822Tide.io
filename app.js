/* Career Lifeline — Scrollytelling Engine (GSAP ScrollTrigger)
   - Mixed text bubbles + your Website PNGs
   - 5–7 visible at once
   - Smooth forward/back on scroll
   - Hidden corner opens videos modal
*/

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- CONFIG: update these filenames if you rename files ----------
  // Your “sentence images” (make sure these exist next to index.html)
  const IMAGE_BEATS = [
    "1_Website.png","2_Website.png","3_Website.png","4_Website.png","5_Website.png","6_Website.png",
    "7_Website.png","8_Website.png","9_Website.png","10_Website.png","11_Website.png","12_Website.png"
  ];

  // Screensaver videos (update names here)
  const VIDEOS = [
    "Screensaver-1.mp4",
    "Screensaver-4.mp4",
    "Screensaver-5.mp4",          // if you truly renamed it, you can remove this line
    "Alien-Beach-Waves.mp4"
  ];

  // ---------- CONTENT: “Career Lifeline” + your original beats ----------
  // Tip: keep these short. One “beat” should read in < 2 seconds.
  const TEXT_BEATS = [
    { kicker: "Career Lifeline", text: "2005 — Enlisted in the U.S. Air Force. Mission-first work ethic forged." },
    { kicker: "Career Lifeline", text: "2008–2009 — Iraq. Pressure-test environments. Real consequences." },
    { kicker: "Career Lifeline", text: "2011–2012 — Afghanistan convoys. Calm, disciplined decision-making." },
    { kicker: "Career Lifeline", text: "2021 — BA in Organizational Management. Systems thinking, sharpened." },
    { kicker: "Career Lifeline", text: "2025 — Selected for MSSA (1 of 15). Transition locked in." },
    { kicker: "Career Lifeline", text: "2026 — Cloud + Software engineering. Same standards. New tools." },

    { kicker: "Build Philosophy", text: "Mission-ready mindset. Built under pressure. Built to last." },
    { kicker: "Build Philosophy", text: "From the flightline to the cloud. Same discipline—new tools." },
    { kicker: "Build Philosophy", text: "Reliable software, not fragile demos." },

    { kicker: "Engineering", text: "C# / .NET is my home base. Strong fundamentals, modern patterns." },
    { kicker: "Engineering", text: "Azure-first thinking. Deploy, monitor, improve—repeat." },
    { kicker: "Engineering", text: "APIs that behave. Clear contracts, validation, predictable errors." },
    { kicker: "Engineering", text: "Automation-friendly workflows. Fewer “works on my machine” moments." },
    { kicker: "Engineering", text: "Small releases. Big momentum." },

    { kicker: "Human-Centered", text: "I design for humans. Clear flows. Less friction." },
    { kicker: "Human-Centered", text: "Clarity beats clever. Every time." },
    { kicker: "Human-Centered", text: "Accessibility isn’t optional. Contrast, structure, keyboard sanity." },
    { kicker: "Human-Centered", text: "Good experiences feel effortless. That’s the goal." },

    { kicker: "Security", text: "Security is the baseline. Validate inputs. Defend the edges." },
    { kicker: "Operations", text: "Calm under load. When things break, I debug—not panic." },
    { kicker: "Wrap", text: "Let’s build something dependable." }
  ];

  // Mix images in “sprinkled” style:
  // We’ll interleave: text, text, image, text, image, ...
  function buildBeatPlan() {
    const plan = [];
    const images = [...IMAGE_BEATS]; // we’ll attempt them; missing files just won’t show
    let iImg = 0;

    for (let i = 0; i < TEXT_BEATS.length; i++) {
      plan.push({ type: "text", ...TEXT_BEATS[i] });

      // sprinkle images every ~2 beats early, then every ~3
      const sprinkle = (i < 10) ? (i % 2 === 1) : (i % 3 === 2);
      if (sprinkle && iImg < images.length) {
        plan.push({ type: "img", src: images[iImg++], alt: images[iImg - 1] });
      }
    }

    // If you have leftover images, add them at the end
    while (iImg < images.length) {
      plan.push({ type: "img", src: images[iImg++], alt: images[iImg - 1] });
    }

    return plan;
  }

  // ---------- UI: Theme / Trail / Audio / Modal ----------
  const btnTheme = $("#btnTheme");
  const btnAudio = $("#btnAudio");
  const vol = $("#vol");
  const audio = $("#bgAudio");
  const secretCorner = $("#secretCorner");
  const mediaModal = $("#mediaModal");
  const btnCloseMedia = $("#btnCloseMedia");
  const mediaGrid = $("#mediaGrid");

  let theme = "corporate"; // corporate | retro
  let audioReady = false;

  function setTheme(next) {
    theme = next;
    document.body.classList.toggle("theme-corporate", theme === "corporate");
    document.body.classList.toggle("theme-retro", theme === "retro");
    btnTheme.setAttribute("aria-pressed", String(theme === "retro"));

    // Optional: swap background image per theme (safe if file missing)
    const bg = $("#bg");
    if (theme === "retro") {
      bg.style.backgroundImage =
        "radial-gradient(1200px 900px at 50% 15%, rgba(255,75,214,.10), transparent 65%)," +
        "radial-gradient(900px 800px at 15% 75%, rgba(90,120,255,.10), transparent 60%)," +
        "radial-gradient(900px 800px at 85% 75%, rgba(255,70,220,.08), transparent 60%)," +
        "url('./CADdets_Retro.png')";
    } else {
      bg.style.backgroundImage =
        "radial-gradient(1200px 900px at 50% 15%, rgba(50,255,255,.10), transparent 65%)," +
        "radial-gradient(900px 800px at 15% 75%, rgba(90,120,255,.10), transparent 60%)," +
        "radial-gradient(900px 800px at 85% 75%, rgba(255,70,220,.08), transparent 60%)," +
        "url('./Tech_Career.png')";
    }
  }

  function openMedia() {
    mediaModal.setAttribute("aria-hidden", "false");
  }
  function closeMedia() {
    mediaModal.setAttribute("aria-hidden", "true");
  }

  // Audio: attempt autoplay (may be blocked). If blocked, Play becomes “Enable audio”.
  async function tryAutoPlay() {
    if (!audio) return;
    audio.volume = parseFloat(vol.value || "0.65");
    try {
      await audio.play();
      audioReady = true;
      btnAudio.textContent = "Pause";
    } catch {
      audioReady = false;
      btnAudio.textContent = "Play";
      // Browser blocked autoplay — normal. We’ll start on first click/keypress.
    }
  }

  function toggleAudio() {
    if (!audio) return;
    audio.muted = false; // Unmute on user interaction
    if (audio.paused) {
      audio.volume = parseFloat(vol.value || "0.65");
      audio.play().then(() => {
        btnAudio.textContent = "Pause";
      }).catch(() => {
        btnAudio.textContent = "Play";
      });
    } else {
      audio.pause();
      btnAudio.textContent = "Play";
    }
  }

  // Build the videos grid (muted autoplay is allowed)
  function buildVideoGrid() {
    mediaGrid.innerHTML = "";
    VIDEOS.forEach((src) => {
      const wrap = document.createElement("div");
      const v = document.createElement("video");
      v.src = `./${src}`;
      v.muted = true;
      v.loop = true;
      v.autoplay = true;
      v.playsInline = true;
      v.preload = "metadata";
      v.controls = true;

      // If a video is missing or unsupported, hide it to avoid ugly tiles.
      v.addEventListener("error", () => {
        wrap.style.display = "none";
      });

      wrap.appendChild(v);
      mediaGrid.appendChild(wrap);
    });
  }

  // Buttons / shortcuts
  btnTheme.addEventListener("click", () => setTheme(theme === "corporate" ? "retro" : "corporate"));
  btnAudio.addEventListener("click", () => toggleAudio());
  vol.addEventListener("input", () => { if (audio) audio.volume = parseFloat(vol.value || "0.65"); });

  secretCorner.addEventListener("click", () => openMedia());
  btnCloseMedia.addEventListener("click", () => closeMedia());
  mediaModal.addEventListener("click", (e) => {
    if (e.target === mediaModal) closeMedia();
  });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "t") setTheme(theme === "corporate" ? "retro" : "corporate");
    if (k === "p") toggleAudio();
    if (k === "v") {
      const open = mediaModal.getAttribute("aria-hidden") === "false";
      open ? closeMedia() : openMedia();
    }
  });

  // ---------- SCROLLTELLING (GSAP) ----------
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function buildBeatsDOM(beatPlan) {
    const zone = $("#flyZone");
    zone.innerHTML = "";

    const els = [];

    beatPlan.forEach((b) => {
      const el = document.createElement("div");
      el.className = "beat";

      if (b.type === "img") {
        const img = document.createElement("img");
        img.src = `./${b.src}`;
        img.alt = b.alt || "";
        img.loading = "lazy";
        img.addEventListener("error", () => {
          // If an image doesn't exist, remove that beat silently
          el.remove();
        });
        el.appendChild(img);
      } else {
        const bubble = document.createElement("div");
        bubble.className = "bubble";

        const kicker = document.createElement("div");
        kicker.className = "kicker";
        kicker.textContent = b.kicker || "Career Lifeline";

        const text = document.createElement("div");
        text.className = "text";
        text.textContent = b.text;

        bubble.appendChild(kicker);
        bubble.appendChild(text);
        el.appendChild(bubble);
      }

      zone.appendChild(el);
      els.push(el);
    });

    return els;
  }

  function buildScroll(els) {
    if (!window.gsap || !window.ScrollTrigger) {
      console.error("GSAP/ScrollTrigger not loaded.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Kill old triggers on rebuild (resize)
    ScrollTrigger.getAll().forEach(t => t.kill());
    gsap.globalTimeline.clear();

    // Stage “space” based on number of beats
    const scrollSpace = $("#scrollSpace");
    const pxPerBeat = 260; // tune this to taste
    const total = Math.max(5200, els.length * pxPerBeat);
    scrollSpace.style.height = `${total}px`;

    // Spread relative to viewport (prevents “blown up” / off-screen chaos)
    const spreadX = Math.min(520, window.innerWidth * 0.34);
    const spreadY = Math.min(260, window.innerHeight * 0.22);

    // Core timeline
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: "#scrollyWrap",
        start: "top top",
        end: `+=${total}`,
        scrub: 1.05,
        pin: "#stage",
        anticipatePin: 1
      }
    });

    // We want 5–7 items visible at once:
    // Each beat lives ~2.8 units; start spacing ~0.45 units => ~6 overlapping
    const spacing = 0.45;

    els.forEach((el, i) => {
      // Random-ish but stable feel
      const x = rand(-spreadX, spreadX);
      const y = rand(-spreadY, spreadY);
      const rot = rand(-6, 6);

      // Slight size variance so not all “same size at same time”
      const baseScale = rand(0.75, 1.02);

      const t0 = i * spacing;

      // Start far away (small + faint)
      tl.set(el, {
        xPercent: -50,
        yPercent: -50,
        x, y,
        rotationZ: rot,
        z: -1200,
        scale: baseScale * 0.55,
        opacity: 0
      }, t0);

      // Move toward user (fade in)
      tl.to(el, {
        opacity: 1,
        z: -220,
        scale: baseScale * 0.95,
        duration: 1.05
      }, t0);

      // “In front” moment (largest)
      tl.to(el, {
        z: 120,
        scale: baseScale * 1.08,
        duration: 0.85
      }, t0 + 1.05);

      // Fly past user and fade out
      tl.to(el, {
        opacity: 0,
        z: 520,
        scale: baseScale * 1.15,
        duration: 0.95
      }, t0 + 1.9);
    });

    // Make the hero fade into scrolly
    gsap.to("#hero", {
      opacity: 0,
      scrollTrigger: {
        trigger: "#scrollyWrap",
        start: "top bottom",
        end: "top top",
        scrub: true
      }
    });
  }

  // ---------- INIT ----------
  function init() {
    // Set initial UI
    setTheme(theme);
    buildVideoGrid();

    // Attempt autoplay (may be blocked)
    tryAutoPlay();

    // Build scrolly
    const plan = buildBeatPlan();
    const els = buildBeatsDOM(plan);

    // Give images a moment to resolve layout, then build scroll
    setTimeout(() => buildScroll(els), 50);

    // Rebuild on resize (keeps spacing sane)
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const plan2 = buildBeatPlan();
        const els2 = buildBeatsDOM(plan2);
        buildScroll(els2);
      }, 200);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
