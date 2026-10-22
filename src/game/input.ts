export type Btn = 'left' | 'right' | 'jump' | 'down';

const MAP: Record<string, Btn> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down',
};

export class Input {
  private keys: Record<Btn, Set<string>> = { left: new Set(), right: new Set(), jump: new Set(), down: new Set() };
  private touch: Record<Btn, boolean> = { left: false, right: false, jump: false, down: false };
  private queued = false;

  constructor(private onPause: () => void) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    window.addEventListener('blur', this.clear);
  }

  private is(b: Btn) { return this.touch[b] || this.keys[b].size > 0; }
  get left() { return this.is('left'); }
  get right() { return this.is('right'); }
  get jump() { return this.is('jump'); }
  get down() { return this.is('down'); }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape') { e.preventDefault(); if (!e.repeat) this.onPause(); return; }
    const b = MAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (b === 'jump' && !this.is('jump')) this.queued = true;
    this.keys[b].add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const b = MAP[e.code];
    if (!b) return;
    e.preventDefault();
    this.keys[b].delete(e.code);
  };

  setTouch(b: Btn, v: boolean) {
    if (b === 'jump' && v && !this.is('jump')) this.queued = true;
    this.touch[b] = v;
  }

  consumeJump() { const q = this.queued; this.queued = false; return q; }

  clear = () => {
    (Object.keys(this.keys) as Btn[]).forEach((k) => { this.keys[k].clear(); this.touch[k] = false; });
    this.queued = false;
  };

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clear);
  }
}
