'use client';
import { useEffect, useRef, useState } from 'react';
import type { Pet as PetData } from '@/lib/game/types';
import type { GameAudio } from '@/lib/client/audio';
import { touchZone } from '@/lib/game/zones';
type Zone =
  | 'head'
  | 'ear'
  | 'chin'
  | 'back'
  | 'belly'
  | 'paw'
  | 'tail'
  | 'private';
export default function Pet({
  pet,
  audio,
  onBond,
  onBoundary,
  compact = false,
}: {
  pet: PetData | null;
  audio: GameAudio | null;
  onBond?: () => void;
  onBoundary?: () => void;
  compact?: boolean;
}) {
  const [reaction, setReaction] = useState('idle'),
    [dialogue, setDialogue] = useState(''),
    [look, setLook] = useState({ x: 0, y: 0 });
  const touched = useRef(0),
    blocked = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    down = useRef<{ x: number; y: number; at: number } | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const react = (zone: Zone) => {
    if (Date.now() < blocked.current) return;
    let line = '',
      pose = 'happy';
    if (zone === 'private') {
      touched.current++;
      line =
        touched.current > 1
          ? 'Stop. I need some space.'
          : 'Not there. Personal space, please.';
      pose = 'defensive';
      blocked.current = Date.now() + (touched.current > 1 ? 15000 : 3000);
      onBoundary?.();
    } else if (zone === 'tail') {
      line = 'Careful with my tail!';
      pose = 'surprised';
    } else if (zone === 'ear') {
      line = 'Mrrp? That tickles my ear!';
      pose = 'ear';
    } else if (zone === 'paw') {
      line =
        pet?.personality === 'Shy'
          ? 'Maybe a high five later?'
          : 'High five, adventure buddy!';
      pose = 'paw';
    } else if (zone === 'belly') {
      line =
        (pet?.bond ?? 0) < 40
          ? 'Let’s get to know each other first.'
          : 'I trust you, friend.';
      pose = (pet?.bond ?? 0) < 40 ? 'shy' : 'happy';
    } else {
      line =
        pet?.hunger && pet.hunger < 35
          ? 'Is it snack time yet?'
          : pet?.personality === 'Sleepy'
            ? 'A little nap sounds lovely.'
            : [
                'You make this place feel like home.',
                'Where are we exploring next?',
                'Mrrp. A very good day to be together.',
              ][Math.floor(Math.random() * 3)];
      pose = zone === 'chin' ? 'chin' : 'happy';
      onBond?.();
    }
    setDialogue(line);
    setReaction(pose);
    audio?.react(pose === 'defensive' ? 'defensive' : 'happy', pet?.species);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setReaction('idle');
        setDialogue('');
      },
      pose === 'defensive' ? 5000 : 3300,
    );
  };
  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 25) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height;
    if (Math.abs(dx) > 35) {
      react('back');
      return;
    }
    react(touchZone(x, y));
  };
  return (
    <div className={`pet-runtime ${reaction} ${compact ? 'compact' : ''}`}>
      <div className="pet-shadow" />
      <div
        className="pet-body"
        role="button"
        tabIndex={0}
        aria-label={`Pet ${pet?.name || 'your companion'}. Press Enter to stroke their head.`}
        style={{
          transform: `perspective(800px) rotateY(${look.x}deg) rotateX(${look.y}deg)`,
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse') {
            const r = e.currentTarget.getBoundingClientRect();
            setLook({
              x: ((e.clientX - r.left) / r.width - 0.5) * 8,
              y: ((e.clientY - r.top) / r.height - 0.5) * -5,
            });
          }
        }}
        onPointerLeave={() => setLook({ x: 0, y: 0 })}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, y: e.clientY, at: Date.now() };
        }}
        onPointerUp={release}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            react('head');
          }
        }}
      >
        <img
          draggable={false}
          src={pet?.appearance || '/assets/companion.webp'}
          alt={`${pet?.name || 'A fluffy companion'}, looking at you with bright teal eyes`}
        />
        {pet?.equipped.includes('star_crown') && (
          <span className="pet-crown" aria-label="Starlight crown">
            ♛
          </span>
        )}
        {pet?.equipped.includes('aurora') && <span className="pet-aura" />}
        {pet?.equipped.includes('ribbon') && (
          <span className="pet-ribbon">✦</span>
        )}
      </div>
      {dialogue && (
        <span className="speech" role="status">
          {dialogue}
        </span>
      )}
      <div className="pet-zone-actions" aria-label="Companion touch zones">
        {(['head', 'ear', 'chin', 'paw', 'tail'] as Zone[]).map((zone) => (
          <button key={zone} onClick={() => react(zone)}>
            {zone}
          </button>
        ))}
      </div>
      {reaction === 'happy' && (
        <span className="affection-particle" aria-hidden="true">
          ♡
        </span>
      )}
    </div>
  );
}
