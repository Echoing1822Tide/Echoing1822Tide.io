"use strict";

/* ---------- Utilities ---------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const clamp01 = (v) => clamp(v, 0, 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- Content (your beats) ---------- */
const HEADLINE = "RELIABLE SOFTWARE.\nHUMAN-FIRST DESIGN";
const SUBLINE = "Cloud • Software • Human-Centered Designs";

const beats = [
  "Mission-ready mindset. Built under pressure. Built to last.",
  "From the flightline to the cloud. Same discipline—new tools.",
  "Reliable software, not fragile demos.",
  "C# / .NET is my home base. Strong fundamentals, modern patterns.",
  "Azure-first thinking. Deploy, monitor, improve—repeat.",
  "I design for humans. Clear flows. Less friction.",
  "Security is the baseline. Validate inputs. Defend the edges.",
  "I turn chaos into structure. Systems, checklists, and clean execution.",
  "Calm under load. When things break, I debug—not panic.",
  "Small releases. Big momentum.",
  "Projects that prove it. Real apps, real commits, real lessons.",
  "Let’s build something dependable.",

  "Build it clean. Keep it maintainable.",
  "C# / .NET developer. OOP, SOLID habits, readable code.",
  "Cloud-minded by default. Logs, monitoring, failure modes.",
  "APIs that behave. Clear contracts, validation, predictable errors.",
  "Data that makes sense. Practical modeling, clean JSON, sane persistence.",
  "Performance with purpose. Fast enough—and understandable.",
  "Security baked in. Inputs guarded. Outputs encoded.",
  "Automation-friendly workflows. Fewer “works on my machine” moments.",
  "I ship in increments. Iterate without breaking everything.",
  "Bugs are just clues. Trace, isolate, fix, prevent.",
  "Operational discipline. Uptime thinking, not just feature thinking.",
  "Give me a problem worth owning.",

  "Human-centered systems. Built for real people.",
  "Clarity beats clever. Every time.",
  "Design that reduces stress. Especially under pressure.",
  "Information that flows. The user always knows where they are.",
  "Friction is the enemy. Remove it.",
  "Accessibility isn’t optional. Contrast, structure, keyboard sanity.",
  "Proof over opinions. Test, learn, iterate.",
  "Strong defaults. Simple paths. Fewer wrong turns.",
  "Design + engineering together. One product brain.",
  "Make the next step obvious.",
  "Build trust through consistency.",
  "Good experiences feel effortless. That’s the goal."
];

/* ---------- Background sequence ---------- */
const bgImages = [
  "./AirForce_Emblem.png",
  "./CADdets_Retro.png",
  "./CADdets_1.png",
  "./Tech_Career.png"
];

/* Screensaver videos (optional) */
const screensaverVideos = [
  "./Screensaver-1.mp4",
  "./Screensaver-4.mp4",
  "./Screensaver-5.mp4",
  "./Alien-Beach-Waves.mp4"
];

/* ---------- DOM ---------- */
const hero = document.getElementById("hero");
const bubbleLayer = document.getElementById("bubbleLayer");
const scrollSpacer = document.getElementById("scrollSpacer");

const bgA = document.getElementById("bgA");
const bgB = document.getElementById("bgB");
const bgVideoWrap = document.getElementById("bgVideoWrap");
const bgVideo = document.getElementById("bgVideo");

const themeBtn = document.getElementById("themeBtn");
const trailBtn = document.getElementById("trailBtn");
const secretToggle = document.getElementById("secretToggle");

const audio = document.getElementById("bgm");
const vol = document.getElementById("vol");
const playBtn = document.getElementById("playBtn");

/* ---------- Bubble pool (7 visible at once) ---------- */
const POOL = 7;
const offsets = [0, -1, 1, -2, 2, -3, 3]; // center + neighbors

// positions around center (relative to viewport)
const slots = [
  { x: 0.00, y: 0.00 },   // center
  { x: -0.34, y: -0.10 }, // left-ish
  { x: 0.34, y: 0.10 },   // right-ish
  { x: -0.18, y: 0.32 },  // lower-left
  { x: 0.18, y: -0.34 },  // upper-right
  { x: 0.46, y: -0.22 },  // far upper-right
  { x: -0.46, y: 0.22 }   // far lower-left
];

