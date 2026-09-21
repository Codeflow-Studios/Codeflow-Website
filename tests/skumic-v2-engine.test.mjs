import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, RunModel, selectLevel } from '../public/skumic-game/engine.js';
import { BeatAudio } from '../public/skumic-game/audio.js';

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
function cleanRun(level = LEVELS[0]) {
  const model = new RunModel(() => .4);
  model.reset(level); model.spawnIn = Infinity;
  return model;
}

test('beat judgement uses input timestamp, has inclusive 80/150ms windows and awards once per beat', () => {
  for (const [offset, judgement] of [[.08, 'perfect'], [-.08, 'perfect'], [.15, 'good'], [-.15, 'good'], [.166, 'normal']]) {
    const model = cleanRun(), target = model.beat * 4;
    model.time = target - .2; // Simulate a delayed render frame.
    assert.equal(model.jump(target + offset), true);
    assert.equal(model.lastJudgement, judgement);
    assert.equal(model.events[0].judgement, judgement);
    assert.equal(model.beats, judgement === 'normal' ? 0 : 1);
  }
  const model = cleanRun();
  model.jump(.01);
  const score = model.score;
  model.jumpAge = -1;
  model.jump(.02);
  assert.equal(model.score, score);
  assert.equal(model.combo, 1);
});

test('optional explicit beat map is used instead of assuming a perfectly even tempo', () => {
  const model = cleanRun({ ...LEVELS[0], beatTimes: [.12, .49, .85, 1.25] });
  model.jump(.49);
  assert.equal(model.lastRhythmBeat, 1);
  assert.equal(model.perfects, 1);
});

test('jump buffering only accepts a fresh press near landing and preserves its timing', () => {
  const model = cleanRun();
  model.jump(0); model.update(.3);
  assert.equal(model.jump(.3), false);
  model.update(.18);
  assert.equal(model.jump(.48), true);
  assert.equal(model.jump(.49), false);
  model.update(.081);
  near(model.jumpAge, .001);
  assert.equal(model.events.filter(event => event.type === 'landing').length, 1);
  assert.equal(model.events.find(event => event.type === 'beat').inputTime, .48);
  assert.equal(model.goods, 1);
});

test('flow grows to x4, Ravy doubles it, misses and inactivity decay it fairly', () => {
  const model = cleanRun();
  for (let i = 0; i < 12; i++) {
    model.time = i * model.beat * 2;
    model.jumpAge = -1; model.jump(model.time);
  }
  assert.equal(model.combo, 12); assert.equal(model.maxCombo, 12);
  assert.equal(model.flowMultiplier, 4);
  model.boost = true; assert.equal(model.multiplier, 8);
  model.jumpAge = -1; model.jump(model.time + .166);
  assert.equal(model.combo, 10); assert.equal(model.maxCombo, 12);
  model.time = model.comboDecayAt; model.update(.01);
  assert.equal(model.combo, 9);
  model.jumpAge = -1; model.jump(model.beat * Math.round(model.time / model.beat));
  assert.equal(model.combo, 10);
});

test('drop timers and configurable duration track the excerpt and Ravy windows', () => {
  const level = { ...LEVELS[0], duration: 6, boostWindows: [[2, 4]], dropTimes: [2] };
  const model = cleanRun(level);
  assert.equal(model.nextDrop, 2); assert.equal(model.dropRemaining, 2);
  near(model.dropProgress, .75);
  model.update(2);
  assert.equal(model.events.filter(event => event.type === 'drop').length, 1);
  assert.equal(model.boost, true); near(model.ravyRemaining, 2); near(model.ravyProgress, 1);
  model.update(1); near(model.ravyProgress, .5);
  model.update(1); assert.equal(model.boost, false); assert.equal(model.nextDrop, null);
  model.update(2); assert.equal(model.done, true); assert.equal(model.remaining, 0);
});

test('movement, distance and passive scoring are consistent across 30/60/120Hz and frame hitches', () => {
  const run = steps => {
    const model = cleanRun(); model.move(1);
    for (const step of steps) model.update(step);
    return model;
  };
  const baseline = run(Array(120 * 24).fill(1 / 120));
  for (const hz of [30, 60]) {
    const model = run(Array(hz * 24).fill(1 / hz));
    near(model.time, baseline.time); near(model.distance, baseline.distance); near(model.score, baseline.score); near(model.x, baseline.x);
  }
  const irregular = run(Array(80).fill([.03, .07, .2]).flat());
  near(irregular.distance, baseline.distance); near(irregular.score, baseline.score);
  const quick60 = run(Array(6).fill(1 / 60)), quick120 = run(Array(12).fill(1 / 120));
  near(quick60.x, quick120.x);
  assert.ok(quick60.x > 1.88, 'lane change should cover at least 88% in 100ms');
});

test('collision, grace after a hit, jumping and Ravy obstacle smashing remain functional', () => {
  const model = cleanRun();
  const obstacle = type => ({ type, lane: 1, z: 5.1, checked: false });
  model.objects = [obstacle('cone'), obstacle('barrier')];
  model.update(.02); assert.equal(model.lives, 2);
  assert.equal(model.events.filter(event => event.type === 'hit').length, 1);
  model.invincible = 0; model.jumpAge = model.jumpDuration / 2;
  model.objects = [obstacle('barrier')]; model.update(.02); assert.equal(model.lives, 2);
  model.time = 11; model.objects = [obstacle('barrier')];
  const scoreBeforeSmash = model.score; model.update(.02);
  assert.equal(model.lives, 2); assert.equal(model.events.some(event => event.type === 'smash'), true);
  near(model.score - scoreBeforeSmash, .02 * 21 * model.multiplier);
  assert.equal(model.events.some(event => event.type === 'smash' && 'points' in event), false);
  assert.equal(model.objects.length, 0);
});

