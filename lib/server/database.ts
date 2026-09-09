import { GameError } from '../game/engine';
import { databaseHeaders, required, type Env } from './env';
export class Database {
  constructor(public env: Env) {}
  async request<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const base = required(this.env, 'SUPABASE_URL');
    if (!base.startsWith('https://'))
      throw new Error('Supabase URL must use HTTPS');
    const response = await fetch(`${base}/rest/v1/${path}`, {
      ...options,
      headers: {
        ...databaseHeaders(this.env),
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (failure.message === 'VERSION_CONFLICT')
        throw new GameError(
          'Your companion is syncing. Please try again.',
          409,
          'VERSION_CONFLICT',
        );
      if (failure.message === 'IDEMPOTENCY_MISMATCH')
        throw new GameError(
          'This request key was already used for another action.',
          409,
        );
      throw new GameError(
        'The sanctuary could not save that change. Please try again.',
        503,
      );
    }
    if (response.status === 204) return undefined as T;
    const raw = await response.text();
    return (raw ? JSON.parse(raw) : undefined) as T;
  }
  rpc<T = unknown>(name: string, args: Record<string, unknown>) {
    return this.request<T>(`rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }
  insert<T = unknown>(
    table: string,
    value: Record<string, unknown>,
    resolution = 'return=representation',
  ) {
    return this.request<T>(table, {
      method: 'POST',
      headers: { Prefer: resolution },
      body: JSON.stringify(value),
    });
  }
}
