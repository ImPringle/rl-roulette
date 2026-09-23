const REPEATS = 40;
const SPIN_DURATION = 2200;
const CATEGORY = "mechanics";
const SETTINGS_KEY = "rl-roulette-enabled";
const LANG_KEY = "rl-roulette-lang";

const COPY = {
  en: {
    title: "Mechanics in 1 Hour",
    settings: "Settings",
    closeSettings: "Close settings",
    mechanics: "Mechanics",
    hintIdle: "Tap or press space to spin",
    hintEmpty: "Enable a mechanic in settings",
    hintSpinning: "Spinning…",
    hintLoadError: "Could not load data.json — check for a syntax error",
    hintNoMechanics: "No mechanics in data.json",
    langButton: "ES",
    langLabel: "Switch to Spanish",
  },
  es: {
    title: "Mecanicas en 1 Hora",
    settings: "Ajustes",
    closeSettings: "Cerrar ajustes",
    mechanics: "Mecánicas",
    hintIdle: "Toca o pulsa espacio para girar",
    hintEmpty: "Activa una mecánica en ajustes",
    hintSpinning: "Girando…",
    hintLoadError: "No se pudo cargar data.json — revisa si hay un error de sintaxis",
    hintNoMechanics: "No hay mecánicas en data.json",
    langButton: "EN",
    langLabel: "Cambiar a inglés",
  },
};

let data = null;
let enabled = null;
let currentPick = null;
let settingsOpen = false;
let lang = "en";
let hintKey = "hintIdle";
const reels = {};
let spinning = false;

function t(key) {
  return COPY[lang][key];
}

function loadLang() {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "es" ? "es" : "en";
}

function setHint(key) {
  hintKey = key;
  document.getElementById("hint").textContent = t(key);
}

function applyLanguage() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.getElementById("settings-toggle").setAttribute("aria-label", t("settings"));
  document.getElementById("settings-title").textContent = t("settings");
  document.getElementById("settings-close").setAttribute("aria-label", t("closeSettings"));
  document.querySelector(".label").textContent = t("title");
  document.getElementById("hint").textContent = t(hintKey);
  const langButton = document.getElementById("lang-toggle");
  langButton.textContent = t("langButton");
  langButton.setAttribute("aria-label", t("langLabel"));
  if (settingsOpen && data) renderSettings();
}

function toggleLanguage() {
  lang = lang === "en" ? "es" : "en";
  localStorage.setItem(LANG_KEY, lang);
  applyLanguage();
}

function itemHeight() {
  return parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--item-h"),
  );
}

function reelAxis() {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--reel-axis")
      .trim() || "y"
  );
}

function itemSize() {
  if (reelAxis() === "x") {
    const item = document.querySelector(".reel .item");
    if (item) {
      const width = item.getBoundingClientRect().width;
      if (width) return width;
    }
    const reel = document.querySelector(".reel");
    if (reel) return reel.getBoundingClientRect().width / 3;
  }
  return itemHeight();
}

function stripTransform(index) {
  const offset = -((index - 1) * itemSize());
  return reelAxis() === "x"
    ? `translateX(${offset}px)`
    : `translateY(${offset}px)`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sameList(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function defaultEnabled() {
  const next = {};
  data.mechanics.forEach((name) => {
    next[name] = true;
  });
  return next;
}

function loadEnabled() {
  const defaults = defaultEnabled();
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (!saved) return defaults;
    const next = { ...defaults };
    data.mechanics.forEach((name) => {
      if (typeof saved[name] === "boolean") next[name] = saved[name];
    });
    return next;
  } catch {
    return defaults;
  }
}

function saveEnabled() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(enabled));
}

function enabledMechanics() {
  return data.mechanics.filter((name) => enabled[name]);
}

function buildStrip(options) {
  const items = [];
  for (let i = 0; i < REPEATS; i += 1) {
    items.push(...options);
  }
  return items;
}

function idleIndex(options, optionIndex) {
  return options.length + optionIndex;
}

function setReelOptions(options, selectedName = options[0]) {
  const reelEl = document.querySelector(`[data-category="${CATEGORY}"]`);
  const strip = reelEl.querySelector(".strip");
  const items = buildStrip(options);
  const optionIndex = Math.max(0, options.indexOf(selectedName));
  const start = idleIndex(options, optionIndex);

  strip.innerHTML = items
    .map(
      (name, index) =>
        `<div class="item" data-index="${index}"><span class="item-text">${escapeHtml(name)}</span></div>`,
    )
    .join("");
  strip.style.transition = "none";
  strip.style.transform = stripTransform(start);

  reels[CATEGORY] = {
    el: reelEl,
    strip,
    options,
    currentIndex: start,
  };

  reelEl.classList.add("stopped");
  markSelected(start);
}

