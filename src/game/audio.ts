type Name = 'jump' | 'ring' | 'spring' | 'hit' | 'stomp' | 'checkpoint' | 'win' | 'over' | 'click';

class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  /** Must be called from a user gesture (click / key / touch). */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* audio unsupported */ }
  }

  private tone(f: number, d: number, type: OscillatorType, v: number, to = f, delay = 0) {
    const c = this.ctx;
    if (!c || !this.master || !this.enabled) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + d + 0.03);
  }

  play(n: Name) {
    switch (n) {
      case 'jump': this.tone(330, 0.18, 'square', 0.3, 760); break;
      case 'ring': this.tone(988, 0.08, 'square', 0.22); this.tone(1319, 0.2, 'square', 0.22, 1319, 0.07); break;
      case 'spring': this.tone(180, 0.35, 'sawtooth', 0.3, 1000); break;
      case 'hit': this.tone(420, 0.4, 'sawtooth', 0.35, 70); break;
      case 'stomp': this.tone(520, 0.12, 'square', 0.3, 200); this.tone(260, 0.12, 'triangle', 0.3, 100, 0.05); break;
      case 'checkpoint': [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.3, f, i * 0.09)); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'square', 0.22, f, i * 0.11)); break;
      case 'over': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.3, f * 0.97, i * 0.2)); break;
      case 'click': this.tone(620, 0.06, 'square', 0.14); break;
    }
  }
}

export const sfx = new Sfx();
