'use client';
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
import { progress } from '@/lib/game/progression';
import type { GameAudio } from '@/lib/client/audio';
export default function Home(p: ScreenProps & { audio: GameAudio | null }) {
  const { state: s, act, busy, navigate, config } = p;
  const pet = s.pet!;
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE MAGIC, EVERY DAY"
        title={`Welcome home, ${pet.name}.`}
        description="There’s a whole world out there. But right here is pretty wonderful, too."
      >
        <span className="pill">✦ Day {s.streak.count || 1} together</span>
      </SectionTitle>
      <div className="home-grid">
        <section className="sanctuary">
          <div className="scene-heading">
            <span className="pill">⌂ Your sanctuary</span>
            <span className="scene-weather">☾ A peaceful evening</span>
          </div>
          <Pet
            pet={pet}
            audio={p.audio}
            onBond={() => void act({ action: 'care', kind: 'pet' })}
            onBoundary={() => void act({ action: 'boundary' })}
          />
          <div className="pet-caption">
            <span className="pill">
              {pet.personality} soul · Level {progress(s.xp).level}
            </span>
            <span>Tap, stroke, or say hello.</span>
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
                  onClick={() => void act({ action: 'care', kind })}
                >
                  <I />
                  <span>{String(label)}</span>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="home-aside">
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
