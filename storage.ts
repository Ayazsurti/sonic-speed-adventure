const get = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

export const loadBest = (): number => Number(get('ssa_best')) || 0;
export const saveBest = (n: number) => set('ssa_best', String(n));
export const loadCleared = (): number[] => {
  try { const v = JSON.parse(get('ssa_cleared') || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const markCleared = (i: number) => {
  const c = loadCleared();
  if (!c.includes(i)) set('ssa_cleared', JSON.stringify([...c, i]));
};
export const loadSound = (): boolean => get('ssa_sound') !== '0';
export const saveSound = (on: boolean) => set('ssa_sound', on ? '1' : '0');
