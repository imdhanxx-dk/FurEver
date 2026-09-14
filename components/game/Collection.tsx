'use client';
import LoginGifts from './LoginGifts';
import { useState } from 'react';
import { Search, Package, Gift, Sparkles, Check, Heart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ITEMS, DAILY_TASKS, ACHIEVEMENTS } from '@/lib/game/catalog';
import type { Item } from '@/lib/game/types';
import { Choice, SectionTitle, type ScreenProps } from './shared';
export function Inventory({
  state: s,
  config,
  act,
  busy,
  navigate,
  shop = false,
}: ScreenProps & { shop?: boolean }) {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('All'),
    [sort, setSort] = useState('Name'),
    [selected, setSelected] = useState<Item | null>(null);
  let items = ITEMS.filter(
    (i) =>
      i.id !== 'fusion_token' &&
      (shop ? config.prices[i.id] > 0 : (s.inventory[i.id] ?? 0) > 0) &&
      (category === 'All' || i.category === category) &&
      i.name.toLowerCase().includes(query.toLowerCase()),
  );
  items = [...items].sort((a, b) =>
    sort === 'Quantity'
      ? (s.inventory[b.id] ?? 0) - (s.inventory[a.id] ?? 0)
      : a.name.localeCompare(b.name),
  );
  const use = async (item: Item) => {
    if (shop) {
      await act({ action: 'buy', itemId: item.id, quantity: 1 });
      return;
    }
    if (['Cosmetics', 'Event items'].includes(item.category)) {
      await act({ action: 'equip', itemId: item.id });
      return;
    }
    if (item.id === 'ticket') {
      navigate('gacha');
      return;
    }
    if (item.id === 'fusion_token') {
      navigate('fusion-lab');
      return;
    }
    const kind: Record<string, string> = {
      food: 'feed',
      brush: 'groom',
      toy: 'play',
    };
    await act(
      kind[item.id]
        ? { action: 'care', kind: kind[item.id] }
        : { action: 'use_item', itemId: item.id },
    );
  };
  return (
    <>
      <SectionTitle
        eyebrow={
          shop
            ? 'SMALL TREASURES, BIG POSSIBILITIES'
            : 'A POCKET FULL OF POSSIBILITIES'
        }
        title={shop ? 'The little trading post.' : 'Your adventure backpack.'}
        description={
          shop
            ? 'Something nourishing, something useful, something just for you.'
            : 'Every keepsake has a story. What will you use today?'
        }
      >
        <span className="coin">◈ {s.coins.toLocaleString()} PC</span>
      </SectionTitle>
      <div className="inventory-controls">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a little treasure…"
            aria-label="Search items"
          />
        </label>
        <Choice
          label="Sort"
          value={sort}
          options={['Name', 'Quantity']}
          onChange={setSort}
        />
      </div>
      <Tabs value={category} onValueChange={(v) => setCategory(String(v))}>
        <TabsList className="category-tabs">
          {[
            'All',
            'Food',
            'EXP items',
            'Level items',
            'Battle items',
            'Cosmetics',
            'Care',
            'Gacha items',
            'Fusion items',
            'Event items',
          ].map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="inventory-grid">
        {items.map((item) => (
          <button
            className={`item-card rarity-${item.rarity.toLowerCase()}`}
            key={item.id}
            onClick={() => setSelected(item)}
          >
            <div className="item-card-top">
              <small>{item.rarity}</small>
              <span>
                {shop
                  ? `◈ ${config.prices[item.id]}`
                  : `×${s.inventory[item.id]}`}
              </span>
            </div>
            <span className="item-icon">{item.icon}</span>
            <strong>{item.name}</strong>
            <small>{item.category}</small>
            {s.pet?.equipped.includes(item.id) && (
              <span className="equipped">Equipped ✓</span>
            )}
          </button>
        ))}
      </div>
      {items.length === 0 && (
        <div className="empty-state">
          <Package size={40} />
          <h3>No treasures here just yet.</h3>
          <p>Try another filter, or head out on an adventure.</p>
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="game-dialog">
          {selected && (
            <>
              <span className="item-icon">{selected.icon}</span>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
              <p>
                {shop
                  ? `◈ ${config.prices[selected.id]} PC`
                  : `You own ${s.inventory[selected.id] ?? 0}`}
              </p>
              {selected.rarity === 'Epic' && !shop && (
                <p className="muted">
                  This is a rare item. Using it will consume one.
                </p>
              )}
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  await use(selected);
                  setSelected(null);
                }}
              >
                {shop
                  ? 'Buy one'
                  : ['Cosmetics', 'Event items'].includes(selected.category)
                    ? 'Equip / remove'
                    : 'Use item'}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Dailies({
  state: s,
  config,
  act,
  busy,
  navigate,
}: ScreenProps) {
  const paths: Record<string, string> = {
    feed: 'home',
    groom: 'home',
    minigame: 'minigames',
    battle: 'battle',
    explore: 'explore',
    exp: 'inventory',
    bond: 'home',
  };
  return (
    <>
      <SectionTitle
        eyebrow="GOOD DAYS ARE MADE OF SMALL THINGS"
        title="Your daily adventures."
        description="A fresh set of moments, every day at midnight UTC."
      />
      <LoginGifts state={s} />
      <div className="daily-layout">
        <section className="panel daily-list">
          {DAILY_TASKS.map(([id, label], i) => (
            <button
              className="quest-row"
              key={id}
              onClick={() => navigate(paths[id])}
            >
              <span
                className={`check ${s.daily.tasks.includes(id) ? 'done' : ''}`}
              >
                {s.daily.tasks.includes(id) ? <Check size={16} /> : i + 1}
              </span>
              <div>
                <strong>{label}</strong>
                <small>
                  {s.daily.tasks.includes(id)
                    ? 'A happy moment, complete.'
                    : 'A little time together goes a long way.'}
                </small>
              </div>
              <span>↗</span>
            </button>
          ))}
        </section>
        <section className="reward-chest panel">
          <Gift size={68} />
          <h2>A day well spent.</h2>
          <p>Complete all seven adventures to open your daily chest.</p>
          <div className="loot-preview">
            <span>◈ {config.dailyCoins} PC</span>
            <span>🧪 5 EXP elixirs</span>
            <span>⚗️ 2 growth nectars</span>
            <span>🎟️ 1 wish ticket</span>
          </div>
          <Progress
            value={(s.daily.tasks.length / 7) * 100}
            aria-label="Daily adventures completed"
          />
          <button
            className="primary"
            disabled={busy || s.daily.claimed || s.daily.tasks.length < 7}
            onClick={() => void act({ action: 'claim_daily' })}
          >
            {s.daily.claimed ? 'See you tomorrow ♡' : 'Open daily chest'}
          </button>
        </section>
      </div>
    </>
  );
}
export function Events({ state: s, config, act, busy }: ScreenProps) {
  const event = config.event,
    active =
      Date.now() >= Date.parse(event.starts) &&
      Date.now() < Date.parse(event.ends);
  return (
    <>
      <SectionTitle
        eyebrow="A STORY FOR THIS SEASON"
        title={event.name}
        description={event.lore}
      />
      <section className="event-banner">
        <span className="event-moon">☾</span>
        <div>
          <small>MEET THE {event.featured.toUpperCase()}</small>
          <h2>
            A little moonlight.
            <br />A memory to keep.
          </h2>
          <p>
            {active
              ? `The festival ends ${new Date(event.ends).toLocaleDateString()}.`
              : 'This festival is currently closed.'}
          </p>
          <span className="pill">✿ {s.event.tokens} moon petals collected</span>
        </div>
      </section>
      <div className="game-tiles">
        {['event_leaf', 'ticket'].map((id) => (
          <section className="panel event-reward" key={id}>
            <span className="item-icon">
              {ITEMS.find((i) => i.id === id)?.icon}
            </span>
            <h3>{ITEMS.find((i) => i.id === id)?.name}</h3>
            <p>{ITEMS.find((i) => i.id === id)?.description}</p>
            <button
              className="primary"
              disabled={
                busy ||
                !active ||
                s.event.tokens < (id === 'ticket' ? 10 : 30) ||
                s.event.claimed.includes(id)
              }
              onClick={() => void act({ action: 'event_claim', itemId: id })}
            >
              {s.event.claimed.includes(id)
                ? 'Collected'
                : `Collect · ${id === 'ticket' ? 10 : 30} petals`}
            </button>
          </section>
        ))}
      </div>
      <p className="muted">
        Find 5 moon petals on every expedition and 3 after every battle victory
        during the festival.
      </p>
    </>
  );
}
export function Achievements({ state: s }: ScreenProps) {
  return (
    <>
      <SectionTitle
        eyebrow="YOUR STORY, ONE MILESTONE AT A TIME"
        title="Look how far you’ve come."
        description={`${s.achievements.length} of ${ACHIEVEMENTS.length} memories made.`}
      />
      <div className="achievement-grid">
        {ACHIEVEMENTS.map(([id, name]) => (
          <section
            className={`panel achievement ${s.achievements.includes(id) ? 'unlocked' : ''}`}
            key={id}
          >
            <Heart />
            <h3>{name}</h3>
            <small>
              {s.achievements.includes(id)
                ? 'A memory to keep · reward collected'
                : 'A little more adventure awaits'}
            </small>
          </section>
        ))}
      </div>
    </>
  );
}
