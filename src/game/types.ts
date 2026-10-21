export interface Seg { x0: number; x1: number; y0: number; y1: number; gap?: boolean }
export interface Ring { x: number; y: number; got: boolean; ph: number }
export interface Plat { x: number; y: number; w: number; c: number }
export interface Spring { x: number; y: number; t: number }
export interface Spike { x: number; y: number; w: number }
export interface Enemy {
  kind: 'crawler' | 'flyer';
  x: number; y: number; x0: number; x1: number;
  dir: number; speed: number; base: number; alive: boolean; t: number;
}
export interface Checkpoint { x: number; active: boolean }
export interface Theme {
  name: string; skyTop: string; skyBot: string; far: string; near: string;
  grass: string; grassDark: string; dirtA: string; dirtB: string;
  plats: string[]; stars: boolean; sun: string; cloud: string;
}
export interface Level {
  theme: Theme; segs: Seg[]; rings: Ring[]; plats: Plat[]; springs: Spring[];
  spikes: Spike[]; enemies: Enemy[]; checkpoints: Checkpoint[];
  finishX: number; bottom: number; par: number;
}
