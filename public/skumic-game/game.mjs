import { FIGHTERS } from "./fighters.mjs?v=3";
import { SkumicEngine } from "./engine.mjs?v=3";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

class Controls {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.map = new Map([
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      ["ArrowDown", "down"],
      ["ArrowUp", "jump"],
      ["KeyA", "punch"],
      ["KeyS", "kick"],
      ["KeyD", "heavy"],
      ["KeyF", "special1"],
      ["KeyG", "special2"],
    ]);
    this.bindKeyboard();
    this.bindTouch();
  }

  bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      const action = this.map.get(event.code);
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(action);
      this.held.add(action);
    }, { passive: false });
    window.addEventListener("keyup", (event) => {
      const action = this.map.get(event.code);
      if (!action) return;
      event.preventDefault();
      this.held.delete(action);
    }, { passive: false });
    window.addEventListener("blur", () => this.clear());
  }

  bindTouch() {
    for (const button of $$("[data-control]")) {
      const action = button.dataset.control;
      const down = (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        if (!this.held.has(action)) this.pressed.add(action);
        this.held.add(action);
        button.classList.add("is-active");
      };
      const up = (event) => {
        event.preventDefault();
        this.held.delete(action);
        button.classList.remove("is-active");
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("lostpointercapture", up);
    }
  }

  frame() {
    const result = {
      left: this.held.has("left"),
      right: this.held.has("right"),
      down: this.held.has("down"),
      jump: this.pressed.has("jump"),
      punch: this.pressed.has("punch"),
      kick: this.pressed.has("kick"),
      heavy: this.pressed.has("heavy"),
      special1: this.pressed.has("special1"),
      special2: this.pressed.has("special2"),
    };
    this.pressed.clear();
    return result;
  }

  clear() {
    this.held.clear();
    this.pressed.clear();
    $$("[data-control].is-active").forEach((button) => button.classList.remove("is-active"));
  }
}

