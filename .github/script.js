(() => {
  // ----------------------------
  // CONFIG — background sequence
  // ----------------------------
  const BACKGROUND_IMAGES = [
    "./AirForce_Emblem.png",
    "./CADdets_Retro.png",
    "./CADdets_1.png",
    "./Tech_Career.png"
  ];

  // Each image stays on screen this long before switching.
  const HOLD_MS = 1600;

  // Crossfade duration matches CSS transition (~900ms)
  const FADE_MS = 900;

  // White flash between images (like your “fade to white” request)
  const FLASH_MS = 180;

  // ----------------------------
  // ELEMENTS
  // ----------------------------
  const bgA = document.getElementById("bgA");
  const bgB = document.getElementById("bgB");
  const bgFlash = document.getElementById("bgFlash");

  const themeBtn = document.getElementById("themeBtn");
  const trailBtn = document.getElementById("trailBtn");
  const trail = document.getElementById("trail");

  const audio = document.getElementById("bgAudio");
  const playBtn = document.getElementById("playBtn");
  const volRange = document.getElementById("volRange");

  const card = document.getElementById("card");
  const steps = Array.from(document.querySelectorAll(".step"));

  // ----------------------------
  // HELPERS
  // ----------------------------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function setBg(el, url){
    el.style.backgroundImage = `url("${url}")`;
  }

  async function preloadImages(urls){
    await Promise.all(urls.map(url => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    })));
  }

  async function flashWhite(){
    bgFlash.style.opacity = "0.90";
    await sleep(FLASH_MS);
    bgFlash.style.opacity = "0";
  }

  // ----------------------------
  // BACKGROUND SEQUENCE
  // ----------------------------
  async function runBackgroundSequence(){
    await preloadImages(BACKGROUND_IMAGES);

    // Initialize
    setBg(bgA, BACKGROUND_IMAGES[0]);
    bgA.style.opacity = "1";
    setBg(bgB, BACKGROUND_IMAGES[0]);
    bgB.style.opacity = "0";

    let showingA = true;

    for (let i = 1; i < BACKGROUND_IMAGES.length; i++){
      await sleep(HOLD_MS);
      await flashWhite();

      const nextUrl = BACKGROUND_IMAGES[i];
      const incoming = showingA ? bgB : bgA;
      const outgoing = showingA ? bgA : bgB;

      setBg(incoming, nextUrl);
      incoming.style.opacity = "1";
      outgoing.style.opacity = "0";

      await sleep(FADE_MS);
      showingA = !showingA;
    }

    // Hold last image forever (no more switching)
  }

  // ----------------------------
  // AUDIO CONTROLS
  // ----------------------------
  function setVolume(v){
    const vol = Math.max(0, Math.min(1, Number(v)));
    audio.volume = vol;
    volRange.value = String(vol);
  }

  async function togglePlay(){
    try{
      if (audio.paused){
        await audio.play();              // requires user gesture (button click)
        playBtn.textContent = "Pause";
      } else {
        audio.pause();
        playBtn.textContent = "Play";
      }
    } catch (e){
      // If the browser blocks it, we still keep the UI sane.
      playBtn.textContent = "Play";
      console.warn("Audio play blocked:", e);
    }
  }

  // ----------------------------
  // THEME + TRAIL
  // ----------------------------
  function toggleTheme(){
    const body = document.body;
    const now = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    body.setAttribute("data-theme", now);
    themeBtn.setAttribute("aria-pressed", now === "light" ? "true" : "false");
  }

  function toggleTrail(){
    const on = document.body.classList.toggle("trail-on");
    trailBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  let trailOn = false;
  window.addEventListener("pointermove", (e) => {
    if (!document.body.classList.contains("trail-on")) return;
    trail.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 8}px, 0)`;
  });

  // ----------------------------
  // SCROLLYTELLING (Luma-style)
  // ----------------------------
  let activeIndex = 0;

  function renderStep(i){
    const step = steps[i];
    const tpl = step.querySelector("template");
    if (!tpl) return;

    // Replace the card content
    card.innerHTML = "";
    card.appendChild(tpl.content.cloneNode(true));

    // Position presets (spread out)
    const pos = step.dataset.pos || "center";
    const map = {
      left:     { x: -140, y: -40 },
      right:    { x:  140, y: -20 },
      center:   { x:    0, y: -30 },
      leftFar:  { x: -180, y:  40 },
      rightFar: { x:  180, y:  60 }
    };
    const p = map[pos] || map.center;

    card.style.setProperty("--x", `${p.x}px`);
    card.style.setProperty("--y", `${p.y}px`);
  }

  function setActive(i){
    activeIndex = Math.max(0, Math.min(steps.length - 1, i));
    renderStep(activeIndex);
  }

  // Smooth “expand/shrink” while scrolling through the active step
  function clamp01(n){ return Math.max(0, Math.min(1, n)); }
  function easeInOut(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

  function tick(){
    const step = steps[activeIndex];
    if (step){
      const r = step.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // progress ~0 when step top hits bottom of viewport, ~1 when step bottom hits top
      const raw = 1 - (r.bottom / (vh + r.height));
      const p = clamp01(raw);
      const e = easeInOut(p);

      const scale = 0.94 + (0.06 * e);
      const op = 0.82 + (0.18 * e);

      card.style.setProperty("--s", scale.toFixed(3));
      card.style.setProperty("--o", op.toFixed(3));
    }
    requestAnimationFrame(tick);
  }

  function setupIntersection(){
    const io = new IntersectionObserver((entries) => {
      // pick the most-visible intersecting step
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length){
        const idx = steps.indexOf(visible[0].target);
        if (idx !== -1 && idx !== activeIndex) setActive(idx);
      }
    }, {
      threshold: [0.25, 0.5, 0.75]
    });

    steps.forEach(s => io.observe(s));
  }

  // ----------------------------
  // INIT
  // ----------------------------
  function init(){
    // Background
    runBackgroundSequence();

    // Audio defaults
    setVolume(volRange.value);

    // Buttons
    playBtn.addEventListener("click", togglePlay);
    volRange.addEventListener("input", (e) => setVolume(e.target.value));
    themeBtn.addEventListener("click", toggleTheme);
    trailBtn.addEventListener("click", toggleTrail);

    // Scrollytelling
    setActive(0);
    setupIntersection();
    requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
