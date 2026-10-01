'use client';
import { useEffect, useRef, useState } from 'react';
import Pet from './Pet';
import KittenDrop from './KittenDrop';
import type { PetCue } from '@/lib/client/companion-motion';
import {
  Compass,
  Lock,
  ArrowRight,
  Swords,
  Shield,
  Sparkles,
  Zap,
  Heart,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { LOCATIONS } from '@/lib/game/catalog';
import { CHAPTERS, WORLD_OBJECTS, findWorldPath } from '@/lib/game/world';
import { progress } from '@/lib/game/progression';
import { SectionTitle, type ScreenProps } from './shared';
export function Explore({ state: s, act, busy, navigate, notify }: ScreenProps) {
  const world = s.world;
  const stage = world?.stage ?? 0;
  const [selected, setSelected] = useState<string | null>(null);
  const [scene, setScene] = useState<'meadow' | 'grove' | 'echo'>(
    stage >= 4 ? 'echo' : stage >= 2 ? 'grove' : 'meadow',
  );
  const selectedObject = selected
    ? WORLD_OBJECTS.find((o) => o.id === selected)
    : null;

  const available = WORLD_OBJECTS.filter(
    (o) => o.stage <= stage && (scene === 'meadow' || o.kind === 'shard' || o.kind === 'tone' || o.kind === 'challenge'),
  ).filter((o) => {
    if (o.kind === 'shard' && scene !== 'grove') return false;
    if ((o.kind === 'tone' || o.kind === 'challenge') && scene !== 'echo') return false;
    if (scene === 'meadow' && ['shard', 'tone', 'challenge'].includes(o.kind)) return false;
    return true;
  });

  const sceneCopy = {
    meadow: {
      title: 'Whispering Meadow',
      eyebrow: 'SCENE 01 · THE LISTENING TOWN',
      description: CHAPTERS[stage].detail,
    },
    grove: {
      title: 'Memory Grove',
      eyebrow: 'SCENE 02 · WHERE THE MEADOW REMEMBERS',
      description: 'Old glass catches the light beneath the roots. Three fragments are waiting.',
    },
    echo: {
      title: 'Echo Garden',
      eyebrow: 'SCENE 03 · THE TANGLED ECHO',
      description: 'The air is quiet here. Listen for the three tones and answer them in time.',
    },
  }[scene];

  const interact = async (objectId: string) => {
    const object = WORLD_OBJECTS.find((o) => o.id === objectId);
    if (!object || busy) return;
    const position = world?.position || [0, 16];
    const path = findWorldPath(
      [position[0], position[1]],
      [object.x, object.z],
      stage,
    );
    if (!path.length) {
      notify('That path is blocked. Try another approach.');
      return;
    }
    const result = await act({ action: 'world_interact', path, objectId });
    if (result) {
      setSelected(null);
      if (objectId === 'pip') navigate('shop');
      if (objectId === 'well') navigate('gacha');
    }
  };

  return (
    <section className="story-explorer" aria-label="FurEver story exploration">
      <header className="story-explorer-heading">
        <div>
          <span className="eyebrow">{sceneCopy.eyebrow}</span>
          <h1>{sceneCopy.title}</h1>
          <p>{sceneCopy.description}</p>
        </div>
        <button className="secondary" onClick={() => navigate('profile')}>
          <BookOpen size={17} /> Journal
        </button>
      </header>

      <div className="scene-switcher" role="tablist" aria-label="Story scenes">
        <button
          role="tab"
          aria-selected={scene === 'meadow'}
          onClick={() => setScene('meadow')}
        >
          Meadow
        </button>
        <button
          role="tab"
          aria-selected={scene === 'grove'}
          disabled={stage < 2}
          onClick={() => setScene('grove')}
        >
          Memory Grove
        </button>
        <button
          role="tab"
          aria-selected={scene === 'echo'}
          disabled={stage < 4}
          onClick={() => setScene('echo')}
        >
          Echo Garden
        </button>
      </div>

      <div className={`story-scene story-scene-${scene}`}>
        <div className="story-scene-art" aria-hidden="true" />
        <div className="story-scene-vignette" aria-hidden="true" />
        <div className="story-scene-pet">
          <Pet pet={s.pet} audio={null} compact interactive={false} />
        </div>

        {available.map((object) => {
          const collected = world?.collected.includes(object.id);
          const discovered = object.kind === 'secret' && world?.secrets.includes(object.id);
          return (
            <button
              key={object.id}
              className={`story-hotspot story-hotspot-${object.kind} ${collected || discovered ? 'collected' : ''}`}
              style={{ left: `${((object.x + 32) / 64) * 100}%`, top: `${((32 - object.z) / 64) * 100}%` }}
              disabled={busy || !!collected || !!discovered}
              onClick={() => setSelected(object.id)}
              aria-label={object.name}
            >
              <span className="hotspot-pulse" />
              <strong>{object.kind === 'npc' ? object.name.split(' · ')[0] : object.name}</strong>
              {!collected && !discovered && <small>Explore</small>}
            </button>
          );
        })}

        <div className="story-scene-caption">
          <strong>{s.pet?.name} is exploring</strong>
          <span>Click a glowing object to investigate it. FurEver will guide your companion along the saved path.</span>
        </div>
      </div>

      {world?.challenge && (
        <div className="echo-status panel">
          <strong>Echo challenge · {world.challenge.nodes.length}/3 tones</strong>
          <span>Answer all three before the 45-second window closes.</span>
        </div>
      )}

      <Dialog open={!!selectedObject} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="game-dialog">
          {selectedObject && (
            <>
              <DialogTitle>{selectedObject.name}</DialogTitle>
              <DialogDescription>
                {selectedObject.kind === 'npc'
                  ? 'Someone here has something to tell you.'
                  : selectedObject.kind === 'secret'
                    ? 'Something hidden is waiting beneath the roots.'
                    : selectedObject.kind === 'challenge'
                      ? 'The tangled echo is listening.'
                      : 'A small piece of the meadow story is waiting here.'}
              </DialogDescription>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void interact(selectedObject.id)}
              >
                Walk here and investigate <ArrowRight size={17} />
              </button>
              <button className="text-button" onClick={() => setSelected(null)}>
                Not yet
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function Battle({ state: s, act, busy, navigate }: ScreenProps) {
  const b = s.battle;
  const [motion, setMotion] = useState(''),
    [cue, setCue] = useState<PetCue>(),
    [enemyCue, setEnemyCue] = useState<PetCue>(),
    [impact, setImpact] = useState<{
      id: number;
      enemy: number;
      pet: number;
    } | null>(null),
    [acting, setActing] = useState(false);
  const locked = useRef(false),
    alive = useRef(true),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);
  const playTurn = async (move: string) => {
    if (!b || locked.current || busy || b.finished) return;
    locked.current = true;
    setActing(true);
    setMotion(move);
    setImpact(null);
    setCue({
      kind: move === 'defend' ? 'guard' : move === 'tonic' ? 'feed' : 'attack',
      id: Date.now(),
    });
    const start = performance.now();
    const result = await act(
      move === 'tonic'
        ? { action: 'use_item', itemId: 'potion' }
        : { action: 'battle_action', id: b.id, move },
    );
    if (!alive.current) return;
    const next = result?.state.battle;
    if (next && next.id === b.id) {
      setImpact({
        id: Date.now(),
        enemy: b.enemyHp - next.enemyHp,
        pet: b.hp - next.hp,
      });
      setEnemyCue({
        kind: next.enemyHp === 0 ? 'rest' : 'attack',
        id: Date.now(),
      });
      if (next.enemyHp === 0) setCue({ kind: 'victory', id: Date.now() });
    } else setMotion('');
    timers.current.push(
      setTimeout(
        () => {
          if (!alive.current) return;
          locked.current = false;
          setActing(false);
          setMotion('');
        },
        Math.max(350, 1100 - (performance.now() - start)),
      ),
    );
  };
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
          <div
            className={`battle-arena move-${motion}`}
            data-battle-state={
              b.finished
                ? b.enemyHp === 0
                  ? 'victory'
                  : 'ended'
                : acting
                  ? 'animating'
                  : 'ready'
            }
          >
            <div className="fighter">
              <h3>{s.pet?.name}</h3>
              <span>
                {b.hp} / {b.maxHp} HP
              </span>
              <Progress
                value={(b.hp / b.maxHp) * 100}
                aria-label="Companion health"
              />
              <div className="battle-creature">
                <Pet
                  pet={s.pet}
                  audio={null}
                  compact
                  interactive={false}
                  cue={cue}
                />
                {motion === 'defend' && (
                  <div className="battle-guard" aria-label="Guarding">
                    <Shield />
                  </div>
                )}
                {impact && impact.pet !== 0 && (
                  <span
                    key={impact.id}
                    className={`battle-number ${impact.pet < 0 ? 'healing' : ''}`}
                  >
                    {impact.pet < 0 ? '+' : '−'}
                    {Math.abs(impact.pet)}
                  </span>
                )}
              </div>
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
              <div
                className={`battle-creature guardian ${b.enemyHp === 0 ? 'defeated' : ''}`}
              >
                <Pet
                  pet={
                    s.pet
                      ? {
                          ...s.pet,
                          name: b.enemy,
                          appearance: '/assets/starlight-rig.png',
                          appearanceFormat: 'companion-atlas-v1',
                          equipped: [],
                        }
                      : null
                  }
                  audio={null}
                  compact
                  interactive={false}
                  cue={enemyCue}
                />
                {impact && impact.enemy > 0 && (
                  <span key={impact.id} className="battle-number enemy-damage">
                    −{impact.enemy}
                  </span>
                )}
                {acting && !['defend', 'tonic', 'retreat'].includes(motion) && (
                  <div
                    className="battle-impact"
                    key={`${b.id}-${b.turn}`}
                    aria-hidden="true"
                  >
                    <Sparkles />
                  </div>
                )}
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
                      acting ||
                      b.finished ||
                      (move === 'ultimate' && b.charge < 100) ||
                      (move === 'special' && b.charge < 40) ||
                      (move === 'ability' && b.cooldown > 0)
                    }
                    onClick={() => void playTurn(String(move))}
                  >
                    <I />
                    <strong>{String(label)}</strong>
                    <small>{String(hint)}</small>
                  </button>
                );
              })}
            </div>
            <div className="battle-result-line" role="status">
              {b.finished
                ? b.enemyHp === 0
                  ? 'Victory! Your rewards are saved.'
                  : b.hp === 0
                    ? 'A brave effort. Rest and try again.'
                    : 'You returned safely.'
                : acting
                  ? 'Your move…'
                  : 'Choose your next move.'}
            </div>
            <details className="battle-log">
              <summary>Battle history</summary>
              <div aria-live="polite">
                {b.log.slice(-5).map((line, i) => (
                  <p key={`${i}-${line}`}>{line}</p>
                ))}
              </div>
            </details>
            {b.finished ? (
              <button className="primary" onClick={() => navigate('explore')}>
                Return to the map
              </button>
            ) : (
              <div className="row">
                <button
                  className="secondary"
                  disabled={busy || acting || !s.inventory.potion}
                  onClick={() => void playTurn('tonic')}
                >
                  💚 Use tonic ({s.inventory.potion || 0})
                </button>
                <button
                  className="text-button"
                  disabled={busy || acting}
                  onClick={() => void playTurn('retreat')}
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
export function Minigames(p: ScreenProps) {
  return (
    <>
      <KittenDrop {...p} />
      <details className="grooming-alternative">
        <summary>Grooming time</summary>
        <GroomingGames {...p} />
      </details>
    </>
  );
}
function GroomingGames({ state: s, config, act, busy }: ScreenProps) {
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
          {(['grooming'] as const).map((kind) => (
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
