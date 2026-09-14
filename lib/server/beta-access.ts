import type { GameConfig } from '../game/types';
import { gameConfig } from './game-service';
import { isAdmin, type Session } from './security';
import type { Database } from './database';
export function betaApproved(
  discordId: string,
  ownerId: string | undefined,
  approved: unknown,
) {
  if (!/^\d{17,20}$/.test(discordId)) return false;
  return (
    (!!ownerId && discordId === ownerId) ||
    (Array.isArray(approved) && approved.includes(discordId))
  );
}
export async function hasBetaAccess(db: Database, s: Session) {
  if (isAdmin(s, db.env)) return true;
  const config = await gameConfig(db);
  return betaApproved(
    s.users.discord_id,
    db.env.ADMIN_DISCORD_ID,
    config.betaDiscordIds,
  );
}
export function publicConfig(config: GameConfig) {
  const { betaDiscordIds: _private, ...safe } = config;
  return safe;
}
