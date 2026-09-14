'use client';
import { useEffect, useRef, useState } from 'react';
import { PawPrint, RotateCcw } from 'lucide-react';
import {
  dropKitten,
  KITTEN_RADII,
  DROP_STEPS,
  type Kitten,
} from '@/lib/game/kitten-drop';
import { loadCompanionAtlas } from '@/lib/client/companion-assets';
import type { CompanionAtlas } from '@/lib/client/companion-renderer';
import { SectionTitle, type ScreenProps } from './shared';
const colors = [
  '#e8cba0',
  '#99ccbc',
  '#dbb0bc',
  '#aac0e9',
  '#cbade5',
  '#edd185',
  '#a8e4de',
];
export default function KittenDrop({ state, act, busy, config }: ScreenProps) {
  const round = state.kittenRound;
  const canvas = useRef<HTMLCanvasElement>(null),
    current = useRef(round),
    aim = useRef(180),
    locked = useRef(false),
    alive = useRef(true),
    animation = useRef<{ frames: Kitten[][]; start: number } | null>(null);
  current.current = round;
  const [moving, setMoving] = useState(false),
    [x, setX] = useState(180),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    alive.current = true;
    let frame = 0,
      parts: CompanionAtlas[] = [];
    void Promise.all([
      loadCompanionAtlas('/assets/companion-rig.png'),
      loadCompanionAtlas('/assets/starlight-rig.png'),
    ])
      .then((a) => {
        parts = a;
        if (alive.current) setReady(true);
      })
      .catch(() => {
        if (alive.current)
          setError('The kittens could not load. Reload to try again.');
      });
    const render = (now: number) => {
      if (!alive.current) return;
      frame = requestAnimationFrame(render);
      const c = canvas.current,
        ctx = c?.getContext('2d');
      if (!c || !ctx || !parts.length || document.hidden) return;
      const dpr = Math.min(devicePixelRatio, 2);
      if (c.width !== 360 * dpr) {
        c.width = 360 * dpr;
        c.height = 470 * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#f4ead9';
      ctx.fillRect(0, 0, 360, 470);
      ctx.strokeStyle = '#b96e6170';
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(6, 52);
      ctx.lineTo(354, 52);
      ctx.stroke();
      ctx.setLineDash([]);
      const a = animation.current,
        balls = a
          ? a.frames[Math.min(DROP_STEPS - 1, Math.floor((now - a.start) / 11))]
          : current.current?.balls || [];
      const draw = (
        tier: number,
        px: number,
        py: number,
        rad: number,
        opacity = 1,
      ) => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = colors[tier];
        ctx.shadowColor = '#5e51332e';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        const atlas = parts[tier % 2],
          part = atlas.parts[tier === 6 ? 1 : 0];
        ctx.drawImage(
          atlas.image,
          part.x,
          part.y,
          part.w,
          part.h,
          px - rad * 0.87,
          py - rad * 0.96,
          rad * 1.74,
          rad * 1.7,
        );
        ctx.fillStyle = '#3a493b';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(String(tier + 1), px, py + rad * 0.82);
        ctx.restore();
      };
      balls?.forEach((b) => draw(b.tier, b.x, b.y, KITTEN_RADII[b.tier]));
      if (!a && current.current && !current.current.finished) {
        const tier = current.current.next,
          rad = KITTEN_RADII[tier],
          px = Math.max(rad + 5, Math.min(355 - rad, aim.current));
        ctx.strokeStyle = '#8b9d825c';
        ctx.setLineDash([3, 7]);
        ctx.beginPath();
        ctx.moveTo(px, 55);
        ctx.lineTo(px, 450);
        ctx.stroke();
        ctx.setLineDash([]);
        draw(tier, px, 27, rad * 0.8, 0.8);
      }
    };
    frame = requestAnimationFrame(render);
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  const drop = async () => {
    if (!round || round.finished || locked.current || busy || !ready) return;
    locked.current = true;
    setMoving(true);
    const frames: Kitten[][] = [];
    dropKitten(round, Math.round(aim.current), (b) => frames.push(b));
    animation.current = { frames, start: performance.now() };
    const [result] = await Promise.all([
      act({
        action: 'kitten_drop',
        id: round.id,
        step: round.drops,
        x: Math.round(aim.current),
      }),
      new Promise((r) => setTimeout(r, 1600)),
    ]);
    if (!alive.current) return;
    animation.current = null;
    locked.current = false;
    setMoving(false);
    if (!result) setError('That drop was not saved. Try again.');
    else setError('');
  };
  return (
    <>
      <SectionTitle
        eyebrow="KITTEN DROP"
        title="A basket full of tiny trouble."
        description="Drop matching kittens together. Make bigger friends. Keep the basket below the dotted line."
      />
      <div className="kitten-game-layout">
        <div className="kitten-basket-panel">
          <div className="kitten-score">
            <span>
              Score <strong>{round?.score || 0}</strong>
            </span>
            <span>
              Best <strong>{state.kittenBest || 0}</strong>
            </span>
            <span>{round?.drops || 0}/30 drops</span>
          </div>
          <canvas
            ref={canvas}
            className="kitten-basket"
            role="img"
            aria-label="Kitten Drop basket. Use the aim slider and Drop kitten button to play."
            onPointerMove={(e) => {
              if (moving) return;
              const r = e.currentTarget.getBoundingClientRect();
              aim.current = Math.round(((e.clientX - r.left) / r.width) * 360);
              setX(aim.current);
            }}
            onPointerUp={() => void drop()}
          />
          {round && !round.finished && (
            <div className="kitten-drop-controls">
              <label>
                Aim
                <input
                  aria-label="Aim kitten"
                  type="range"
                  min="25"
                  max="335"
                  value={x}
                  disabled={moving || busy}
                  onChange={(e) => {
                    aim.current = +e.target.value;
                    setX(+e.target.value);
                  }}
                />
              </label>
              <button
                className="primary"
                disabled={moving || busy || !ready}
                onClick={() => void drop()}
              >
                <PawPrint size={18} />
                {moving ? 'Settling…' : 'Drop kitten'}
              </button>
            </div>
          )}
          {!round ? (
            <button
              className="primary"
              disabled={busy || !ready}
              onClick={() => void act({ action: 'kitten_start' })}
            >
              <RotateCcw size={17} />
              Start a basket
            </button>
          ) : (
            <button
              className="secondary"
              disabled={moving || busy}
              onClick={() =>
                void act({ action: 'kitten_finish', id: round.id })
              }
            >
              {round.finished ? 'Save score & finish' : 'Finish this basket'}
            </button>
          )}
          {(error || !ready) && (
            <p role="status">{error || 'Gathering the kittens…'}</p>
          )}
        </div>
        <aside className="kitten-guide panel">
          <h3>Small cats. Big combinations.</h3>
          <p>
            Move your pointer or slide to aim. Tap the basket or press Drop
            kitten. Two matching cats combine when they touch.
          </p>
          <p>
            Leave space for the next drop. Larger cats are worth more points.
          </p>
          <h3>Play rewards</h3>
          <p>
            Reach 120 points with at least 8 drops and 4 merges to earn{' '}
            {config.playCoins} PC and 60 EXP when you finish.
          </p>
          <p>
            {state.daily.play}/{config.minigameLimit} rewarded games today. Keep
            playing for a higher best score after the daily limit.
          </p>
          <div className="kitten-evolution" aria-label="Seven kitten sizes">
            {colors.map((c, i) => (
              <span key={c} style={{ background: c }}>
                {i + 1}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
