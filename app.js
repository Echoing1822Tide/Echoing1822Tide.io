(() => {
  // --- Elements
  const steps = Array.from(document.querySelectorAll(".step"));
  const cards = Array.from(document.querySelectorAll(".card"));
  const bgLayers = Array.from(document.querySelectorAll(".bg-layer"));
  const audio = document.getElementById("bgMusic");
  const playPauseBtn = document.getElementById("playPause");
  const volume = document.getElementById("volume");
  const themeToggle = document.getElementById("themeToggle");
  const trailToggle = document.getElementById("trailToggle");
  const secretBtn = document.getElementById("secretBtn");

  // --- Safety checks (prevents silent failure)
  if (!steps.length || !cards.length) {
    console.warn("Missing steps/cards. Scroll sections won't run.");
    return;
  }

  // --- State
  let activeIndex = 0;

  // --- Background switching
  function setBackground(bgIndex) {
    bgLayers.forEach(layer => {
      layer.classList.toggle("is-visible", Number(layer.dataset.bg) === bgIndex);
    });
  }

  // --- Card switching
  function setActive(index) {
    activeIndex = index;

    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));

    // Map steps -> backgrounds:
    // 0 -> AirForce_Emblem
    // 1 -> CADdets_Retro
    // 2 -> CADdets_1
    // 3+ -> Tech_Career (stays)
    const bgIndex = Number(steps[index].dataset.bg ?? 0);
    setBackground(bgIndex);
  }

  // Set initial state
  setActive(0);

  // --- Scroll observer (drives the scrollytelling)
  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the most visible intersecting step
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      const idx = Number(visible.target.dataset.step);
      if (!Number.isNaN(idx)) setActive(idx);
    },
    { threshold: [0.35, 0.5, 0.65, 0.8] }
  );

  steps.forEach(step => observer.observe(step));

  // --- Expand buttons
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-expand]");
    if (!btn) return;

    const idx = Number(btn.dataset.expand);
    const body = document.querySelector(`.cardBody[data-body="${idx}"]`);
    if (!body) return;

    body.classList.toggle("is-open");
    btn.textContent = body.classList.contains("is-open") ? "Collapse" : "Expand";
  });

  // --- Audio controls
  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value);
  });
  audio.volume = Number(volume.value);

  playPauseBtn.addEventListener("click", async () => {
    try {
      if (audio.paused) {
        // Browsers block autoplay-with-sound unless user gestures; click counts as gesture.
        await audio.play();
        playPauseBtn.textContent = "Pause";
      } else {
        audio.pause();
        playPauseBtn.textContent = "Play";
      }
    } catch (err) {
      console.warn("Audio play blocked or failed:", err);
      playPauseBtn.textContent = "Play";
      alert("Audio couldn't start. Double-check the MP3 filename/path and try again.");
    }
  });

  audio.addEventListener("pause", () => { playPauseBtn.textContent = "Play"; });
  audio.addEventListener("play", () => { playPauseBtn.textContent = "Pause"; });

  // --- Theme toggle (simple)
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("theme-alt");
    // You can extend this later; right now it just exists so your button doesn't “disappear.”
  });

  // --- Mouse trail
  const dot = document.createElement("div");
  dot.className = "trail-dot";
  document.body.appendChild(dot);

  let trailOn = false;
  trailToggle.addEventListener("click", () => {
    trailOn = !trailOn;
    document.body.classList.toggle("trail-on", trailOn);
  });

  window.addEventListener("mousemove", (e) => {
    if (!trailOn) return;
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
  });

  // --- Hidden debug toggle (shows outlines around the invisible steps)
  secretBtn.addEventListener("click", () => {
    document.body.classList.toggle("debug");
  });
})();
