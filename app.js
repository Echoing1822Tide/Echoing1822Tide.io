/* global gsap, ScrollTrigger */
gsap.registerPlugin(ScrollTrigger);

/* -----------------------------
   1) Background sequence
-------------------------------- */
const bgImages = [
  "AirForce_Emblem.png",
  "CADdets_Retro.png",
  "CADdets_1.png",
  "Tech_Career.png",
];

const bgEls = [
  document.getElementById("bg1"),
  document.getElementById("bg2"),
  document.getElementById("bg3"),
  document.getElementById("bg4"),
];

bgEls.forEach((el, i) => (el.src = `./${bgImages[i]}`));
bgEls[0].style.opacity = 1;

/* -----------------------------
   2) Beats (your “cards”)
   - First 12 are your images.
   - Then we sprinkle in text beats
     to keep “Career Lifeline” loud.
-------------------------------- */
const beats = [
  // Option A image beats
  { type: "image", src: "1_Website.png", alt: "Beat 1" },
  { type: "image", src: "2_Website.png", alt: "Beat 2" },
  { type: "image", src: "3_Website.png", alt: "Beat 3" },
  { type: "image", src: "4_Website.png", alt: "Beat 4" },
  { type: "image", src: "5_Website.png", alt: "Beat 5" },
  { type: "image", src: "6_Website.png", alt: "Beat 6" },
  { type: "image", src: "7_Website.png", alt: "Beat 7" },
  { type: "image", src: "8_Website.png", alt: "Beat 8" },
  { type: "image", src: "9_Website.png", alt: "Beat 9" },
  { type: "image", src: "10_Website.png", alt: "Beat 10" },
  { type: "image", src: "11_Website.png", alt: "Beat 11" },
  { type: "image", src: "12_Website.png", alt: "Beat 12" },

  // Career Lifeline “sprinkle”
  {
    type: "text",
    title: "20 years U.S. Air Force leadership.",
    sub: "Mission ops taught me calm execution under pressure.",
  },
  {
    type: "text",
    title: "Led large-scale inspections and programs.",
    sub: "150 sites • 17,643 personnel • $361M scope",
  },
  {
    type: "text",
    title: "Managed projects and budgets.",
    sub: "$4.6M across 55 locations • systems and standards",
  },
  {
    type: "text",
    title: "Operational reliability mindset.",
    sub: "Airfield recovery operations protecting $1.2B in assets",
  },
  {
    type: "text",
    title: "Now building in C# / .NET + cloud.",
    sub: "Strong fundamentals • modern patterns • ship in increments",
  },
  {
    type: "text",
    title: "Houston-bound.",
    sub: "Looking for a team that values integrity, growth, and impact.",
  },
  {
    type: "text",
    title: "Let’s build something dependable.",
    sub: "Reliable software. Human-first design.",
  },
];

/* -----------------------------
   3) Create cards
-------------------------------- */
const cardsHost = document.getElementById("cards");

const anchors = beats.map(() => ({
  x: gsap.utils.random(-120, 120),
  y: gsap.utils.random(-90, 90),
  r: gsap.utils.random(-6, 6),
  rx: gsap.utils.random(-4, 4),
}));

const cards = beats.map((b, i) => {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.index = String(i);

  const inner = document.createElement("div");
  inner.className = "cardInner";

  if (b.type === "image") {
    const img = document.createElement("img");
    img.loading = "eager";
    img.alt = b.alt || `Beat ${i + 1}`;
    img.src = `./${b.src}`;
    inner.appendChild(img);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "cardText";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = b.title;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = b.sub || "";

    wrap.appendChild(title);
    wrap.appendChild(sub);
    inner.appendChild(wrap);
  }

  card.appendChild(inner);
  cardsHost.appendChild(card);

  // subtle floating animation on inner (does not fight scroll transforms)
  gsap.to(inner, {
    y: gsap.utils.random(-10, 10),
    duration: gsap.utils.random(2.8, 4.6),
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    delay: gsap.utils.random(0, 1.2),
  });

  return card;
});

