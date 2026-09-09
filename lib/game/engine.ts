import {
  ACHIEVEMENTS,
  DEFAULT_CONFIG,
  ITEMS,
  LOCATIONS,
  DAILY_TASKS,
} from './catalog';
import { levelBottleXp, progress, xpForLevel } from './progression';
import type {
  Context,
  GameResult,
  Intent,
  LedgerEntry,
  Personality,
  PlayerState,
  Rarity,
  Species,
} from './types';
export class GameError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'INVALID_ACTION',
  ) {
    super(message);
  }
}
export function ensure(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw new GameError(message, status);
}
export function textValue(value: unknown, max = 100, min = 1): string {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.length > max
  )
    throw new GameError('Please check the text you entered.');
  return value.trim();
}
export function intValue(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new GameError('Please choose a valid amount.');
  return value;
}
const day = (n: number) => new Date(n).toISOString().slice(0, 10);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.floor(n)));
export function initialState(now: number): PlayerState {
  return {
    version: 1,
    coins: 500,
    xp: 0,
    pet: null,
    avatar: null,
    inventory: {
      food: 5,
      exp_bottle: 5,
      level_bottle: 2,
      potion: 3,
      brush: 2,
      toy: 1,
      ticket: 3,
      fusion_token: 1,
    },
    daily: { day: day(now), tasks: [], claimed: false, grooming: 0, play: 0 },
    streak: { day: '', count: 0 },
    cooldowns: {},
    battle: null,
    expedition: null,
    challenge: null,
    gacha: { total: 0, epic: 0, legendary: 0, mythic: 0, history: [] },
    generations: [],
    achievements: [],
    stats: { battles: 0, expeditions: 0, grooms: 0 },
    event: { id: DEFAULT_CONFIG.event.id, tokens: 0, claimed: [] },
    lastSeen: now,
  };
}
export function applyIntent(
  previous: PlayerState,
  intent: Intent,
  ctx: Context,
): GameResult {
  const s = structuredClone(previous),
    ledger: LedgerEntry[] = [],
    { now, config: c, admin } = ctx;
  let message = 'Saved.',
    rewards: GameResult['rewards'];
  const level = () => progress(s.xp).level;
  const grant = (currency: 'PC' | 'XP', amount: number, kind: string) => {
    const key = currency === 'PC' ? 'coins' : 'xp',
      before = s[key];
    s[key] =
      currency === 'XP'
        ? Math.min(xpForLevel(100), Math.max(0, before + amount))
        : before + amount;
    if (!Number.isSafeInteger(s[key]) || s[key] < 0 || s[key] > 1_000_000_000)
      throw new GameError('The balance limit was reached.');
    ledger.push({
      currency,
      amount: s[key] - before,
      before,
      after: s[key],
      kind,
      source: intent.action,
    });
  };
  const add = (id: string, n = 1) => {
    s.inventory[id] = (s.inventory[id] ?? 0) + n;
    ensure(s.inventory[id] <= 1_000_000, 'Inventory limit reached.');
  };
  const take = (id: string, n = 1) => {
    ensure(admin || (s.inventory[id] ?? 0) >= n, 'You need more of that item.');
    if (!admin) s.inventory[id] -= n;
  };
  const pay = (n: number) => {
    ensure(admin || s.coins >= n, 'You need a few more Pet Coins.');
    if (!admin) grant('PC', -n, 'SHOP_PURCHASE');
  };
  const task = (id: string) => {
    if (!s.daily.tasks.includes(id)) s.daily.tasks.push(id);
  };
  const cooldown = (key: string, ms: number) => {
    ensure(
      now - (s.cooldowns[key] ?? 0) >= ms,
      'Give your companion a moment to catch their breath.',
      429,
    );
    s.cooldowns[key] = now;
  };
  const rand = (lo: number, hi: number) =>
    lo + Math.floor(ctx.random() * (hi - lo + 1));
  const pet = () => {
    ensure(s.pet, 'Create your companion first.');
    return s.pet!;
  };
  const activeEvent = () =>
    now >= Date.parse(c.event.starts) && now < Date.parse(c.event.ends);
  if (s.daily.day !== day(now))
    s.daily = {
      day: day(now),
      tasks: [],
      claimed: false,
      grooming: 0,
      play: 0,
    };
  if (s.event.id !== c.event.id)
    s.event = { id: c.event.id, tokens: 0, claimed: [] };
  const hours = Math.min(48, Math.max(0, (now - s.lastSeen) / 3_600_000));
  if (s.pet) {
    s.pet.hunger = Math.max(20, s.pet.hunger - Math.floor(hours));
    s.pet.cleanliness = Math.max(25, s.pet.cleanliness - Math.floor(hours / 2));
    s.pet.energy = clamp(s.pet.energy + Math.floor(hours * 8));
  }
  s.lastSeen = now;
  switch (intent.action) {
    case 'login': {
      if (s.streak.day !== day(now)) {
        s.streak.count =
          s.streak.day === day(now - 86_400_000) ? s.streak.count + 1 : 1;
        s.streak.day = day(now);
        grant('PC', s.streak.count % 7 === 0 ? 150 : 30, 'LOGIN_REWARD');
        if (s.streak.count % 7 === 0) add('ticket', 3);
        if ([14, 30].includes(s.streak.count))
          add(s.streak.count === 30 ? 'star_crown' : 'moon_collar');
        message = `Welcome home. Day ${s.streak.count} together!`;
      }
      break;
    }
    case 'create_pet': {
      ensure(!s.pet, 'Your companion is already waiting.');
      const species = textValue(intent.species) as Species;
      ensure(
        ['cat', 'dog', 'fusion'].includes(species),
        'Choose a starter species.',
      );
      const personality = textValue(intent.personality) as Personality;
      ensure(
        ['Playful', 'Curious', 'Brave', 'Sleepy', 'Shy', 'Calm'].includes(
          personality,
        ),
        'Choose a personality.',
      );
      s.pet = {
        name: textValue(intent.name, 24),
        species,
        personality,
        hunger: 85,
        happiness: 85,
        cleanliness: 90,
        energy: 100,
        bond: 10,
        appearance: '/assets/companion.webp',
        equipped: [],
      };
      message = `Meet ${s.pet.name}. Your story begins here.`;
      break;
    }
    case 'care': {
      const p = pet(),
        kind = textValue(intent.kind);
      cooldown('care', 2000);
      ensure(
        now >= (s.cooldowns.boundary ?? 0),
        'Your companion needs a little personal space.',
      );
      if (kind === 'feed') {
        take('food');
        p.hunger = clamp(p.hunger + 30);
        p.happiness = clamp(p.happiness + 5);
        task('feed');
      } else if (kind === 'pet') {
        cooldown('affection', 30_000);
        p.bond = clamp(p.bond + 1);
        p.happiness = clamp(p.happiness + 3);
        task('bond');
      } else if (kind === 'groom') {
        take('brush');
        p.cleanliness = clamp(p.cleanliness + 40);
        task('groom');
      } else if (kind === 'play') {
        take('toy');
        p.happiness = clamp(p.happiness + 25);
        p.bond = clamp(p.bond + 3);
        task('bond');
      } else if (kind === 'rest') {
        cooldown('rest', 60_000);
        p.energy = clamp(p.energy + 30);
      } else if (kind === 'train') {
        ensure(p.energy >= 15, 'Rest before training.');
        cooldown('train', 30_000);
        p.energy -= 15;
        grant('XP', 80, 'TRAINING');
      } else throw new GameError('Unknown care action.');
      if (kind !== 'rest' && kind !== 'train') grant('XP', 10, 'PET_CARE');
      message = `${p.name} ${kind === 'feed' ? 'enjoyed that!' : kind === 'rest' ? 'is resting peacefully.' : 'loves spending time with you.'}`;
      break;
    }
    case 'boundary': {
      const p = pet();
      p.happiness = clamp(p.happiness - 2);
      p.bond = clamp(p.bond - 1);
      s.cooldowns.boundary = now + 15_000;
      message = 'Personal space, please. Give your companion a moment.';
      break;
    }
    case 'use_item': {
      pet();
      const id = textValue(intent.itemId);
      ensure(
        ['exp_bottle', 'level_bottle', 'potion'].includes(id),
        'Use this item through pet care or customization.',
      );
      take(id);
      if (id === 'exp_bottle') {
        grant('XP', c.expBottle, 'ITEM_USE');
        task('exp');
        message = `+${c.expBottle} EXP · a little closer to the stars.`;
      } else if (id === 'level_bottle') {
        grant('XP', levelBottleXp(s.xp) - s.xp, 'ITEM_USE');
        message = '+1.2 levels of growth.';
      } else {
        ensure(s.battle && !s.battle.finished, 'Use a tonic during battle.');
        s.battle.hp = Math.min(s.battle.maxHp, s.battle.hp + 40);
        message = 'Restored 40 HP.';
      }
      break;
    }
    case 'buy': {
      const id = textValue(intent.itemId),
        quantity = intValue(intent.quantity, 1, 100),
        price = c.prices[id];
      ensure(
        ITEMS.some((i) => i.id === id) &&
          Number.isSafeInteger(price) &&
          price > 0,
        'This item is not for sale.',
      );
      pay(price * quantity);
      add(id, quantity);
      message = 'Tucked safely into your backpack.';
      break;
    }
    case 'equip': {
      const p = pet(),
        id = textValue(intent.itemId);
      ensure(
        ITEMS.some(
          (i) =>
            i.id === id && ['Cosmetics', 'Event items'].includes(i.category),
        ) &&
          (admin || (s.inventory[id] ?? 0) > 0),
        'You do not own that cosmetic.',
      );
      p.equipped = p.equipped.includes(id)
        ? p.equipped.filter((x) => x !== id)
        : [...p.equipped.slice(-2), id];
      message = 'A little more you.';
      break;
    }
    case 'claim_daily': {
      ensure(!s.daily.claimed, 'Today’s rewards have already been collected.');
      ensure(
        DAILY_TASKS.every(([id]) => s.daily.tasks.includes(id)),
        'Complete all daily adventures first.',
      );
      s.daily.claimed = true;
      grant('PC', c.dailyCoins, 'DAILY_REWARD');
      grant('XP', c.dailyXp, 'DAILY_REWARD');
      add('exp_bottle', 5);
      add('level_bottle', 2);
      add('ticket');
      message =
        'Daily chest opened! 200 PC, 5 elixirs, 2 growth nectars and a wish.';
      break;
    }
    case 'explore_start': {
      const p = pet(),
        location = intValue(intent.location, 1, 10),
        loc = LOCATIONS[location - 1];
      ensure(level() >= loc.level, 'This path opens at a higher level.');
      ensure(!s.expedition, 'Finish your current expedition first.');
      ensure(!s.battle || s.battle.finished, 'Finish your battle first.');
      ensure(p.energy >= 15, 'Your companion needs some rest.');
      cooldown('explore_start', 10_000);
      p.energy -= 15;
      s.expedition = {
        id: ctx.id(),
        location,
        step: 0,
        started: now,
        lastStep: now,
        finds: [],
      };
      message = loc.lore;
      break;
    }
    case 'explore_step': {
      pet();
      const e = s.expedition;
      ensure(e && e.id === intent.id, 'That expedition is no longer active.');
      ensure(
        now - e.lastStep >= 2500,
        'Take a moment to explore the path.',
        429,
      );
      ensure(
        now - e.started < 3_600_000,
        'Your expedition has expired. Return home.',
      );
      e.lastStep = now;
      e.step++;
      e.finds.push(
        [
          'A trail of silver pawprints',
          'Moon petals along the path',
          'A hidden grove of fireflies',
        ][e.step - 1],
      );
      if (e.step >= 3) {
        const i = e.location;
        grant('PC', rand(30 * i, 60 * i), 'EXPEDITION_REWARD');
        grant('XP', 100 * i, 'EXPEDITION_REWARD');
        add('exp_bottle', rand(i, 2 * i));
        add('level_bottle', rand(Math.max(1, Math.floor(i / 2)), i));
        if (ctx.random() < 0.3) add('ticket');
        if (activeEvent()) s.event.tokens += 5;
        task('explore');
        s.stats.expeditions++;
        s.expedition = null;
        message = 'A hidden chest! Your treasures are in your backpack.';
      } else message = e.finds[e.finds.length - 1];
      break;
    }
    case 'explore_cancel':
      s.expedition = null;
      message = 'Safe and sound back home.';
      break;
    case 'battle_start': {
      const p = pet(),
        location = intValue(intent.location, 1, 10),
        loc = LOCATIONS[location - 1];
      ensure(level() >= loc.level, 'That battle zone is still locked.');
      ensure(
        !s.battle || s.battle.finished || now - s.battle.started >= 3_600_000,
        'A battle is already in progress.',
      );
      ensure(!s.expedition, 'Return from your expedition first.');
      ensure(p.energy >= 10, 'Rest before battle.');
      cooldown('battle_start', 10_000);
      p.energy -= 10;
      const hp = 80 + level() * 12,
        ehp = 65 + loc.level * 11;
      s.battle = {
        id: ctx.id(),
        location,
        enemy: loc.enemy,
        hp,
        maxHp: hp,
        enemyHp: ehp,
        enemyMaxHp: ehp,
        turn: 0,
        charge: 0,
        cooldown: 0,
        guard: 0,
        poison: 0,
        started: now,
        finished: false,
        log: [`${loc.enemy} emerges from the shadows.`],
      };
      message = 'Stay close. You have each other.';
      break;
    }
    case 'battle_action': {
      const p = pet(),
        b = s.battle;
      ensure(b && !b.finished && b.id === intent.id, 'This battle has ended.');
      if (now - b.started >= 3_600_000) {
        b.finished = true;
        message = 'The shadows have faded. You both return home safely.';
        break;
      }
      cooldown('battle_turn', 650);
      const move = textValue(intent.move);
      ensure(
        [
          'attack',
          'defend',
          'ability',
          'special',
          'ultimate',
          'retreat',
        ].includes(move),
        'Choose a battle action.',
      );
      if (move === 'retreat') {
        b.finished = true;
        message = 'You both return home safely.';
        break;
      }
      let damage = 0;
      const critical = ctx.random() < 0.12 + p.bond / 1000;
      const attack = 12 + level() * 4;
      if (move === 'defend') {
        b.guard = 1;
        b.hp = Math.min(b.maxHp, b.hp + Math.floor(b.maxHp * 0.08));
        b.log.push('You brace together. Defense rises and wounds recover.');
      } else if (move === 'ultimate') {
        ensure(b.charge >= 100, 'Your bond burst is still charging.');
        b.charge = 0;
        damage = attack * 4;
        b.log.push('Bond burst lights up the battlefield!');
      } else if (move === 'ability') {
        ensure(b.cooldown === 0, 'Your ability is cooling down.');
        b.cooldown = 3;
        damage = Math.floor(attack * 1.6);
        b.poison = 3;
        b.log.push('Stardust strike! The enemy is marked for three turns.');
      } else if (move === 'special') {
        ensure(b.charge >= 40, 'Special needs 40 bond energy.');
        b.charge -= 40;
        damage = attack * 2;
        b.hp = Math.min(b.maxHp, b.hp + attack);
      } else damage = attack;
      if (damage) {
        if (ctx.random() < 0.06) {
          damage = 0;
          b.log.push('The enemy dodges.');
        } else if (critical) {
          damage = Math.floor(damage * 1.6);
          b.log.push('Critical hit!');
        }
        b.enemyHp = Math.max(0, b.enemyHp - damage);
        b.log.push(`${p.name} deals ${damage} damage.`);
      }
      if (b.poison > 0) {
        b.enemyHp = Math.max(0, b.enemyHp - Math.ceil(attack * 0.2));
        b.poison--;
      }
      b.turn++;
      b.cooldown = Math.max(0, b.cooldown - 1);
      b.charge = Math.min(100, b.charge + 22);
      if (b.enemyHp === 0) {
        b.finished = true;
        s.stats.battles++;
        task('battle');
        grant('PC', 40 * b.location, 'BATTLE_REWARD');
        grant('XP', 120 * b.location, 'BATTLE_REWARD');
        if (ctx.random() < 0.2) add('ticket');
        if (activeEvent()) s.event.tokens += 3;
        message = 'Victory! Stronger, together.';
        b.log.push(message);
      } else {
        let hit = Math.max(
          4,
          8 + LOCATIONS[b.location - 1].level * 3 - Math.floor(level() * 1.2),
        );
        if (b.turn % 3 === 0) {
          hit = Math.floor(hit * 1.4);
          b.log.push('The enemy unleashes a shadow strike!');
        }
        if (b.guard) {
          hit = Math.ceil(hit * 0.3);
          b.guard = 0;
        }
        if (ctx.random() < 0.1) {
          hit = 0;
          b.log.push(`${p.name} dodges!`);
        }
        b.hp = Math.max(0, b.hp - hit);
        b.log.push(`The enemy deals ${hit} damage.`);
        message = b.log.at(-1)!;
        if (b.hp === 0) {
          b.finished = true;
          message = 'A brave effort. Rest and try again.';
          b.log.push(message);
        }
      }
      b.log = b.log.slice(-20);
      break;
    }
    case 'minigame_start': {
      pet();
      ensure(
        !s.challenge || s.challenge.expires < now,
        'Finish your current minigame or wait for it to expire.',
      );
      const kind = textValue(intent.kind) as 'grooming' | 'play';
      ensure(['grooming', 'play'].includes(kind), 'Choose a minigame.');
      ensure(
        admin || s.daily[kind] < c.minigameLimit,
        'All rewarded games for today are complete.',
      );
      cooldown('minigame', 10_000);
      s.challenge = {
        id: ctx.id(),
        nonce: ctx.id(),
        kind,
        started: now,
        expires: now + 120_000,
        step: 0,
        targets: Array.from({ length: 10 }, () => rand(0, 8)),
        lastStep: now,
      };
      message =
        kind === 'grooming'
          ? 'Brush each sparkling patch.'
          : 'Catch the glowing toy!';
      break;
    }
    case 'minigame_hit': {
      const p = pet(),
        g = s.challenge;
      ensure(
        g && g.id === intent.id && g.nonce === intent.nonce,
        'That challenge is not yours.',
      );
      ensure(now < g.expires, 'The game timed out. Try a fresh game.');
      ensure(intent.step === g.step, 'That move has already been played.');
      ensure(
        now - g.lastStep >= 500,
        'That was too fast. Follow the rhythm.',
        429,
      );
      ensure(intent.target === g.targets[g.step], 'Find the glowing target.');
      g.lastStep = now;
      g.step++;
      if (g.step === 10) {
        ensure(now - g.started >= 5000, 'Challenge duration is invalid.');
        ensure(
          admin || s.daily[g.kind] < c.minigameLimit,
          'Daily reward limit reached.',
        );
        s.daily[g.kind]++;
        grant(
          'PC',
          g.kind === 'grooming' ? c.groomCoins : c.playCoins,
          'MINIGAME_REWARD',
        );
        grant('XP', 60, 'MINIGAME_REWARD');
        task('minigame');
        p.happiness = clamp(p.happiness + 15);
        p.bond = clamp(p.bond + 2);
        task('bond');
        if (g.kind === 'grooming') {
          p.cleanliness = 100;
          s.stats.grooms++;
          task('groom');
        }
        s.challenge = null;
        message = 'Perfect teamwork! Your reward is ready.';
      } else message = 'Nice catch. Keep going!';
      break;
    }
    case 'minigame_cancel':
      s.challenge = null;
      message = 'Come back whenever you feel playful.';
      break;
    case 'gacha': {
      pet();
      const count = intValue(intent.count, 1, 10);
      ensure(count === 1 || count === 10, 'Choose one or ten wishes.');
      take('ticket', count);
      rewards = [];
      const rarities: Rarity[] = [
          'Common',
          'Rare',
          'Epic',
          'Legendary',
          'Mythic',
        ],
        pool = ['ribbon', 'moon_collar', 'star_crown', 'aurora', 'moon_fox'];
      for (let n = 0; n < count; n++) {
        s.gacha.total++;
        s.gacha.epic++;
        s.gacha.legendary++;
        s.gacha.mythic++;
        let rank = 0;
        const roll = ctx.random() * 100;
        let sum = 0;
        for (let i = 0; i < 5; i++) {
          sum += c.gachaWeights[i];
          if (roll < sum) {
            rank = i;
            break;
          }
        }
        if (s.gacha.mythic >= c.pity.mythic) rank = 4;
        else if (s.gacha.legendary >= c.pity.legendary)
          rank = Math.max(rank, 3);
        else if (s.gacha.epic >= c.pity.epic) rank = Math.max(rank, 2);
        if (rank >= 2) s.gacha.epic = 0;
        if (rank >= 3) s.gacha.legendary = 0;
        if (rank === 4) s.gacha.mythic = 0;
        const item = pool[rank];
        if ((s.inventory[item] ?? 0) > 0)
          grant('PC', (rank + 1) * 40, 'GACHA_DUPLICATE');
        else add(item);
        s.gacha.history.unshift({
          id: ctx.id(),
          item,
          rarity: rarities[rank],
          time: now,
        });
        rewards.push({ item, rarity: rarities[rank] });
      }
      s.gacha.history = s.gacha.history.slice(0, 100);
      message = 'The Moonwell has answered your wish.';
      break;
    }
    case 'event_claim': {
      ensure(activeEvent(), 'This festival is resting until its next season.');
      const item = textValue(intent.itemId);
      const cost = item === 'event_leaf' ? 30 : item === 'ticket' ? 10 : 0;
      ensure(cost, 'Choose a festival reward.');
      ensure(
        s.event.tokens >= cost,
        'Collect more moon petals by exploring and battling.',
      );
      ensure(
        item !== 'event_leaf' || !s.event.claimed.includes(item),
        'You already collected this keepsake.',
      );
      s.event.tokens -= cost;
      add(item);
      if (item === 'event_leaf') s.event.claimed.push(item);
      message = 'A little festival magic, just for you.';
      break;
    }
    case 'generation_open': {
      const kind = textValue(intent.kind) as 'avatar' | 'pet' | 'fusion';
      ensure(
        ['avatar', 'pet', 'fusion'].includes(kind),
        'Unknown creation type.',
      );
      if (kind === 'fusion') {
        ensure(level() >= 10 || admin, 'Fusion opens at level 10.');
        take('fusion_token');
      } else
        ensure(
          !s.generations.some((g) => g.kind === kind),
          'Your creation session already exists.',
        );
      s.generations.push({
        id: ctx.id(),
        kind,
        attempts: 0,
        selected: null,
        candidates: [],
      });
      message = 'Your creative journey is ready.';
      break;
    }
    case 'generation_reserve': {
      const g = s.generations.find((g) => g.id === intent.sessionId);
      ensure(g && !g.selected, 'Choose an open creation session.');
      ensure(
        admin || g.attempts < 5,
        'You have used all five attempts in this session.',
      );
      ensure(
        !g.candidates.some(
          (x) => x.status === 'pending' && now - x.created < 300_000,
        ),
        'A creation is already being painted.',
      );
      g.attempts++;
      g.candidates.push({
        id: textValue(intent.candidateId),
        status: 'pending',
        prompt: textValue(intent.prompt, 1000),
        created: now,
      });
      message = 'Painting your companion’s story…';
      break;
    }
    case 'generation_finish': {
      const g = s.generations.find((g) => g.id === intent.sessionId),
        candidate = g?.candidates.find((x) => x.id === intent.candidateId);
      ensure(
        candidate && candidate.status === 'pending',
        'This creation has already been completed.',
      );
      candidate.status = intent.success ? 'ready' : 'failed';
      if (intent.success) candidate.url = textValue(intent.url, 500);
      message = intent.success
        ? 'Your new design is ready.'
        : 'The painter could not finish this attempt.';
      break;
    }
    case 'generation_select': {
      const g = s.generations.find((g) => g.id === intent.sessionId),
        candidate = g?.candidates.find((x) => x.id === intent.candidateId);
      ensure(
        g && !g.selected && candidate?.status === 'ready' && candidate.url,
        'Choose an available design.',
      );
      g.selected = candidate.id;
      if (g.kind === 'avatar') s.avatar = candidate.url;
      else {
        const p = pet();
        p.appearance = candidate.url;
        if (g.kind === 'fusion') p.species = 'fusion';
      }
      message = 'Made by you. Forever yours.';
      break;
    }
    case 'admin_grant': {
      ensure(admin, 'That portal is not yours to enter.', 403);
      const amount = intValue(intent.amount, -1_000_000, 1_000_000);
      if (intent.currency === 'PC') grant('PC', amount, 'ADMIN_GRANT');
      else if (intent.currency === 'XP') grant('XP', amount, 'ADMIN_GRANT');
      else {
        const id = textValue(intent.itemId);
        ensure(
          ITEMS.some((i) => i.id === id),
          'Unknown item.',
        );
        ensure(
          (s.inventory[id] ?? 0) + amount >= 0,
          'Cannot remove more than owned.',
        );
        add(id, amount);
      }
      message = 'Admin adjustment recorded.';
      break;
    }
    case 'external_credit': {
      ensure(admin, 'Internal action only.', 403);
      grant(
        'PC',
        intValue(intent.amount, 1, 1_000_000),
        textValue(intent.kind),
      );
      message = 'Pet Coins received.';
      break;
    }
    default:
      throw new GameError('Unknown action.');
  }
  const eligible: Record<string, boolean> = {
    first_steps: !!s.pet,
    first_battle: s.stats.battles >= 1,
    perfect_groom: s.stats.grooms >= 1,
    best_friend: (s.pet?.bond ?? 0) >= 80,
    treasure_hunter: s.stats.expeditions >= 10,
    lucky_pull: s.gacha.history.some((x) => x.rarity === 'Mythic'),
    legendary_collector: s.gacha.history.some((x) => x.rarity === 'Legendary'),
    fusion_pioneer: s.generations.some(
      (g) => g.kind === 'fusion' && g.selected,
    ),
  };
  for (const n of [10, 25, 50, 75, 100]) eligible[`level_${n}`] = level() >= n;
  // Boundary interactions never grant any benefit, including incidental achievements.
  if (intent.action !== 'boundary')
    for (const [id] of ACHIEVEMENTS) {
      if (eligible[id] && !s.achievements.includes(id)) {
        s.achievements.push(id);
        grant('PC', id === 'level_100' ? 1000 : 50, 'ACHIEVEMENT');
        if (id === 'level_100') add('aurora');
      }
    }
  return { state: s, message, ledger, rewards };
}
