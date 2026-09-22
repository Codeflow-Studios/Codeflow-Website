import { FIGHTERS, STAGES, INPUT_LABELS, otherFighter } from "./fighters.mjs?v=3";

const W = 480;
const H = 270;
const EPSILON = 0.0001;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Asset kon niet laden: ${src}`));
    image.src = src;
  });
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function stripConnectedBackdrop(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (seen[index]) return;
    seen[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  const canFlow = (from, to) => {
    const a = from * 4;
    const b = to * 4;
    const dr = Math.abs(data[a] - data[b]);
    const dg = Math.abs(data[a + 1] - data[b + 1]);
    const db = Math.abs(data[a + 2] - data[b + 2]);
    return Math.max(dr, dg, db) <= 35 && dr + dg + db <= 76;
  };

  while (head < tail) {
    const current = queue[head++];
    const x = current % width;
    const y = (current / width) | 0;
    if (x > 0) {
      const next = current - 1;
      if (!seen[next] && canFlow(current, next)) enqueue(next);
    }
    if (x + 1 < width) {
      const next = current + 1;
      if (!seen[next] && canFlow(current, next)) enqueue(next);
    }
    if (y > 0) {
      const next = current - width;
      if (!seen[next] && canFlow(current, next)) enqueue(next);
    }
    if (y + 1 < height) {
      const next = current + width;
      if (!seen[next] && canFlow(current, next)) enqueue(next);
    }
  }

  for (let index = 0; index < count; index += 1) {
    if (seen[index]) data[index * 4 + 3] = 0;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function buildFrames(image) {
  const columns = 4;
  const rows = 2;
  const cellWidth = Math.floor(image.naturalWidth / columns);
  const cellHeight = Math.floor(image.naturalHeight / rows);
  const frames = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const frame = createCanvas(cellWidth, cellHeight);
      const frameCtx = frame.getContext("2d", { willReadFrequently: true });
      frameCtx.imageSmoothingEnabled = false;
      frameCtx.drawImage(
        image,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight,
      );
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
  };
}

class Fighter {
  constructor(config, side, stage) {
    this.config = config;
    this.side = side;
    this.stage = stage;
    this.roundWins = 0;
    this.cooldowns = {};
    this.reset(side === "left" ? 132 : 348, side === "left" ? 1 : -1);
  }

  reset(x, facing) {
    this.x = x;
    this.y = this.stage.groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.config.stats.maxHp;
    this.displayHp = this.hp;
    this.hitstun = 0;
    this.flash = 0;
    this.action = null;
    this.crouching = false;
    this.blockIntent = false;
    this.walkClock = 0;
    this.ko = false;
    this.victorious = false;
    this.projectileRequest = null;
    this.cooldowns = {};
  }

  get grounded() {
    return this.y >= this.stage.groundY - EPSILON;
  }

  get canAct() {
    return !this.ko && this.hitstun <= 0 && !this.action;
  }

  startMove(key) {
    const move = this.config.moves[key];
    if (!move || !this.canAct || (this.cooldowns[key] || 0) > 0) return false;
    this.action = { key, move, elapsed: 0, connected: false, spawned: false };
    this.cooldowns[key] = move.cooldown;
    this.crouching = false;
    return true;
  }

  update(dt, input, opponent) {
    this.projectileRequest = null;
    this.displayHp = lerp(this.displayHp, this.hp, 1 - Math.pow(0.0008, dt));
    this.flash = Math.max(0, this.flash - dt);
    this.hitstun = Math.max(0, this.hitstun - dt);
    for (const key of Object.keys(this.cooldowns)) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
    }

    if (!this.action && this.hitstun <= 0 && !this.ko) {
      this.facing = opponent.x >= this.x ? 1 : -1;
    }

    const awayHeld = this.facing === 1 ? input.left : input.right;
    this.blockIntent = this.canAct && this.grounded && awayHeld;

    if (this.ko) {
      this.vx *= Math.pow(0.02, dt);
    } else if (this.hitstun > 0) {
      this.action = null;
      this.crouching = false;
    } else if (this.action) {
      this.advanceAction(dt);
    } else {
      this.handleNeutral(dt, input);
    }

    const airFactor = this.grounded ? 1 : this.config.stats.airControl;
    this.x += this.vx * dt * airFactor;
    if (!this.grounded || this.vy < 0) {
      this.vy += this.config.stats.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= this.stage.groundY) {
        this.y = this.stage.groundY;
        this.vy = 0;
      }
    }

    const bounds = this.stage.bounds;
    this.x = clamp(this.x, bounds.left, bounds.right);
    this.walkClock += Math.abs(this.vx) * dt * 0.055;
  }

  handleNeutral(dt, input) {
    this.crouching = this.grounded && input.down;
    let direction = 0;
    if (!this.crouching) direction = Number(input.right) - Number(input.left);
    const target = direction * this.config.stats.moveSpeed;
    const step = this.config.stats.acceleration * dt;
    this.vx += clamp(target - this.vx, -step, step);
    if (direction === 0) this.vx *= Math.pow(0.002, dt);

    if (input.jump && this.grounded && !this.crouching) {
      this.vy = -this.config.stats.jumpSpeed;
      this.y -= 1;
    }

    if (input.special2 && this.startMove("special2")) return;
    if (input.special1 && this.startMove("special1")) return;
    if (input.heavy && this.startMove("heavy")) return;
    if (input.kick && this.startMove("kick")) return;
    if (input.punch) this.startMove("punch");
  }

  advanceAction(dt) {
    const action = this.action;
    const before = action.elapsed;
    action.elapsed += dt;
    const move = action.move;
    if (move.kind === "dash" && this.isActive()) {
      this.vx = this.facing * move.dashSpeed;
    } else if (move.kind !== "dash") {
      this.vx *= Math.pow(0.0005, dt);
    }
    if (move.kind === "projectile" && !action.spawned && before < move.startup && action.elapsed >= move.startup) {
      action.spawned = true;
      this.projectileRequest = move;
    }
    if (action.elapsed >= move.startup + move.active + move.recovery) {
      this.action = null;
    }
  }

  isActive() {
    if (!this.action) return false;
    const { move, elapsed } = this.action;
    return elapsed >= move.startup && elapsed < move.startup + move.active;
  }

  isCountering() {
    return this.isActive() && this.action.move.kind === "counter";
  }

  isBlocking(attacker) {
    if (!this.blockIntent || !this.grounded || this.hitstun > 0 || this.ko) return false;
    return attacker.x > this.x ? this.facing === 1 : this.facing === -1;
  }

  hurtbox() {
    const height = this.crouching ? 72 : 108;
    return { x: this.x - 18, y: this.y - height, w: 36, h: height };
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
    if (this.ko || this.hitstun > 0) return 6;
    if (this.action) return this.action.move.frame;
    if (!this.grounded) return 1;
    if (this.crouching) return 1;
    return Math.floor((time * 3.2 + this.walkClock) % 2);
  }
}

class AIController {
  constructor() {
    this.decision = 0;
    this.held = emptyInput();
  }

  reset() {
    this.decision = 0;
    this.held = emptyInput();
  }

  frame(dt, self, foe) {
    const input = { ...this.held };
    input.jump = false;
    input.punch = false;
    input.kick = false;
    input.heavy = false;
    input.special1 = false;
    input.special2 = false;
    const resolved = () => ({
      ...this.held,
      jump: input.jump,
      punch: input.punch,
      kick: input.kick,
      heavy: input.heavy,
      special1: input.special1,
      special2: input.special2,
    });
    if (!self.canAct) {
      this.decision = Math.max(this.decision, 0.18);
      return input;
    }
    this.decision -= dt;

    if (this.decision > 0) return input;
    this.decision = 0.16 + Math.random() * 0.20;
    const distance = Math.abs(foe.x - self.x);
    const towardRight = foe.x > self.x;
    const toward = towardRight ? "right" : "left";
    const away = towardRight ? "left" : "right";
    this.held.left = false;
    this.held.right = false;
    this.held.down = false;

    const incoming = foe.action && distance < 88 && foe.action.elapsed > foe.action.move.startup * 0.55;
    if (incoming && Math.random() < 0.32) {
      this.held[away] = true;
      if (self.config.id === "gauthier" && Math.random() < 0.18 && (self.cooldowns.special2 || 0) <= 0) {
        this.held[away] = false;
        input.special2 = true;
      }
      return resolved();
    }

    if (distance > 112) {
      this.held[toward] = true;
      if (self.config.id === "matar" && distance < 255 && (self.cooldowns.special1 || 0) <= 0 && Math.random() < 0.22) {
        this.held[toward] = false;
        input.special1 = true;
      } else if (Math.random() < 0.045 && self.grounded) {
        input.jump = true;
      }
    } else if (distance > 66) {
      if ((self.cooldowns.special1 || 0) <= 0 && Math.random() < 0.20) input.special1 = true;
      else if ((self.cooldowns.special2 || 0) <= 0 && Math.random() < 0.17) input.special2 = true;
      else this.held[toward] = true;
    } else {
      const roll = Math.random();
      if (roll < 0.22) input.punch = true;
      else if (roll < 0.40) input.kick = true;
      else if (roll < 0.52) input.heavy = true;
      else if (roll < 0.62 && (self.cooldowns.special1 || 0) <= 0) input.special1 = true;
      else if (roll < 0.70 && (self.cooldowns.special2 || 0) <= 0) input.special2 = true;
      else this.held[away] = true;
    }
    return resolved();
  }
}

export class SkumicEngine {
  constructor(canvas, emit = () => {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.emit = emit;
    this.stage = STAGES.skumicStreet;
    this.state = "loading";
    this.assets = { stage: null, portraits: {}, frames: {} };
    this.player = null;
    this.cpu = null;
    this.projectiles = [];
    this.particles = [];
    this.ai = new AIController();
    this.inputProvider = () => emptyInput();
    this.round = 1;
    this.roundTimer = 60;
    this.stateTimer = 0;
    this.roundMessage = "";
    this.hitstop = 0;
    this.shake = 0;
    this.visualTime = 0;
    this.last = 0;
    this.running = false;
    this.pausedFrom = null;
  }

  setInputProvider(provider) {
    this.inputProvider = provider;
  }

  async load() {
    const [stageImage, matarPortrait, gauthierPortrait, matarSheet, gauthierSheet] = await Promise.all([
      loadImage(this.stage.image),
      loadImage(FIGHTERS.matar.portrait),
      loadImage(FIGHTERS.gauthier.portrait),
      loadImage(FIGHTERS.matar.fightSheet),
      loadImage(FIGHTERS.gauthier.fightSheet),
    ]);
    this.assets.stage = stageImage;
    this.assets.portraits.matar = matarPortrait;
    this.assets.portraits.gauthier = gauthierPortrait;
    this.assets.frames.matar = buildFrames(matarSheet);
    this.assets.frames.gauthier = buildFrames(gauthierSheet);
    this.state = "title";
    this.emit("ready", {});
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    const frame = (now) => {
      if (!this.running) return;
      const dt = this.last ? Math.min(1 / 24, (now - this.last) / 1000) : 0;
      this.last = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  showTitle() {
    this.state = "title";
    this.player = null;
    this.cpu = null;
    this.projectiles.length = 0;
    this.particles.length = 0;
  }

  showSelect() {
    this.state = "select";
  }

  startMatch(fighterId) {
    const chosen = FIGHTERS[fighterId] || FIGHTERS.matar;
    this.player = new Fighter(chosen, "left", this.stage);
    this.cpu = new Fighter(otherFighter(chosen.id), "right", this.stage);
    this.player.roundWins = 0;
    this.cpu.roundWins = 0;
    this.round = 1;
    this.ai.reset();
    this.beginRound();
  }

  rematch() {
    if (!this.player) return;
    this.startMatch(this.player.config.id);
  }

  beginRound() {
    this.player.reset(132, 1);
    this.cpu.reset(348, -1);
    this.projectiles.length = 0;
    this.particles.length = 0;
    this.roundTimer = 60;
    this.stateTimer = 2.05;
    this.state = "round-intro";
    this.roundMessage = `ROUND ${this.round}`;
    this.ai.reset();
    this.emit("announce", { text: `Ronde ${this.round}` });
  }

  togglePause() {
    if (this.state === "paused") {
      this.state = this.pausedFrom || "fighting";
      this.pausedFrom = null;
      this.emit("pause", { paused: false });
    } else if (this.state === "fighting" || this.state === "round-intro") {
      this.pausedFrom = this.state;
      this.state = "paused";
      this.emit("pause", { paused: true });
    }
  }

  update(dt) {
    this.visualTime += dt;
    this.updateParticles(dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    if (!this.player || !this.cpu) return;
    if (this.state === "paused" || this.state === "match-over") return;

    if (this.state === "round-intro") {
      this.inputProvider();
      this.stateTimer -= dt;
      if (this.stateTimer <= 0.72 && this.roundMessage !== "FIGHT!") {
        this.roundMessage = "FIGHT!";
        this.emit("fight", {});
      }
      if (this.stateTimer <= 0) {
        this.state = "fighting";
        this.roundMessage = "";
      }
      return;
    }

    if (this.state === "round-over") {
      this.stateTimer -= dt;
      this.player.displayHp = lerp(this.player.displayHp, this.player.hp, 1 - Math.pow(0.001, dt));
      this.cpu.displayHp = lerp(this.cpu.displayHp, this.cpu.hp, 1 - Math.pow(0.001, dt));
      if (this.stateTimer <= 0) {
        if (this.player.roundWins >= 2 || this.cpu.roundWins >= 2) this.finishMatch();
        else {
          if (this.roundMessage !== "DRAW") this.round += 1;
          this.beginRound();
        }
      }
      return;
    }

    if (this.state !== "fighting") return;
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }

    const playerInput = this.inputProvider() || emptyInput();
    const cpuInput = this.ai.frame(dt, this.cpu, this.player);
    this.player.update(dt, playerInput, this.cpu);
    this.cpu.update(dt, cpuInput, this.player);

    this.spawnRequestedProjectile(this.player);
    this.spawnRequestedProjectile(this.cpu);
    this.resolveMelee(this.player, this.cpu);
    this.resolveMelee(this.cpu, this.player);
    this.updateProjectiles(dt);
    this.resolveBodyCollision();

    this.roundTimer = Math.max(0, this.roundTimer - dt);
    if (this.player.hp <= 0 || this.cpu.hp <= 0) {
      const winner = this.player.hp > this.cpu.hp ? this.player : this.cpu;
      this.endRound(winner, "KO");
    } else if (this.roundTimer <= 0) {
      if (Math.abs(this.player.hp - this.cpu.hp) < 1) this.endRound(null, "DRAW");
      else this.endRound(this.player.hp > this.cpu.hp ? this.player : this.cpu, "TIME");
    }
  }

  spawnRequestedProjectile(fighter) {
    const move = fighter.projectileRequest;
    if (!move) return;
    this.projectiles.push({
      owner: fighter,
      move,
      x: fighter.x + fighter.facing * 34,
      y: fighter.y - 77,
      vx: fighter.facing * move.projectileSpeed,
      w: move.projectileSize.w,
      h: move.projectileSize.h,
      life: 1.7,
    });
    this.emit("shot", { fighter: fighter.config.id });
  }

  resolveMelee(attacker, target) {
    if (!attacker.action || attacker.action.connected || !attacker.isActive()) return;
    if (attacker.action.move.kind === "counter" || attacker.action.move.kind === "projectile") return;
    const hitbox = attacker.attackBox();
    if (!hitbox || !overlaps(hitbox, target.hurtbox())) return;
    attacker.action.connected = true;

    if (target.isCountering()) {
      const counter = target.action.move;
      target.action.connected = true;
      target.action.elapsed = counter.startup + counter.active;
      this.applyHit(target, attacker, counter, { counter: true });
      return;
    }
    this.applyHit(attacker, target, attacker.action.move);
  }

  updateProjectiles(dt) {
    const remaining = [];
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.life -= dt;
      const target = projectile.owner === this.player ? this.cpu : this.player;
      const rect = {
        x: projectile.x - projectile.w / 2,
        y: projectile.y - projectile.h / 2,
        w: projectile.w,
        h: projectile.h,
      };
      if (overlaps(rect, target.hurtbox())) {
        this.applyHit(projectile.owner, target, projectile.move, { projectile: true });
        continue;
      }
      if (projectile.life > 0 && projectile.x > -30 && projectile.x < W + 30) remaining.push(projectile);
    }
    this.projectiles = remaining;
  }

  applyHit(source, target, move, flags = {}) {
    const blocked = !flags.counter && target.isBlocking(source);
    const damage = Math.round(move.damage * (blocked ? 0.2 : 1) / target.config.stats.defense);
    target.hp = Math.max(0, target.hp - damage);
    target.flash = blocked ? 0.045 : 0.09;
    target.hitstun = blocked ? 0.105 : move.hitstun;
    target.crouching = false;
    target.action = null;
    const direction = source.x <= target.x ? 1 : -1;
    target.vx = direction * move.knockback.x * (blocked ? 0.38 : 1);
    if (!blocked) {
      target.vy = move.knockback.y;
      target.y -= 1;
    }
    this.hitstop = blocked ? 0.028 : flags.counter ? 0.085 : move.damage >= 100 ? 0.068 : 0.052;
    this.shake = blocked ? 1.4 : move.damage >= 100 ? 5.2 : 3.2;
    const x = target.x - direction * 9;
    const y = target.y - 72;
    this.makeHitSparks(x, y, blocked ? "#8ddcff" : move.spark, flags.counter ? 13 : 9);
    this.emit("hit", { blocked, counter: Boolean(flags.counter), damage, move: move.id });
  }

  resolveBodyCollision() {
    const distance = this.cpu.x - this.player.x;
    const minimum = this.player.config.stats.pushRadius + this.cpu.config.stats.pushRadius;
    if (Math.abs(distance) >= minimum) return;
    const direction = distance >= 0 ? 1 : -1;
    const correction = (minimum - Math.abs(distance)) / 2;
    this.player.x -= direction * correction;
    this.cpu.x += direction * correction;
    this.player.x = clamp(this.player.x, this.stage.bounds.left, this.stage.bounds.right);
    this.cpu.x = clamp(this.cpu.x, this.stage.bounds.left, this.stage.bounds.right);
  }

  endRound(winner, message) {
    this.state = "round-over";
    this.stateTimer = 2.45;
    this.roundMessage = message;
    if (winner) {
      winner.roundWins += 1;
      winner.victorious = true;
      const loser = winner === this.player ? this.cpu : this.player;
      loser.ko = loser.hp <= 0;
      const direction = loser.x >= winner.x ? 1 : -1;
      const center = (winner.x + loser.x) / 2;
      const halfGap = 54;
      winner.x = clamp(center - direction * halfGap, this.stage.bounds.left, this.stage.bounds.right);
      loser.x = clamp(center + direction * halfGap, this.stage.bounds.left, this.stage.bounds.right);
      winner.vx = 0;
      loser.vx = 0;
    }
    this.emit("round-over", { message, winner: winner?.config.id || null });
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
      const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.35;
      const speed = 35 + Math.random() * 85;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.14 + Math.random() * 0.16,
        maxLife: 0.30,
        color,
        size: 1 + Math.random() * 3,
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.03, dt);
      particle.vy += 160 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake * 0.5 : 0;
    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));
    this.drawStage(ctx);

    if (this.player && this.cpu) {
      this.drawProjectiles(ctx);
      const order = this.player.x < this.cpu.x ? [this.cpu, this.player] : [this.player, this.cpu];
      for (const fighter of order) this.drawFighter(ctx, fighter);
      this.drawParticles(ctx);
    }
    ctx.restore();

    if (this.player && this.cpu) this.drawHud(ctx);
    if (this.state === "round-intro" || this.state === "round-over") this.drawAnnouncement(ctx);
    if (this.state === "paused") this.drawPause(ctx);
  }

  drawStage(ctx) {
    if (this.assets.stage) ctx.drawImage(this.assets.stage, 0, 0, W, H);
    else {
      ctx.fillStyle = "#070b16";
      ctx.fillRect(0, 0, W, H);
    }
    const floorShade = ctx.createLinearGradient(0, 180, 0, H);
    floorShade.addColorStop(0, "rgba(2,4,10,0)");
    floorShade.addColorStop(1, "rgba(2,3,8,.32)");
    ctx.fillStyle = floorShade;
    ctx.fillRect(0, 170, W, 100);

    ctx.save();
    ctx.globalAlpha = 0.17;
    ctx.strokeStyle = "#b8efff";
    ctx.lineWidth = 1;
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 83 + this.visualTime * 58) % (W + 60) - 30;
      const y = (index * 47 + this.visualTime * 122) % 210;
      ctx.beginPath();
      ctx.moveTo(Math.floor(x), Math.floor(y));
      ctx.lineTo(Math.floor(x - 2), Math.floor(y + 7));
      ctx.stroke();
    }
    ctx.restore();

    const pulse = 0.035 + (Math.sin(this.visualTime * 3.5) + 1) * 0.018;
    ctx.fillStyle = `rgba(255,230,0,${pulse})`;
    ctx.fillRect(354, 14, 74, 102);
  }

  drawFighter(ctx, fighter) {
    const frames = this.assets.frames[fighter.config.id];
    if (!frames) return;
    const frame = frames[fighter.frameIndex(this.visualTime)] || frames[0];
    const width = 98;
    const height = 130;
    const flip = fighter.facing !== fighter.config.artFacing;

    ctx.save();
    ctx.globalAlpha = fighter.ko ? 0.86 : 1;
    ctx.fillStyle = "rgba(0,0,0,.46)";
    ctx.beginPath();
    ctx.ellipse(Math.round(fighter.x), this.stage.groundY + 2, fighter.crouching ? 25 : 31, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(Math.round(fighter.x), Math.round(fighter.y));
    if (flip) ctx.scale(-1, 1);
    if (fighter.flash > 0) ctx.filter = "brightness(2.7) saturate(.35)";
    ctx.drawImage(frame, -width / 2, -height, width, height);
    ctx.filter = "none";
    if (fighter.isCountering()) {
      ctx.strokeStyle = "#ffe600";
      ctx.globalAlpha = 0.55 + Math.sin(this.visualTime * 20) * 0.18;
      ctx.lineWidth = 2;
      const left = -31;
      const right = 31;
      const top = -112;
      const bottom = -6;
      const corner = 9;
      ctx.beginPath();
      ctx.moveTo(left, top + corner); ctx.lineTo(left, top); ctx.lineTo(left + corner, top);
      ctx.moveTo(right - corner, top); ctx.lineTo(right, top); ctx.lineTo(right, top + corner);
      ctx.moveTo(left, bottom - corner); ctx.lineTo(left, bottom); ctx.lineTo(left + corner, bottom);
      ctx.moveTo(right - corner, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - corner);
      ctx.stroke();
    } else if (fighter.blockIntent) {
      ctx.strokeStyle = "#72e7ff";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, -64, 34, -1.2, 1.2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawProjectiles(ctx) {
    for (const projectile of this.projectiles) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "#fff7bd";
      ctx.fillRect(Math.round(projectile.x - projectile.w / 2), Math.round(projectile.y - 2), projectile.w, 4);
      ctx.fillStyle = "rgba(255,114,0,.55)";
      ctx.fillRect(Math.round(projectile.x - projectile.w / 2 - Math.sign(projectile.vx) * 8), Math.round(projectile.y - 1), projectile.w + 8, 2);
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      const size = Math.max(1, Math.round(particle.size));
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx) {
    const left = this.player;
    const right = this.cpu;
    ctx.save();
    ctx.textBaseline = "top";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillStyle = "rgba(2,3,8,.82)";
    ctx.fillRect(8, 7, 204, 41);
    ctx.fillRect(268, 7, 204, 41);
    ctx.strokeStyle = "#d6dbea";
    ctx.strokeRect(13.5, 21.5, 190, 11);
    ctx.strokeRect(276.5, 21.5, 190, 11);

    const leftRatio = clamp(left.displayHp / left.config.stats.maxHp, 0, 1);
    const rightRatio = clamp(right.displayHp / right.config.stats.maxHp, 0, 1);
    ctx.fillStyle = leftRatio < 0.22 ? "#ff3038" : left.config.color;
    ctx.fillRect(15, 23, Math.round(187 * leftRatio), 8);
    ctx.fillStyle = rightRatio < 0.22 ? "#ff3038" : right.config.color;
    const rightWidth = Math.round(187 * rightRatio);
    ctx.fillRect(465 - rightWidth, 23, rightWidth, 8);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(`P1 · ${left.config.shortName}`, 13, 9);
    ctx.font = "bold 7px 'Courier New', monospace";
    ctx.fillStyle = "#cdd3df";
    ctx.fillText(`${Math.ceil(left.hp)} HP`, 14, 34);
    ctx.textAlign = "right";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${right.config.shortName} · CPU`, 467, 9);
    ctx.font = "bold 7px 'Courier New', monospace";
    ctx.fillStyle = "#cdd3df";
    ctx.fillText(`${Math.ceil(right.hp)} HP`, 466, 34);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,.86)";
    ctx.fillRect(218, 6, 44, 34);
    ctx.strokeStyle = "#ffe600";
    ctx.strokeRect(219.5, 7.5, 41, 31);
    ctx.fillStyle = "#ffe600";
    ctx.font = "bold 19px 'Courier New', monospace";
    ctx.fillText(String(Math.ceil(this.roundTimer)).padStart(2, "0"), 240, 10);

    this.drawRoundPips(ctx, left.roundWins, 18, 45, 1);
    this.drawRoundPips(ctx, right.roundWins, 461, 45, -1);

    ctx.font = "bold 6px 'Courier New', monospace";
    ctx.textAlign = "left";
    this.drawCooldown(ctx, left, "special1", 14, 53);
    this.drawCooldown(ctx, left, "special2", 14, 62);
    ctx.textAlign = "right";
    this.drawCooldown(ctx, right, "special1", 466, 53);
    this.drawCooldown(ctx, right, "special2", 466, 62);
    ctx.restore();
  }

  drawRoundPips(ctx, wins, x, y, direction) {
    for (let index = 0; index < 2; index += 1) {
      ctx.fillStyle = index < wins ? "#ffe600" : "#252a38";
      ctx.fillRect(x + direction * index * 8, y, 6, 4);
    }
  }

  drawCooldown(ctx, fighter, key, x, y) {
    const move = fighter.config.moves[key];
    const remaining = fighter.cooldowns[key] || 0;
    ctx.fillStyle = remaining > 0 ? "#697083" : fighter.config.accent;
    const suffix = remaining > 0 ? ` ${remaining.toFixed(1)}` : " READY";
    ctx.fillText(`${INPUT_LABELS[key]} ${move.label}${suffix}`, x, y);
  }

  drawAnnouncement(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const isFight = this.roundMessage === "FIGHT!";
    const isKo = this.roundMessage === "KO";
    ctx.font = `900 ${isFight || isKo ? 43 : 29}px 'Courier New', monospace`;
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#050509";
    ctx.strokeText(this.roundMessage, W / 2, 128);
    ctx.fillStyle = isFight ? "#ffe600" : isKo ? "#ff3038" : "#fff";
    ctx.fillText(this.roundMessage, W / 2, 128);
    if (this.state === "round-over" && this.roundMessage !== "DRAW") {
      const winner = this.player.victorious ? this.player : this.cpu;
      ctx.font = "bold 10px 'Courier New', monospace";
      ctx.fillStyle = "#fff";
      ctx.fillText(`${winner.config.shortName} WINS`, W / 2, 157);
    }
    ctx.restore();
  }

  drawPause(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(2,3,8,.7)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 30px 'Courier New', monospace";
    ctx.strokeStyle = "#050509";
    ctx.lineWidth = 6;
    ctx.strokeText("PAUSED", W / 2, H / 2 - 8);
    ctx.fillStyle = "#ffe600";
    ctx.fillText("PAUSED", W / 2, H / 2 - 8);
    ctx.font = "bold 8px 'Courier New', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("PRESS P TO CONTINUE", W / 2, H / 2 + 20);
    ctx.restore();
  }
}
