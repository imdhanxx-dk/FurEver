'use client';
import { useEffect, useRef, useState } from 'react';
import { applyIntent, initialState } from '@/lib/game/engine';
import { DEFAULT_CONFIG } from '@/lib/game/catalog';
import type { PlayerState } from '@/lib/game/types';
import type { ScreenProps } from './shared';
import Home from './Home';
import LoginGifts from './LoginGifts';
import Companions from './Companions';
import Onboarding from './Onboarding';
import Wishes from './Wishes';
import Story from './Story';
import { Inventory } from './Collection';
import { Battle, Explore, Minigames } from './Adventure';
export default function BetaPreview() {
  const [state, setState] = useState<PlayerState | null>(null),
    [page, setPage] = useState('home'),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const current = useRef(state),
    pending = useRef(false);
  current.current = state;
  useEffect(() => {
    try {
      setState(
        JSON.parse(sessionStorage.getItem('furever.local-qa') || 'null') ||
          initialState(Date.now()),
      );
    } catch {
      setState(initialState(Date.now()));
    }
  }, []);
  if (!state) return <p>Opening local test game…</p>;
  const props: ScreenProps = {
    state,
    config: DEFAULT_CONFIG,
    admin: false,
    ai: false,
    payments: false,
    busy,
    navigate: setPage,
    notify: setNotice,
    request: async () => ({}),
    act: async (intent) => {
      if (pending.current || !current.current) return;
      pending.current = true;
      setBusy(true);
      try {
        await new Promise((r) => setTimeout(r, 120));
        const result = applyIntent(current.current, intent, {
          now: Date.now(),
          random: () =>
            crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
          id: () => crypto.randomUUID(),
          admin: false,
          config: DEFAULT_CONFIG,
        });
        setState(result.state);
        sessionStorage.setItem(
          'furever.local-qa',
          JSON.stringify(result.state),
        );
        if (intent.action !== 'world_sync') setNotice(result.message);
        return result;
      } catch (e) {
        setNotice(e instanceof Error ? e.message : String(e));
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
  };
  return (
    <div className="furever-app">
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#1f3c34',
          color: '#fff1d5',
          fontSize: 14,
        }}
      >
        <strong>LOCAL TEST GAME</strong>
        {[
          'home',
          'pet',
          'profile',
          'gacha',
          'shop',
          'inventory',
          'explore',
          'battle',
          'minigames',
          'dailies',
        ].map((x) => (
          <button key={x} onClick={() => setPage(x)}>
            {x}
          </button>
        ))}
        <span>{state.coins} PC</span>
        <span role="status">{notice}</span>
      </div>
      {!state.pet ? (
        <Onboarding {...props} />
      ) : page === 'home' ? (
        <Home {...props} audio={null} playerName="Beta tester" />
      ) : (
        <main className="game-content">
          {page === 'dailies' ? (
            <LoginGifts state={state} />
          ) : page === 'pet' ? (
            <Companions {...props} />
          ) : page === 'profile' ? (
            <Story {...props} />
          ) : page === 'gacha' ? (
            <Wishes {...props} />
          ) : page === 'battle' ? (
            <Battle {...props} />
          ) : page === 'explore' ? (
            <Explore {...props} />
          ) : page === 'minigames' ? (
            <Minigames {...props} />
          ) : (
            <Inventory {...props} shop={page === 'shop'} />
          )}
        </main>
      )}
    </div>
  );
}