const bubblePool = [];
for (let i = 0; i < POOL; i++) {
  const el = document.createElement("div");
  el.className = "bubble";
  const span = document.createElement("span");
  el.appendChild(span);
  bubbleLayer.appendChild(el);
  bubblePool.push({ el, span });
}

/* ---------- Layout tuning ---------- */
let beatPx = 240;     // scroll pixels per beat
let heroPx = 0;       // how long hero stays dominant
let totalScrollPx = 6000;

function preloadImages(list) {
  for (const src of list) {
    const img = new Image();
    img.src = src;
  }
}

function setSpacerHeight() {
  // scale to viewport size so it feels cinematic everywhere
  beatPx = Math.max(200, Math.floor(window.innerHeight * 0.28));
  heroPx = Math.max(420, Math.floor(window.innerHeight * 0.72));

  totalScrollPx = heroPx + beats.length * beatPx + window.innerHeight;
  scrollSpacer.style.height = `${totalScrollPx}px`;
}

preloadImages(bgImages);
setSpacerHeight();
window.addEventListener("resize", setSpacerHeight);

/* ---------- Background crossfade ---------- */
let currentBgIndex = 0;
let showingA = true;

// initial background
bgA.style.backgroundImage = `url(${bgImages[0]})`;
bgA.style.opacity = "1";
bgB.style.opacity = "0";

function setBackground(index) {
  index = clamp(index, 0, bgImages.length - 1);
  if (index === currentBgIndex) return;

  currentBgIndex = index;

  const show = showingA ? bgB : bgA;
  const hide = showingA ? bgA : bgB;

  show.style.backgroundImage = `url(${bgImages[index]})`;
  show.style.opacity = "1";
  hide.style.opacity = "0";

  showingA = !showingA;
}

function pickBgIndex(globalT) {
  // globalT is 0..1 through the whole scroll
  // Keep last image static for the remaining scroll
  if (globalT < 0.18) return 0; // AirForce
  if (globalT < 0.40) return 1; // Retro
  if (globalT < 0.62) return 2; // CADdets_1
  return 3;                     // Tech_Career (hold)
}

/* ---------- Audio (autoplay handling) ---------- */
let isPlaying = false;

audio.volume = Number(vol.value);
vol.addEventListener("input", () => {
  audio.volume = Number(vol.value);
});

async function tryAutoPlay() {
  try {
    await audio.play();
    isPlaying = true;
    playBtn.textContent = "Pause";
  } catch {
    // Autoplay with sound is often blocked. We'll start on first user gesture.
    isPlaying = false;
    playBtn.textContent = "Play";
  }
}

playBtn.addEventListener("click", async () => {
  if (!isPlaying) {
    await tryAutoPlay();
  } else {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = "Play";
  }
});

// attempt on load
window.addEventListener("load", () => {
  tryAutoPlay();
});

// unlock on first real user gesture (scroll/wheel/click/keydown)
const unlockOnce = async () => {
  if (!isPlaying) await tryAutoPlay();
};
["pointerdown", "touchstart", "wheel", "keydown"].forEach((evt) => {
  window.addEventListener(evt, unlockOnce, { once: true, passive: true });
});

/* ---------- Screensaver (hidden toggle) ---------- */
let screensaverOn = false;
let videoTimer = null;
let videoIndex = 0;

async function playVideo(src) {
  try {
    bgVideo.src = src;
    bgVideo.loop = true;
    await bgVideo.play();
  } catch {
    // If it fails, we just don't block the rest of the site.
  }
}

function startScreensaver() {
  screensaverOn = true;
  bgVideoWrap.style.display = "block";
  bgVideoWrap.setAttribute("aria-hidden", "false");

  videoIndex = 0;
  playVideo(screensaverVideos[videoIndex]);

  // rotate every ~28s (optional)
  clearInterval(videoTimer);
  videoTimer = setInterval(() => {
    videoIndex = (videoIndex + 1) % screensaverVideos.length;
    playVideo(screensaverVideos[videoIndex]);
  }, 28000);
}

function stopScreensaver() {
  screensaverOn = false;
  bgVideoWrap.style.display = "none";
  bgVideoWrap.setAttribute("aria-hidden", "true");

  clearInterval(videoTimer);
  videoTimer = null;

  try { bgVideo.pause(); } catch {}
  bgVideo.removeAttribute("src");
  bgVideo.load();
}

