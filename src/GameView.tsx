import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Game } from './game/engine';
import type { EndInfo, HudState, Status } from './game/engine';
import type { Btn } from './game/input';
import { sfx } from './game/audio';
import { canFullscreen, toggleFullscreen } from './fullscreen';

interface Props {
  level: number; score: number; lives: number; soundOn: boolean;
  onToggleSound: () => void; onExit: () => void; onNext: (score: number, lives: number) => void;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function TouchBtn({ name, label, cls, gameRef }: { name: Btn; label: string; cls?: string; gameRef: MutableRefObject<Game | null> }) {
  const set = (v: boolean) => gameRef.current?.input.setTouch(name, v);
  return (
    <button
      className={`tbtn ${cls ?? ''}`}
      aria-label={name}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); sfx.unlock(); set(true); }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >{label}</button>
  );
}

export default function GameView({ level, score, lives, soundOn, onToggleSound, onExit, onNext }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>({ score, rings: 0, lives, level: level + 1, time: 0, best: 0 });
  const [status, setStatus] = useState<Status>('running');
  const [info, setInfo] = useState<EndInfo | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!, wrap = wrapRef.current!;
    const game = new Game(canvas, level, score, lives, {
      onHud: setHud,
      onStatus: (s, e) => { setStatus(s); setInfo(e ?? null); },
    });
    gameRef.current = game;
    game.start();
    const ro = new ResizeObserver(() => game.resize());
    ro.observe(canvas);
    const onVis = () => { if (document.hidden) game.pause(); };
    const onMove = (e: TouchEvent) => e.preventDefault();
    const unlock = () => sfx.unlock();
    document.addEventListener('visibilitychange', onVis);
    wrap.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('keydown', unlock);
    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      wrap.removeEventListener('touchmove', onMove);
      window.removeEventListener('keydown', unlock);
      game.dispose();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const g = () => gameRef.current;
  return (
    <div className="game" ref={wrapRef}>
      <canvas ref={canvasRef} className="canvas" />

      <div className="hud">
        <span className="chip">SCORE <b>{hud.score}</b></span>
        <span className="chip ring-chip">RINGS <b>{hud.rings}</b></span>
        <span className="chip">LIVES <b>{'♥'.repeat(Math.max(0, hud.lives))}</b></span>
        <span className="chip">LEVEL <b>{hud.level}</b></span>
        <span className="chip">TIME <b>{fmt(hud.time)}</b></span>
        <span className="chip">BEST <b>{hud.best}</b></span>
      </div>

      <div className="hud-btns">
        <button className="ibtn" aria-label="Pause" onClick={() => { sfx.unlock(); g()?.pause(); }}>❚❚</button>
        <button className="ibtn" aria-label="Toggle sound" onClick={onToggleSound}>{soundOn ? '🔊' : '🔇'}</button>
        {canFullscreen() && <button className="ibtn" aria-label="Fullscreen" onClick={toggleFullscreen}>⛶</button>}
      </div>

      <div className="rotate-hint">Tip: rotate your phone to landscape for the best view</div>

      <div className="touch">
        <div className="grp">
          <TouchBtn name="left" label="◀" gameRef={gameRef} />
          <TouchBtn name="right" label="▶" gameRef={gameRef} />
        </div>
        <div className="grp">
          <TouchBtn name="down" label="ROLL" cls="small" gameRef={gameRef} />
          <TouchBtn name="jump" label="JUMP" cls="big" gameRef={gameRef} />
        </div>
      </div>

      {status === 'paused' && (
        <div className="overlay"><div className="panel">
          <h2>Paused</h2>
          <button className="btn" onClick={() => g()?.resume()}>Resume</button>
          <button className="btn alt" onClick={() => g()?.restart()}>Restart</button>
          <button className="btn alt" onClick={onExit}>Main Menu</button>
        </div></div>
      )}

      {status === 'gameover' && info && (
        <div className="overlay"><div className="panel">
          <h2 className="bad">Game Over</h2>
          <p className="big-num">{info.score}</p>
          <p className="sub">{info.newBest ? 'New best score!' : `Best: ${info.best}`}</p>
          <button className="btn" onClick={() => g()?.restart()}>Restart</button>
          <button className="btn alt" onClick={onExit}>Main Menu</button>
        </div></div>
      )}

      {(status === 'complete' || status === 'win') && info && (
        <div className="overlay"><div className="panel">
          <h2 className="good">{status === 'win' ? 'You Beat Every Zone!' : 'Level Complete!'}</h2>
          <table className="stats"><tbody>
            <tr><td>Time</td><td>{fmt(info.time)}</td></tr>
            <tr><td>Time bonus</td><td>+{info.timeBonus}</td></tr>
            <tr><td>Ring bonus</td><td>+{info.ringBonus}</td></tr>
            <tr><td>Total score</td><td><b>{info.score}</b></td></tr>
          </tbody></table>
          <p className="sub">{info.newBest ? 'New best score!' : `Best: ${info.best}`}</p>
          {status === 'complete' && <button className="btn" onClick={() => onNext(info.score, info.lives)}>Next Level</button>}
          <button className={status === 'win' ? 'btn' : 'btn alt'} onClick={() => g()?.restart()}>{status === 'win' ? 'Play Again' : 'Replay'}</button>
          <button className="btn alt" onClick={onExit}>Main Menu</button>
        </div></div>
      )}
    </div>
  );
}
