import { FIGHTERS, STAGES } from "./roster-v2.mjs?v=9";
import { CPU_DIFFICULTIES, FighterGame } from "./engine-v2.mjs?v=11";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

class Controls {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.keyMap = new Map([
      ["ArrowLeft", "left"],
      ["ArrowRight", "right"],
      ["ArrowDown", "down"],
      ["ArrowUp", "jump"],
      ["KeyA", "punch"],
      ["KeyS", "kick"],
      ["KeyD", "heavy"],
      ["KeyF", "special1"],
      ["KeyG", "special2"],
      ["KeyC", "guard"],
      ["ShiftLeft", "guard"],
      ["ShiftRight", "guard"],
      ["KeyW", "jump"],
      ["KeyJ", "punch"],
      ["KeyK", "kick"],
      ["KeyL", "heavy"],
      ["KeyU", "special1"],
      ["KeyI", "special2"],
      ["Space", "jump"],
      ["a", "punch"],
      ["s", "kick"],
      ["d", "heavy"],
      ["f", "special1"],
      ["g", "special2"],
      ["c", "guard"],
    ]);
    this.pulsed = new Set(["jump", "punch", "kick", "heavy", "special1", "special2"]);
    this.bindKeyboard();
    this.bindTouch();
  }

  bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      const control = this.keyMap.get(event.code) || this.keyMap.get(event.key?.toLowerCase());
      if (!control) return;
      event.preventDefault();
      if (!event.repeat) this.pressed.add(control);
      this.held.add(control);
    });
    window.addEventListener("keyup", (event) => {
      const control = this.keyMap.get(event.code) || this.keyMap.get(event.key?.toLowerCase());
      if (!control) return;
      event.preventDefault();
      this.held.delete(control);
    });
    window.addEventListener("blur", () => this.clear());
  }

  bindTouch() {
    $$('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      const release = (event) => {
        event.preventDefault();
        this.held.delete(control);
        button.classList.remove("is-held");
      };
      const press = (event) => {
        event.preventDefault();
        if (event.pointerId !== undefined) button.setPointerCapture?.(event.pointerId);
        this.held.add(control);
        this.pressed.add(control);
        button.classList.add("is-held");
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("touchstart", press, { passive: false });
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("touchend", release, { passive: false });
      button.addEventListener("touchcancel", release, { passive: false });
      button.addEventListener("lostpointercapture", release);
    });
  }

  sample() {
    const input = {
      left: this.held.has("left"),
      right: this.held.has("right"),
      down: this.held.has("down"),
      jump: this.pressed.has("jump"),
      punch: this.pressed.has("punch"),
      kick: this.pressed.has("kick"),
      heavy: this.pressed.has("heavy"),
      special1: this.pressed.has("special1"),
      special2: this.pressed.has("special2"),
      guard: this.held.has("guard"),
    };
    for (const control of this.pulsed) this.pressed.delete(control);
    return input;
  }

  clear() {
    this.held.clear();
    this.pressed.clear();
    $$('[data-control].is-held').forEach((button) => button.classList.remove("is-held"));
  }
}

