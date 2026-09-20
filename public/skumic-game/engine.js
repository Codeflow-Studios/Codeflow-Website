export const ROUND_SECONDS = 45;

// Authored timing estimates for the supplied excerpts, retained from the original game.
// Adjust these against the recordings before describing them as measured beat maps.
const configureLevel = (level, background, horizon, roadStyle) => ({
  ...level, duration: ROUND_SECONDS, artist: 'SKUMIC', available: true,
  background: `./assets/${background}`, horizon, roadStyle,
  colors: { accent: roadStyle.accent, pickup: '#effe59', danger: '#ff4a24' },
  audioOffset: level.beatOffset, beatTimes: null,
  timing: { perfect: .08, good: .15, comboGraceBeats: 4, decayBeats: 2 },
  movement: { jumpDuration: .56, jumpBuffer: .12, laneResponse: 22 },
  buildUpSeconds: 8, dropTimes: level.boostWindows.map(([start]) => start),
  sections: level.boostWindows.map(([start, end]) => ({ type: 'ravy', start, end })),
});
export const LEVELS = [
  configureLevel({ id: 'ca-va-peter', number: '01', title: 'ÇA VA PÉTER', subtitle: 'DE EERSTE DROP', difficulty: 'WARM-UP', src: './assets/ca-va-peter.mp3', bpm: 174, beatOffset: 0, sourceStart: 11.122483, boostWindows: [[11.0, 16.5], [22.1, 27.6], [33.1, 38.6]], speed: 1, density: 1, gullAfter: 17, doubleAfter: 22, mission: { speakers: 8, beats: 4 }, ranks: [2600, 1900, 1200] }, 'background-oostende-v2.png', .37, { dark: '38,48,54', light: '255,220,164', accent: '#233b51' }),
  configureLevel({ id: 'project-ravy', number: '02', title: 'PROJECT RAVY 2.0', subtitle: 'RAVE OP DE DIJK', difficulty: 'TEMPO OMHOOG', src: './assets/project-ravy-2.mp3', bpm: 175, beatOffset: .012, sourceStart: 234, boostWindows: [[0, 5], [14, 19], [22, 27]], speed: 1.07, density: .94, gullAfter: 13, doubleAfter: 19, mission: { speakers: 10, beats: 5 }, ranks: [3200, 2350, 1500] }, 'background-ravy-v2.png', .375, { dark: '8,17,42', light: '79,225,255', accent: '#ff3fc5' }),
  configureLevel({ id: 'puber', number: '03', title: 'PUBER', subtitle: 'GEEN REM MEER', difficulty: 'HARD', src: './assets/puber.mp3', bpm: 175, beatOffset: .312, sourceStart: 76, boostWindows: [[18, 23], [29, 34], [40, 45]], speed: 1.13, density: .88, gullAfter: 9, doubleAfter: 15, mission: { speakers: 11, beats: 6 }, ranks: [3800, 2800, 1800] }, 'background-puber-v2.png', .38, { dark: '31,20,19', light: '255,111,48', accent: '#ff4a24' }),
  configureLevel({ id: 'manosfeer', number: '04', title: 'MANOSFEER', subtitle: 'FINALE AAN ZEE', difficulty: 'VOL GAS', src: './assets/manosfeer.mp3', bpm: 174, beatOffset: .184, sourceStart: 44, boostWindows: [[1, 6], [12, 17], [40, 45]], speed: 1.20, density: .82, gullAfter: 6, doubleAfter: 10, mission: { speakers: 12, beats: 7 }, ranks: [4500, 3300, 2200] }, 'background-manosfeer-v2.png', .405, { dark: '12,17,19', light: '255,201,73', accent: '#ffc83d' }),
];
export let MUSIC = LEVELS[0];
export let BPM = MUSIC.bpm;
export let BEAT = 60 / BPM;
export function selectLevel(index) {
  MUSIC = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
  BPM = MUSIC.bpm;
  BEAT = 60 / BPM;
  return MUSIC;
}