function markSelected(index) {
  const { strip } = reels[CATEGORY];
  strip.querySelectorAll(".item").forEach((item) => {
    item.classList.toggle("selected", Number(item.dataset.index) === index);
  });
}

function pickTarget(optionIndex) {
  const { options, currentIndex } = reels[CATEGORY];
  const currentCycle = Math.floor(currentIndex / options.length);
  const minCycle = currentCycle + 14;
  const extra = Math.floor(Math.random() * 6);
  return (minCycle + extra) * options.length + optionIndex;
}

function spinReel(options, result) {
  if (!reels[CATEGORY] || !sameList(reels[CATEGORY].options, options)) {
    setReelOptions(options);
  }

  const reel = reels[CATEGORY];
  const optionIndex = Math.max(0, options.indexOf(result));
  const target = pickTarget(optionIndex);

  reel.el.classList.remove("stopped");
  markSelected(-1);

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      reel.strip.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.12, 0.7, 0.16, 1)`;
      reel.strip.style.transform = stripTransform(target);
      reel.currentIndex = target;

      window.setTimeout(() => {
        markSelected(target);
        reel.el.classList.add("stopped");
        settleReel(target);
        resolve();
      }, SPIN_DURATION);
    });
  });
}

function settleReel(index) {
  const reel = reels[CATEGORY];
  const optionIndex = index % reel.options.length;
  const reset = idleIndex(reel.options, optionIndex);

  window.setTimeout(() => {
    reel.strip.style.transition = "none";
    reel.strip.style.transform = stripTransform(reset);
    reel.currentIndex = reset;
    markSelected(reset);
  }, 40);
}

function blinkColumn() {
  const col = document
    .querySelector(`[data-category="${CATEGORY}"]`)
    .closest(".reel-col");
  col.classList.remove("hit");
  void col.offsetWidth;
  col.classList.add("locked", "hit");
}

function clearBlinks() {
  document.querySelectorAll(".reel-col").forEach((col) => {
    col.classList.remove("hit", "locked");
  });
}

function showResult(name) {
  currentPick = name;
  setReelOptions(enabledMechanics(), name);
  document
    .querySelector(`[data-category="${CATEGORY}"]`)
    .closest(".reel-col")
    .classList.add("locked");
}

function showEmpty() {
  currentPick = null;
  setReelOptions(["—"], "—");
  clearBlinks();
  setHint("hintEmpty");
}

function applySettings() {
  saveEnabled();
  if (spinning) return;
  const options = enabledMechanics();
  if (currentPick && options.includes(currentPick)) {
    showResult(currentPick);
    setHint("hintIdle");
    return;
  }
  if (options.length) {
    showResult(options[0]);
    setHint("hintIdle");
    return;
  }
  showEmpty();
}

function renderSettings() {
  const body = document.getElementById("settings-body");
  const mechanicsHtml = data.mechanics
    .map(
      (name) => `
        <label class="settings-row">
          <input
            type="checkbox"
            data-kind="mechanic"
            data-name="${escapeHtml(name)}"
            ${enabled[name] ? "checked" : ""}
          />
          <span>${escapeHtml(name)}</span>
        </label>
      `,
    )
    .join("");

  body.innerHTML = `
    <section class="settings-section">
      <h3 class="settings-kicker">${escapeHtml(t("mechanics"))}</h3>
      ${mechanicsHtml}
    </section>
  `;
}

function onSettingsChange(event) {
  const input = event.target.closest("input");
  if (!input || input.type !== "checkbox") return;
  if (input.dataset.kind !== "mechanic") return;
  enabled[input.dataset.name] = input.checked;
  applySettings();
}

function openSettings() {
  settingsOpen = true;
  renderSettings();
  document.body.classList.add("settings-open");
  const overlay = document.getElementById("settings-overlay");
  overlay.setAttribute("aria-hidden", "false");
  document.getElementById("settings-toggle").setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
    });
  });
}

function closeSettings() {
  settingsOpen = false;
  document.body.classList.remove("settings-open");
  const overlay = document.getElementById("settings-overlay");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.getElementById("settings-toggle").setAttribute("aria-expanded", "false");
  document.getElementById("settings-toggle").focus();
}

async function spin() {
  if (spinning || !data || settingsOpen) return;
  const options = enabledMechanics();
  if (!options.length) {
    showEmpty();
    return;
  }

  spinning = true;
  document.body.classList.add("spinning");
  clearBlinks();
  setHint("hintSpinning");

  const result = pick(options);
  await spinReel(options, result);
  blinkColumn();

  currentPick = result;
  spinning = false;
  document.body.classList.remove("spinning");
  setHint("hintIdle");
}

function startFluid() {
  const layer = document.getElementById("fluid");
  if (!layer) return;

  const canvas = document.createElement("canvas");
  canvas.className = "fluid-canvas";
  layer.append(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let last = 0;

  const cells = Array.from({ length: 8 }, () => ({
    nx: Math.random(),
    ny: 0.35 + Math.random() * 0.7,
    nr: 0.18 + Math.random() * 0.22,
    vx: (Math.random() - 0.5) * 0.012,
    vy: (Math.random() - 0.5) * 0.008,
    phase: Math.random() * Math.PI * 2,
  }));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function wrap(value) {
    if (value < -0.25) return value + 1.5;
    if (value > 1.25) return value - 1.5;
    return value;
  }

  function drawCell(cell, time) {
    const x = cell.nx * width;
    const y = cell.ny * height;
    const pulse = 1 + Math.sin(time * 0.00025 + cell.phase) * 0.06;
    const r = Math.max(width, height) * cell.nr * pulse;
    const glow = ctx.createRadialGradient(x, y, r * 0.08, x, y, r);
    glow.addColorStop(0, "rgba(28, 92, 196, 0.42)");
    glow.addColorStop(0.4, "rgba(12, 48, 120, 0.2)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function tick(time) {
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0.016;
    last = time;
    ctx.clearRect(0, 0, width, height);
    cells.forEach((cell) => {
      if (!reduced) {
        cell.nx = wrap(cell.nx + cell.vx * dt);
        cell.ny = wrap(cell.ny + cell.vy * dt);
      }
      drawCell(cell, time);
    });
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(tick);
}

async function init() {
  startFluid();
  lang = loadLang();
  applyLanguage();
  document.getElementById("lang-toggle").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLanguage();
  });

  try {
    const response = await fetch("data.json");
    data = await response.json();
  } catch {
    setHint("hintLoadError");
    return;
  }

  if (!Array.isArray(data.mechanics) || !data.mechanics.length) {
    setHint("hintNoMechanics");
    return;
  }

  enabled = loadEnabled();

  const options = enabledMechanics();
  if (options.length) showResult(options[0]);
  else showEmpty();

  document.getElementById("settings-toggle").addEventListener("click", () => {
    if (settingsOpen) closeSettings();
    else openSettings();
  });
  document.getElementById("settings-close").addEventListener("click", closeSettings);
  document.getElementById("settings-overlay").addEventListener("click", (event) => {
    if (event.target.id === "settings-overlay") closeSettings();
  });
  document.getElementById("settings-body").addEventListener("change", onSettingsChange);
  document.querySelector(".stage").addEventListener("click", (event) => {
    if (settingsOpen) return;
    if (event.target.closest(".settings-toggle, .settings-overlay, .lang-toggle")) return;
    spin();
  });
}

let lastLayoutKey = "";

function layoutKey() {
  return `${reelAxis()}:${itemSize()}`;
}

function relayoutReels() {
  if (spinning) return;
  const key = layoutKey();
  if (!itemSize() || key === lastLayoutKey) return;
  lastLayoutKey = key;
  Object.keys(reels).forEach((category) => {
    const reel = reels[category];
    if (!reel) return;
    reel.strip.style.transition = "none";
    reel.strip.style.transform = stripTransform(reel.currentIndex);
  });
}

init();
window.addEventListener("resize", relayoutReels);
window.addEventListener("orientationchange", relayoutReels);

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && settingsOpen) {
    event.preventDefault();
    closeSettings();
    return;
  }

  if (event.code !== "Space" && event.key !== " ") return;
  if (event.repeat) return;
  if (settingsOpen) {
    if (event.target.closest("input, button")) return;
    event.preventDefault();
    return;
  }
  event.preventDefault();
  spin();
});
