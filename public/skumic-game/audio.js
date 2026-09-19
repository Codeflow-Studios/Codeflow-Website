import { MUSIC, ROUND_SECONDS } from './engine.js';

const excerptKey = level => `${level.src}|${level.sourceStart}|${level.duration ?? ROUND_SECONDS}`;

export class BeatAudio {
  constructor() {
    this.ctx = null; this.enabled = false; this.active = false; this.epoch = 0;
    this.buffer = null; this.bufferSrc = ''; this.bufferKey = ''; this.source = null; this.loading = null;
    this.cache = new Map(); this.pending = new Map(); this.loadRequest = 0;
    this.requestedKey = ''; this.level = null; this.pausedTime = 0; this.startOffset = 0;
  }
  async init(level = MUSIC) {
    // Capture the chosen track before any await: selecting another track must never
    // relabel a completed request or start the wrong recording.
    const config = { src: level.src, sourceStart: level.sourceStart, duration: level.duration ?? ROUND_SECONDS };
    const key = excerptKey(config), request = ++this.loadRequest;
    this.requestedKey = key;
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.ctx = new AudioContext(); this.master = this.ctx.createGain();
      this.master.gain.value = 0; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = .7; this.musicGain.connect(this.master);
      this.effects = this.ctx.createGain(); this.effects.gain.value = .2; this.effects.connect(this.master);
    }
    await this.ctx.resume();
    if (request !== this.loadRequest) return false;
    let buffer = this.cache.get(key);
    if (!buffer) {
      let pending = this.pending.get(key);
      if (!pending) {
        pending = this.loadExcerpt(config, key).finally(() => {
          this.pending.delete(key);
          if (this.loading === pending) this.loading = null;
        });
        this.pending.set(key, pending);
      }
      this.loading = pending;
      buffer = await pending;
    }
    if (request !== this.loadRequest || !buffer) return false;
    this.buffer = buffer; this.bufferSrc = config.src; this.bufferKey = key; this.level = config;
    this.cache.delete(key); this.cache.set(key, buffer);
    while (this.cache.size > 2) this.cache.delete(this.cache.keys().next().value);
    return this.ctx.state === 'running';
  }
  async loadExcerpt(config, key) {
    const response = await fetch(config.src);
    if (!response.ok) throw new Error('Muziek kon niet laden');
    const data = await response.arrayBuffer();
    if (key !== this.requestedKey) return null;
    const decoded = await this.ctx.decodeAudioData(data);
    if (key !== this.requestedKey) return null;
    if (decoded.duration + .001 < config.sourceStart + config.duration) throw new Error('Muziekfragment te kort');
    // Keep only playable excerpts, not several complete decoded songs in memory.
    const length = Math.round(config.duration * decoded.sampleRate);
    const start = Math.round(config.sourceStart * decoded.sampleRate);
    const buffer = this.ctx.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      buffer.copyToChannel(decoded.getChannelData(channel).subarray(start, start + length), channel);
    }
    return buffer;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(this.active && enabled ? .78 : 0, this.ctx.currentTime, .018); }
  }
  start(gameTime = 0, level = MUSIC) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.buffer || this.bufferKey !== excerptKey(level)) return false;
    const offset = Math.max(0, Math.min(this.level.duration, gameTime));
    if (offset >= this.level.duration) return false;
    this.stop(); this.active = true;
    const when = this.ctx.currentTime + .025;
    this.epoch = when - offset; this.startOffset = offset; this.pausedTime = offset;
    const source = this.ctx.createBufferSource(); this.source = source; source.buffer = this.buffer;
    source.connect(this.musicGain);
    source.onended = () => {
      source.disconnect(); source.onended = null;
      if (this.source === source) { this.pausedTime = this.level.duration; this.active = false; this.source = null; this.setEnabled(this.enabled); }
    };
    source.start(when, offset, this.level.duration - offset);
    this.setEnabled(this.enabled);
    return true;
  }
  stop() {
    if (this.active) this.pausedTime = this.time ?? this.pausedTime;
    this.active = false;
    if (this.source) {
      const source = this.source; this.source = null; source.onended = null;
      try { source.stop(); } catch {}
      source.disconnect();
    }
    this.setEnabled(this.enabled);
  }
  pause() { this.stop(); return this.pausedTime; }
  async resume(gameTime = this.pausedTime) { const level = this.level ?? MUSIC; return await this.init(level) && this.start(gameTime, level); }
  sampleTime(eventTimestamp) {
    if (!this.ctx || !this.active) return null;
    let delay = 0;
    if (Number.isFinite(eventTimestamp) && eventTimestamp > 0) {
      const timestamp = eventTimestamp > 1e12 ? eventTimestamp - performance.timeOrigin : eventTimestamp;
      delay = Math.max(0, (performance.now() - timestamp) / 1000);
    }
    return Math.min(this.level.duration, Math.max(this.startOffset, this.ctx.currentTime - this.epoch - delay));
  }
  get time() { return this.sampleTime(); }
  tone(frequency, duration, when, volume, endFrequency = null) {
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, when);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(.001, when); gain.gain.exponentialRampToValueAtTime(volume, when + .006);
    gain.gain.exponentialRampToValueAtTime(.001, when + duration);
    osc.connect(gain); gain.connect(this.effects); osc.start(when); osc.stop(when + duration + .02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); osc.onended = null; };
  }
  effect(type) {
    if (!this.ctx || !this.enabled || !this.active) return;
    const t = this.ctx.currentTime;
    if (type === 'speaker') { this.tone(660, .09, t, .22); this.tone(990, .08, t + .05, .15); }
    if (type === 'deck') { this.tone(440, .08, t, .18); this.tone(880, .10, t + .055, .19); this.tone(1320, .12, t + .11, .12); }
    if (type === 'beat') this.tone(1320, .055, t, .07);
    if (type === 'hit') this.tone(125, .18, t, .2, 40);
  }
}