export class RunModel {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset(level = MUSIC) {
    this.level = level;
    this.time = 0; this.distance = 0; this.score = 0; this.lives = 3;
    this.lane = 1; this.x = 1; this.jumpAge = -1; this.bufferedJump = null; this.invincible = 0;
    this.speakers = 0; this.decks = 0; this.beats = 0; this.combo = 0; this.maxCombo = 0;
    this.perfects = 0; this.goods = 0; this.lastJudgement = null;
    this.lastRhythmBeat = -Infinity; this.comboDecayAt = Infinity;
    this.objects = []; this.spawnIn = 0.6; this.pattern = 0;
    this.boost = false; this.done = false; this.events = [];
  }
  move(direction) { if (!this.done) this.lane = Math.max(0, Math.min(2, this.lane + direction)); }
  jump(inputTime = this.time) {
    if (this.done) return false;
    const timestamp = Number.isFinite(inputTime) ? Math.max(0, Math.min(this.duration, inputTime)) : this.time;
    if (this.jumpAge >= 0) {
      // Only accept a fresh press close to landing, never repeated presses while airborne.
      if (this.jumpDuration - this.jumpAge > (this.level.movement?.jumpBuffer ?? .12) || this.bufferedJump !== null) return false;
      this.bufferedJump = timestamp;
      return true;
    }
    this.launchJump(timestamp);
    return true;
  }
  launchJump(inputTime) {
    this.jumpAge = 0;
    const { index, time } = this.nearestBeat(inputTime);
    const difference = Math.abs(inputTime - time);
    const perfectWindow = this.level.timing?.perfect ?? .08, goodWindow = this.level.timing?.good ?? .15;
    const judgement = difference <= perfectWindow + 1e-9 ? 'perfect' : difference <= goodWindow + 1e-9 ? 'good' : 'normal';
    this.lastJudgement = judgement;
    if (judgement !== 'normal' && index >= 0 && index > this.lastRhythmBeat) {
      this.combo++;
      this.lastRhythmBeat = index; this.beats++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.comboDecayAt = inputTime + (this.level.timing?.comboGraceBeats ?? 4) * this.beat;
      const perfect = judgement === 'perfect';
      if (perfect) this.perfects++; else this.goods++;
      const ravy = this.level.boostWindows.some(([start, end]) => inputTime >= start && inputTime < end);
      const points = (perfect ? 100 : 60) * this.flowMultiplier * (ravy ? 2 : 1);
      this.score += points;
      this.events.push({ type: 'beat', judgement, perfect, points, combo: this.combo, difference, inputTime });
    } else if (judgement === 'normal') {
      this.combo = Math.max(0, this.combo - 2);
      this.events.push({ type: 'timing', judgement, points: 0, combo: this.combo, difference, inputTime });
    }
  }
  nearestBeat(time) {
    const mapped = this.level.beatTimes;
    if (mapped?.length) {
      let low = 0, high = mapped.length - 1;
      while (low < high) { const middle = Math.floor((low + high) / 2); if (mapped[middle] < time) low = middle + 1; else high = middle; }
      const index = low > 0 && Math.abs(mapped[low - 1] - time) <= Math.abs(mapped[low] - time) ? low - 1 : low;
      return { index, time: mapped[index] };
    }
    const offset = this.level.audioOffset ?? this.level.beatOffset ?? 0;
    const index = Math.round((time - offset) / this.beat);
    return { index, time: offset + index * this.beat };
  }
  get beat() { return 60 / this.level.bpm; }
  get beatPosition() { return (this.time - (this.level.audioOffset ?? this.level.beatOffset ?? 0)) / this.beat; }
  get beatIndex() { return Math.floor(this.beatPosition); }
  get beatPhase() { return ((this.beatPosition % 1) + 1) % 1; }
  get duration() { return this.level.duration ?? ROUND_SECONDS; }
  get jumpDuration() { return this.level.movement?.jumpDuration ?? .56; }
  get height() { return this.jumpAge < 0 ? 0 : Math.max(0, Math.sin(Math.PI * this.jumpAge / this.jumpDuration)); }
  get remaining() { return Math.max(0, this.duration - this.time); }
  get flowMultiplier() { return Math.min(4, 1 + Math.floor(this.combo / 4)); }
  get multiplier() { return (this.boost ? 2 : 1) * this.flowMultiplier; }
  get nextDrop() { return this.level.dropTimes?.find(start => start > this.time + 1e-8) ?? this.level.boostWindows.find(([start]) => start > this.time + 1e-8)?.[0] ?? null; }
  get dropRemaining() { return this.nextDrop === null ? null : Math.max(0, this.nextDrop - this.time); }
  get dropProgress() { return this.dropRemaining === null ? 0 : Math.max(0, Math.min(1, 1 - this.dropRemaining / (this.level.buildUpSeconds ?? 8))); }
  get ravyWindow() { return this.level.boostWindows.find(([start, end]) => this.time >= start && this.time < end); }
  get ravyRemaining() { return this.ravyWindow ? Math.max(0, this.ravyWindow[1] - this.time) : 0; }
  get ravyProgress() { return this.ravyWindow ? this.ravyRemaining / (this.ravyWindow[1] - this.ravyWindow[0]) : 0; }
  spawn() {
    const lane = Math.floor(this.random() * 3);
    const row = this.pattern++;
    // Every row has a clear lane. A skateboard trail shows a route through the hazards.
    if (row % 9 === 6) {
      this.objects.push({ type: 'deck', lane, z: 115, checked: false });
      const pressureLane = (lane + (row % 2 ? 1 : 2)) % 3;
      this.objects.push({ type: row % 2 ? 'cone' : 'barrier', lane: pressureLane, z: 115, checked: false });
    } else if (row % 4 === 0) {
      for (let i = 0; i < 3; i++) this.objects.push({ type: 'speaker', lane, z: 115 + i * 10, checked: false });
    } else {
      const hazard = this.time > this.level.gullAfter && row % 5 === 0 ? 'gull' : row % 3 === 0 ? 'cone' : 'barrier';
      this.objects.push({ type: hazard, lane, z: 115, checked: false });
      const safeLane = (lane + (row % 2 ? 1 : 2)) % 3;
      this.objects.push({ type: 'speaker', lane: safeLane, z: 115, checked: false });
      if (this.time > this.level.doubleAfter && row % 3 === 0) {
        this.objects.push({ type: 'cone', lane: (safeLane + 1) % 3 === lane ? (safeLane + 2) % 3 : (safeLane + 1) % 3, z: 115, checked: false });
      }
    }
    this.spawnIn += Math.max(0.82, 1.30 - this.time * 0.008) * this.level.density;
  }
  update(dt) {
    if (this.done) return;
    this.events = [];
    if (!Number.isFinite(dt) || dt <= 0) return;
    const target = Math.min(this.duration, this.time + dt);
    // Small steps bound collision error, while splitting at state transitions keeps
    // movement, scoring and drops consistent at different display refresh rates.
    while (this.time < target - 1e-9 && !this.done) {
      this.syncBoost();
      if (this.spawnIn <= 1e-9) this.spawn();
      let step = Math.min(1 / 120, target - this.time);
      for (const window of this.level.boostWindows) {
        for (const edge of window) if (edge > this.time + 1e-9) step = Math.min(step, edge - this.time);
      }
      if (this.spawnIn > 1e-9) step = Math.min(step, this.spawnIn);
      if (this.jumpAge >= 0) step = Math.min(step, this.jumpDuration - this.jumpAge);
      if (this.comboDecayAt > this.time + 1e-9) step = Math.min(step, this.comboDecayAt - this.time);
      this.advance(step);
    }
    if (!this.done && Math.abs(this.time - target) < 1e-8) this.time = target;
    this.syncBoost();
    this.objects = this.objects.filter(object => object.z > -14 && !object.collected);
    if (this.time >= this.duration - 1e-9) { this.time = this.duration; this.done = true; }
  }
  syncBoost() {
    const nextBoost = this.level.boostWindows.some(([start, end]) => this.time + 1e-9 >= start && this.time < end - 1e-9);
    if (nextBoost && !this.boost) this.events.push({ type: 'drop' });
    if (!nextBoost && this.boost) this.events.push({ type: 'ravy-end' });
    this.boost = nextBoost;
  }
  advance(dt) {
    const midpoint = this.time + dt / 2;
    const previousX = this.x, previousJumpAge = this.jumpAge;
    this.time += dt;
    const response = this.level.movement?.laneResponse ?? 22;
    this.x += (this.lane - this.x) * (1 - Math.exp(-dt * response));
    if (this.jumpAge >= 0) this.jumpAge += dt;
    this.invincible = Math.max(0, this.invincible - dt);
    const speed = (22 + midpoint * 0.17) * this.level.speed * (this.boost ? 1.42 : 1);
    this.distance += speed * dt;
    this.score += dt * 21 * this.multiplier;
    this.spawnIn -= dt;
    for (const object of this.objects) {
      const previousZ = object.z;
      object.z -= speed * dt;
      if (object.z <= 5 && !object.checked) {
        object.checked = true;
        const crossingTime = Math.max(0, Math.min(dt, (previousZ - 5) / speed));
        const crossingX = this.lane + (previousX - this.lane) * Math.exp(-crossingTime * response);
        const crossingHeight = previousJumpAge < 0 ? 0 : Math.max(0, Math.sin(Math.PI * (previousJumpAge + crossingTime) / this.jumpDuration));
        const collectible = object.type === 'speaker' || object.type === 'deck';
        const aligned = Math.abs(object.lane - crossingX) < (this.boost && collectible ? 1.08 : 0.46);
        if (!aligned) continue;
        if (object.type === 'speaker') {
          object.collected = true; this.speakers++; this.score += 100 * this.multiplier;
          this.events.push({ type: 'speaker', lane: object.lane, points: 100 * this.multiplier });
        } else if (object.type === 'deck') {
          object.collected = true; this.decks++; this.score += 350 * this.multiplier;
          this.events.push({ type: 'deck', lane: object.lane, points: 350 * this.multiplier });
        } else if (this.boost) {
          const points = 40 * this.multiplier;
          object.collected = true; this.score += points;
          this.events.push({ type: 'smash', lane: object.lane, points });
        } else if ((object.type === 'gull' ? crossingHeight > 0.28 : crossingHeight < 0.46) && this.invincible === 0) {
          const lostCombo = this.combo;
          this.combo = 0;
          this.lives--; this.invincible = 1.5;
          this.events.push({ type: 'hit', lane: object.lane, lostCombo });
          if (this.lives <= 0) { this.done = true; break; }
        }
      }
    }
    if (this.done) { this.bufferedJump = null; return; }
    if (this.jumpAge >= this.jumpDuration - 1e-9) {
      this.jumpAge = -1;
      this.events.push({ type: 'landing', lane: this.x });
      if (this.bufferedJump !== null) {
        const inputTime = this.bufferedJump;
        this.bufferedJump = null; this.launchJump(inputTime);
      }
    }
    if (this.combo > 0 && this.time >= this.comboDecayAt - 1e-9) {
      this.combo--;
      this.comboDecayAt += (this.level.timing?.decayBeats ?? 2) * this.beat;
      this.events.push({ type: 'combo-decay', combo: this.combo });
    }
  }
}
