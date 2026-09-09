import { applyIntent, GameError, initialState } from '../game/engine';
import { DEFAULT_CONFIG } from '../game/catalog';
import type {
  GameConfig,
  GameResult,
  Intent,
  PlayerState,
} from '../game/types';
import { Database } from './database';
import { hash } from './security';
export type StoredPlayer = {
  user_id: string;
  state: PlayerState;
  revision: number;
};
export async function gameConfig(db: Database) {
  const rows = await db.request<{ value: GameConfig }[]>(
    'game_config?id=eq.main&select=value',
  );
  return rows[0]?.value ?? structuredClone(DEFAULT_CONFIG);
}
export async function readPlayer(db: Database, userId: string) {
  const rows = await db.request<StoredPlayer[]>(
    `players?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`,
  );
  if (!rows[0]) throw new GameError('Your companion could not be found.', 404);
  return rows[0];
}
export async function transact(
  db: Database,
  userId: string,
  intent: Intent,
  key: string,
  admin = false,
  actorId?: string,
): Promise<GameResult> {
  const fingerprint = await hash(JSON.stringify(intent));
  const prior = await db.request<
    { fingerprint: string; response: GameResult }[]
  >(
    `operations?user_id=eq.${encodeURIComponent(userId)}&key=eq.${encodeURIComponent(key)}&select=fingerprint,response&limit=1`,
  );
  if (prior[0]) {
    if (prior[0].fingerprint !== fingerprint)
      throw new GameError('This request key was already used.', 409);
    return prior[0].response;
  }
  const config = await gameConfig(db);
  for (let retry = 0; retry < 5; retry++) {
    const row = await readPlayer(db, userId);
    const result = applyIntent(row.state, intent, {
      now: Date.now(),
      random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
      id: () => crypto.randomUUID(),
      admin,
      config,
    });
    try {
      return await db.rpc<GameResult>('commit_game', {
        p_user: userId,
        p_revision: row.revision,
        p_key: key,
        p_fingerprint: fingerprint,
        p_state: result.state,
        p_ledger: result.ledger,
        p_response: result,
        p_actor: actorId ?? null,
        p_audit: actorId ? intent : null,
      });
    } catch (e) {
      if (!(e instanceof GameError && e.code === 'VERSION_CONFLICT')) throw e;
    }
  }
  throw new GameError('A few things happened at once. Please try again.', 409);
}
export async function createIdentity(
  db: Database,
  identity: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  },
) {
  const avatar = identity.avatar
    ? `https://cdn.discordapp.com/avatars/${identity.id}/${identity.avatar}.png`
    : null;
  return db.rpc<string>('upsert_identity', {
    p_discord_id: identity.id,
    p_username: identity.username,
    p_name: identity.global_name || identity.username,
    p_avatar: avatar,
    p_initial: initialState(Date.now()),
  });
}
export function publicState(state: PlayerState) {
  const safe = structuredClone(state);
  if (safe.challenge)
    safe.challenge.targets = safe.challenge.targets.map((t, i) =>
      i === safe.challenge!.step ? t : -1,
    );
  return safe;
}
