'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  PawPrint,
  Home as HomeIcon,
  Compass,
  Gamepad2,
  Backpack,
  ShoppingBag,
  Sparkles,
  Gift,
  Heart,
  Settings as SettingsIcon,
  Shield,
  Coins,
  Menu,
  Volume2,
  VolumeX,
  Swords,
  Palette,
  Mail,
  ArrowLeftRight,
  UserRound,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Entry from './Entry';
import { readApiResponse } from '@/lib/client/api';
import Home from './Home';
import Onboarding from './Onboarding';
import { GameAudio, AUDIO_DEFAULTS, type AudioPrefs } from '@/lib/client/audio';
import { progress } from '@/lib/game/progression';
import type {
  GameConfig,
  GameResult,
  Intent,
  PlayerState,
} from '@/lib/game/types';
import type { ScreenProps } from './shared';
const Explore = lazy(() =>
    import('./Adventure').then((m) => ({ default: m.Explore })),
  ),
  Battle = lazy(() =>
    import('./Adventure').then((m) => ({ default: m.Battle })),
  ),
  Minigames = lazy(() =>
    import('./Adventure').then((m) => ({ default: m.Minigames })),
  );
const Inventory = lazy(() =>
    import('./Collection').then((m) => ({ default: m.Inventory })),
  ),
  Dailies = lazy(() =>
    import('./Collection').then((m) => ({ default: m.Dailies })),
  ),
  Gacha = lazy(() => import('./Wishes')),
  Events = lazy(() =>
    import('./Collection').then((m) => ({ default: m.Events })),
  ),
  Achievements = lazy(() =>
    import('./Collection').then((m) => ({ default: m.Achievements })),
  );
const World = lazy(() => import('./World')),
  Story = lazy(() => import('./Story')),
  Companions = lazy(() => import('./Companions')),
  Settings = lazy(() => import('./Settings')),
  Admin = lazy(() => import('./Admin'));
const Mora = lazy(() =>
    import('./Community').then((m) => ({ default: m.Mora })),
  ),
  Support = lazy(() =>
    import('./Community').then((m) => ({ default: m.Support })),
  );