test('pickup lanes remain clear and no generated obstacle row blocks all three lanes', () => {
  for (const level of LEVELS) {
    const model = cleanRun(level); model.time = 30;
    for (let row = 0; row < 36; row++) {
      model.objects = []; model.spawn();
      const blocked = new Set(model.objects.filter(object => !['speaker', 'deck'].includes(object.type)).map(object => object.lane));
      assert.ok(blocked.size <= 2);
      assert.ok(model.objects.filter(object => ['speaker', 'deck'].includes(object.type)).every(object => !blocked.has(object.lane)));
    }
  }
});

class FakeBuffer {
  constructor(channels, length, sampleRate, marker = 0) {
    this.numberOfChannels = channels; this.length = length; this.sampleRate = sampleRate; this.duration = length / sampleRate;
    this.channels = Array.from({ length: channels }, () => new Float32Array(length).fill(marker));
  }
  getChannelData(channel) { return this.channels[channel]; }
  copyToChannel(samples, channel) { this.channels[channel].set(samples); }
}
class FakeNode {
  constructor() {
    this.gain = this.frequency = { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { this.value = value; }, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    this.disconnected = 0; this.stopped = 0;
  }
  connect() {}
  disconnect() { this.disconnected++; }
  start(...args) { this.started = args; }
  stop() { this.stopped++; }
}
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.sources = []; }
  async resume() { this.state = 'running'; }
  createGain() { return new FakeNode(); }
  createBuffer(channels, length, sampleRate) { return new FakeBuffer(channels, length, sampleRate); }
  async decodeAudioData(data) { return new FakeBuffer(2, 60000, 100, new Uint8Array(data)[0]); }
  createBufferSource() { const source = new FakeNode(); this.sources.push(source); return source; }
  createOscillator() { return new FakeNode(); }
}
function mockAudio(t, fetcher = async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([7]).buffer })) {
  const oldWindow = globalThis.window, oldFetch = globalThis.fetch;
  globalThis.window = { AudioContext: FakeAudioContext }; globalThis.fetch = fetcher;
  t.after(() => { globalThis.window = oldWindow; globalThis.fetch = oldFetch; selectLevel(0); });
  return new BeatAudio();
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('audio selection race cannot attach an old track to a newer selection', async t => {
  const requests = new Map();
  const audio = mockAudio(t, source => new Promise(resolve => requests.set(source, marker => resolve({ ok: true, arrayBuffer: async () => new Uint8Array([marker]).buffer }))));
  const first = audio.init(LEVELS[0]); await flush();
  const second = audio.init(LEVELS[1]); await flush();
  requests.get(LEVELS[1].src)(2); assert.equal(await second, true);
  requests.get(LEVELS[0].src)(1); assert.equal(await first, false);
  assert.equal(audio.bufferSrc, LEVELS[1].src); assert.equal(audio.buffer.getChannelData(0)[0], 2);
  assert.equal(audio.buffer.duration, LEVELS[1].duration);
  assert.equal(audio.start(0, LEVELS[0]), false);
  assert.equal(audio.start(0, LEVELS[1]), true);
});

test('audio retains at most two excerpts and reuses the most recent selected track', async t => {
  let fetched = 0;
  const audio = mockAudio(t, async () => { fetched++; return { ok: true, arrayBuffer: async () => new Uint8Array([7]).buffer }; });
  for (const index of [0, 1, 0, 2]) assert.equal(await audio.init(LEVELS[index]), true);
  assert.equal(fetched, 3); assert.equal(audio.cache.size, 2);
  for (const buffer of audio.cache.values()) assert.equal(buffer.duration, 45);
  assert.equal(await audio.init(LEVELS[1]), true); assert.equal(fetched, 4);
});

test('audio start/pause/resume uses excerpt offsets, exact input clock and releases old sources', async t => {
  const audio = mockAudio(t); await audio.init(LEVELS[0]); audio.setEnabled(true);
  assert.equal(audio.start(4, LEVELS[0]), true);
  const first = audio.source;
  assert.deepEqual(first.started, [.025, 4, 41]);
  audio.ctx.currentTime = 2.025;
  near(audio.time, 6);
  const inputDelay = Math.min(.01, performance.now() / 2000);
  near(audio.sampleTime(performance.now() - inputDelay * 1000), 6 - inputDelay, .003);
  near(audio.pause(), 6); assert.equal(audio.time, null);
  assert.equal(first.stopped, 1); assert.equal(first.disconnected, 1); assert.equal(first.onended, null);
  assert.equal(await audio.resume(), true);
  assert.equal(audio.source.started[1], 6); assert.equal(audio.master.gain.value, .78);
  audio.setEnabled(false); assert.equal(audio.master.gain.value, 0);
  const second = audio.source; second.onended();
  assert.equal(audio.active, false); assert.equal(audio.source, null); assert.equal(second.disconnected, 1);
});

test('failed or too-short audio stays retryable without starting the wrong buffer', async t => {
  let fails = true;
  const audio = mockAudio(t, async () => ({ ok: !fails, arrayBuffer: async () => new Uint8Array([7]).buffer }));
  await assert.rejects(audio.init(LEVELS[0]), /kon niet laden/);
  assert.equal(audio.pending.size, 0); fails = false;
  assert.equal(await audio.init(LEVELS[0]), true);
  await assert.rejects(audio.init({ ...LEVELS[0], sourceStart: 580 }), /te kort/);
  assert.equal(audio.pending.size, 0);
});
