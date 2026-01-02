/* global gsap, ScrollTrigger */

(function () {
  // --- Safety check
  if (!window.gsap || !window.ScrollTrigger) {
    console.warn("GSAP / ScrollTrigger not loaded.");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // --- Elements
  const bubblesRoot = document.getElementById("bubbles");
  const spacer = document.getElementById("spacer");
  const stage = document.querySelector(".stage");

  const bgLayers = [
    document.getElementById("bg1"),
    document.getElementById("bg2"),
    document.getElementById("bg3"),
    document.getElementById("bg4"),
  ];

  const themeToggle = document.getElementById("themeToggle");
  const trailToggle = document.getElementById("trailToggle");

  const bgm = document.getElementById("bgm");
  const vol = document.getElementById("vol");
  const playBtn = document.getElementById("playBtn");
  const soundHint = document.getElementById("soundHint");

  const vaultHotspot = document.getElementById("vaultHotspot");
  const vaultModal = document.getElementById("vaultModal");
  const vaultClose = document.getElementById("vaultClose");

  // --- Your “beats” (mix images + text)
  // NOTE: Add/remove items here. Images must exist in repo root.
  const beats = [
    // Image replacements you created:
    { type: "image", src: "./1_Website.png" },
    { type: "image", src: "./2_Website.png" },
    { type: "image", src: "./3_Website.png" },
    { type: "image", src: "./4_Website.png" },
    { type: "image", src: "./5_Website.png" },
    { type: "image", src: "./6_Website.png" },
    { type: "image", src: "./7_Website.png" },
    { type: "image", src: "./8_Website.png" },
    { type: "image", src: "./9_Website.png" },
    { type: "image", src: "./10_Website.png" },

    // Sprinkle in “Career Lifeline” truth-bombs (resume-based)
    { type: "text", title: "20 years U.S. Air Force.", sub: "Mission systems. High-stakes ops. Calm execution." },
    { type: "text", title: "Led teams across 55+ locations.", sub: "Training, safety, inspections, and operational control." },
    { type: "text", title: "$258M in assets. $4.6M in projects.", sub: "Accountability, planning, delivery." },
    { type: "text", title: "Designed a Job Safety Program.", sub: "Built for 2,500 people. Real-world risk reduction." },
    { type: "text", title: "BA — Organizational Management (Summa Cum Laude).", sub: "Plus AAS in Mechanical/Electrical Technology." },

    // More cinematic lines (keep these as text bubbles)
    { type: "text", title: "Build it clean.", sub: "Keep it maintainable." },
    { type: "text", title: "Cloud-minded by default.", sub: "Logs, monitoring, failure modes." },
    { type: "text", title: "APIs that behave.", sub: "Clear contracts, validation, predictable errors." },
    { type: "text", title: "Bugs are just clues.", sub: "Trace. Isolate. Fix. Prevent." },
    { type: "text", title: "Human-centered systems.", sub: "Built for real people." },
    { type: "text", title: "Clarity beats clever.", sub: "Every time." },
    { type: "text", title: "Accessibility isn’t optional.", sub: "Contrast. Structure. Keyboard sanity." },

    { type: "text", title: "Let’s build something dependable.", sub: "Real apps. Real commits. Real lessons." },

    // If you add 11/12 later, they’ll render automatically if files exist:
    { type: "image", src: "./11_Website.png" },
    { type: "image", src: "./12_Website.png" },
  ];

  // --- Utility
  const vw = (n) => (window.innerWidth * n) / 100;
  const vh = (n) => (window.innerHeight * n) / 100;

  // Lane positions around center (Luma-ish scatter)
  // x/y are offsets from center in px (computed via vw/vh each time)
  const lanes = [
    () => ({ x: 0,         y: 0,         s: 1.12 }),
    () => ({ x: -vw(28),   y: -vh(12),   s: 0.92 }),
    () => ({ x: vw(28),    y: -vh(10),   s: 0.92 }),
    () => ({ x: -vw(34),   y: vh(16),    s: 0.88 }),
    () => ({ x: vw(34),    y: vh(16),    s: 0.88 }),
    () => ({ x: -vw(8),    y: -vh(26),   s: 0.82 }),
    () => ({ x: vw(10),    y: -vh(26),   s: 0.82 }),
    () => ({ x: -vw(12),   y: vh(28),    s: 0.82 }),
    () => ({ x: vw(12),    y: vh(28),    s: 0.82 }),
  ];

  // --- Preload images so they don't “pop” mid-scroll
  function preload() {
    const srcs = new Set([
      "./AirForce_Emblem.png",
      "./CADdets_Retro.png",
      "./CADdets_1.png",
      "./Tech_Career.png",
      ...beats.filter(b => b.type === "image").map(b => b.src),
    ]);

    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }

  // --- Render bubbles
  function createBubble(beat) {
    const el = document.createElement("div");
    el.className = "bubble " + (beat.type === "image" ? "image" : "text");

    if (beat.type === "image") {
      const img = document.createElement("img");
      img.loading = "eager";
      img.decoding = "async";
      img.src = beat.src;
      img.alt = "";
      el.appendChild(img);
    } else {
      const t = document.createElement("div");
      t.className = "bubbleTitle";
      t.textContent = beat.title;

      const s = document.createElement("div");
      s.className = "bubbleSub";
      s.textContent = beat.sub || "";

      el.appendChild(t);
      el.appendChild(s);
    }

    bubblesRoot.appendChild(el);
    return el;
  }

  // --- Background crossfade timeline (1→2→3→4 then hold)
  function makeBgTimeline() {
    // Start with first bg visible
    gsap.set(bgLayers, { autoAlpha: 0 });
    gsap.set(bgLayers[0], { autoAlpha: 1 });

    const tl = gsap.timeline({ defaults: { ease: "none" } });

    // Each crossfade takes 1 unit
    tl.to(bgLayers[0], { autoAlpha: 0 }, 1);
    tl.to(bgLayers[1], { autoAlpha: 1 }, 1);

    tl.to(bgLayers[1], { autoAlpha: 0 }, 2);
    tl.to(bgLayers[2], { autoAlpha: 1 }, 2);

    tl.to(bgLayers[2], { autoAlpha: 0 }, 3);
    tl.to(bgLayers[3], { autoAlpha: 1 }, 3);

    // Hold last
    tl.to({}, { duration: 1 }, 4);

    return tl;
  }

  // --- Luma-style overlapping bubble animation
  function makeBubblesTimeline(bubbleEls) {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // These two numbers are the whole “5–7 bubbles visible” trick:
    const spacing = 0.55;   // new beat starts every 0.55 units
    const lifetime = 3.3;   // each beat stays alive ~3.3 units
    // visible count ≈ lifetime/spacing => 3.3/0.55 = 6 bubbles on average ✅

    bubbleEls.forEach((el, i) => {
      const lane = lanes[i % lanes.length]();

      // small drift so they “flow past”
      const driftX = (Math.random() - 0.5) * vw(14);
      const driftY = (Math.random() - 0.5) * vh(10);

      const t0 = i * spacing;

      // start slightly smaller + offset, fade in
      gsap.set(el, {
        x: lane.x + driftX * 0.35,
        y: lane.y + driftY * 0.35,
        scale: lane.s * 0.88,
        autoAlpha: 0,
      });

      // fade in & sharpen
      tl.to(el, {
        autoAlpha: 1,
        scale: lane.s,
        duration: 0.35,
      }, t0);

      // glide across its lane while alive
      tl.to(el, {
        x: lane.x + driftX,
        y: lane.y + driftY,
        duration: lifetime,
        ease: "none"
      }, t0);

      // fade out near the end (so reverse scroll looks good too)
      tl.to(el, {
        autoAlpha: 0,
        scale: lane.s * 0.92,
        duration: 0.35,
        ease: "power2.in"
      }, t0 + lifetime - 0.35);
    });

    // total duration needed
    const total = (bubbleEls.length - 1) * 0.55 + 3.3;
    tl.to({}, { duration: 0.01 }, total);

    return tl;
  }

  // --- ScrollTrigger wiring
  function setupScroll(bgTl, bubbleTl) {
    // Make page scroll length proportional to beats
    // (Big enough to feel cinematic, not tiny-janky)
    const vhPerBeat = 55; // adjust if you want longer/shorter
    spacer.style.height = `${Math.max(800, beats.length * vhPerBeat)}vh`;

    // Master timeline, driven by scroll progress
    const master = gsap.timeline();
    master.add(bgTl, 0);
    master.add(bubbleTl, 0);

    ScrollTrigger.create({
      trigger: "#scrollArea",
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      pin: ".stage",
      anticipatePin: 1,
      animation: master,
    });
  }

  // --- Audio (real autoplay is blocked; we “arm” it on first interaction)
  let audioArmed = false;

  function tryStartAudio() {
    if (audioArmed) return;

    audioArmed = true;
    soundHint.hidden = true;

    bgm.volume = parseFloat(vol.value || "0.25");

    const p = bgm.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // If still blocked, un-arm so the next gesture can try again
        audioArmed = false;
        soundHint.hidden = false;
      });
    }
  }

  function setupAudio() {
    vol.addEventListener("input", () => {
      bgm.volume = parseFloat(vol.value || "0.25");
    });

    playBtn.addEventListener("click", async () => {
      tryStartAudio();
      // if already playing, toggle pause/play
      if (!bgm.paused) {
        bgm.pause();
        playBtn.textContent = "Play";
      } else {
        await bgm.play().catch(() => {});
        playBtn.textContent = "Pause";
      }
    });

    // Show hint until first successful start
    soundHint.hidden = false;

    // First user gesture triggers audio (click/tap/keydown)
    const armEvents = ["pointerdown", "keydown", "touchstart"];
    armEvents.forEach((ev) => window.addEventListener(ev, tryStartAudio, { once: true, passive: true }));
  }

  // --- Theme toggle
  function setupTheme() {
    themeToggle.addEventListener("click", () => {
      const on = document.body.classList.toggle("alt");
      themeToggle.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // --- Mouse trail
  let trailOn = false;
  const trail = document.getElementById("trail");
  const dots = [];
  function setupTrail() {
    // build dots
    for (let i = 0; i < 18; i++) {
      const d = document.createElement("div");
      d.className = "trDot";
      trail.appendChild(d);
      dots.push({ el: d, x: 0, y: 0, a: 0 });
    }

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;

    window.addEventListener("pointermove", (e) => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    gsap.ticker.add(() => {
      if (!trailOn) return;

      let x = mx, y = my;
      dots.forEach((d, i) => {
        d.x += (x - d.x) * (0.18 - i * 0.006);
        d.y += (y - d.y) * (0.18 - i * 0.006);
        x = d.x; y = d.y;

        d.a = Math.max(0, 1 - i / dots.length);
        d.el.style.transform = `translate(${d.x}px, ${d.y}px)`;
        d.el.style.opacity = String(d.a);
      });
    });

    trailToggle.addEventListener("click", () => {
      trailOn = !trailOn;
      trailToggle.setAttribute("aria-pressed", trailOn ? "true" : "false");
      if (!trailOn) dots.forEach(d => (d.el.style.opacity = "0"));
    });
  }

  // --- Vault modal
  function setVault(open) {
    vaultModal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      // Try to play previews (muted is allowed)
      vaultModal.querySelectorAll("video").forEach(v => {
        v.play().catch(() => {});
      });
    }
  }
  function setupVault() {
    vaultHotspot.addEventListener("click", () => setVault(true));
    vaultClose.addEventListener("click", () => setVault(false));
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "v") {
        const isOpen = vaultModal.getAttribute("aria-hidden") === "false";
        setVault(!isOpen);
      }
      if (e.key === "Escape") setVault(false);
    });
    vaultModal.addEventListener("click", (e) => {
      if (e.target === vaultModal) setVault(false);
    });
  }

  // --- Init
  function init() {
    preload();

    // Create bubbles
    bubblesRoot.innerHTML = "";
    const bubbleEls = beats.map(createBubble);

    // Timelines
    const bgTl = makeBgTimeline();
    const bubbleTl = makeBubblesTimeline(bubbleEls);

    // ScrollTrigger wiring
    setupScroll(bgTl, bubbleTl);

    // UI
    setupAudio();
    setupTheme();
    setupTrail();
    setupVault();

    // Refresh on resize to keep lanes correct
    let rAF = null;
    window.addEventListener("resize", () => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }

  init();
})();
