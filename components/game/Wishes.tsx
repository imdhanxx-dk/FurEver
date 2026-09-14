'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sparkles, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ITEMS } from '@/lib/game/catalog';
import type { GameResult } from '@/lib/game/types';
import { Choice, SectionTitle, type ScreenProps } from './shared';
import Pet from './Pet';
export default function Wishes({ state: s, config, act, busy }: ScreenProps) {
  const [payment, setPayment] = useState('Wish tickets'),
    [phase, setPhase] = useState<'idle' | 'casting' | 'results'>('idle'),
    [rewards, setRewards] = useState<NonNullable<GameResult['rewards']>>([]),
    [skipped, setSkipped] = useState(false);
  const active = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  const [focus, setFocus] = useState(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const cast = async (count: 1 | 10) => {
    if (active.current || busy) return;
    active.current = true;
    setSkipped(false);
    setRewards([]);
    setPhase('casting');
    const start = performance.now();
    const result = await act({
      action: 'gacha',
      count,
      payment: payment === 'Pet Coins' ? 'coins' : 'tickets',
    });
    active.current = false;
    if (!mounted.current) return;
    if (!result?.rewards) {
      setPhase('idle');
      return;
    }
    setRewards(result.rewards);
    setFocus(0);
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : Math.max(0, 3000 - (performance.now() - start));
    timer.current = setTimeout(() => {
      if (mounted.current) setPhase('results');
    }, delay);
  };
  useEffect(() => {
    if (skipped && rewards.length) {
      if (timer.current) clearTimeout(timer.current);
      setPhase('results');
    }
  }, [skipped, rewards]);
  const can = (n: number) =>
    !busy &&
    phase === 'idle' &&
    (payment === 'Wish tickets'
      ? (s.inventory.ticket || 0) >= n
      : s.coins >= n * 160);
  return (
    <>
      <SectionTitle
        eyebrow="THE MOONWELL"
        title="A ripple. A wish. A wonder."
        description="Superior treasures wait beyond the surface. Wishes use earned tickets or Pet Coins."
      />
      <div className="gacha-layout">
        <section className="moonwell panel">
          <div className="wish-orbit">
            <Sparkles size={64} />
          </div>
          <span className="wish-feature">FEATURED SUPERIOR TREASURE</span>
          <h2>Celestial familiar</h2>
          <p>
            A star-borne companion charm. Equip it for 10% more coins from story
            quests.
          </p>
          <div className="wish-payment">
            <Choice
              label="Use for this wish"
              value={payment}
              options={['Wish tickets', 'Pet Coins']}
              onChange={setPayment}
            />
          </div>
          <div className="row">
            <button
              className="primary"
              disabled={!can(1)}
              onClick={() => void cast(1)}
            >
              Wish once · {payment === 'Wish tickets' ? '1 ticket' : '160 PC'}
            </button>
            <button
              className="secondary"
              disabled={!can(10)}
              onClick={() => void cast(10)}
            >
              Wish ten times ·{' '}
              {payment === 'Wish tickets' ? '10 tickets' : '1,600 PC'}
            </button>
          </div>
          <p className="wish-cost">
            {s.inventory.ticket || 0} tickets · {s.coins.toLocaleString()} PC
            available
          </p>
        </section>
        <aside className="panel">
          <h3>Your next guarantees</h3>
          {(['epic', 'legendary', 'mythic'] as const).map((r, i) => (
            <div className="pity-row" key={r}>
              <span>
                {['Epic or higher', 'Legendary or higher', 'Superior'][i]}{' '}
                within {Math.max(1, config.pity[r] - s.gacha[r])} wishes
              </span>
              <Progress
                value={Math.min(100, (s.gacha[r] / config.pity[r]) * 100)}
                aria-label={`${r === 'mythic' ? 'Superior' : r} guarantee progress`}
              />
            </div>
          ))}
          <h3>Base probabilities</h3>
          {['Common', 'Uncommon', 'Epic', 'Legendary', 'Superior'].map(
            (r, i) => (
              <div className="odds-row" key={r}>
                <span>{r}</span>
                <strong>{config.gachaWeights[i]}%</strong>
              </div>
            ),
          )}
          <p className="wish-cost">
            Pity overrides base odds. A higher-tier result resets lower-tier
            counters. Duplicate treasures return 40–200 PC. Single and
            multi-pulls use the same odds.
          </p>
        </aside>
      </div>
      <section className="panel wish-history">
        <h3>Pull history · {s.gacha.total} lifetime wishes</h3>
        {s.gacha.history.slice(0, 30).map((h) => (
          <div className="history-row" key={h.id}>
            <span>
              {ITEMS.find((i) => i.id === h.item)?.name}
              <small>
                {h.duplicateCoins ? ` · Duplicate +${h.duplicateCoins} PC` : ''}
              </small>
            </span>
            <small>
              {h.rarity} ·{' '}
              {h.cost
                ? `${h.cost} ${h.payment === 'coins' ? 'PC' : 'ticket'} · `
                : ''}
              {new Date(h.time).toLocaleDateString()}
            </small>
          </div>
        ))}
        {!s.gacha.history.length && (
          <p>
            Your first result will be recorded here, including its cost and any
            duplicate return.
          </p>
        )}
      </section>
      <Dialog
        open={phase !== 'idle'}
        onOpenChange={(v) => {
          if (!v && !active.current) {
            if (timer.current) clearTimeout(timer.current);
            setPhase('idle');
          }
        }}
      >
        <DialogContent className="game-dialog reveal-dialog">
          <DialogTitle>
            {phase === 'casting'
              ? 'The Moonwell is listening…'
              : 'Your wishes have arrived'}
          </DialogTitle>
          <DialogDescription>
            {phase === 'casting'
              ? 'Your result is being saved.'
              : 'Your backpack and balance now include these results.'}
          </DialogDescription>
          {phase === 'casting' ? (
            <div className="wish-cinematic">
              <button className="wish-skip" onClick={() => setSkipped(true)}>
                {skipped ? 'Waiting for your result…' : 'Skip animation'}
              </button>
              {Array.from({ length: 24 }, (_, i) => (
                <span
                  key={i}
                  className="wish-particle"
                  aria-hidden="true"
                  style={
                    {
                      '--angle': `${i * 15}deg`,
                      animationDelay: `${(i % 5) * 0.12}s`,
                    } as CSSProperties
                  }
                >
                  ✦
                </span>
              ))}
              <span className="wish-star" aria-hidden="true">
                ✦
              </span>
              <p>A small light finds its way home.</p>
            </div>
          ) : (
            <>
              <div className="wish-treasure-model archived-portrait">
                <Pet
                  pet={
                    s.pet
                      ? {
                          ...s.pet,
                          equipped: [rewards[focus]?.item].filter(Boolean),
                        }
                      : null
                  }
                  audio={null}
                  compact
                  interactive={false}
                />
              </div>
              <div className="reveal-grid wish-results">
                {rewards.map((r, i) => (
                  <button
                    onClick={() => setFocus(i)}
                    key={i}
                    className={`reveal rarity-${r.rarity.toLowerCase()}`}
                    style={{ '--reveal-index': i } as CSSProperties}
                  >
                    <span className="item-icon">
                      {ITEMS.find((x) => x.id === r.item)?.icon}
                    </span>
                    <strong>{ITEMS.find((x) => x.id === r.item)?.name}</strong>
                    <small>{r.rarity}</small>
                    {!!r.duplicateCoins && (
                      <span className="duplicate">
                        Duplicate · +{r.duplicateCoins} PC
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button className="primary" onClick={() => setPhase('idle')}>
                Return to Moonwell
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
