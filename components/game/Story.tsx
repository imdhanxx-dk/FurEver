'use client';
import {
  BookOpen,
  Compass,
  Heart,
  Sparkles,
  Trophy,
  KeyRound,
  PawPrint,
  Gift,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CHAPTERS } from '@/lib/game/world';
import { ACHIEVEMENTS, ITEMS } from '@/lib/game/catalog';
import { SectionTitle, type ScreenProps } from './shared';
export default function Story({ state: s, navigate }: ScreenProps) {
  const w = s.world,
    stage = w?.stage || 0;
  const completed = s.achievements.filter((id) =>
    ACHIEVEMENTS.some((a) => a[0] === id),
  );
  const categories = [
    {
      icon: BookOpen,
      title: 'Story milestones',
      value: w?.quests.length || 0,
      detail: 'Wake the beacon, recover memory glass, and restore the orchard.',
    },
    {
      icon: Trophy,
      title: 'Challenges overcome',
      value: s.stats.battles,
      detail: w?.quests.includes('echo')
        ? 'The tangled echo is at peace.'
        : 'Defeat battle opponents and calm the tangled echo.',
    },
    {
      icon: Compass,
      title: 'Places discovered',
      value: w?.discovered.length || 0,
      detail:
        (w?.discovered || [])
          .map(
            (v) =>
              ({
                meadow: 'Whispering Meadow',
                grove: 'Memory Grove',
                orchard: 'Listening Orchard',
              })[v] || v,
          )
          .join(' · ') || 'Enter the meadow to discover your first region.',
    },
    {
      icon: Sparkles,
      title: 'Rare treasures',
      value: ITEMS.filter(
        (i) =>
          ['Epic', 'Legendary', 'Superior'].includes(i.rarity) &&
          (s.inventory[i.id] || 0) > 0 &&
          i.category !== 'Gacha items',
      ).length,
      detail: 'Unique Epic, Legendary and Superior treasures in your backpack.',
    },
    {
      icon: PawPrint,
      title: 'Companions met',
      value: new Set([
        ...Object.keys(s.petNames || {}),
        ...(s.pet ? [s.pet.appearance] : []),
      ]).size,
      detail: 'Name your companions and choose who joins your adventures.',
    },
    {
      icon: Heart,
      title: 'Friendship',
      value: s.pet?.bond || 0,
      detail:
        (s.pet?.bond || 0) >= 80
          ? 'Forever friends · milestone reached'
          : `Next milestone: ${(s.pet?.bond || 0) >= 40 ? 80 : 40} friendship.`,
    },
    {
      icon: Gift,
      title: 'Festival treasures',
      value: s.event.claimed.length,
      detail:
        'Earn moon petals through expeditions and victories during a festival.',
    },
    {
      icon: KeyRound,
      title: 'Secrets discovered',
      value: w?.secrets.length || 0,
      detail: w?.secrets.includes('cache')
        ? 'The rootkeeper’s hidden cache is yours.'
        : 'Search beyond the village paths. Some roots shelter old treasures.',
    },
  ];
  return (
    <>
      <SectionTitle
        eyebrow="MY STORY"
        title="Your meadow chronicle"
        description={`${completed.length} achievements earned. Every milestone comes from your saved game.`}
      />
      <section className="story-chapter panel">
        <BookOpen size={30} />
        <div>
          <small>
            CHAPTER I · {stage === 6 ? 'COMPLETE' : `PART ${stage + 1} OF 7`}
          </small>
          <h2>{CHAPTERS[stage].title}</h2>
          <p>{CHAPTERS[stage].detail}</p>
          <Progress value={(stage / 6) * 100} aria-label="Chapter progress" />
          <p>{CHAPTERS[stage].objective}</p>
        </div>
        <button className="primary" onClick={() => navigate('home')}>
          {stage === 6 ? 'Return to the meadow' : 'Continue story'}
        </button>
      </section>
      <div className="story-stat-grid">
        {categories.map(({ icon: Icon, title, value, detail }) => (
          <article className="panel story-stat" key={title}>
            <Icon size={22} />
            <strong>{value}</strong>
            <h3>{title}</h3>
            <p>{detail}</p>
          </article>
        ))}
      </div>
      <section className="panel story-timeline">
        <h2>Your adventure history</h2>
        {w?.history.length ? (
          <ol>
            {w.history.map((h) => (
              <li key={h.id}>
                <span className="timeline-star">✦</span>
                <div>
                  <strong>{h.title}</strong>
                  <time dateTime={new Date(h.time).toISOString()}>
                    {new Date(h.time).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p>Meet Edda in the meadow to write the first entry.</p>
        )}
      </section>
      <h2 className="story-achievements-heading">Achievement collection</h2>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map(([id, name]) => (
          <article
            className={`panel achievement ${completed.includes(id) ? 'unlocked' : ''}`}
            key={id}
          >
            <Trophy />
            <h3>{name}</h3>
            <small>
              {completed.includes(id)
                ? 'Completed · reward saved'
                : (
                    {
                      first_steps: 'Name your first companion.',
                      first_battle: 'Win your first challenge.',
                      perfect_groom: 'Finish a grooming game.',
                      best_friend: 'Reach 80 friendship.',
                      treasure_hunter: 'Complete 10 expeditions.',
                      lucky_pull:
                        'Receive a Superior treasure from the Moonwell.',
                      legendary_collector:
                        'Receive a Legendary treasure from the Moonwell.',
                    } as Record<string, string>
                  )[id] || `Reach level ${id.replace('level_', '')}.`}
            </small>
          </article>
        ))}
      </div>
    </>
  );
}
