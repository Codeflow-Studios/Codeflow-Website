export const ROUND_SECONDS = 45;

// Timings are measured from the supplied recordings. Every level uses a 45-second excerpt.
export const LEVELS = [
  { id: 'ca-va-peter', number: '01', title: 'ÇA VA PÉTER', subtitle: 'DE EERSTE DROP', difficulty: 'WARM-UP', src: './assets/ca-va-peter.mp3', bpm: 174, beatOffset: 0, sourceStart: 11.122483, boostWindows: [[11.0, 16.5], [22.1, 27.6], [33.1, 38.6]], speed: 1, density: 1, gullAfter: 17, doubleAfter: 22, mission: { speakers: 8, beats: 4 }, ranks: [2600, 1900, 1200] },
  { id: 'project-ravy', number: '02', title: 'PROJECT RAVY 2.0', subtitle: 'RAVE OP DE DIJK', difficulty: 'TEMPO OMHOOG', src: './assets/project-ravy-2.mp3', bpm: 175, beatOffset: .012, sourceStart: 234, boostWindows: [[0, 5], [14, 19], [22, 27]], speed: 1.07, density: .94, gullAfter: 13, doubleAfter: 19, mission: { speakers: 10, beats: 5 }, ranks: [3200, 2350, 1500] },
  { id: 'puber', number: '03', title: 'PUBER', subtitle: 'GEEN REM MEER', difficulty: 'HARD', src: './assets/puber.mp3', bpm: 175, beatOffset: .312, sourceStart: 76, boostWindows: [[18, 23], [29, 34], [40, 45]], speed: 1.13, density: .88, gullAfter: 9, doubleAfter: 15, mission: { speakers: 11, beats: 6 }, ranks: [3800, 2800, 1800] },
  { id: 'manosfeer', number: '04', title: 'MANOSFEER', subtitle: 'FINALE AAN ZEE', difficulty: 'VOL GAS', src: './assets/manosfeer.mp3', bpm: 174, beatOffset: .184, sourceStart: 44, boostWindows: [[1, 6], [12, 17], [40, 45]], speed: 1.20, density: .82, gullAfter: 6, doubleAfter: 10, mission: { speakers: 12, beats: 7 }, ranks: [4500, 3300, 2200] },
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
  reset() {
    this.time = 0; this.distance = 0; this.score = 0; this.lives = 3;
    this.lane = 1; this.x = 1; this.jumpAge = -1; this.invincible = 0;
    this.speakers = 0; this.decks = 0; this.beats = 0; this.combo = 0; this.maxCombo = 0;
    this.lastRhythmBeat = -Infinity;
    this.objects = []; this.spawnIn = 0.6; this.pattern = 0;
    this.boost = false; this.done = false; this.events = [];
  }
  move(direction) { if (!this.done) this.lane = Math.max(0, Math.min(2, this.lane + direction)); }
  jump() {
    if (this.done || this.jumpAge >= 0) return false;
    this.jumpAge = 0;
    const nearest = Math.round((this.time - MUSIC.beatOffset) / BEAT);
    const difference = Math.abs(this.time - MUSIC.beatOffset - nearest * BEAT);
    if (difference <= 0.085 && this.lastRhythmBeat !== nearest) {
      this.combo = nearest - this.lastRhythmBeat <= 3 ? this.combo + 1 : 1;
      this.lastRhythmBeat = nearest; this.beats++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      const perfect = difference < 0.045;
      const points = (perfect ? 80 : 50) * this.multiplier;
      this.score += points; this.events.push({ type: 'beat', perfect, points, combo: this.combo });
    }
    return true;
  }
  get height() { return this.jumpAge < 0 ? 0 : Math.sin(Math.PI * this.jumpAge / 0.57); }
  get remaining() { return Math.max(0, ROUND_SECONDS - this.time); }
  get flowMultiplier() { return Math.min(3, 1 + Math.floor(this.combo / 3)); }
  get multiplier() { return (this.boost ? 2 : 1) * this.flowMultiplier; }
  spawn() {
    const lane = Math.floor(this.random() * 3);
    const row = this.pattern++;
    // Every row has a clear lane. A speaker trail shows a route through the hazards.
    if (row % 9 === 6) {
      this.objects.push({ type: 'deck', lane, z: 115, checked: false });
      const pressureLane = (lane + (row % 2 ? 1 : 2)) % 3;
      this.objects.push({ type: row % 2 ? 'cone' : 'barrier', lane: pressureLane, z: 115, checked: false });
    } else if (row % 4 === 0) {
      for (let i = 0; i < 3; i++) this.objects.push({ type: 'speaker', lane, z: 115 + i * 10, checked: false });
    } else {
      const hazard = this.time > MUSIC.gullAfter && row % 5 === 0 ? 'gull' : row % 3 === 0 ? 'cone' : 'barrier';
      this.objects.push({ type: hazard, lane, z: 115, checked: false });
      const safeLane = (lane + (row % 2 ? 1 : 2)) % 3;
      this.objects.push({ type: 'speaker', lane: safeLane, z: 115, checked: false });
      if (this.time > MUSIC.doubleAfter && row % 3 === 0) {
        this.objects.push({ type: 'cone', lane: (safeLane + 1) % 3 === lane ? (safeLane + 2) % 3 : (safeLane + 1) % 3, z: 115, checked: false });
      }
    }
    this.spawnIn += Math.max(0.82, 1.30 - this.time * 0.008);
  }
  update(dt) {
    if (this.done) return;
    this.events = [];
    dt = Math.max(0, Math.min(dt, ROUND_SECONDS - this.time));
    this.time += dt;
    this.x += (this.lane - this.x) * Math.min(1, dt * 15);
    if (this.jumpAge >= 0) { this.jumpAge += dt; if (this.jumpAge >= 0.57) this.jumpAge = -1; }
    this.invincible = Math.max(0, this.invincible - dt);
    const nextBoost = MUSIC.boostWindows.some(([start, end]) => this.time >= start && this.time < end);
    if (nextBoost && !this.boost) this.events.push({ type: 'drop' });
    this.boost = nextBoost;
    const speed = (22 + this.time * 0.17) * MUSIC.speed * (this.boost ? 1.42 : 1);
    this.distance += speed * dt;
    this.score += dt * 21 * this.multiplier;
    this.spawnIn -= dt; if (this.spawnIn <= 0) { this.spawn(); this.spawnIn *= MUSIC.density; }
    for (const object of this.objects) {
      object.z -= speed * dt;
      if (object.z <= 5 && !object.checked) {
        object.checked = true;
        const collectible = object.type === 'speaker' || object.type === 'deck';
        const aligned = Math.abs(object.lane - this.x) < (this.boost && collectible ? 1.08 : 0.46);
        if (!aligned) continue;
        if (object.type === 'speaker') {
          object.collected = true; this.speakers++; this.score += 100 * this.multiplier;
          this.events.push({ type: 'speaker', lane: object.lane, points: 100 * this.multiplier });
        } else if (object.type === 'deck') {
          object.collected = true; this.decks++; this.score += 350 * this.multiplier;
          this.events.push({ type: 'deck', lane: object.lane, points: 350 * this.multiplier });
        } else if (this.boost) {
          object.collected = true; this.score += 40;
          this.events.push({ type: 'smash', lane: object.lane });
        } else if ((object.type === 'gull' ? this.height > 0.28 : this.height < 0.46) && this.invincible === 0) {
          const lostCombo = this.combo;
          this.combo = 0;
          this.lives--; this.invincible = 1.5;
          this.events.push({ type: 'hit', lane: object.lane, lostCombo });
          if (this.lives <= 0) { this.done = true; break; }
        }
      }
    }
    this.objects = this.objects.filter(object => object.z > -14 && !object.collected);
    if (this.time >= ROUND_SECONDS) this.done = true;
  }
}
