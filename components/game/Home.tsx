'use client';
import { useState } from 'react';
import type { CareKind, PetCue } from '@/lib/client/companion-motion';
import CompanionVoice from './CompanionVoice';
import {
  Heart,
  Utensils,
  Brush,
  Moon,
  Compass,
  ArrowUpRight,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import Pet from './Pet';
import { Meter, SectionTitle, type ScreenProps } from './shared';
import { DAILY_TASKS } from '@/lib/game/catalog';
import { BUILTIN_COMPANIONS } from '@/lib/game/companions';
import { progress } from '@/lib/game/progression';
import type { GameAudio } from '@/lib/client/audio';
export default function Home(p: ScreenProps & { audio: GameAudio | null }) {
  const { state: s, act, busy, navigate, config } = p;
  const pet = s.pet!;
  const [cue, setCue] = useState<PetCue>();
  const companionLooks = [
    ...BUILTIN_COMPANIONS,
    ...s.generations
      .filter((g) => g.kind !== 'avatar' && g.selected)
      .flatMap((g) =>
        g.candidates.filter(
          (c) =>
            c.id === g.selected &&
            c.status === 'ready' &&
            c.format === 'companion-atlas-v1',
        ),
      )
      .map((c, i) => ({
        id: c.id,
        name: `My creation ${i + 1}`,
        description: 'Dreamed up by you.',
        icon: '♡',
        url: c.url!,
      })),
  ];
  const care = async (kind: CareKind) => {
    const result = await act({ action: 'care', kind });
    if (result) setCue({ kind, id: Date.now() });
  };
  return (
    <>
      <SectionTitle
        eyebrow="YOUR LITTLE CORNER OF FUREVER"
        title={`${pet.name}’s home`}
        description="A full belly, a warm cuddle, and a little mischief."
      >
        <span className="pill">✦ Day {s.streak.count || 1} together</span>
      </SectionTitle>
      <div className="home-grid">
        <section className="sanctuary">
          <div className="scene-heading">
            <span className="pill">⌂ Your sanctuary</span>
            <span className="scene-weather">☾ Moonbeam cottage</span>
          </div>
          <Pet
            pet={pet}
            audio={p.audio}
            cue={cue}
            busy={busy}
            onCare={(kind) => void care(kind)}
            onBond={() => void act({ action: 'care', kind: 'pet' })}
            onBoundary={() => void act({ action: 'boundary' })}
          />
          <div className="pet-caption">
            <span className="pill">
              {pet.personality} soul · Level {progress(s.xp).level}
            </span>
            <span>Stroke my head · tap my paw · let’s play</span>
          </div>
          <div className="care-bar">
            {[
              [Utensils, 'feed', 'Feed'],
              [Heart, 'pet', 'Pet'],
              [Brush, 'groom', 'Groom'],
              [Sparkles, 'play', 'Play'],
              [Moon, 'rest', 'Rest'],
              [Dumbbell, 'train', 'Train'],
            ].map(([Icon, kind, label]) => {
              const I = Icon as typeof Heart;
              return (
                <button
                  key={String(kind)}
                  disabled={busy}
                  draggable={
                    !busy && ['feed', 'groom', 'play'].includes(String(kind))
                  }
                  onDragStart={(event) =>
                    event.dataTransfer.setData(
                      'application/x-furever-care',
                      String(kind),
                    )
                  }
                  onClick={() => void care(kind as CareKind)}
                  aria-pressed={cue?.kind === kind}
                >
                  <I />
                  <span>{String(label)}</span>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="home-aside">
          <CompanionVoice name={pet.name} onCue={setCue} />
          <section className="panel">
            <div className="panel-heading">
              <h3>Feeling good</h3>
              <Heart size={17} />
            </div>
            <Meter label="Fullness" value={pet.hunger} color="#e4bc85" />
            <Meter label="Happiness" value={pet.happiness} color="#d7a4b5" />
            <Meter label="Energy" value={pet.energy} color="#a4cae3" />
            <Meter
              label="Cleanliness"
              value={pet.cleanliness}
              color="#a9d4c0"
            />
            <div className="bond-line">
              <Heart size={16} />
              <strong>{pet.bond}</strong>
              <span>
                Bond ·{' '}
                {pet.bond >= 80
                  ? 'Forever friends'
                  : pet.bond >= 40
                    ? 'Growing closer'
                    : 'Getting to know you'}
              </span>
            </div>
          </section>
          <section className="panel daily-peek">
            <div className="panel-heading">
              <h3>Little daily adventures</h3>
              <span>{s.daily.tasks.length}/7</span>
            </div>
            {DAILY_TASKS.slice(0, 3).map(([id, label]) => (
              <div className="quest-row" key={id}>
                <span
                  className={
                    s.daily.tasks.includes(id) ? 'check done' : 'check'
                  }
                >
                  {s.daily.tasks.includes(id) ? '✓' : ''}
                </span>
                <span>{label}</span>
              </div>
            ))}
            <button className="text-button" onClick={() => navigate('dailies')}>
              View all adventures <ArrowUpRight size={16} />
            </button>
          </section>
        </aside>
      </div>
      <div className="home-bottom">
        <section className="panel companion-wardrobe">
          <div className="panel-heading">
            <div>
              <h3>One friend. A little more magic.</h3>
              <p>Choose a look. Your bond and progress stay with you.</p>
            </div>
            <Sparkles size={24} />
          </div>
          <div className="companion-choices">
            {companionLooks.map((design) => (
              <button
                key={design.id}
                disabled={busy}
                aria-pressed={
                  pet.appearance === design.url ||
                  (design.id === 'sunbeam' &&
                    pet.appearance === '/assets/companion.webp')
                }
                onClick={() =>
                  void act({ action: 'companion_equip', designId: design.id })
                }
              >
                <span aria-hidden="true">{design.icon}</span>
                <strong>{design.name}</strong>
                <small>{design.description}</small>
              </button>
            ))}
            <button onClick={() => navigate('create-pet')}>
              <span aria-hidden="true">＋</span>
              <strong>Create my own</strong>
              <small>Your imagination, brought to life.</small>
            </button>
          </div>
        </section>
        <button
          className="destination-card"
          onClick={() => navigate('explore')}
        >
          <Compass />
          <div>
            <small>THE WORLD IS WAITING</small>
            <h3>Follow your curiosity</h3>
            <p>Your next little adventure starts here.</p>
          </div>
          <ArrowUpRight />
        </button>
        <button className="festival-card" onClick={() => navigate('events')}>
          <span className="festival-moon">☾</span>
          <div>
            <small>SEASONAL STORIES</small>
            <h3>{config.event.name}</h3>
            <p>{config.event.featured} awaits beneath the moonlight.</p>
          </div>
          <ArrowUpRight />
        </button>
      </div>
    </>
  );
}