function toggleScreensaver() {
  if (!screensaverOn) startScreensaver();
  else stopScreensaver();
}

secretToggle.addEventListener("click", toggleScreensaver);
window.addEventListener("keydown", (e) => {
  if (e.key === "v" || e.key === "V") toggleScreensaver();
});

/* ---------- Theme toggle ---------- */
themeBtn.addEventListener("click", () => {
  const root = document.documentElement;
  const now = root.getAttribute("data-theme") === "light" ? "" : "light";
  if (now) root.setAttribute("data-theme", now);
  else root.removeAttribute("data-theme");
});

/* ---------- Mouse trail (optional) ---------- */
const trailCanvas = document.getElementById("trailCanvas");
const ctx = trailCanvas.getContext("2d");
let trailOn = false;
let pts = [];

function resizeTrail() {
  trailCanvas.width = window.innerWidth * devicePixelRatio;
  trailCanvas.height = window.innerHeight * devicePixelRatio;
  trailCanvas.style.width = "100%";
  trailCanvas.style.height = "100%";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
resizeTrail();
window.addEventListener("resize", resizeTrail);

trailBtn.addEventListener("click", () => {
  trailOn = !trailOn;
  trailCanvas.style.display = trailOn ? "block" : "none";
  pts = [];
});

window.addEventListener("mousemove", (e) => {
  if (!trailOn) return;
  pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (pts.length > 80) pts.shift();
});

/* ---------- Main animation loop ---------- */
function update() {
  const y = window.scrollY || 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Global scroll progress 0..1
  const globalT = clamp01(y / Math.max(1, totalScrollPx - vh));
  setBackground(pickBgIndex(globalT));

  // Hero fades out over heroPx
  const heroT = clamp01(1 - y / heroPx);
  hero.style.opacity = String(easeOutCubic(heroT));
  hero.style.transform = `translate3d(0, ${Math.round((1 - heroT) * -24)}px, 0)`;

  // When still in hero phase, keep bubbles mostly hidden
  const beatsStartY = heroPx;
  const beatFloat = (y - beatsStartY) / beatPx;

  // Center beat index
  const baseIndex = Math.floor(beatFloat);

  // Bubble flow tuning
  const flowY = Math.max(110, Math.floor(vh * 0.18)); // how far bubbles drift between beats
  const spreadX = vw * 0.44;
  const spreadY = vh * 0.40;

  for (let i = 0; i < POOL; i++) {
    const poolItem = bubblePool[i];
    const beatIndex = baseIndex + offsets[i];

    if (beatIndex < 0 || beatIndex >= beats.length || y < beatsStartY - 40) {
      poolItem.el.style.opacity = "0";
      continue;
    }

    // d = 0 means "this beat is centered right now"
    const d = beatIndex - beatFloat;

    // Visibility window: show about 3 beats away
    const vis = clamp01(1 - Math.abs(d) / 3.2);
    const opacity = easeOutCubic(vis);

    // Size: center biggest, others smaller
    const scale = 1.22 - 0.14 * Math.abs(d);

    // Slot base position (around center)
    const s = slots[i];
    const baseX = s.x * spreadX;
    const baseY = s.y * spreadY;

    // Drift along Y as you scroll: upcoming beats sit lower, past beats float higher
    const driftY = d * flowY;

    // Subtle sideways parallax based on distance
    const driftX = d * 18;

    poolItem.span.textContent = beats[beatIndex];

    // z-index so center sits on top
    poolItem.el.style.zIndex = String(1000 - Math.floor(Math.abs(d) * 10));

    // Apply transform
    poolItem.el.style.opacity = String(opacity);
    poolItem.el.style.transform =
      `translate3d(calc(-50% + ${baseX + driftX}px), calc(-50% + ${baseY + driftY}px), 0) scale(${scale})`;
  }

  // Trail draw
  if (trailOn) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const now = performance.now();
    pts = pts.filter(p => now - p.t < 550);

    for (let i = 0; i < pts.length; i++) {
      const age = now - pts[i].t;
      const a = 1 - age / 550;
      const r = 10 + (1 - a) * 18;

      ctx.globalAlpha = a * 0.28;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#7fdcff"; // subtle teal-ish glow
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(update);
}

requestAnimationFrame(update);
