import { MUSIC } from './engine.js';

export class BeatAudio {
  constructor() { this.ctx = null; this.enabled = false; this.active = false; this.epoch = 0; this.buffer = null; this.bufferSrc = ''; this.source = null; this.loading = null; }
  async init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.ctx = new AudioContext(); this.master = this.ctx.createGain();
      this.master.gain.value = 0; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = .7; this.musicGain.connect(this.master);
      this.effects = this.ctx.createGain(); this.effects.gain.value = .2; this.effects.connect(this.master);
    }
    await this.ctx.resume();
    if (!this.buffer || this.bufferSrc !== MUSIC.src) {
      this.buffer = null;
      if (!this.loading) this.loading = fetch(MUSIC.src).then(response => {
        if (!response.ok) throw new Error('Muziek kon niet laden');
        return response.arrayBuffer();
      }).then(data => this.ctx.decodeAudioData(data)).then(buffer => {
        if (buffer.duration < MUSIC.sourceStart + 45) throw new Error('Muziekfragment te kort');
        this.buffer = buffer; this.bufferSrc = MUSIC.src;
      }).finally(() => { this.loading = null; });
      await this.loading;
    }
    return this.ctx.state === 'running';
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(this.active && enabled ? .78 : 0, this.ctx.currentTime, .018); }
  }
  start(gameTime) {
    if (!this.ctx || !this.buffer) return;
    this.stop(); this.active = true;
    const when = this.ctx.currentTime + .025;
    this.epoch = when - gameTime;
    this.source = this.ctx.createBufferSource(); this.source.buffer = this.buffer;
    this.source.connect(this.musicGain); this.source.start(when, MUSIC.sourceStart + gameTime);
    this.setEnabled(this.enabled);
  }
  stop() {
    this.active = false;
    if (this.source) { try { this.source.stop(); } catch {} this.source.disconnect(); this.source = null; }
    this.setEnabled(this.enabled);
  }
  get time() { return this.ctx && this.active ? Math.max(0, this.ctx.currentTime - this.epoch) : null; }
  tone(frequency, duration, when, volume, endFrequency = null) {
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, when);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(.001, when); gain.gain.exponentialRampToValueAtTime(volume, when + .006);
    gain.gain.exponentialRampToValueAtTime(.001, when + duration);
    osc.connect(gain); gain.connect(this.effects); osc.start(when); osc.stop(when + duration + .02);
  }
  effect(type) {
    if (!this.ctx || !this.enabled || !this.active) return;
    const t = this.ctx.currentTime;
    if (type === 'speaker') { this.tone(660, .09, t, .22); this.tone(990, .08, t + .05, .15); }
    if (type === 'beat') this.tone(1320, .055, t, .07);
    if (type === 'hit') this.tone(125, .18, t, .2, 40);
  }
}
