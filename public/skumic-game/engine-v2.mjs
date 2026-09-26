import { FIGHTERS, INPUT_LABELS, STAGE, STAGES, otherFighter } from "./roster-v2.mjs?v=10";

const W = 480;
const H = 270;
const RENDER_SCALE = 2;
const STEP = 1 / 60;
const EPSILON = 0.0001;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const approach = (value, target, amount) => value + clamp(target - value, -amount, amount);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Asset ontbreekt: ${src}`));
    image.src = src;
  });
}

function sliceAtlas(image) {
  const frames = [];
  const width = image.naturalWidth / 4;
  const height = image.naturalHeight / 2;
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const frame = document.createElement("canvas");
      frame.width = width;
      frame.height = height;
      const ctx = frame.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, column * width, row * height, width, height, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      let lastVisibleRow = height - 1;
      for (let y = height - 1; y >= 0; y -= 1) {
        let found = false;
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] > 127) {
            found = true;
            break;
          }
        }
        if (found) {
          lastVisibleRow = y;
          break;
        }
      }
      frame.footOffset = height - 1 - lastVisibleRow;
      frames.push(frame);
    }
  }
  return frames;
}

function emptyInput() {
  return {
    left: false,
    right: false,
    down: false,
    jump: false,
    punch: false,
    kick: false,
    heavy: false,
    special1: false,
    special2: false,
    guard: false,
  };
}

class Fighter {
  constructor(config, side) {
    this.config = config;
    this.side = side;
    this.roundWins = 0;
    this.cooldowns = {};
    this.action = null;
    this.inputBuffer = null;
    this.resetRound(side === "player" ? 128 : 352, side === "player" ? 1 : -1);
  }

  resetRound(x, facing) {
    this.x = x;
    this.y = STAGE.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.config.stats.maxHp;
    this.displayHp = this.hp;
    this.stun = 0;
    this.flash = 0;
    this.action = null;
    this.inputBuffer = null;
    this.cooldowns = {};
    this.crouching = false;
    this.guarding = false;
    this.ko = false;
    this.victorious = false;
    this.walkClock = 0;
    this.projectileRequest = null;
  }

  get grounded() {
    return this.y >= STAGE.groundY - EPSILON;
  }

  get canAct() {
    return !this.ko && this.stun <= 0 && !this.action;
  }

  queueAction(input) {
    const key = ["special2", "special1", "heavy", "kick", "punch"].find((name) => input[name]);
    if (key) this.inputBuffer = { key, remaining: 0.14 };
  }

  startBufferedAction() {
    if (!this.inputBuffer || !this.canAct) return false;
    const { key } = this.inputBuffer;
    const move = this.config.moves[key];
    if (!move || (this.cooldowns[key] || 0) > 0) return false;
    this.inputBuffer = null;
    this.action = { key, move, elapsed: 0, connected: false, spawned: false };
    this.cooldowns[key] = move.cooldown;
    this.crouching = false;
    this.guarding = false;
    return true;
  }

  update(dt, input, opponent) {
    this.projectileRequest = null;
    this.displayHp = lerp(this.displayHp, this.hp, 1 - Math.pow(0.0003, dt));
    this.flash = Math.max(0, this.flash - dt);
    this.stun = Math.max(0, this.stun - dt);
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    if (this.inputBuffer) {
      this.inputBuffer.remaining -= dt;
      if (this.inputBuffer.remaining <= 0) this.inputBuffer = null;
    }
    this.queueAction(input);

    if (!this.action && this.stun <= 0 && !this.ko) this.facing = opponent.x >= this.x ? 1 : -1;
    const awayHeld = this.facing === 1 ? input.left : input.right;
    this.guarding = this.canAct && this.grounded && (awayHeld || input.guard);

    if (this.ko) {
      this.vx *= Math.pow(0.01, dt);
    } else if (this.stun > 0) {
      this.action = null;
      this.crouching = false;
      this.guarding = false;
    } else if (this.action) {
      this.advanceAction(dt);
    } else if (!this.startBufferedAction()) {
      this.handleNeutral(dt, input);
    }

    const airControl = this.grounded ? 1 : this.config.stats.airControl;
    this.x += this.vx * dt * airControl;
    if (!this.grounded || this.vy < 0) {
      this.vy += this.config.stats.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= STAGE.groundY) {
        this.y = STAGE.groundY;
        this.vy = 0;
      }
    }
    this.x = clamp(this.x, STAGE.bounds.left, STAGE.bounds.right);
    this.walkClock += Math.abs(this.vx) * dt * 0.045;
  }

  handleNeutral(dt, input) {
    this.crouching = this.grounded && input.down;
    let direction = 0;
    if (!this.crouching) direction = Number(input.right) - Number(input.left);
    const target = direction * this.config.stats.moveSpeed;
    this.vx = approach(this.vx, target, this.config.stats.acceleration * dt);
    if (direction === 0) this.vx *= Math.pow(0.001, dt);
    if (input.jump && this.grounded && !this.crouching) {
      this.vy = -this.config.stats.jumpSpeed;
      this.y -= 1;
      this.guarding = false;
    }
  }

  advanceAction(dt) {
    const action = this.action;
    const before = action.elapsed;
    action.elapsed += dt;
    const { move } = action;
    if (move.kind === "dash" && this.isActive()) this.vx = this.facing * move.dashSpeed;
    else this.vx *= Math.pow(0.0003, dt);
    if (move.kind === "projectile" && !action.spawned && before < move.startup && action.elapsed >= move.startup) {
      action.spawned = true;
      this.projectileRequest = move;
    }
    if (action.elapsed >= move.startup + move.active + move.recovery) this.action = null;
  }

  isActive() {
    if (!this.action) return false;
    const { move, elapsed } = this.action;
    return elapsed >= move.startup && elapsed < move.startup + move.active;
  }

  isCountering() {
    return this.isActive() && this.action?.move.kind === "counter";
  }

  isBlocking(attacker) {
    if (!this.guarding || !this.grounded || this.stun > 0 || this.ko) return false;
    return attacker.x > this.x ? this.facing === 1 : this.facing === -1;
  }

  hurtbox() {
    const height = this.crouching ? 78 : 112;
    return { x: this.x - 19, y: this.y - height, w: 38, h: height };
  }

  attackBox() {
    if (!this.isActive() || !this.action.move.hitbox) return null;
    const box = this.action.move.hitbox;
    return {
      x: this.facing === 1 ? this.x + box.x : this.x - box.x - box.w,
      y: this.y + box.y,
      w: box.w,
      h: box.h,
    };
  }

  frameIndex(time) {
    if (this.victorious) return 7;
    if (this.ko || this.stun > 0) return 6;
    if (this.action) return this.action.move.frame;
    if (!this.grounded || this.crouching) return 1;
    return Math.floor((time * 3 + this.walkClock) % 2);
  }
}

export const CPU_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: "EASY", opening: 0.58, thinkMin: 0.34, thinkRange: 0.22, guard: 0.14, counter: 0.04, farSpecial: 0.08, midSpecial: 0.08, approach: 0.66, attack: 0.42 }),
  normal: Object.freeze({ label: "NORMAL", opening: 0.40, thinkMin: 0.21, thinkRange: 0.16, guard: 0.30, counter: 0.11, farSpecial: 0.16, midSpecial: 0.15, approach: 0.74, attack: 0.62 }),
  hard: Object.freeze({ label: "HARD", opening: 0.24, thinkMin: 0.11, thinkRange: 0.11, guard: 0.52, counter: 0.23, farSpecial: 0.27, midSpecial: 0.24, approach: 0.84, attack: 0.82 }),
});

class CPUBrain {
  constructor(level = "easy") {
    this.held = emptyInput();
    this.decision = 0;
    this.setDifficulty(level);
  }

  setDifficulty(level) {
    this.level = CPU_DIFFICULTIES[level] ? level : "easy";
    this.profile = CPU_DIFFICULTIES[this.level];
  }

  reset() {
    this.held = emptyInput();
    this.decision = this.profile.opening;
  }

  frame(dt, self, foe) {
    const input = { ...this.held, jump: false, punch: false, kick: false, heavy: false, special1: false, special2: false };
    if (!self.canAct) {
      this.decision = Math.max(this.decision, 0.20);
      return input;
    }
    this.decision -= dt;
    if (this.decision > 0) return input;
    this.decision = this.profile.thinkMin + Math.random() * this.profile.thinkRange;
    this.held.left = false;
    this.held.right = false;
    this.held.down = false;

    const distance = Math.abs(foe.x - self.x);
    const towardRight = foe.x > self.x;
    const toward = towardRight ? "right" : "left";
    const away = towardRight ? "left" : "right";
    const incoming = foe.action && distance < 90 && foe.action.elapsed > foe.action.move.startup * 0.65;

    if (incoming && Math.random() < this.profile.guard) {
      this.held[away] = true;
      if (self.config.id === "gauthier" && (self.cooldowns.special2 || 0) <= 0 && Math.random() < this.profile.counter) {
        this.held[away] = false;
        input.special2 = true;
      }
      return input;
    }

    if (distance > 120) {
      this.held[toward] = true;
      if (self.config.id === "matar" && distance < 265 && (self.cooldowns.special1 || 0) <= 0 && Math.random() < this.profile.farSpecial) {
        this.held[toward] = false;
        input.special1 = true;
      }
      return input;
    }

    if (distance > 70) {
      const roll = Math.random();
      if (roll < this.profile.midSpecial && (self.cooldowns.special1 || 0) <= 0) input.special1 = true;
      else if (roll < this.profile.midSpecial * 1.7 && (self.cooldowns.special2 || 0) <= 0) input.special2 = true;
      else if (roll < this.profile.approach) this.held[toward] = true;
      else this.held[away] = true;
      return input;
    }

    const roll = Math.random();
    const attack = this.profile.attack;
    if (roll < attack * 0.30) input.punch = true;
    else if (roll < attack * 0.55) input.kick = true;
    else if (roll < attack * 0.72) input.heavy = true;
    else if (roll < attack * 0.86 && (self.cooldowns.special1 || 0) <= 0) input.special1 = true;
    else if (roll < attack && (self.cooldowns.special2 || 0) <= 0) input.special2 = true;
    else this.held[away] = true;
    return input;
  }
}

export class FighterGame {
  constructor(canvas, emit = () => {}) {
    this.canvas = canvas;
    this.canvas.width = W * RENDER_SCALE;
    this.canvas.height = H * RENDER_SCALE;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.emit = emit;
    this.state = "boot";
    this.inputProvider = emptyInput;
    this.assets = { stages: {}, portraits: {}, frames: {} };
    this.player = null;
    this.cpu = null;
    this.difficulty = "easy";
    this.stageId = "the-stage";
    this.brain = new CPUBrain(this.difficulty);
    this.round = 0;
    this.roundTimer = 60;
    this.stateTimer = 0;
    this.roundMessage = "";
    this.projectiles = [];
    this.particles = [];
    this.visualTime = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.running = false;
    this.lastTime = 0;
    this.accumulator = 0;
    this.pendingPlayerInput = emptyInput();
  }

  setInputProvider(provider) {
    this.inputProvider = provider;
  }

  async load() {
    const [stageImages, matarPortrait, gauthierPortrait, matarAtlas, gauthierAtlas] = await Promise.all([
      Promise.all(Object.values(STAGES).map(async (stage) => [stage.id, await loadImage(stage.image)])),
      loadImage(FIGHTERS.matar.portrait),
      loadImage(FIGHTERS.gauthier.portrait),
      loadImage(FIGHTERS.matar.atlas),
      loadImage(FIGHTERS.gauthier.atlas),
    ]);
    this.assets.stages = Object.fromEntries(stageImages);
    this.assets.portraits.matar = matarPortrait;
    this.assets.portraits.gauthier = gauthierPortrait;
    this.assets.frames.matar = sliceAtlas(matarAtlas);
    this.assets.frames.gauthier = sliceAtlas(gauthierAtlas);
    this.state = "title";
    this.emit("ready", {});
    this.render();
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    const frame = (now) => {
      if (!this.lastTime) this.lastTime = now;
      const elapsed = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      if (this.state !== "paused") this.accumulator += elapsed;
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  showTitle() {
    this.state = "title";
    this.player = null;
    this.cpu = null;
    this.projectiles = [];
    this.particles = [];
    this.pendingPlayerInput = emptyInput();
  }

  showSelect() {
    this.state = "select";
    this.player = null;
    this.cpu = null;
    this.pendingPlayerInput = emptyInput();
  }

  showDifficulty() {
    this.state = "difficulty";
  }

  showStageSelect() {
    this.state = "stage-select";
  }

  setStage(stageId = "the-stage") {
    this.stageId = STAGES[stageId] ? stageId : "the-stage";
  }

  setDifficulty(level = "easy") {
    this.difficulty = CPU_DIFFICULTIES[level] ? level : "easy";
    this.brain.setDifficulty(this.difficulty);
  }

  startMatch(playerId = "matar", difficulty = this.difficulty, stageId = this.stageId) {
    this.setDifficulty(difficulty);
    this.setStage(stageId);
    const chosen = FIGHTERS[playerId] || FIGHTERS.matar;
    this.player = new Fighter(chosen, "player");
    this.cpu = new Fighter(FIGHTERS[otherFighter(chosen.id)], "cpu");
    this.round = 0;
    this.player.roundWins = 0;
    this.cpu.roundWins = 0;
    this.beginRound();
  }

  beginRound() {
    this.round += 1;
    this.player.resetRound(126, 1);
    this.cpu.resetRound(354, -1);
    this.brain.reset();
    this.roundTimer = 60;
    this.state = "round-intro";
    this.stateTimer = 1.1;
    this.roundMessage = `ROUND ${this.round}`;
    this.projectiles = [];
    this.particles = [];
    this.hitstop = 0;
    this.shake = 0;
    this.pendingPlayerInput = emptyInput();
    this.emit("round-start", { round: this.round });
  }

  rematch() {
    if (!this.player) return;
    this.startMatch(this.player.config.id);
  }

  togglePause() {
    if (!["fight", "paused"].includes(this.state)) return false;
    this.state = this.state === "paused" ? "fight" : "paused";
    this.emit("pause", { paused: this.state === "paused" });
    return this.state === "paused";
  }

  update(dt) {
    this.visualTime += dt;
    this.shake *= Math.pow(0.002, dt);
    this.updateParticles(dt);

    if (["boot", "title", "select", "difficulty", "stage-select", "match-over", "paused"].includes(this.state)) return;
    if (this.state === "round-intro") {
      const introInput = this.inputProvider() || emptyInput();
      for (const key of Object.keys(this.pendingPlayerInput)) {
        if (introInput[key]) this.pendingPlayerInput[key] = true;
      }
      this.stateTimer -= dt;
      this.roundMessage = this.stateTimer > 0.72 ? `ROUND ${this.round}` : "FIGHT!";
      if (this.stateTimer <= 0) {
        this.state = "fight";
        this.emit("fight", {});
      }
      return;
    }
    if (this.state === "round-end") {
      this.stateTimer -= dt;
      this.player.update(dt, emptyInput(), this.cpu);
      this.cpu.update(dt, emptyInput(), this.player);
      if (this.stateTimer <= 0) {
        if (this.player.roundWins >= 2 || this.cpu.roundWins >= 2) this.finishMatch();
        else this.beginRound();
      }
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    const playerInput = { ...(this.inputProvider() || emptyInput()) };
    for (const key of Object.keys(this.pendingPlayerInput)) {
      if (this.pendingPlayerInput[key]) playerInput[key] = true;
      this.pendingPlayerInput[key] = false;
    }
    const cpuInput = this.brain.frame(dt, this.cpu, this.player);
    this.player.update(dt, playerInput, this.cpu);
    this.cpu.update(dt, cpuInput, this.player);
    this.spawnRequestedProjectile(this.player);
    this.spawnRequestedProjectile(this.cpu);
    this.resolveMelee(this.player, this.cpu);
    this.resolveMelee(this.cpu, this.player);
    this.updateProjectiles(dt);
    this.resolvePush();
    this.roundTimer = Math.max(0, this.roundTimer - dt);

    if (this.player.hp <= 0 || this.cpu.hp <= 0) {
      const winner = this.player.hp > 0 ? this.player : this.cpu.hp > 0 ? this.cpu : null;
      this.endRound(winner, "KO");
    } else if (this.roundTimer <= 0) {
      const winner = this.player.hp === this.cpu.hp ? null : this.player.hp > this.cpu.hp ? this.player : this.cpu;
      this.endRound(winner, winner ? "TIME" : "DRAW");
    }
  }

  spawnRequestedProjectile(fighter) {
    const move = fighter.projectileRequest;
    if (!move) return;
    this.projectiles.push({
      owner: fighter,
      move,
      x: fighter.x + fighter.facing * 37,
      y: fighter.y - (move.id === "vocal-wave" ? 112 : 91),
      vx: fighter.facing * move.projectileSpeed,
      w: move.projectileSize.w,
      h: move.projectileSize.h,
      life: 1.4,
    });
    this.emit("projectile", { fighter: fighter.config.id });
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.life -= dt;
      const target = projectile.owner === this.player ? this.cpu : this.player;
      const box = { x: projectile.x - projectile.w / 2, y: projectile.y - projectile.h / 2, w: projectile.w, h: projectile.h };
      if (projectile.life > 0 && overlaps(box, target.hurtbox())) {
        if (target.isCountering()) {
          projectile.vx *= -1;
          projectile.owner = target;
          projectile.x += Math.sign(projectile.vx) * 14;
          target.action.connected = true;
          this.makeHitSparks(projectile.x, projectile.y, "#ffe600", 10);
          this.hitstop = 0.055;
        } else {
          this.applyHit(projectile.owner, target, projectile.move, { projectile: true });
          projectile.life = 0;
        }
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && projectile.x > -40 && projectile.x < W + 40);
  }

  resolveMelee(attacker, target) {
    if (!attacker.isActive() || attacker.action.connected || attacker.action.move.kind === "projectile" || attacker.action.move.kind === "counter") return;
    const hitbox = attacker.attackBox();
    if (!hitbox || !overlaps(hitbox, target.hurtbox())) return;
    if (target.isCountering()) {
      target.action.connected = true;
      attacker.action.connected = true;
      this.applyHit(target, attacker, target.action.move, { counter: true });
      return;
    }
    attacker.action.connected = true;
    this.applyHit(attacker, target, attacker.action.move);
  }

  applyHit(attacker, target, move, flags = {}) {
    const blocked = !flags.counter && target.isBlocking(attacker);
    const damage = Math.round(move.damage * (blocked ? 0.15 : 1) / target.config.stats.defense);
    target.hp = Math.max(0, target.hp - damage);
    target.stun = blocked ? 0.11 : move.hitstun;
    target.flash = blocked ? 0.045 : 0.085;
    if (!blocked) {
      target.vx = attacker.facing * move.knockback.x;
      target.vy = move.knockback.y;
      if (target.vy < 0) target.y -= 1;
    } else {
      target.vx = attacker.facing * move.knockback.x * 0.22;
    }
    this.hitstop = blocked ? 0.028 : move.hitstop;
    this.shake = blocked ? 1.5 : move.damage >= 100 ? 5.5 : 3.2;
    const sparkX = (attacker.x + target.x) / 2 + attacker.facing * 10;
    const sparkY = target.y - (flags.projectile ? 91 : 82);
    this.makeHitSparks(sparkX, sparkY, blocked ? "#8be9ff" : move.spark, blocked ? 6 : flags.counter ? 14 : 10);
    this.emit("hit", { blocked, counter: Boolean(flags.counter), damage, move: move.id });
  }

  resolvePush() {
    if (!this.player.grounded || !this.cpu.grounded) return;
    const distance = this.cpu.x - this.player.x;
    const minimum = this.player.config.stats.pushRadius + this.cpu.config.stats.pushRadius;
    if (Math.abs(distance) >= minimum) return;
    const direction = distance >= 0 ? 1 : -1;
    const correction = (minimum - Math.abs(distance)) / 2;
    this.player.x = clamp(this.player.x - direction * correction, STAGE.bounds.left, STAGE.bounds.right);
    this.cpu.x = clamp(this.cpu.x + direction * correction, STAGE.bounds.left, STAGE.bounds.right);
  }

  endRound(winner, message) {
    if (this.state !== "fight") return;
    this.state = "round-end";
    this.stateTimer = 2.35;
    this.roundMessage = message;
    if (winner) {
      winner.roundWins += 1;
      winner.victorious = true;
      const loser = winner === this.player ? this.cpu : this.player;
      loser.ko = loser.hp <= 0;
      const direction = loser.x >= winner.x ? 1 : -1;
      const center = (winner.x + loser.x) / 2;
      winner.x = clamp(center - direction * 61, STAGE.bounds.left, STAGE.bounds.right);
      loser.x = clamp(center + direction * 61, STAGE.bounds.left, STAGE.bounds.right);
      winner.vx = 0;
      loser.vx = 0;
    }
    this.emit("round-end", { message, winner: winner?.config.id || null });
  }

  finishMatch() {
    const winner = this.player.roundWins >= 2 ? this.player : this.cpu;
    winner.victorious = true;
    this.state = "match-over";
    this.emit("match-over", {
      winner: winner.config,
      playerWon: winner === this.player,
      score: `${this.player.roundWins}-${this.cpu.roundWins}`,
    });
  }

  makeHitSparks(x, y, color, amount) {
    for (let index = 0; index < amount; index += 1) {
      const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.45;
      const speed = 38 + Math.random() * 92;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.13 + Math.random() * 0.18,
        maxLife: 0.31,
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const shakeX = this.shake > 0.15 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const shakeY = this.shake > 0.15 ? Math.round((Math.random() - 0.5) * this.shake * 0.5) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawStage(ctx);
    if (this.player && this.cpu) {
      this.drawProjectiles(ctx);
      const order = [this.player, this.cpu].sort((fighterA, fighterB) => {
        const priorityA = fighterA.isActive() ? 2 : Number(Boolean(fighterA.action));
        const priorityB = fighterB.isActive() ? 2 : Number(Boolean(fighterB.action));
        if (priorityA !== priorityB) return priorityA - priorityB;
        return fighterB.x - fighterA.x;
      });
      for (const fighter of order) this.drawFighter(ctx, fighter);
      this.drawParticles(ctx);
    }
    ctx.restore();
    if (this.player && this.cpu) this.drawHud(ctx);
    if (this.state === "round-intro" || this.state === "round-end") this.drawAnnouncement(ctx);
    if (this.state === "paused") this.drawPause(ctx);
  }

  drawStage(ctx) {
    if (this.assets.stages[this.stageId]) ctx.drawImage(this.assets.stages[this.stageId], 0, 0, W, H);
    else {
      ctx.fillStyle = "#060914";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(1,2,7,.17)";
    ctx.fillRect(0, 176, W, 48);
    ctx.fillStyle = "rgba(1,2,7,.4)";
    ctx.fillRect(0, 224, W, 46);
    ctx.fillStyle = "rgba(1,3,10,.64)";
    ctx.fillRect(0, 0, W, 48);
    if (this.stageId === "the-stage") {
      ctx.save();
      ctx.globalAlpha = .25;
      for (let index = 0; index < 12; index += 1) {
        const x = (index * 103 + this.visualTime * 14) % (W + 40) - 20;
        const y = (index * 61 + this.visualTime * 23) % 170;
        ctx.fillStyle = index % 2 ? "#ff66d6" : "#b9f3ff";
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      }
      ctx.restore();
    }
  }

  drawFighter(ctx, fighter) {
    const frames = this.assets.frames[fighter.config.id];
    if (!frames) return;
    const frame = frames[fighter.frameIndex(this.visualTime)] || frames[0];
    const flip = fighter.facing !== fighter.config.artFacing;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.52)";
    const shadowWidth = fighter.crouching ? 50 : 66;
    ctx.fillRect(Math.round(fighter.x - shadowWidth / 2), STAGE.groundY, shadowWidth, 5);
    ctx.translate(Math.round(fighter.x), Math.round(fighter.y));
    if (flip) ctx.scale(-1, 1);
    if (fighter.flash > 0) ctx.filter = "brightness(2.8) saturate(.25)";
    ctx.drawImage(frame, -64, -170 + (frame.footOffset || 0), 128, 170);
    ctx.filter = "none";
    if (fighter.isCountering()) {
      ctx.strokeStyle = "#ffe600";
      ctx.globalAlpha = 0.6 + Math.sin(this.visualTime * 24) * 0.2;
      ctx.lineWidth = 2;
      ctx.strokeRect(-36, -126, 72, 116);
    }
    ctx.restore();
  }

  drawProjectiles(ctx) {
    for (const projectile of this.projectiles) {
      ctx.save();
      ctx.translate(Math.round(projectile.x), Math.round(projectile.y));
      if (projectile.vx < 0) ctx.scale(-1, 1);
      if (projectile.move.id === "vinyl-throw") {
        ctx.fillStyle = "#050712";
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillRect(-11, -6, 22, 12);
        ctx.fillStyle = "#f2e6ad";
        ctx.fillRect(-7, -7, 14, 2);
        ctx.fillRect(-7, 5, 14, 2);
        ctx.fillStyle = "#ffe451";
        ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = "#12182c";
        ctx.fillRect(-1, -1, 2, 2);
      } else {
        ctx.fillStyle = "#071422";
        ctx.fillRect(-18, -8, 26, 16);
        ctx.fillStyle = "#39d9ed";
        for (let index = 0; index < 3; index += 1) {
          const x = -12 + index * 9;
          ctx.fillRect(x, -5 - index, 3, 10 + index * 2);
          ctx.fillRect(x + 3, -3 - index, 3, 6 + index * 2);
        }
        ctx.fillStyle = "#dcfbff";
        ctx.fillRect(15, -2, 4, 4);
      }
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      const size = particle.life > 0.16 ? 3 : 2;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx) {
    const maxHp = this.player.config.stats.maxHp;
    this.drawPortrait(ctx, this.player, 5, 5, false);
    this.drawPortrait(ctx, this.cpu, W - 39, 5, true);
    this.drawHealth(ctx, this.player, 43, 15, 166, false, maxHp);
    this.drawHealth(ctx, this.cpu, 271, 15, 166, true, maxHp);

    ctx.fillStyle = "#04050a";
    ctx.fillRect(220, 4, 40, 42);
    ctx.strokeStyle = "#ffe600";
    ctx.lineWidth = 2;
    ctx.strokeRect(221, 5, 38, 40);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "16px 'Skumic Arcade', monospace";
    ctx.fillStyle = "#ffe600";
    ctx.fillText(String(Math.max(0, Math.ceil(this.roundTimer))).padStart(2, "0"), 240, 25);
    ctx.font = "700 7px 'Skumic Pixel', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`R${this.round} · ${CPU_DIFFICULTIES[this.difficulty].label}`, 240, 41);

    this.drawSpecial(ctx, this.player, "special1", 43, 41);
    this.drawSpecial(ctx, this.player, "special2", 112, 41);
  }

  drawPortrait(ctx, fighter, x, y, mirrored) {
    const image = this.assets.portraits[fighter.config.id];
    ctx.save();
    ctx.fillStyle = "#060812";
    ctx.fillRect(x, y, 34, 34);
    ctx.strokeStyle = fighter.config.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, 32, 32);
    if (image) {
      if (mirrored) {
        ctx.translate(x + 34, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, y, 34, 34);
      } else ctx.drawImage(image, x, y, 34, 34);
    }
    ctx.restore();
  }

  drawHealth(ctx, fighter, x, y, width, reverse, maxHp) {
    ctx.fillStyle = "#05060c";
    ctx.fillRect(x - 2, y - 2, width + 4, 15);
    ctx.strokeStyle = "#edf3ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, width + 2, 13);
    const delayed = clamp(fighter.displayHp / maxHp, 0, 1);
    const current = clamp(fighter.hp / maxHp, 0, 1);
    ctx.fillStyle = "#fff";
    const delayedWidth = Math.round(width * delayed);
    ctx.fillRect(reverse ? x + width - delayedWidth : x, y, delayedWidth, 11);
    ctx.fillStyle = fighter.config.color;
    const currentWidth = Math.round(width * current);
    ctx.fillRect(reverse ? x + width - currentWidth : x, y, currentWidth, 11);
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 9px 'Skumic Pixel', monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = reverse ? "right" : "left";
    ctx.fillText(`${fighter.side === "player" ? "P1" : "CPU"} · ${fighter.config.name}`, reverse ? x + width : x, 10);
    ctx.font = "700 7px 'Skumic Pixel', monospace";
    ctx.fillStyle = "#d7ddeb";
    ctx.fillText(`${fighter.hp} HP`, reverse ? x + width : x, 37);
    for (let index = 0; index < 2; index += 1) {
      const pipX = reverse ? x + width - index * 10 - 7 : x + index * 10;
      ctx.fillStyle = index < fighter.roundWins ? "#ffe600" : "#34394a";
      ctx.fillRect(pipX, 42, 7, 3);
    }
  }

  drawSpecial(ctx, fighter, key, x, y) {
    const move = fighter.config.moves[key];
    const remaining = fighter.cooldowns[key] || 0;
    const ratio = remaining > 0 ? 1 - remaining / move.cooldown : 1;
    ctx.fillStyle = "rgba(3,5,12,.86)";
    ctx.fillRect(x, y, 62, 6);
    ctx.fillStyle = remaining > 0 ? "#596174" : fighter.config.accent;
    ctx.fillRect(x, y, Math.round(62 * clamp(ratio, 0, 1)), 6);
    ctx.font = "700 6px 'Skumic Pixel', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = remaining > 0 ? "#d2d7e3" : "#07080d";
    ctx.fillText(`${INPUT_LABELS[key]} ${move.label}`, x + 2, y + 5);
  }

  drawAnnouncement(ctx) {
    const isFight = this.roundMessage === "FIGHT!";
    const isKo = this.roundMessage === "KO";
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${isFight || isKo ? 30 : 19}px 'Skumic Arcade', monospace`;
    ctx.fillStyle = "#020309";
    ctx.fillText(this.roundMessage, W / 2 + 4, 141);
    ctx.fillStyle = isFight ? "#ffe600" : isKo ? "#ff3045" : "#fff";
    ctx.fillText(this.roundMessage, W / 2, 137);
    if (this.state === "round-end" && this.roundMessage !== "DRAW") {
      const winner = this.player.victorious ? this.player : this.cpu;
      ctx.font = "700 13px 'Skumic Pixel', monospace";
      ctx.fillStyle = "#020309";
      ctx.fillText(`${winner.config.name} WINS`, W / 2 + 2, 168);
      ctx.fillStyle = winner.config.color;
      ctx.fillText(`${winner.config.name} WINS`, W / 2, 166);
    }
    ctx.restore();
  }

  drawPause(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(2,3,9,.76)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "25px 'Skumic Arcade', monospace";
    ctx.fillStyle = "#020309";
    ctx.fillText("PAUSED", W / 2 + 3, H / 2 - 3);
    ctx.fillStyle = "#ffe600";
    ctx.fillText("PAUSED", W / 2, H / 2 - 6);
    ctx.font = "700 11px 'Skumic Pixel', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("PRESS P TO CONTINUE", W / 2, H / 2 + 23);
    ctx.restore();
  }

  getState() {
    return {
      state: this.state,
      difficulty: this.difficulty,
      stage: this.stageId,
      round: this.round,
      timer: Math.ceil(this.roundTimer),
      player: this.player ? { id: this.player.config.id, hp: this.player.hp, rounds: this.player.roundWins, x: this.player.x, guarding: this.player.guarding } : null,
      cpu: this.cpu ? { id: this.cpu.config.id, hp: this.cpu.hp, rounds: this.cpu.roundWins, x: this.cpu.x, guarding: this.cpu.guarding } : null,
    };
  }
}

export const ENGINE_CONSTANTS = Object.freeze({ width: W, height: H, renderScale: RENDER_SCALE, step: STEP });