type Bootstrap = {
  betaPending?: boolean;
  revision?: number;
  authenticated: boolean;
  setupRequired?: boolean;
  user?: {
    id: string;
    display_name: string;
    username: string;
    discord_avatar: string | null;
    admin: boolean;
    discord_id?: string;
  };
  state?: PlayerState;
  csrf?: string;
  config?: GameConfig;
  capabilities?: { ai: boolean; payments: boolean };
};
const NAV = [
  ['home', 'Home', HomeIcon],
  ['pet', 'My companions', PawPrint],
  ['explore', 'Explore', Compass],
  ['minigames', 'Play together', Gamepad2],
  ['battle', 'Battle', Swords],
  ['inventory', 'Backpack', Backpack],
  ['dailies', 'Daily adventures', Gift],
  ['shop', 'Trading post', ShoppingBag],
  ['gacha', 'Moonwell', Sparkles],
  ['events', 'Seasonal stories', Heart],
  ['profile', 'My story', UserRound],
  ['mora', 'Mora exchange', ArrowLeftRight],
  ['support', 'Contact the club', Mail],
] as const;
function Loading({ path = 'home' }: { path?: string }) {
  return (
    <div className={`game-loading loading-${path}`} role="status">
      <PawPrint size={40} />
      <div className="loading-trail">· · ✧ · ·</div>
      <p>
        {path === 'battle'
          ? 'Finding our courage…'
          : path === 'explore'
            ? 'Following a new trail…'
            : path === 'gacha'
              ? 'Gathering a little starlight…'
              : path === 'fusion-lab'
                ? 'Bringing imagination together…'
                : 'Finding our way home…'}
      </p>
    </div>
  );
}
export default function Game() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [path, setPath] = useState('home'),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [prefs, setPreferences] = useState<AudioPrefs>(AUDIO_DEFAULTS),
    [online, setOnline] = useState(true),
    [tutorial, setTutorial] = useState(-1),
    [setupDialog, setSetupDialog] = useState(false),
    [levelUp, setLevelUp] = useState<{ amount: number; id: number } | null>(
      null,
    ),
    [mainMenu, setMainMenu] = useState(false);
  const audio = useRef<GameAudio | null>(null),
    inFlight = useRef(false),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    csrfRef = useRef('');
  const notify = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 5500);
  };
  const refresh = async () => {
    try {
      const r = await fetch('/api/bootstrap', { cache: 'no-store' });
      const b = await readApiResponse<Bootstrap>(r);
      if (typeof b.authenticated !== 'boolean')
        throw new Error(
          'The game service is temporarily unavailable. Please reload FurEver.',
        );
      csrfRef.current = b.csrf || '';
      setData((current) =>
        current?.authenticated &&
        b.authenticated &&
        current.user?.id === b.user?.id &&
        (current.revision ?? -1) > (b.revision ?? -1)
          ? current
          : b,
      );
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not reach the sanctuary.',
      );
    }
  };
  useEffect(() => {
    setPath(window.location.pathname.slice(1) || 'home');
    setSetupDialog(
      new URLSearchParams(window.location.search).get('notice') === 'setup',
    );
    void refresh();
    audio.current = new GameAudio();
    try {
      const saved = JSON.parse(
        localStorage.getItem('furever.preferences') || 'null',
      );
      if (saved) setPreferences({ ...AUDIO_DEFAULTS, ...saved });
    } catch {}
    const pop = () => setPath(window.location.pathname.slice(1) || 'home'),
      on = () => {
        setOnline(true);
        void refresh();
      },
      off = () => setOnline(false);
    window.addEventListener('popstate', pop);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    const resume = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      audio.current?.stop();
      window.removeEventListener('popstate', pop);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      document.removeEventListener('visibilitychange', resume);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    audio.current?.update(prefs, path);
  }, [prefs, path]);
  const setPrefs = (p: AudioPrefs) => {
    setPreferences(p);
    localStorage.setItem('furever.preferences', JSON.stringify(p));
    audio.current?.start();
    audio.current?.update(p, path);
  };
  const navigate = (next: string) => {
    window.history.pushState({}, '', `/${next}`);
    setPath(next);
    setMainMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    audio.current?.start();
  };
  const request = async (
    endpoint: string,
    payload?: unknown,
  ): Promise<Record<string, unknown>> => {
    const key = crypto.randomUUID();
    const options: RequestInit =
      payload === undefined
        ? { cache: 'no-store' }
        : {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfRef.current,
              'idempotency-key': key,
            },
            body: JSON.stringify(payload),
          };
    let response: Response;
    try {
      response = await fetch(`/api/${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      if (payload === undefined)
        throw new Error('You’re offline. Reconnect to continue.');
      response = await fetch(`/api/${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(20000),
      });
    }
    return readApiResponse<Record<string, unknown>>(response);
  };
  const act = async (intent: Intent): Promise<GameResult | undefined> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    audio.current?.start();
    try {
      const result = (await request('action', intent)) as unknown as GameResult;
      const before = progress(data?.state?.xp || 0).level,
        after = progress(result.state.xp).level;
      setData((d) =>
        d && (result.revision ?? -1) >= (d.revision ?? -1)
          ? { ...d, state: result.state, revision: result.revision }
          : d,
      );
      if (
        ![
          'world_sync',
          'battle_action',
          'battle_start',
          'use_item',
          'kitten_drop',
          'kitten_start',
          'minigame_hit',
        ].includes(intent.action)
      )
        notify(result.message);
      if (intent.action !== 'world_sync')
        audio.current?.react(
          intent.action === 'boundary' ? 'defensive' : 'happy',
          result.state.pet?.species,
        );
      if (after > before)
        setLevelUp({ amount: after - before, id: Date.now() });
      if (intent.action === 'create_pet') {
        navigate('home');
        if (!localStorage.getItem('furever.tutorial')) setTutorial(0);
      }
      return result;
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : 'A little tangle in the trail. Try again.',
      );
      void refresh();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      await request('auth/logout', {});
      setData({ authenticated: false });
      navigate('home');
    } catch (e) {
      notify(String(e));
    }
  };
  if (error && !data)
    return (
      <div className="error-page">
        <PawPrint size={48} />
        <h2>A little pause in the adventure.</h2>
        <p>{error}</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Reload FurEver
        </button>
      </div>
    );
  if (!data) return <Loading />;
  if (!data.authenticated)
    return (
      <>
        <Entry />
        <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
          <DialogContent className="game-dialog">
            <DialogTitle>The sanctuary is being prepared.</DialogTitle>
            <DialogDescription>
              Discord sign-in will open once the game owner finishes connecting
              the sanctuary. Your future companion is waiting.
            </DialogDescription>
            <button className="primary" onClick={() => setSetupDialog(false)}>
              Back to the sanctuary
            </button>
          </DialogContent>
        </Dialog>
      </>
    );
  if (data.betaPending)
    return (
      <div className="beta-waiting">
        <PawPrint size={48} />
        <h1>Your invitation is waiting</h1>
        <p>FurEver beta is open to players approved by the game owner.</p>
        <p>
          Signed in as <strong>{data.user?.display_name}</strong>
        </p>
        <p>
          Your Discord ID: <strong>{data.user?.discord_id}</strong>
        </p>
        <p>Ask the owner to approve this account, then check again.</p>
        <button className="primary" onClick={() => void refresh()}>
          Check my access
        </button>
        <button className="text-button" onClick={() => void logout()}>
          Use another Discord account
        </button>
      </div>
    );
  const state = data.state!,
    config = data.config!,
    user = data.user!,
    xp = progress(state.xp);
  const screen: ScreenProps = {
    state,
    config,
    act,
    busy,
    navigate,
    notify,
    request,
    admin: user.admin,
    ai: !!data.capabilities?.ai,
    payments: !!data.capabilities?.payments,
  };
  let content: React.ReactNode;
  if (!state.pet) content = <Onboarding act={act} busy={busy} />;
  else
    switch (path) {
      case 'home':
        content = (
          <Home
            {...screen}
            audio={audio.current}
            playerName={user.display_name}
          />
        );
        break;
      case 'world':
        content = <World {...screen} />;
        break;
      case 'pet':
        content = <Companions {...screen} />;
        break;
      case 'sanctuary':
        content = <Home {...screen} audio={audio.current} />;
        break;
      case 'explore':
        content = <Explore {...screen} />;
        break;
      case 'battle':
        content = <Battle {...screen} />;
        break;
      case 'minigames':
      case 'minigames/play':
      case 'minigames/grooming':
        content = <Minigames {...screen} />;
        break;
      case 'inventory':
      case 'shop':
        content = <Inventory {...screen} shop={path === 'shop'} />;
        break;
      case 'dailies':
        content = <Dailies {...screen} />;
        break;
      case 'gacha':
        content = <Gacha {...screen} />;
        break;
      case 'events':
        content = <Events {...screen} />;
        break;
      case 'create-avatar':
      case 'create-pet':
      case 'fusion-lab':
        content = <Companions {...screen} />;
        break;
      case 'story':
      case 'profile':
        content = (
          <>
            <div className="profile-card panel">
              <img
                src={state.avatar || user.discord_avatar || '/icon.svg'}
                alt="Your player portrait"
              />
              <div>
                <h2>{user.display_name}</h2>
                <p>
                  @{user.username} · Level {xp.level} · {state.stats.battles}{' '}
                  victories
                </p>
              </div>
            </div>
            <Story {...screen} />
          </>
        );
        break;
      case 'buy-coins':
      case 'mora':
        content = <Mora {...screen} />;
        break;
      case 'support':
        content = <Support {...screen} />;
        break;
      case 'settings':
        content = (
          <Settings prefs={prefs} setPrefs={setPrefs} logout={logout} />
        );
        break;
      default:
        content =
          path.startsWith('admin') && user.admin ? (
            <Admin {...screen} />
          ) : (
            <Home {...screen} audio={audio.current} />
          );
    }
  const tutorialSteps = [
    [
      'Meet your companion',
      'Tap their head or swipe gently to say hello.',
      'pet',
    ],
    [
      'A little nourishment',
      'Feed a harvest bowl from the care bar.',
      'sanctuary',
    ],
    [
      'Make time for play',
      'Try grooming or catch a little starlight.',
      'minigames',
    ],
    [
      'Small daily adventures',
      'Seven happy moments unlock a daily chest.',
      'dailies',
    ],
    [
      'The world is waiting',
      'Walk into the meadow and meet Edda to begin the first chapter.',
      'home',
    ],
  ];
  return (
    <div
      className={`furever-app detail-${prefs.graphics.toLowerCase()} ${path === 'world' ? 'in-world' : ''}`}
    >
      <a className="skip-link" href="#game-content">
        Skip to game
      </a>
      <div className="game-inset">
        <header className="topbar">
          <div className="row">
            <button
              className="icon-button main-menu-button"
              aria-label="Main menu"
              onClick={() => setMainMenu(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Your adventure <span>/</span>{' '}
              <strong>
                {NAV.find((n) => n[0] === path)?.[1] || 'Your story'}
              </strong>
            </span>
          </div>
          <div className="hud">
            <div className="xp-hud">
              <span className="level-label">
                LV. {xp.level}
                {levelUp && (
                  <b
                    key={levelUp.id}
                    className="level-gain"
                    role="status"
                    aria-label={`Gained ${levelUp.amount} levels`}
                    onAnimationEnd={() => setLevelUp(null)}
                  >
                    +{levelUp.amount}
                  </b>
                )}
              </span>
              <div>
                <small>
                  {xp.level === 100
                    ? 'Forever friends'
                    : `${xp.xp.toLocaleString()} / ${xp.needed.toLocaleString()} EXP`}
                </small>
                <Progress value={xp.percent} aria-label="Level progress" />
              </div>
            </div>
            <button className="coin-pill" onClick={() => navigate('mora')}>
              <span>◈</span>
              {state.coins.toLocaleString()}
              <small>PC</small>
            </button>
            <button
              className="icon-button"
              onClick={() => setPrefs({ ...prefs, music: !prefs.music })}
              aria-label={prefs.music ? 'Mute music' : 'Enable music'}
            >
              {prefs.music ? <Volume2 /> : <VolumeX />}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner">
            You’re offline. Reconnect to continue your adventure.
          </div>
        )}
        <main id="game-content" className="game-content">
          <Suspense fallback={<Loading path={path} />}>{content}</Suspense>
        </main>
        <nav className="bottom-nav" aria-label="Quick navigation">
          {[
            ['home', HomeIcon, 'Home'],
            ['explore', Compass, 'Explore'],
            ['minigames', Gamepad2, 'Play'],
            ['inventory', Backpack, 'Bag'],
            ['profile', UserRound, 'You'],
          ].map(([route, Icon, label]) => {
            const I = Icon as typeof HomeIcon;
            return (
              <button
                key={String(route)}
                className={path === route ? 'active' : ''}
                onClick={() => navigate(String(route))}
              >
                <I />
                <span>{String(label)}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {notice && (
        <div className="game-toast" role="status">
          <PawPrint size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      <Dialog
        open={tutorial >= 0}
        onOpenChange={(v) => {
          if (!v) {
            setTutorial(-1);
            localStorage.setItem('furever.tutorial', 'done');
          }
        }}
      >
        <DialogContent className="game-dialog">
          <DialogTitle>{tutorialSteps[tutorial]?.[0]}</DialogTitle>
          <DialogDescription>{tutorialSteps[tutorial]?.[1]}</DialogDescription>
          <span className="eyebrow">
            {tutorial + 1} / {tutorialSteps.length}
          </span>
          <button
            className="primary"
            onClick={() => {
              navigate(tutorialSteps[tutorial][2]);
              if (tutorial === tutorialSteps.length - 1) {
                setTutorial(-1);
                localStorage.setItem('furever.tutorial', 'done');
              } else setTutorial(tutorial + 1);
            }}
          >
            {tutorial === tutorialSteps.length - 1
              ? 'Begin your adventure'
              : 'Next'}
          </button>
          <button
            className="text-button"
            onClick={() => {
              setTutorial(-1);
              localStorage.setItem('furever.tutorial', 'done');
            }}
          >
            Skip introduction
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={mainMenu} onOpenChange={setMainMenu}>
        <DialogContent className="game-dialog main-menu-dialog">
          <DialogTitle>FurEver</DialogTitle>
          <DialogDescription>Where shall we go?</DialogDescription>
          <nav className="main-menu-grid" aria-label="Game destinations">
            {NAV.map(([route, label, Icon]) => (
              <button
                key={route}
                aria-current={path === route ? 'page' : undefined}
                onClick={() => navigate(route)}
              >
                <Icon size={22} />
                <span>{label}</span>
              </button>
            ))}
            <button onClick={() => navigate('settings')}>
              <SettingsIcon size={22} />
              <span>Settings</span>
            </button>
            {user.admin && (
              <button onClick={() => navigate('admin')}>
                <Shield size={22} />
                <span>Club administration</span>
              </button>
            )}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
