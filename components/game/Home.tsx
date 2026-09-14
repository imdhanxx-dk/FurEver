'use client';
import { useState } from 'react';
import type { CareKind, PetCue } from '@/lib/client/companion-motion';
import Pet from './Pet';
import { DAILY_TASKS } from '@/lib/game/catalog';
import { progress } from '@/lib/game/progression';
import type { GameAudio } from '@/lib/client/audio';
import type { ScreenProps } from './shared';
import {
  EventIcon,
  ExploreIcon,
  FeedIcon,
  InventoryIcon,
  LocationIcon,
  PetIcon,
  PlayIcon,
  PlusIcon,
  QuestPawIcon,
  TeamIcon,
  TrainIcon,
  WorldMapIcon,
} from './FurEverIcons';

export default function Home(
  p: ScreenProps & { audio: GameAudio | null; playerName?: string },
) {
  const { state: s, act, busy, navigate } = p;
  const pet = s.pet!;
  const xp = progress(s.xp);
  const [cue, setCue] = useState<PetCue>();

  const care = async (kind: CareKind) => {
    const result = await act({ action: 'care', kind });
    if (result) setCue({ kind, id: Date.now() });
  };

  const quests = DAILY_TASKS.slice(0, 3).map(([id, label]) => ({
    id,
    label,
    done: s.daily.tasks.includes(id),
  }));

  const actions = [
    {
      key: 'feed',
      label: 'Feed',
      Icon: FeedIcon,
      onClick: () => void care('feed'),
    },
    {
      key: 'play',
      label: 'Minigames',
      Icon: PlayIcon,
      onClick: () => navigate('minigames'),
    },
    {
      key: 'pet',
      label: 'Pet',
      Icon: PetIcon,
      onClick: () => void care('pet'),
    },
    {
      key: 'train',
      label: 'Train',
      Icon: TrainIcon,
      onClick: () => void care('train'),
    },
    {
      key: 'explore',
      label: 'Explore',
      Icon: ExploreIcon,
      onClick: () => navigate('explore'),
    },
  ] as const;

  const sideNav = [
    {
      label: 'Inventory',
      Icon: InventoryIcon,
      route: 'inventory',
      badge: false,
    },
    { label: 'My pet', Icon: TeamIcon, route: 'pet', badge: false },
    { label: 'Login gifts', Icon: EventIcon, route: 'dailies', badge: false },
    { label: 'World Map', Icon: WorldMapIcon, route: 'explore', badge: false },
  ] as const;

  return (
    <div className="fe-world-hub">
      <div className="fe-world-vignette" />
      <div className="fe-world-pollen" aria-hidden="true" />

      <section className="fe-player-hud" aria-label="Player status">
        <div className="fe-level-orb">{xp.level}</div>
        <div className="fe-player-copy">
          <small>RANGER</small>
          <strong>{p.playerName || 'PLAYER 01'}</strong>
        </div>
        <div className="fe-xp-track" aria-label="Experience progress">
          <span style={{ width: `${xp.percent}%` }} />
        </div>
        <small className="fe-xp-numbers">
          {xp.level === 100
            ? 'MAX LEVEL'
            : `${xp.xp.toLocaleString()} / ${xp.needed.toLocaleString()}`}
        </small>
      </section>

      <button className="fe-region-hud" onClick={() => navigate('explore')}>
        <small>CURRENT REGION</small>
        <span>
          <LocationIcon /> WHISPERING MEADOW
        </span>
      </button>

      <button className="fe-coin-hud" onClick={() => navigate('mora')}>
        <span className="fe-coin-art" aria-hidden="true" />
        <strong>{s.coins.toLocaleString()} PC</strong>
        <span className="fe-plus-orb">
          <PlusIcon />
        </span>
      </button>

      <section className="fe-quest-card">
        <header>
          <div>
            <small>TODAY&apos;S TRAIL</small>
            <h2>Daily Quests</h2>
          </div>
          <QuestPawIcon />
        </header>
        <div className="fe-quest-rule" />
        <div className="fe-quest-list">
          {quests.map((quest) => (
            <button key={quest.id} onClick={() => navigate('dailies')}>
              <span className={`fe-quest-check ${quest.done ? 'done' : ''}`}>
                {quest.done ? '✓' : ''}
              </span>
              <span>{quest.label}</span>
              <em>{quest.done ? 'DONE' : '0/1'}</em>
            </button>
          ))}
        </div>
        <p>
          Small steps,
          <br />
          brighter tomorrows.
        </p>
      </section>

      <section className="fe-world-title" aria-label="Whispering Meadow">
        <div className="fe-logo-lockup fe-logo-lockup-asset">
          <strong className="release-wordmark">FurEver</strong>
          <small>A KINDER WORLD FOR EVERY CAT</small>
        </div>
        <h1>
          Whispering
          <br />
          Meadow
        </h1>
        <p>
          NEW PLACES <span>•</span> NEW FRIENDS <span>•</span> A BRIGHTER
          TOMORROW
        </p>
      </section>

      <div className="fe-pet-stage">
        <Pet
          pet={pet}
          audio={p.audio}
          cue={cue}
          busy={busy}
          compact
          onCare={(kind) => void care(kind)}
          onBond={() => void care('pet')}
          onBoundary={() => void act({ action: 'boundary' })}
        />
      </div>

      <div className="fe-pet-bubble" role="status">
        <small>{pet.name.toUpperCase()}</small>
        <strong>Ready for another little adventure?</strong>
        <span>{pet.personality} tail flick detected ♡</span>
      </div>
      <button className="fe-story-link" onClick={() => navigate('profile')}>
        My story & achievements →
      </button>

      <nav className="fe-side-orbit" aria-label="Game sections">
        {sideNav.map(({ label, Icon, route, badge }) => (
          <button key={label} onClick={() => navigate(route)}>
            <span className="fe-orbit-icon">
              <Icon />
              {badge ? <i>1</i> : null}
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      <nav className="fe-action-dock" aria-label="Companion actions">
        {actions.map(({ key, label, Icon, onClick }) => (
          <button
            key={key}
            disabled={busy}
            className={cue?.kind === key || key === 'pet' ? 'active' : ''}
            onClick={onClick}
          >
            <span className="fe-action-orb">
              <Icon />
            </span>
            <strong>{label}</strong>
          </button>
        ))}
      </nav>

      <div className="fe-chapter-note">
        <small>CHAPTER 01 / WHISPERING MEADOW</small>
        <span>A KINDER WORLD, ONE CAT AT A TIME.</span>
      </div>
      <div className="fe-world-mantra" aria-hidden="true">
        More
        <br />
        Good Days
        <br />
        Together ♡
      </div>
    </div>
  );
}
