'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, Heart, Sparkles } from 'lucide-react';
import type { Pet as PetData } from '@/lib/game/types';
import type { GameAudio } from '@/lib/client/audio';
import {
  companionHit,
  REACTION_LENGTH,
  sampleCompanionPose,
  type PetCue,
  type PetReaction,
  type CareKind,
} from '@/lib/client/companion-motion';
import {
  drawCompanion,
  type CompanionAtlas,
} from '@/lib/client/companion-renderer';
import { loadCompanionAtlas } from '@/lib/client/companion-assets';

const LINES: Partial<Record<PetReaction, string>> = {
  pet: 'Purrr… that’s my favorite spot.',
  tickle: 'Hehe! That tickles!',
  paw: 'High five, best friend!',
  ear: 'Mrrp? I heard that!',
  surprised: 'Oh! Careful with my tail.',
  defensive: 'I need some personal space, please.',
  feed: 'Nom nom… delicious!',
  groom: 'Ooh, looking fluffy!',
  play: 'Catch me if you can!',
  rest: 'Stay a little… zzz.',
  train: 'One, two… we can do this!',
};
export default function Pet({
  pet,
  audio,
  onBond,
  onBoundary,
  compact = false,
  cue,
  onCare,
  busy = false,
  design,
  onReady,
  interactive = true,
}: {
  pet: PetData | null;
  audio: GameAudio | null;
  onBond?: () => void;
  onBoundary?: () => void;
  compact?: boolean;
  cue?: PetCue;
  onCare?: (kind: CareKind) => void;
  busy?: boolean;
  design?: { url?: string; format?: string };
  onReady?: (ready: boolean) => void;
  interactive?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    kind: 'idle' as PetReaction,
    started: 0,
    look: { x: 0, y: 0 },
    equipped: pet?.equipped || [],
  });
  const gesture = useRef<{
    x: number;
    y: number;
    distance: number;
    pointer: number;
    last: number;
  } | null>(null);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldown = useRef({ affection: 0, boundary: 0 });
  const [reaction, setReaction] = useState<PetReaction>('idle');
  const [line, setLine] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [customPortrait, setCustomPortrait] = useState(false);
  live.current.equipped = pet?.equipped || [];
  const appearance = design?.url || pet?.appearance;
  const format = design?.format || pet?.appearanceFormat;
  const source =
    format === 'companion-atlas-v1' && appearance
      ? appearance
      : '/assets/companion-rig.png';
  const custom =
    !!appearance &&
    !appearance.startsWith('/assets/') &&
    format !== 'companion-atlas-v1';
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const respond = useCallback(
    (kind: PetReaction, text?: string) => {
      live.current.kind = kind;
      live.current.started = performance.now();
      setReaction(kind);
      setLine(text ?? LINES[kind] ?? '');

      audio?.react(kind === 'defensive' ? 'defensive' : 'happy', pet?.species);
      if (reset.current) clearTimeout(reset.current);
      reset.current = setTimeout(() => {
        live.current.kind = 'idle';
        setReaction('idle');
        setLine('');
      }, REACTION_LENGTH[kind]);
    },
    [audio, pet?.species],
  );
  useEffect(() => {
    if (cue) respond(cue.kind);
  }, [cue, respond]);
  useEffect(
    () => () => {
      if (reset.current) clearTimeout(reset.current);
    },
    [],
  );
  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    setLoaded(false);
    setLoadFailed(false);
    onReadyRef.current?.(false);
    const ctx = surface.getContext('2d');
    if (!ctx) {
      setLoadFailed(true);
      return;
    }
    let disposed = false,
      frame = 0,
      atlas: CompanionAtlas | undefined,
      lastFrame = 0,
      visible = true;
    let smooth = sampleCompanionPose('idle', 0, 0, { x: 0, y: 0 });
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = new ResizeObserver(() => {
      const parent = surface.parentElement!;
      const size = Math.min(parent.clientWidth, parent.clientHeight, 610);
      surface.style.width = surface.style.height = `${size}px`;
    });
    resize.observe(surface.parentElement!);
    const paint = (time: number) => {
      if (disposed) return;
      if (!atlas || !visible || document.hidden) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(paint);
      if (
        !atlas ||
        document.hidden ||
        (media.matches && time - lastFrame < 100)
      )
        return;
      const delta = Math.min(64, time - lastFrame || 16.67);
      lastFrame = time;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const size = Math.max(300, Math.round(surface.clientWidth * ratio));
      if (surface.width !== size || surface.height !== size) {
        surface.width = size;
        surface.height = size;
      }
      ctx.setTransform(size / 1000, 0, 0, size / 1000, 0, 0);
      ctx.clearRect(0, 0, 1000, 1000);
      const state = live.current;
      const pose = sampleCompanionPose(
        state.kind,
        time - state.started,
        time,
        state.look,
        media.matches,
      );
      const blend = 1 - Math.exp(-delta / 55);
      const joints = [
        'x',
        'y',
        'body',
        'breath',
        'head',
        'headY',
        'leftArm',
        'rightArm',
        'leftFoot',
        'rightFoot',
        'tail',
        'eyeX',
        'eyeY',
      ] as const;
      for (const joint of joints)
        smooth[joint] += (pose[joint] - smooth[joint]) * blend;
      smooth.face = pose.face;
      smooth.active = pose.active;
      drawCompanion(ctx, atlas, smooth, state.equipped);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!disposed && atlas && visible && !document.hidden) {
        lastFrame = 0;
        frame = requestAnimationFrame(paint);
      }
    };
    const visibility = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      resume();
    });
    visibility.observe(surface);
    document.addEventListener('visibilitychange', resume);
    void loadCompanionAtlas(source)
      .then((result) => {
        if (disposed) return;
        atlas = result;
        setLoaded(true);
        onReadyRef.current?.(true);
        resume();
      })
      .catch(() => {
        if (!disposed) setLoadFailed(true);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', resume);
    };
  }, [source]);

  const touch = (zone: ReturnType<typeof companionHit>) => {
    if (!interactive) return;
    const now = Date.now();
    if (!zone || now < cooldown.current.boundary) return;
    if (zone === 'private') {
      cooldown.current.boundary = now + 15000;
      respond('defensive');
      onBoundary?.();
      return;
    }
    if (zone === 'tail') {
      respond('surprised');
      return;
    }
    if (zone === 'paw') {
      respond('paw');
      return;
    }
    if (zone === 'ear') {
      respond('ear');
      return;
    }
    if (zone === 'belly') {
      respond(
        (pet?.bond || 0) < 40 ? 'surprised' : 'tickle',
        (pet?.bond || 0) < 40
          ? 'Let’s get to know each other first.'
          : undefined,
      );
      return;
    }
    respond('pet');
    if (!busy && now > cooldown.current.affection) {
      cooldown.current.affection = now + 31000;
      onBond?.();
    }
  };
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };
  return (
    <div
      className={`pet-runtime articulated-pet ${reaction} ${compact ? 'compact' : ''}`}
      data-interactive={interactive}
    >
      <canvas
        ref={canvas}
        className={`companion-canvas ${loaded ? 'ready' : ''}`}
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={
          interactive
            ? `Interact with ${pet?.name || 'your companion'}. Stroke the head, tap a paw for a high five, or press Enter to pet.`
            : `${pet?.name || 'Companion'} animated preview`
        }
        onPointerDown={(e) => {
          if (!interactive || e.button !== 0) return;
          const p = point(e);
          if (!companionHit(p.x, p.y)) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          gesture.current = {
            ...p,
            distance: 0,
            pointer: e.pointerId,
            last: performance.now(),
          };
        }}
        onPointerMove={(e) => {
          if (!interactive) return;
          const p = point(e);
          live.current.look = { x: (p.x - 0.5) * 2, y: (p.y - 0.4) * 2 };
          const g = gesture.current;
          if (!g || g.pointer !== e.pointerId) return;
          g.distance += Math.hypot(p.x - g.x, p.y - g.y);
          g.x = p.x;
          g.y = p.y;
          if (g.distance > 0.07 && performance.now() - g.last > 800) {
            touch(companionHit(p.x, p.y));
            g.last = performance.now();
          }
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          gesture.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (!g) return;
          const p = point(e);
          if (g.distance < 0.07) touch(companionHit(p.x, p.y));
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onLostPointerCapture={() => {
          gesture.current = null;
        }}
        onPointerLeave={() => {
          if (!gesture.current) live.current.look = { x: 0, y: 0 };
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            touch('head');
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            touch('paw');
          }
        }}
        onDragOver={(e) => {
          if (!interactive) return;
          if (e.dataTransfer.types.includes('application/x-furever-care'))
            e.preventDefault();
        }}
        onDrop={(e) => {
          if (!interactive) return;
          e.preventDefault();
          const kind = e.dataTransfer.getData('application/x-furever-care');
          if (!busy && ['feed', 'groom', 'play'].includes(kind))
            onCare?.(kind as CareKind);
        }}
      />
      {!loaded && (
        <div className="companion-loading" role="status">
          {loadFailed
            ? 'Your companion could not load. Reload to try again.'
            : 'Your companion is waking up…'}
        </div>
      )}
      {line && (
        <span className="speech" role="status" key={`${reaction}-${cue?.id}`}>
          {line}
        </span>
      )}
      {reaction === 'pet' && (
        <div className="reaction-sparkles" aria-hidden="true">
          ♡ <span>♡</span> ♡
        </div>
      )}
      {reaction === 'rest' && (
        <div className="sleep-particles" aria-hidden="true">
          z <span>z</span> Z
        </div>
      )}
      {reaction === 'feed' && (
        <span className="care-prop feed-prop" aria-hidden="true">
          🍲
        </span>
      )}
      {reaction === 'groom' && (
        <span className="care-prop groom-prop" aria-hidden="true">
          🪮
        </span>
      )}
      {reaction === 'play' && (
        <span className="care-prop play-prop" aria-hidden="true">
          🧶
        </span>
      )}
      {!compact && (
        <div className="pet-zone-actions" aria-label="Play with your companion">
          <button onClick={() => touch('head')}>
            <Heart size={15} /> Stroke
          </button>
          <button onClick={() => touch('paw')}>
            <Hand size={15} /> High five
          </button>
          <button onClick={() => touch('belly')}>
            <Sparkles size={15} /> Tickle
          </button>
        </div>
      )}
      {custom && (
        <div className="custom-look-control">
          <button
            onClick={() => setCustomPortrait((v) => !v)}
            aria-expanded={customPortrait}
          >
            My saved design
          </button>
          {customPortrait && (
            <figure>
              <img src={pet!.appearance} alt={`${pet?.name}'s saved design`} />
              <figcaption>
                Your custom design is saved as artwork. It does not change the
                animated character yet.
              </figcaption>
            </figure>
          )}
        </div>
      )}
    </div>
  );
}