class ArcadeAudio {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  ensure() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === "suspended") void this.context.resume();
  }

  tone(frequency, duration = 0.08, type = "square", volume = 0.025, slide = 0) {
    if (this.muted) return;
    this.ensure();
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(Math.max(35, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  event(type, detail = {}) {
    if (type === "fight") this.tone(180, 0.18, "square", 0.04, 260);
    if (type === "projectile") {
      const vinyl = detail.fighter === "matar";
      this.tone(vinyl ? 294 : 440, 0.13, "square", 0.022, vinyl ? -66 : 130);
    }
    if (type === "hit") {
      if (detail.blocked) this.tone(420, 0.045, "square", 0.018, -90);
      else this.tone(detail.counter ? 82 : 115, detail.counter ? 0.14 : 0.075, "sawtooth", 0.04, -48);
    }
    if (type === "round-end") this.tone(detail.message === "KO" ? 76 : 120, 0.42, "sawtooth", 0.045, -38);
    if (type === "match-over") {
      this.tone(196, 0.12, "square", 0.025, 98);
      window.setTimeout(() => this.tone(294, 0.2, "square", 0.025, 98), 125);
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (!this.muted) this.ensure();
    return this.muted;
  }
}

const arcade = $("#arcade");
const screens = {
  loading: $("#loading-screen"),
  title: $("#title-screen"),
  select: $("#select-screen"),
  difficulty: $("#difficulty-screen"),
  stage: $("#stage-screen"),
  winner: $("#winner-screen"),
};
const cards = $$(".fighter-card");
const difficultyCards = $$(".difficulty-card");
const stageCards = $$(".stage-card");
const controls = new Controls();
const audio = new ArcadeAudio();
let selectedId = "matar";
let selectedDifficulty = "easy";
let selectedStageId = "the-stage";
let uiState = "loading";

function announce(text) {
  $("#announcer").textContent = "";
  requestAnimationFrame(() => { $("#announcer").textContent = text; });
}

function showScreen(name) {
  uiState = name;
  arcade.dataset.screen = name;
  for (const [id, screen] of Object.entries(screens)) screen.classList.toggle("is-hidden", id !== name);
}

function selectFighter(id, focus = false) {
  if (!FIGHTERS[id]) return;
  selectedId = id;
  cards.forEach((card) => {
    const selected = card.dataset.fighter === id;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
    card.querySelector(".pick-tag").textContent = selected ? "P1 // SELECTED" : "CPU // OPPONENT";
    if (selected && focus) card.focus({ preventScroll: true });
  });
  $("#select-role-left").textContent = id === "matar" ? "PLAYER 1" : "CPU OPPONENT";
  $("#select-role-right").textContent = id === "gauthier" ? "PLAYER 1" : "CPU OPPONENT";
  $("#select-screen").dataset.fighter = id;
  $("#selected-fighter-name").textContent = FIGHTERS[id].name;
  $("#selected-fighter-callout").textContent = FIGHTERS[id].nickname;
  announce(`${FIGHTERS[id].name}, ${FIGHTERS[id].nickname}.`);
}

function selectDifficulty(level, focus = false) {
  if (!CPU_DIFFICULTIES[level]) return;
  selectedDifficulty = level;
  difficultyCards.forEach((card) => {
    const selected = card.dataset.difficulty === level;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
    if (selected && focus) card.focus({ preventScroll: true });
  });
  announce(`Moeilijkheid ${CPU_DIFFICULTIES[level].label}.`);
}

function selectStage(id, focus = false) {
  if (!STAGES[id]) return;
  selectedStageId = id;
  stageCards.forEach((card) => {
    const selected = card.dataset.stage === id;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
    if (selected && focus) card.focus({ preventScroll: true });
  });
  engine.setStage(id);
  announce(`Locatie ${STAGES[id].name} geselecteerd.`);
}

function openSelect() {
  controls.clear();
  engine.showSelect();
  showScreen("select");
  selectFighter(selectedId);
  $("#confirm-fighter").focus({ preventScroll: true });
}

function openDifficulty() {
  controls.clear();
  engine.showDifficulty();
  showScreen("difficulty");
  selectDifficulty(selectedDifficulty);
  $("#confirm-difficulty").focus({ preventScroll: true });
}

function openStageSelect() {
  controls.clear();
  engine.showStageSelect();
  showScreen("stage");
  selectStage(selectedStageId);
  $("#confirm-stage").focus({ preventScroll: true });
}

function beginMatch(id = selectedId, difficulty = selectedDifficulty, stageId = selectedStageId) {
  selectedId = id;
  selectedDifficulty = CPU_DIFFICULTIES[difficulty] ? difficulty : "easy";
  selectedStageId = STAGES[stageId] ? stageId : "the-stage";
  audio.ensure();
  controls.clear();
  showScreen("fight");
  engine.startMatch(id, selectedDifficulty, selectedStageId);
  $("#game").focus({ preventScroll: true });
  announce(`${FIGHTERS[id].name} tegen ${FIGHTERS[id === "matar" ? "gauthier" : "matar"].name} in ${STAGES[selectedStageId].name}. ${CPU_DIFFICULTIES[selectedDifficulty].label}. Round 1.`);
}

function showWinner(detail) {
  const winner = detail.winner;
  $("#winner-screen").style.backgroundImage = `radial-gradient(circle, rgb(18 25 41 / 72%), rgb(2 3 9 / 94%) 68%), url("${STAGES[selectedStageId].image}")`;
  $("#winner-portrait").src = winner.portrait;
  $("#winner-portrait").alt = `${winner.name}, winnaar van de match`;
  $("#winner-name").textContent = winner.name;
  const winnerScore = detail.playerWon ? detail.score : detail.score.split("-").reverse().join("-");
  $("#winner-score").textContent = winnerScore.replace("-", "–");
  showScreen("winner");
  announce(`${winner.name} wint de match met ${winnerScore}.`);
  $("#rematch").focus({ preventScroll: true });
}

const engine = new FighterGame($("#game"), (type, detail) => {
  if (type === "ready") {
    showScreen("title");
    $("#start").focus({ preventScroll: true });
  }
  if (type === "round-start") announce(`Round ${detail.round}.`);
  if (type === "fight") announce("Fight!");
  if (type === "pause") announce(detail.paused ? "Game gepauzeerd" : "Game hervat");
  if (type === "match-over") showWinner(detail);
  audio.event(type, detail);
});

engine.setInputProvider(() => controls.sample());
engine.startLoop();
const pixelFontsReady = document.fonts
  ? Promise.all([
      document.fonts.load('16px "Skumic Pixel"'),
      document.fonts.load('16px "Skumic Arcade"'),
    ]).catch(() => {})
  : Promise.resolve();

pixelFontsReady.then(() => engine.load()).catch((error) => {
  screens.loading.innerHTML = `<div class="bolt">!</div><p>GAME LOAD FAILED</p><small>${error.message}</small>`;
  announce(error.message);
});

$("#start").addEventListener("click", () => {
  audio.ensure();
  openSelect();
});

cards.forEach((card) => {
  card.addEventListener("click", () => selectFighter(card.dataset.fighter, true));
});

$("#confirm-fighter").addEventListener("click", openDifficulty);

difficultyCards.forEach((card) => {
  card.addEventListener("click", () => selectDifficulty(card.dataset.difficulty, true));
});

$("#difficulty-back").addEventListener("click", openSelect);
$("#confirm-difficulty").addEventListener("click", openStageSelect);
stageCards.forEach((card) => {
  card.addEventListener("click", () => selectStage(card.dataset.stage, true));
});
$("#stage-back").addEventListener("click", openDifficulty);
$("#confirm-stage").addEventListener("click", () => beginMatch());

$("#rematch").addEventListener("click", () => {
  audio.ensure();
  controls.clear();
  showScreen("fight");
  engine.rematch();
  $("#game").focus({ preventScroll: true });
});

$("#reselect").addEventListener("click", openSelect);

[$("#mute"), $("#select-mute")].forEach((button) => {
  button.addEventListener("click", () => {
    const muted = audio.toggle();
    [$("#mute"), $("#select-mute")].forEach((control) => {
      control.textContent = muted ? "×" : "♪";
      control.setAttribute("aria-label", muted ? "Geluid aanzetten" : "Geluid uitzetten");
    });
  });
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    if (uiState === "title") {
      event.preventDefault();
      openSelect();
    } else if (uiState === "select") {
      event.preventDefault();
      openDifficulty();
    } else if (uiState === "difficulty") {
      event.preventDefault();
      openStageSelect();
    } else if (uiState === "stage") {
      event.preventDefault();
      beginMatch();
    } else if (uiState === "winner") {
      event.preventDefault();
      $("#rematch").click();
    }
  }
  if (uiState === "select" && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
    event.preventDefault();
    selectFighter(selectedId === "matar" ? "gauthier" : "matar", true);
  }
  if (uiState === "difficulty" && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
    event.preventDefault();
    const levels = Object.keys(CPU_DIFFICULTIES);
    const current = levels.indexOf(selectedDifficulty);
    const direction = event.code === "ArrowRight" ? 1 : -1;
    selectDifficulty(levels[(current + direction + levels.length) % levels.length], true);
  }
  if (uiState === "stage" && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
    event.preventDefault();
    selectStage(selectedStageId === "the-stage" ? "recording-studio" : "the-stage", true);
  }
  if (event.code === "Escape" && uiState === "select") {
    engine.showTitle();
    showScreen("title");
  }
  if (event.code === "Escape" && uiState === "difficulty") openSelect();
  if (event.code === "Escape" && uiState === "stage") openDifficulty();
  if (event.code === "KeyP" && uiState === "fight") {
    event.preventDefault();
    engine.togglePause();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && uiState === "fight" && engine.state === "fight") engine.togglePause();
});

window.skumicGame = Object.freeze({
  version: "3.4-vinyl-stages",
  getState: () => engine.getState(),
  startMatch: (fighterId = "matar", difficulty = "easy", stageId = "the-stage") => beginMatch(FIGHTERS[fighterId] ? fighterId : "matar", CPU_DIFFICULTIES[difficulty] ? difficulty : "easy", STAGES[stageId] ? stageId : "the-stage"),
  selectFighter: (fighterId = "matar") => selectFighter(FIGHTERS[fighterId] ? fighterId : "matar"),
  selectDifficulty: (difficulty = "easy") => selectDifficulty(CPU_DIFFICULTIES[difficulty] ? difficulty : "easy"),
  selectStage: (stageId = "the-stage") => selectStage(STAGES[stageId] ? stageId : "the-stage"),
  rematch: () => $("#rematch").click(),
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool) => void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
  register({
    name: "read_fight_state",
    title: "Read fight state",
    description: "Read the visible Skumic Fighters screen, round, timer, health, and score without changing the game.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => ({ screen: uiState, ...engine.getState() }),
  });
  register({
    name: "start_fight",
    title: "Start a fight",
    description: "Start the best-of-three match with Matar or Gauthier, a CPU difficulty, and a location.",
    inputSchema: {
      type: "object",
      properties: {
        fighterId: { type: "string", enum: ["matar", "gauthier"] },
        difficulty: { type: "string", enum: ["easy", "normal", "hard"], default: "easy" },
        stageId: { type: "string", enum: ["the-stage", "recording-studio"], default: "the-stage" },
      },
      required: ["fighterId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!FIGHTERS[input?.fighterId]) throw new TypeError("fighterId must be matar or gauthier");
      beginMatch(input.fighterId, input.difficulty || "easy", input.stageId || "the-stage");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return { screen: uiState, ...engine.getState() };
    },
  });
}

registerWebMcpTools();