/* -----------------------------
   4) ScrollTrigger engine
   Goal: ~7 visible cards at once.
-------------------------------- */
const hero = document.getElementById("hero");
const scrollSpacer = document.getElementById("scrollSpacer");

const total = beats.length;

// Give enough scroll distance for smooth cinematic motion
const scrollLen = Math.max(7000, total * 1200);
scrollSpacer.style.height = `${scrollLen}px`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function updateBackground(progress) {
  // progress maps across 4 backgrounds, last stays.
  const t = progress * (bgImages.length - 1);
  const i = Math.floor(t);
  const f = t - i;

  bgEls.forEach((el, idx) => (el.style.opacity = 0));

  const a = clamp(i, 0, bgEls.length - 1);
  const b = clamp(i + 1, 0, bgEls.length - 1);

  if (a === bgEls.length - 1) {
    bgEls[a].style.opacity = 1;
    return;
  }

  bgEls[a].style.opacity = String(1 - f);
  bgEls[b].style.opacity = String(f);
}

function updateCards(progress) {
  // “t” is fractional index so motion is smooth between beats
  const t = progress * (total - 1);

  // Hero fades fast once scrolling begins
  const heroAlpha = clamp(1 - progress * 5, 0, 1);
  gsap.set(hero, { autoAlpha: heroAlpha });

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const a = anchors[i];

    const d = i - t;               // float distance from “active”
    const ad = Math.abs(d);

    // show ~7 cards at once (dist <= ~3.2)
    const visible = ad <= 3.2;

    if (!visible) {
      gsap.set(card, { autoAlpha: 0 });
      continue;
    }

    const dir = d === 0 ? 0 : (d > 0 ? 1 : -1);

    // Cinematic path:
    // - upcoming cards are “behind” camera
    // - passed cards move forward “past” the camera
    let z = 320 - ad * 320;
    if (d < 0) z += (-d) * 520; // passed = fly forward

    const spreadX = 260 + ad * 220;
    const spreadY = 40 + ad * 140;

    const x = dir * spreadX + a.x;
    const y =
      (d > 0 ? -spreadY : spreadY * 0.25) + a.y;

    let scale = 1.06 - ad * 0.18;
    scale = clamp(scale, 0.42, 1.08);

    let alpha = 1 - ad * 0.33;
    alpha = clamp(alpha, 0, 1);

    // fade quickly after passing
    if (d < -0.6) {
      alpha *= clamp(1 - (-d - 0.6) * 0.85, 0, 1);
    }

    const rotY = (-dir * (10 + ad * 7)) + a.r;
    const rotX = (d > 0 ? 5 : -5) + a.rx;

    // Higher zIndex for near cards
    const zIndex = String(1000 - Math.floor(ad * 120));

    gsap.set(card, {
      xPercent: -50,
      yPercent: -50,
      x,
      y,
      z,
      rotationY: rotY,
      rotationX: rotX,
      scale,
      autoAlpha: alpha,
      zIndex,
      transformPerspective: 1200,
      transformStyle: "preserve-3d",
    });
  }
}

ScrollTrigger.create({
  trigger: scrollSpacer,
  start: "top top",
  end: "bottom bottom",
  pin: "#stage",
  scrub: true,
  onUpdate: (self) => {
    updateBackground(self.progress);
    updateCards(self.progress);
  },
});

/* Initialize first frame */
updateBackground(0);
updateCards(0);

/* -----------------------------
   5) Audio (autoplay reality check)
   Browsers often block autoplay with sound.
   We try immediately, then again on first user interaction.
-------------------------------- */
const bgm = document.getElementById("bgm");
const playBtn = document.getElementById("playBtn");
const vol = document.getElementById("vol");

bgm.volume = Number(vol.value || 0.35);

function setPlayLabel() {
  playBtn.textContent = bgm.paused ? "Play" : "Pause";
}

async function tryPlayAudio() {
  try {
    await bgm.play();
  } catch {
    // blocked until user interacts — that’s normal
  } finally {
    setPlayLabel();
  }
}

vol.addEventListener("input", () => {
  bgm.volume = Number(vol.value);
});

