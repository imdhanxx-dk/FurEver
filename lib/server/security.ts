import { GameError, ensure } from '../game/engine';
import type { Env } from './env';
import { required } from './env';
import { Database } from './database';
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
export function constantEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
// Vercel and Cloudflare expose the caller's address under different names, and
// reading only one host's header silently degrades to no address at all on the
// other. `x-forwarded-for` is a client-to-edge chain, so only the left-most
// entry is the original caller. Null means no per-caller key is derivable, and
// it is the caller's job to decide what limit still applies.
export function clientAddress(request: Request) {
  const direct =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-real-ip');
  if (direct?.trim()) return direct.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0];
  return forwarded?.trim() || null;
}
export const cookieValue = (request: Request, name: string) =>
  request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
export function cookie(name: string, value: string, maxAge: number, env: Env) {
  const secure = required(env, 'APP_ORIGIN').startsWith('https://');
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
export function assertOrigin(request: Request, env: Env) {
  ensure(
    request.headers.get('origin') === required(env, 'APP_ORIGIN'),
    'Please reload FurEver before trying again.',
    403,
  );
}
export type Session = {
  token_hash: string;
  user_id: string;
  csrf: string;
  expires_at: string;
  created_at: string;
  users: {
    discord_id: string;
    display_name: string;
    username: string;
    discord_avatar: string | null;
    suspended: boolean;
  };
};
export async function session(
  request: Request,
  db: Database,
): Promise<Session> {
  const value = cookieValue(request, 'furever_session');
  if (!value || !/^[a-f0-9]{64}$/.test(value))
    throw new GameError('Sign in with Discord to meet your companion.', 401);
  const rows = await db.request<Session[]>(
    `sessions?token_hash=eq.${await hash(value)}&select=*,users(discord_id,display_name,username,discord_avatar,suspended)&limit=1`,
  );
  const s = rows[0];
  ensure(
    s && Date.parse(s.expires_at) > Date.now(),
    'Your session has ended. Sign in again.',
    401,
  );
  ensure(
    !s.users.suspended,
    'This account is paused. Contact the club administrator.',
    403,
  );
  return s;
}
export function assertCsrf(request: Request, s: Session, env: Env) {
  assertOrigin(request, env);
  ensure(
    constantEqual(request.headers.get('x-csrf-token') ?? '', s.csrf),
    'Please reload FurEver before trying again.',
    403,
  );
}
export const isAdmin = (s: Session, env: Env) =>
  !!env.ADMIN_DISCORD_ID && s.users.discord_id === env.ADMIN_DISCORD_ID;
export function requireAdmin(s: Session, env: Env) {
  ensure(isAdmin(s, env), 'That portal is not yours to enter.', 403);
}
export async function rateLimit(
  db: Database,
  key: string,
  limit: number,
  seconds = 60,
) {
  const allowed = await db.rpc<boolean>('take_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (!allowed)
    throw new GameError(
      'A little too quickly. Try again in a moment.',
      429,
      'RATE_LIMIT',
    );
}
export async function limitedBytes(request: Request, max: number) {
  ensure(
    (Number(request.headers.get('content-length')) || 0) <= max,
    'This request is too large.',
    413,
  );
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new GameError('This request is too large.', 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function body(request: Request, max = 12_000) {
  const raw = new TextDecoder().decode(await limitedBytes(request, max));
  try {
    const b = JSON.parse(raw);
    ensure(b && typeof b === 'object' && !Array.isArray(b), 'Invalid request.');
    return b as Record<string, unknown>;
  } catch (e) {
    if (e instanceof GameError) throw e;
    throw new GameError('Please send valid JSON.');
  }
}
export function secureResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    },
  });
}
// Players still receive a sanitised message; the operator needs the real cause.
// Only server-side failures are reported, so ordinary validation and rate-limit
// rejections do not bury genuine faults. Never include the request body, cookies
// or configuration here.
export function reportFailure(e: unknown, context: string) {
  const expected = e instanceof GameError;
  const status = expected ? e.status : 500;
  // Client errors are ordinary traffic; reporting them would bury real faults.
  if (status < 500) return;
  // A GameError is a deliberate, already-diagnosed condition, so its message is
  // the whole story. Only an unplanned throw needs a stack to be actionable.
  if (expected) {
    console.error(`[furever] ${context} failed (${status}) ${e.message}`);
    return;
  }
  console.error(
    `[furever] ${context} failed unexpectedly`,
    e instanceof Error ? (e.stack ?? `${e.name}: ${e.message}`) : String(e),
  );
}
export function errorResponse(e: unknown, context = 'request') {
  reportFailure(e, context);
  if (e instanceof GameError)
    return secureResponse({ error: e.message, code: e.code }, e.status);
  return secureResponse(
    { error: 'The sanctuary is unavailable. Please try again shortly.' },
    503,
  );
}
