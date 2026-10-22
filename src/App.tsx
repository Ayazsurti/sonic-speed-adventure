import { useEffect, useRef, useState } from 'react';
import GameView from './GameView';
import { THEMES, LEVEL_COUNT } from './game/levels';
import { drawHero } from './game/render';
import { sfx } from './game/audio';
import { loadBest, loadCleared, loadSound, saveSound } from './game/storage';
import { canFullscreen, toggleFullscreen } from './fullscreen';

type Screen = 'loading' | 'menu' | 'levels' | 'play';
interface Run { level: number; score: number; lives: number; key: number }

function HeroPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!;
    let raf = 0, t = 0;
    const loop = () => {
      t++;
      x.clearRect(0, 0, c.width, c.height);
      x.save(); x.translate(c.width / 2, c.height - 18); x.scale(2.3, 2.3);
      drawHero(x, 0, 0, 1, 'run', t, 9);
      x.restore();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={210} height={190} className="hero-preview" aria-hidden="true" />;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<Run>({ level: 0, score: 0, lives: 3, key: 0 });
  const [soundOn, setSoundOn] = useState(loadSound());
  const [showControls, setShowControls] = useState(false);
  const [best, setBest] = useState(loadBest());
  const [cleared, setCleared] = useState<number[]>(loadCleared());

  useEffect(() => { sfx.enabled = soundOn; saveSound(soundOn); }, [soundOn]);

  useEffect(() => {
    if (screen !== 'loading') return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / 1100);
      setProgress(p);
      if (p >= 1) { clearInterval(id); setScreen('menu'); }
    }, 40);
    return () => clearInterval(id);
  }, [screen]);

  const start = (level: number) => {
    sfx.unlock(); sfx.play('click');
    setRun((r) => ({ level, score: 0, lives: 3, key: r.key + 1 }));
    setScreen('play');
  };
  const toMenu = () => { setBest(loadBest()); setCleared(loadCleared()); setScreen('menu'); };
  const toggleSound = () => { sfx.unlock(); setSoundOn((s) => !s); };

  if (screen === 'loading') {
    return (
      <div className="screen loading">
        <div className="spinner" />
        <p className="sub">Loading zones…</p>
        <div className="bar"><div style={{ width: `${progress * 100}%` }} /></div>
      </div>
    );
  }

  if (screen === 'play') {
    return (
      <GameView
        key={run.key} level={run.level} score={run.score} lives={run.lives} soundOn={soundOn}
        onToggleSound={toggleSound} onExit={toMenu}
        onNext={(score, lives) => setRun((r) => ({ level: r.level + 1, score, lives, key: r.key + 1 }))}
      />
    );
  }

  return (
    <div className="screen menu">
      <div className="deco-ground" />
      <span className="deco-ring r1" /><span className="deco-ring r2" /><span className="deco-ring r3" />
      <div className="menu-inner">
        <h1 className="title">Sonic Speed Adventure</h1>
        {screen === 'menu' ? (
          <>
            <HeroPreview />
            <p className="sub">Best score: <b>{best}</b></p>
            <div className="btn-col">
              <button className="btn" onClick={() => start(0)}>Play</button>
              <button className="btn alt" onClick={() => { sfx.unlock(); sfx.play('click'); setScreen('levels'); }}>Level Select</button>
              <button className="btn alt" onClick={toggleSound}>Sound: {soundOn ? 'On' : 'Off'}</button>
              <button className="btn alt" onClick={() => { sfx.unlock(); sfx.play('click'); setShowControls(true); }}>Controls</button>
              {canFullscreen() && <button className="btn alt" onClick={toggleFullscreen}>Fullscreen</button>}
            </div>
          </>
        ) : (
          <>
            <div className="cards">
              {THEMES.slice(0, LEVEL_COUNT).map((t, i) => (
                <button key={t.name} className="card" onClick={() => start(i)}
                  style={{ background: `linear-gradient(${t.skyTop}, ${t.skyBot})` }}>
                  <span className="card-n">{i + 1}</span>
                  <span className="card-name">{t.name}</span>
                  <span className="card-meta">{['Easy', 'Medium', 'Hard'][i]}{cleared.includes(i) ? ' • ★ Cleared' : ''}</span>
                  <span className="card-ground" style={{ background: t.grass }} />
                </button>
              ))}
            </div>
            <button className="btn alt" onClick={() => { sfx.play('click'); setScreen('menu'); }}>Back</button>
          </>
        )}
      </div>

      {showControls && (
        <div className="overlay" onClick={() => setShowControls(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>Controls</h2>
            <table className="stats"><tbody>
              <tr><td>Run</td><td>← → or A / D</td></tr>
              <tr><td>Jump</td><td>Space, ↑ or W</td></tr>
              <tr><td>Crouch / Roll</td><td>↓ or S</td></tr>
              <tr><td>Pause</td><td>Esc</td></tr>
              <tr><td>Touch</td><td>On-screen buttons</td></tr>
            </tbody></table>
            <p className="sub small">Jump on enemies, collect rings, hit springs, and reach the finish line. Rolling keeps your speed on slopes!</p>
            <button className="btn" onClick={() => setShowControls(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
