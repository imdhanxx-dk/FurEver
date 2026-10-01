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
  const [scene, setScene] = useState<'meadow' | 'grove' | 'echo'>(
    stage >= 4 ? 'echo' : stage >= 2 ? 'grove' : 'meadow',
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);

  const scenes = {
    meadow: {
      title: 'Whispering Meadow',
      eyebrow: 'THE LISTENING TOWN',
      description: CHAPTERS[stage].detail,
      minX: -34,
      maxX: 34,
      minZ: -14,
      maxZ: 34,
      filter: (kind: string) => !['shard', 'tone', 'challenge', 'story'].includes(kind),
      next: stage >= 2 ? 'grove' as const : null,
      nextLabel: 'Follow the roots',
    },
    grove: {
      title: 'Memory Grove',
      eyebrow: 'WHERE THE MEADOW REMEMBERS',
      description: 'Old glass catches the light beneath the roots. The western path disappears into moss.',
      minX: -34,
      maxX: 20,
      minZ: -32,
      maxZ: 8,
      filter: (kind: string) => ['npc', 'shard', 'secret', 'story'].includes(kind),
      next: stage >= 4 ? 'echo' as const : null,
      nextLabel: 'Follow the echo',
    },
    echo: {
      title: 'Echo Garden',
      eyebrow: 'THE TANGLED ECHO',
      description: 'The air is quiet here. Three tones are hidden around the garden.',
      minX: -12,
      maxX: 20,
      minZ: -32,
      maxZ: -12,
      filter: (kind: string) => ['tone', 'challenge', 'story'].includes(kind),
      next: null,
      nextLabel: '',
    },
  }[scene];

  const sceneObjects = WORLD_OBJECTS.filter(
    (object) =>
      object.stage <= stage &&
      scenes.filter(object.kind) &&
      object.x >= scenes.minX &&
      object.x <= scenes.maxX &&
      object.z >= scenes.minZ &&
      object.z <= scenes.maxZ,
  );

  const place = (x: number, z: number) => ({
    left: `${((x - scenes.minX) / (scenes.maxX - scenes.minX)) * 100}%`,
    top: `${((scenes.maxZ - z) / (scenes.maxZ - scenes.minZ)) * 100}%`,
  });

  const playerPosition = world?.position ?? [0, 16];
  const playerStyle = place(playerPosition[0], playerPosition[1]);

  useEffect(() => {
    if (stage < 4 && scene === 'echo') setScene(stage >= 2 ? 'grove' : 'meadow');
    if (stage < 2 && scene === 'grove') setScene('meadow');
  }, [stage, scene]);

  const inspect = async (objectId: string) => {
    if (busy) return;
    const object = WORLD_OBJECTS.find((item) => item.id === objectId);
    if (!object) return;
    setSelected(objectId);
    setDialogue('Your companion is making their way there…');
    const path = findWorldPath(
      [playerPosition[0], playerPosition[1]],
      [object.x, object.z],
      stage,
    );
    if (!path.length) {
      setDialogue('There is no clear path from here.');
      notify('That path is blocked. Try another route.');
      return;
    }
    const result = await act({ action: 'world_interact', path, objectId });
    if (!result) return;

    if (object.kind === 'npc') {
      setDialogue(
        object.id === 'edda'
          ? 'Edda lowers her lantern. “You heard it too, didn’t you? The meadow is trying to remember.”'
          : 'Vale brushes the dust from a piece of memory glass. “These fragments only make sense when the meadow is allowed to speak.”',
      );
    } else if (object.kind === 'shard') {
      setDialogue('The glass warms beneath a paw. A tiny memory flickers across its surface.');
    } else if (object.kind === 'tone') {
      setDialogue('A soft note answers. One part of the tangled echo has heard you.');
    } else if (object.kind === 'challenge') {
      setDialogue('The tangled echo stirs. Three tones are waiting for an answer.');
    } else if (object.kind === 'story') {
      setDialogue('The listening lens catches a memory that does not belong to any single creature.');
    } else if (object.kind === 'secret') {
      setDialogue('Something old is hidden beneath the roots. The meadow has noticed your curiosity.');
    } else {
      setDialogue(`${object.name} responds to your companion's presence.`);
    }

    if (objectId === 'pip') navigate('shop');
    if (objectId === 'well') navigate('gacha');
  };

  const moveScene = (target: 'meadow' | 'grove' | 'echo') => {
    setDialogue(null);
    setSelected(null);
    setScene(target);
  };

  return (
    <section className="story-adventure" aria-label="FurEver point and click adventure">
      <header className="story-adventure-topbar">
        <div>
          <span className="eyebrow">CHAPTER {Math.min(stage + 1, CHAPTERS.length)} · {scenes.eyebrow}</span>
          <h1>{scenes.title}</h1>
          <p>{scenes.description}</p>
        </div>
        <button className="secondary" onClick={() => navigate('profile')}>
          <BookOpen size={17} /> Journal
        </button>
      </header>

      <div className={`point-click-scene point-click-${scene}`}>
        <div className="scene-sky" />
        <div className="scene-hills scene-hills-back" />
        <div className="scene-hills scene-hills-front" />
        <div className="scene-ground" />
        <div className="scene-path scene-path-main" />
        <div className="scene-path scene-path-side" />
        <div className="scene-water" />
        <div className="scene-ambient ambient-one" />
        <div className="scene-ambient ambient-two" />
        <div className="scene-ambient ambient-three" />

        <div className="scene-building building-one"><span /></div>
        <div className="scene-building building-two"><span /></div>
        <div className="scene-tree tree-one"><i /><b /></div>
        <div className="scene-tree tree-two"><i /><b /></div>
        <div className="scene-tree tree-three"><i /><b /></div>
        <div className="scene-tree tree-four"><i /><b /></div>

        {sceneObjects.map((object) => {
          const collected = world?.collected.includes(object.id);
          const discovered = object.kind === 'secret' && world?.secrets.includes(object.id);
          const pos = place(object.x, object.z);
          const isCharacter = object.kind === 'npc';

          return (
            <button
              key={object.id}
              className={`scene-object scene-object-${object.kind} ${isCharacter ? 'scene-character' : ''} ${selected === object.id ? 'is-selected' : ''} ${collected || discovered ? 'is-done' : ''}`}
              style={pos}
              disabled={busy || !!collected || !!discovered}
              onClick={() => void inspect(object.id)}
              aria-label={`Investigate ${object.name}`}
            >
              {isCharacter ? (
                <span className="character-sprite" aria-hidden="true">
                  <i className="character-head" />
                  <i className="character-body" />
                  <i className="character-shadow" />
                </span>
              ) : (
                <span className="environment-prop" aria-hidden="true" />
              )}
              <span className="scene-object-name">{object.name.split(' · ')[0]}</span>
              <span className="scene-object-ring" />
            </button>
          );
        })}

        <div className="scene-player" style={playerStyle}>
          <Pet pet={s.pet} audio={null} compact interactive={false} />
          <span className="player-shadow" />
        </div>

        <div className="scene-interaction-hint">
          <strong>{selected ? 'Investigating…' : 'Explore the meadow'}</strong>
          <span>Click a person, object, or path to interact.</span>
        </div>

        {scene !== 'meadow' && (
          <button className="scene-exit scene-exit-left" onClick={() => moveScene(scene === 'echo' ? 'grove' : 'meadow')}>
            <span>‹</span>
            <small>{scene === 'echo' ? 'Memory Grove' : 'Town'}</small>
          </button>
        )}

        {scenes.next && (
          <button className="scene-exit scene-exit-right" onClick={() => moveScene(scenes.next!)}>
            <span>›</span>
            <small>{scenes.nextLabel}</small>
          </button>
        )}

        {dialogue && (
          <div className="scene-dialogue" role="status">
            <div className="scene-dialogue-avatar">
              <span />
            </div>
            <div>
              <strong>{selected ? WORLD_OBJECTS.find((o) => o.id === selected)?.name.split(' · ')[0] : s.pet?.name}</strong>
              <p>{dialogue}</p>
            </div>
            <button className="text-button" onClick={() => { setDialogue(null); setSelected(null); }}>
              Close
            </button>
          </div>
        )}
      </div>

      <div className="story-adventure-footer">
        <span>Chapter objective: {CHAPTERS[stage].objective}</span>
        {world?.challenge && (
          <strong>Echo tones: {world.challenge.nodes.length}/3</strong>
        )}
      </div>
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