class ArcadeAudio {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  ensure() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === "suspended") this.context.resume();
  }

  tone(frequency, duration, type = "square", volume = 0.035, slide = 0) {
    if (this.muted) return;
    this.ensure();
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  event(type, detail = {}) {
    if (type === "select") this.tone(330, 0.06, "square", 0.025, 110);
    if (type === "fight") this.tone(220, 0.18, "sawtooth", 0.035, 440);
    if (type === "shot") this.tone(740, 0.055, "square", 0.035, -420);
    if (type === "hit") {
      if (detail.counter) this.tone(150, 0.18, "sawtooth", 0.055, 480);
      else if (detail.blocked) this.tone(980, 0.04, "square", 0.022, -260);
      else this.tone(detail.damage >= 100 ? 92 : 132, 0.085, "square", 0.045, -42);
    }
    if (type === "round-over") this.tone(detail.message === "KO" ? 74 : 110, 0.45, "sawtooth", 0.05, -36);
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const screens = {
  loading: $("#loading-screen"),
  title: $("#title-screen"),
  select: $("#select-screen"),
  winner: $("#winner-screen"),
};
const fightHint = $("#fight-hint");
const touchControls = $("#touch-controls");
const announcer = $("#announcer");
const cards = $$(".fighter-card");
const controls = new Controls();
const audio = new ArcadeAudio();
let selectedId = "matar";
let ready = false;
let uiState = "loading";

function showScreen(name) {
  uiState = name;
  Object.entries(screens).forEach(([key, element]) => element.classList.toggle("is-hidden", key !== name));
  const fighting = name === "fight";
  fightHint.classList.toggle("is-hidden", !fighting);
  touchControls.classList.toggle("is-hidden", !fighting);
}

function announce(text) {
  announcer.textContent = "";
  requestAnimationFrame(() => { announcer.textContent = text; });
}

function selectCard(id, focus = false) {
  selectedId = id;
  cards.forEach((card) => {
    const selected = card.dataset.fighter === id;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
    if (selected && focus) card.focus({ preventScroll: true });
  });
  audio.event("select");
}

function openSelect() {
  if (!ready) return;
  engine.showSelect();
  controls.clear();
  showScreen("select");
  selectCard(selectedId, true);
  announce("Kies Matar of Gauthier. Beide vechters hebben gelijke basisstats.");
}

function beginMatch(id = selectedId) {
  selectedId = id;
  audio.ensure();
  controls.clear();
  showScreen("fight");
  engine.startMatch(id);
  $("#game").focus({ preventScroll: true });
}

function showWinner(detail) {
  const winner = detail.winner;
  $("#winner-portrait").src = winner.portrait;
  $("#winner-portrait").alt = `${winner.name}, winnaar van de match`;
  $("#winner-name").textContent = winner.name;
  $("#winner-score").textContent = detail.score.replace("-", "–");
  showScreen("winner");
  announce(`${winner.name} wint de match met ${detail.score}.`);
  $("#rematch").focus({ preventScroll: true });
}

const engine = new SkumicEngine($("#game"), (type, detail) => {
  if (type === "ready") {
    ready = true;
    showScreen("title");
    $("#start").focus({ preventScroll: true });
  }
  if (type === "announce") announce(detail.text);
  if (type === "fight") announce("Fight!");
  if (type === "pause") announce(detail.paused ? "Game gepauzeerd" : "Game hervat");
  if (type === "match-over") showWinner(detail);
  audio.event(type, detail);
});

engine.setInputProvider(() => controls.frame());
engine.startLoop();
engine.load().catch((error) => {
  screens.loading.innerHTML = `<div class="error-mark">!</div><p>DE GAME KON NIET LADEN</p><small>${error.message}</small>`;
  announce(error.message);
});

$("#start").addEventListener("click", () => {
  audio.ensure();
  openSelect();
});

cards.forEach((card) => {
  card.addEventListener("focus", () => selectCard(card.dataset.fighter));
  card.addEventListener("mouseenter", () => selectCard(card.dataset.fighter));
  card.addEventListener("click", () => beginMatch(card.dataset.fighter));
});

$("#rematch").addEventListener("click", () => {
  audio.ensure();
  controls.clear();
  showScreen("fight");
  engine.rematch();
  $("#game").focus({ preventScroll: true });
});

$("#reselect").addEventListener("click", openSelect);

$("#mute").addEventListener("click", () => {
  const muted = audio.toggle();
  $("#mute").textContent = muted ? "×" : "♪";
  $("#mute").setAttribute("aria-label", muted ? "Geluid aanzetten" : "Geluid uitzetten");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    if (uiState === "title") {
      event.preventDefault();
      openSelect();
    } else if (uiState === "select") {
      event.preventDefault();
      beginMatch(selectedId);
    } else if (uiState === "winner") {
      event.preventDefault();
      $("#rematch").click();
    }
  }
  if (uiState === "select" && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
    event.preventDefault();
    selectCard(selectedId === "matar" ? "gauthier" : "matar", true);
  }
  if (event.code === "Escape" && uiState === "select") {
    engine.showTitle();
    showScreen("title");
  }
  if (event.code === "KeyP" && uiState === "fight") {
    event.preventDefault();
    engine.togglePause();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && uiState === "fight" && engine.state === "fighting") engine.togglePause();
});

window.addEventListener("gamepadconnected", () => announce("Gamepad gevonden. Keyboard blijft de hoofdcontrole voor deze versie."));

window.skumicGame = Object.freeze({
  getState: () => ({
    state: engine.state,
    round: engine.round,
    timer: Math.ceil(engine.roundTimer),
    player: engine.player ? { id: engine.player.config.id, hp: engine.player.hp, rounds: engine.player.roundWins } : null,
    cpu: engine.cpu ? { id: engine.cpu.config.id, hp: engine.cpu.hp, rounds: engine.cpu.roundWins } : null,
  }),
  startMatch: (fighterId = "matar") => beginMatch(FIGHTERS[fighterId] ? fighterId : "matar"),
  rematch: () => $("#rematch").click(),
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool) => {
    void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
  };

  register({
    name: "read_fight_state",
    title: "Read fight state",
    description: "Read the current visible Skumic Fighters screen, round, timer, health, and score without changing the game.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      return window.skumicGame.getState();
    },
  });

  register({
    name: "start_fight",
    title: "Start a fight",
    description: "Start the visible best-of-three match with Matar or Gauthier as the player's fighter.",
    inputSchema: {
      type: "object",
      properties: { fighterId: { type: "string", enum: ["matar", "gauthier"] } },
      required: ["fighterId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!ready) throw new Error("The game is still loading.");
      if (!input || !FIGHTERS[input.fighterId]) throw new TypeError("fighterId must be matar or gauthier.");
      beginMatch(input.fighterId);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return window.skumicGame.getState();
    },
  });
}

registerWebMcpTools();