playBtn.addEventListener("click", async () => {
  if (bgm.paused) await tryPlayAudio();
  else bgm.pause();
  setPlayLabel();
});

// Attempt on load
tryPlayAudio();

// Try again on first real interaction (scroll/click/key)
const unlock = async () => {
  await tryPlayAudio();
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
  window.removeEventListener("wheel", unlock);
};
window.addEventListener("pointerdown", unlock, { once: true });
window.addEventListener("keydown", unlock, { once: true });
window.addEventListener("wheel", unlock, { once: true });

/* -----------------------------
   6) Theme + Mouse Trail (simple)
-------------------------------- */
const themeBtn = document.getElementById("themeBtn");
const trailBtn = document.getElementById("trailBtn");

themeBtn.addEventListener("click", () => {
  const on = themeBtn.getAttribute("aria-pressed") === "true";
  themeBtn.setAttribute("aria-pressed", String(!on));
  // optional: you can swap CSS variables here later if you want a true light theme
});

let trailOn = false;
let trailDot = null;

trailBtn.addEventListener("click", () => {
  trailOn = !trailOn;
  trailBtn.setAttribute("aria-pressed", String(trailOn));

  if (trailOn && !trailDot) {
    trailDot = document.createElement("div");
    trailDot.style.position = "fixed";
    trailDot.style.width = "10px";
    trailDot.style.height = "10px";
    trailDot.style.borderRadius = "999px";
    trailDot.style.pointerEvents = "none";
    trailDot.style.zIndex = "9999";
    trailDot.style.background = "rgba(0, 220, 255, 0.65)";
    trailDot.style.boxShadow = "0 0 30px rgba(0, 220, 255, 0.35)";
    document.body.appendChild(trailDot);

    window.addEventListener("mousemove", (e) => {
      if (!trailOn) return;
      trailDot.style.left = `${e.clientX - 5}px`;
      trailDot.style.top = `${e.clientY - 5}px`;
    });
  }

  if (!trailOn && trailDot) {
    trailDot.style.opacity = "0";
  }
  if (trailOn && trailDot) {
    trailDot.style.opacity = "1";
  }
});

/* -----------------------------
   7) Screensavers modal
-------------------------------- */
const modal = document.getElementById("vaultModal");
const screensaverBtn = document.getElementById("screensaverBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const prevVidBtn = document.getElementById("prevVidBtn");
const nextVidBtn = document.getElementById("nextVidBtn");
const ssVideo = document.getElementById("ssVideo");
const vidMeta = document.getElementById("vidMeta");

// Candidate list (supports your rename)
const candidateVideos = [
  "Screensaver-1.mp4",
  "Screensaver-4.mp4",
  "Alien-Beach-Waves.mp4", // your renamed file
  // If you later add more, just list them here.
];

let videos = [];
let vidIndex = 0;

async function buildVideoList() {
  // Filter out missing files so you don’t get “format/MIME not found” panels.
  const checks = await Promise.all(
    candidateVideos.map(async (name) => {
      try {
        const res = await fetch(`./${name}`, { method: "GET" });
        if (!res.ok) return null;
        return name;
      } catch {
        return null;
      }
    })
  );
  videos = checks.filter(Boolean);
  if (videos.length === 0) {
    videos = []; // none found
  }
}

function showVideo(i) {
  if (!videos.length) {
    ssVideo.removeAttribute("src");
    vidMeta.textContent = "No screensaver videos found in folder.";
    return;
  }
  vidIndex = (i + videos.length) % videos.length;
  const name = videos[vidIndex];
  ssVideo.src = `./${name}`;
  ssVideo.play().catch(() => {});
  vidMeta.textContent = `${name} (${vidIndex + 1}/${videos.length})`;
}

function openModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  buildVideoList().then(() => showVideo(vidIndex));
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  ssVideo.pause();
}

screensaverBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
prevVidBtn.addEventListener("click", () => showVideo(vidIndex - 1));
nextVidBtn.addEventListener("click", () => showVideo(vidIndex + 1));

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "v") {
    if (modal.classList.contains("show")) closeModal();
    else openModal();
  }
});
