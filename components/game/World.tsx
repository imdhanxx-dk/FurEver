'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  PawPrint,
  Footprints,
  MapPin,
  Maximize,
  RotateCcw,
} from 'lucide-react';
import { CHAPTERS, WORLD_OBJECTS } from '@/lib/game/world';
import type {
  MeadowControls,
  MeadowView,
  mountMeadow,
} from '@/lib/client/meadow-scene';
import type { ScreenProps } from './shared';

export default function World(p: ScreenProps) {
  const host = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLElement>(null);
  const api = useRef<Awaited<ReturnType<typeof mountMeadow>> | null>(null);
  const latest = useRef(p);
  latest.current = p;
  const controls = useRef<MeadowControls>({
    x: 0,
    z: 0,
    run: false,
    jump: false,
    zoom: 0,
    mood: 'idle',
  });
  const trail = useRef<[number, number][]>([]),
    pending = useRef(false),
    keyset = useRef(new Set<string>());
  const [ready, setReady] = useState(false),
    [failure, setFailure] = useState(''),
    [view, setView] = useState<MeadowView>({
      position: p.state.world?.position || [0, 16],
      nearest: null,
      fps: 0,
    }),
    [saving, setSaving] = useState(false),
    [help, setHelp] = useState(false),
    [reload, setReload] = useState(0);
  const state = p.state.world,
    chapter = CHAPTERS[state?.stage || 0];
  const save = async (objectId?: string) => {
    if (pending.current || latest.current.busy) return;
    pending.current = true;
    setSaving(true);
    const path = trail.current.slice();
    const result = await latest.current.act({
      action: objectId ? 'world_interact' : 'world_sync',
      path,
      ...(objectId ? { objectId } : {}),
    });
    if (result) {
      trail.current.splice(0, path.length);
      if (objectId === 'pip') latest.current.navigate('shop');
      if (objectId === 'well') latest.current.navigate('gacha');
    } else {
      trail.current = [];
      api.current?.reset(latest.current.state.world?.position || [0, 16]);
    }
    pending.current = false;
    controls.current.blocked = false;
    setSaving(false);
    return result;
  };
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    let disposed = false;
    setFailure('');
    setReady(false);
    trail.current = [];
    void (async () => {
      try {
        let saved = latest.current.state;
        if (!saved.world) {
          // A new companion may still be finishing its creation request.
          for (let i = 0; latest.current.busy && i < 100 && !disposed; i++)
            await new Promise((r) => setTimeout(r, 50));
          if (disposed) return;
          const confirmed = await latest.current.act({
            action: 'world_sync',
            path: [],
          });
          if (!confirmed)
            throw new Error(
              'The meadow could not load your save. Try entering again.',
            );
          saved = confirmed.state;
        }
        const { mountMeadow } = await import('@/lib/client/meadow-scene');
        if (disposed || !host.current) return;
        const mounted = await mountMeadow(
          host.current,
          saved,
          controls.current,
          (v) => {
            const last = trail.current.at(-1) ||
              latest.current.state.world?.position || [0, 16];
            if (
              Math.hypot(v.position[0] - last[0], v.position[1] - last[1]) >
              0.015
            )
              trail.current.push(v.position);
            if (trail.current.length >= 280) {
              controls.current.blocked = true;
              controls.current.x = controls.current.z = 0;
              keyset.current.clear();
            }
            setView(v);
          },
          setFailure,
        );
        if (disposed) {
          mounted.dispose();
          return;
        }
        api.current = mounted;
        setReady(true);
      } catch (e) {
        if (!disposed)
          setFailure(
            e instanceof Error
              ? e.message
              : 'This device could not start the meadow.',
          );
      }
    })();
    const timer = setInterval(() => {
      if (api.current && !document.hidden && trail.current.length)
        void saveRef.current();
    }, 3000);
    const input = () => {
      const k = keyset.current;
      controls.current.x =
        Number(k.has('d') || k.has('arrowright')) -
        Number(k.has('a') || k.has('arrowleft'));
      controls.current.z =
        Number(k.has('s') || k.has('arrowdown')) -
        Number(k.has('w') || k.has('arrowup'));
      controls.current.run = k.has('shift');
    };
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,button,[role="dialog"]',
        )
      )
        return;
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
          'shift',
          'e',
        ].includes(e.key.toLowerCase())
      )
        e.preventDefault();
      keyset.current.add(e.key.toLowerCase());
      input();
      if (e.code === 'Space' && !e.repeat) controls.current.jump = true;
    };
    const up = (e: KeyboardEvent) => {
      keyset.current.delete(e.key.toLowerCase());
      input();
    };
    const blur = () => {
      keyset.current.clear();
      controls.current.x = controls.current.z = 0;
      controls.current.run = false;
      if (trail.current.length) void saveRef.current();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', blur);
    return () => {
      disposed = true;
      clearInterval(timer);
      api.current?.dispose();
      api.current = null;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', blur);
      controls.current.x = controls.current.z = 0;
    };
  }, [reload]);
  useEffect(() => {
    api.current?.update(p.state);
  }, [p.state]);
  useEffect(() => {
    const interact = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'e' &&
        !e.repeat &&
        view.nearest &&
        !(e.target as HTMLElement).closest('input,textarea,button')
      )
        void saveRef.current(view.nearest);
    };
    window.addEventListener('keydown', interact);
    return () => window.removeEventListener('keydown', interact);
  }, [view.nearest]);
  const dragged = useRef(false);
  const cameraDrag = useRef<{ id: number; x: number } | null>(null),
    stick = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <section className="meadow-game" ref={shell} aria-label="Whispering Meadow">
      <div
        className="meadow-canvas"
        ref={host}
        onPointerDown={(e) => {
          if (e.button === 0) {
            dragged.current = false;
            const r = e.currentTarget.getBoundingClientRect();
            controls.current.pointer = [
              ((e.clientX - r.left) / r.width) * 2 - 1,
              (-(e.clientY - r.top) / r.height) * 2 + 1,
            ];
            cameraDrag.current = { id: e.pointerId, x: e.clientX };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          controls.current.pointer = [
            ((e.clientX - r.left) / r.width) * 2 - 1,
            (-(e.clientY - r.top) / r.height) * 2 + 1,
          ];
          if (cameraDrag.current?.id === e.pointerId) {
            if (Math.abs(e.clientX - cameraDrag.current.x) > 1)
              dragged.current = true;
            cameraDrag.current.x = e.clientX;
          }
        }}
        onPointerUp={() => {
          if (!dragged.current) controls.current.click = true;
          cameraDrag.current = null;
        }}
        onPointerLeave={() => {
          if (!cameraDrag.current) controls.current.pointer = undefined;
        }}
        onPointerCancel={() => {
          cameraDrag.current = null;
        }}
        onWheel={(e) => {
          controls.current.zoom += e.deltaY * 0.009;
        }}
      />
      <div className="world-location">
        <Compass size={19} />
        <div>
          <strong>Whispering Meadow</strong>
          <span>Chapter I · The listening town</span>
        </div>
        <span className="world-save" role="status">
          {saving
            ? 'Saving…'
            : trail.current.length
              ? 'Exploring…'
              : ready
                ? 'Saved'
                : 'Entering…'}
        </span>
      </div>
      <div className="world-quest">
        <small>STORY QUEST · {(state?.stage || 0) + 1}/7</small>
        <h2>{chapter.title}</h2>
        <p>{chapter.objective}</p>
        {state?.challenge && (
          <span className="challenge-clock">
            Echo challenge · {state.challenge.nodes.length}/3 tones ·{' '}
            {Math.max(
              0,
              45 - Math.floor((Date.now() - state.challenge.started) / 1000),
            )}
            s
          </span>
        )}
        <button onClick={() => p.navigate('profile')}>Open journal</button>
      </div>
      <div className="world-tools">
        <button aria-label="Controls" onClick={() => setHelp(!help)}>
          ?
        </button>
        <button
          aria-label="Full screen"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else
              void shell.current
                ?.requestFullscreen()
                .catch(() =>
                  p.notify('Full screen is unavailable on this device.'),
                );
          }}
        >
          <Maximize size={18} />
        </button>
        <button aria-label="My companion" onClick={() => p.navigate('pet')}>
          <PawPrint size={18} />
        </button>
      </div>
      {help && (
        <div className="world-help">
          <strong>Explore with {p.state.pet?.name}</strong>
          <p>WASD / arrows: move · Shift: run · Space: jump · E: interact.</p>
          <p>
            Click or tap a path to walk there. Scroll to zoom. On touchscreens,
            drag the left pad and use the right buttons.
          </p>
          <p>
            Your trail saves every three seconds while connected. Wait for
            “Saved” before closing.
          </p>
          <button onClick={() => setHelp(false)}>Back to the meadow</button>
        </div>
      )}
      <div className="world-pet-chip">
        <PawPrint />
        <span>
          <strong>{p.state.pet?.name}</strong>
          <small>{p.state.pet?.bond} friendship</small>
        </span>
        <button
          aria-label="Sit or stand"
          onClick={() => {
            controls.current.mood =
              controls.current.mood === 'sit' ? 'idle' : 'sit';
          }}
        >
          Sit
        </button>
        <button
          aria-label="Sleep or wake"
          onClick={() => {
            controls.current.mood =
              controls.current.mood === 'sleep' ? 'idle' : 'sleep';
          }}
        >
          Rest
        </button>
      </div>
      <div
        className="world-stick"
        role="group"
        aria-label="Touch movement pad"
        onPointerDown={(e) => {
          stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const s = stick.current;
          if (s?.id === e.pointerId) {
            controls.current.x = Math.max(
              -1,
              Math.min(1, (e.clientX - s.x) / 35),
            );
            controls.current.z = Math.max(
              -1,
              Math.min(1, (e.clientY - s.y) / 35),
            );
          }
        }}
        onPointerUp={() => {
          stick.current = null;
          controls.current.x = controls.current.z = 0;
        }}
        onPointerCancel={() => {
          stick.current = null;
          controls.current.x = controls.current.z = 0;
        }}
      >
        <Footprints />
        <span>MOVE</span>
      </div>
      <div className="world-actions">
        <button
          className="world-jump"
          onClick={() => {
            controls.current.jump = true;
          }}
        >
          Jump
        </button>
        <button
          aria-pressed={controls.current.run}
          onClick={() => {
            controls.current.run = !controls.current.run;
          }}
        >
          {controls.current.run ? 'Running' : 'Run'}
        </button>
        <button
          className="world-interact"
          disabled={!ready || p.busy || !view.nearest}
          onClick={() => view.nearest && void save(view.nearest)}
        >
          <span>E</span>
          {view.nearest
            ? WORLD_OBJECTS.find((o) => o.id === view.nearest)?.name
            : 'Explore the meadow'}
        </button>
      </div>
      {(!ready || failure) && (
        <div className="world-loading" role="status">
          <PawPrint size={40} />
          <h2>{failure ? 'The trail is paused' : 'Entering the meadow'}</h2>
          <p>{failure || 'Loading your companion and saved adventure…'}</p>
          {failure && (
            <button className="primary" onClick={() => setReload((n) => n + 1)}>
              <RotateCcw size={17} /> Re-enter meadow
            </button>
          )}
        </div>
      )}
    </section>
  );
}
