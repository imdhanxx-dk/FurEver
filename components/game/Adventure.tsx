'use client';
import { useState } from 'react';
import {
  Compass,
  Lock,
  ArrowRight,
  Swords,
  Shield,
  Sparkles,
  Zap,
  Heart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { LOCATIONS } from '@/lib/game/catalog';
import { progress } from '@/lib/game/progression';
import { SectionTitle, type ScreenProps } from './shared';
export function Explore({ state: s, act, busy, navigate }: ScreenProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const loc = selected ? LOCATIONS[selected - 1] : null,
    e = s.expedition;
  return (
    <>
      <SectionTitle
        eyebrow="BEYOND YOUR DOORSTEP"
        title="A world worth wandering."
        description="Ten places to discover. A thousand little reasons to keep going."
      />
      {e ? (
        <section className="expedition panel">
          <div
            className="expedition-art"
            style={{
              backgroundPosition: `${LOCATIONS[e.location - 1].x}% ${LOCATIONS[e.location - 1].y}%`,
            }}
          />
          <div>
            <span className="eyebrow">ON THE TRAIL · {e.step}/3</span>
            <h2>{LOCATIONS[e.location - 1].name}</h2>
            <p>{LOCATIONS[e.location - 1].lore}</p>
            <ol>
              {e.finds.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ol>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void act({ action: 'explore_step', id: e.id })}
            >
              Follow the trail <ArrowRight size={17} />
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void act({ action: 'explore_cancel' })}
            >
              Return home
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="world-map">
            <img
              src="/assets/world-map.webp"
              alt="FurEver’s magical world, from meadows to the Astral Wilds"
            />
            {LOCATIONS.map((l) => (
              <button
                className={`map-pin ${progress(s.xp).level < l.level ? 'locked' : ''}`}
                style={{ left: `${l.x}%`, top: `${l.y}%` }}
                aria-label={`${l.name}, level ${l.level}`}
                key={l.id}
                onClick={() => setSelected(l.id)}
              >
                {progress(s.xp).level < l.level ? (
                  <Lock size={16} />
                ) : (
                  <Compass size={19} />
                )}
                <span>{l.name}</span>
              </button>
            ))}
          </div>
          <div className="locations-list">
            {LOCATIONS.map((l) => (
              <button key={l.id} onClick={() => setSelected(l.id)}>
                <span className="location-index" style={{ color: l.color }}>
                  {String(l.id).padStart(2, '0')}
                </span>
                <div>
                  <strong>{l.name}</strong>
                  <small>
                    Level {l.level} · {l.enemy}
                  </small>
                </div>
                {progress(s.xp).level < l.level ? (
                  <Lock size={16} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <Dialog open={!!loc} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="game-dialog">
          {loc && (
            <>
              <DialogTitle>{loc.name}</DialogTitle>
              <DialogDescription>{loc.lore}</DialogDescription>
              <div className="loot-preview">
                <span>
                  🧪 {loc.id}–{loc.id * 2} EXP elixirs
                </span>
                <span>
                  ⚗️ {Math.max(1, Math.floor(loc.id / 2))}–{loc.id} growth
                  nectars
                </span>
                <span>
                  ◈ {loc.id * 30}–{loc.id * 60} PC
                </span>
              </div>
              <p className="muted">
                Requires level {loc.level} · 15 energy · Three discoveries
              </p>
              <button
                className="primary"
                disabled={busy || progress(s.xp).level < loc.level}
                onClick={async () => {
                  const r = await act({
                    action: 'explore_start',
                    location: loc.id,
                  });
                  if (r) setSelected(null);
                }}
              >
                Explore with {s.pet?.name} <Compass size={17} />
              </button>
              <button
                className="secondary"
                disabled={busy || progress(s.xp).level < loc.level}
                onClick={async () => {
                  const r = await act({
                    action: 'battle_start',
                    location: loc.id,
                  });
                  if (r) {
                    setSelected(null);
                    navigate('battle');
                  }
                }}
              >
                Challenge {loc.enemy}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Battle({ state: s, act, busy, navigate }: ScreenProps) {
  const b = s.battle;
  return (
    <>
      <SectionTitle
        eyebrow="BRAVER TOGETHER"
        title="Stand by your companion."
        description="Read your opponent, build bond energy, and choose your moment."
      />
      {!b ? (
        <section className="panel empty-state">
          <Swords size={44} />
          <h3>A brave heart needs a little adventure.</h3>
          <p>Choose an unlocked region and challenge its guardian.</p>
          <button className="primary" onClick={() => navigate('explore')}>
            Find a challenge
          </button>
        </section>
      ) : (
        <>
          <div className="battle-arena">
            <div className="fighter">
              <h3>{s.pet?.name}</h3>
              <span>
                {b.hp} / {b.maxHp} HP
              </span>
              <Progress
                value={(b.hp / b.maxHp) * 100}
                aria-label="Companion health"
              />
              <img
                src={s.pet?.appearance || '/assets/companion.webp'}
                alt={s.pet?.name}
              />
            </div>
            <span className="versus">
              VS<small>TURN {b.turn + 1}</small>
            </span>
            <div className="fighter enemy">
              <h3>{b.enemy}</h3>
              <span>
                {b.enemyHp} / {b.enemyMaxHp} HP
              </span>
              <Progress
                value={(b.enemyHp / b.enemyMaxHp) * 100}
                aria-label="Enemy health"
              />
              <div className="enemy-sigil">
                <Swords size={85} />
                <span>SHADOW GUARDIAN</span>
              </div>
            </div>
          </div>
          <div className="battle-control panel">
            <div className="bond-meter">
              <Heart size={18} />
              <span>Bond energy</span>
              <Progress value={b.charge} aria-label="Bond energy" />
              <strong>{b.charge}%</strong>
            </div>
            <div className="battle-actions">
              {[
                [Swords, 'attack', 'Attack', 'A steady strike'],
                [Shield, 'defend', 'Defend', 'Guard + recover'],
                [Sparkles, 'ability', 'Stardust', 'Mark for 3 turns'],
                [Zap, 'special', 'Special', '40 bond energy'],
                [Heart, 'ultimate', 'Bond burst', '100 bond energy'],
              ].map(([Icon, move, label, hint]) => {
                const I = Icon as typeof Swords;
                return (
                  <button
                    key={String(move)}
                    disabled={
                      busy ||
                      b.finished ||
                      (move === 'ultimate' && b.charge < 100) ||
                      (move === 'special' && b.charge < 40) ||
                      (move === 'ability' && b.cooldown > 0)
                    }
                    onClick={() =>
                      void act({ action: 'battle_action', id: b.id, move })
                    }
                  >
                    <I />
                    <strong>{String(label)}</strong>
                    <small>{String(hint)}</small>
                  </button>
                );
              })}
            </div>
            <div className="battle-log" aria-live="polite">
              {b.log.slice(-5).map((line, i) => (
                <p key={`${i}-${line}`}>{line}</p>
              ))}
            </div>
            {b.finished ? (
              <button className="primary" onClick={() => navigate('explore')}>
                Return to the map
              </button>
            ) : (
              <div className="row">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void act({ action: 'use_item', itemId: 'potion' })
                  }
                >
                  💚 Use tonic ({s.inventory.potion || 0})
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void act({
                      action: 'battle_action',
                      id: b.id,
                      move: 'retreat',
                    })
                  }
                >
                  Retreat safely
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function Minigames({ state: s, config, act, busy }: ScreenProps) {
  const g = s.challenge;
  return (
    <>
      <SectionTitle
        eyebrow="MAKE TIME FOR A LITTLE JOY"
        title="Play. Laugh. Grow closer."
        description="A few happy moments make a lifelong friendship."
      />
      {g ? (
        <div className="minigame panel">
          <h2>
            {g.kind === 'grooming'
              ? 'Cloud-soft grooming'
              : 'Catch a little starlight'}
          </h2>
          <p>
            {g.kind === 'grooming'
              ? 'Brush the sparkling patch. Follow the gentle rhythm.'
              : 'Tap the glowing toy before it disappears. Mouse, touch, and keyboard all work.'}
          </p>
          <div className="mini-progress">
            <Progress value={g.step * 10} aria-label="Minigame progress" />
            <span>{g.step}/10</span>
          </div>
          <div className="target-grid">
            {Array.from({ length: 9 }, (_, i) => (
              <button
                key={i}
                className={i === g.targets[g.step] ? 'target active' : 'target'}
                disabled={busy}
                aria-label={`Patch ${i + 1}${i === g.targets[g.step] ? ', glowing' : ''}`}
                onClick={() =>
                  void act({
                    action: 'minigame_hit',
                    id: g.id,
                    nonce: g.nonce,
                    step: g.step,
                    target: i,
                  })
                }
              >
                {i === g.targets[g.step]
                  ? g.kind === 'grooming'
                    ? '✧'
                    : '✦'
                  : '·'}
              </button>
            ))}
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void act({ action: 'minigame_cancel' })}
          >
            Finish for now
          </button>
        </div>
      ) : (
        <div className="game-tiles">
          {(['grooming', 'play'] as const).map((kind) => (
            <section className={`game-tile ${kind}`} key={kind}>
              <span className="tile-illustration">
                {kind === 'grooming' ? '🫧' : '🧶'}
              </span>
              <small>
                {kind === 'grooming'
                  ? 'A LITTLE SELF-CARE'
                  : 'FOLLOW THE SPARKLE'}
              </small>
              <h2>
                {kind === 'grooming'
                  ? 'Cloud-soft grooming'
                  : 'Starlight catch'}
              </h2>
              <p>
                {kind === 'grooming'
                  ? 'A brush, a sparkle, and the happiest little companion.'
                  : 'Catch the wandering lights before they slip away.'}
              </p>
              <div className="row">
                <span className="coin">
                  ◈ {kind === 'grooming' ? config.groomCoins : config.playCoins}{' '}
                  PC
                </span>
                <small>
                  {s.daily[kind]} / {config.minigameLimit} rewards today
                </small>
              </div>
              <button
                className="primary"
                disabled={busy || s.daily[kind] >= config.minigameLimit}
                onClick={() => void act({ action: 'minigame_start', kind })}
              >
                Let’s play <ArrowRight size={17} />
              </button>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
