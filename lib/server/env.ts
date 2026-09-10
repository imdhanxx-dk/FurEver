export type Env = Record<string, string | undefined> & { FILES?: R2Bucket };
export async function environment(): Promise<Env> {
  try {
    const { runtimeEnv } = await import('./runtime-bindings');
    return { ...process.env, ...(await runtimeEnv()) } as unknown as Env;
  } catch {
    return process.env as Env;
  }
}
export function required(env: Env, key: string) {
  const value = env[key];
  if (typeof value !== 'string' || !value)
    throw new Error(`Missing configuration: ${key}`);
  return value;
}
export const configured = (e: Env) =>
  !!(
    e.SUPABASE_URL &&
    (e.SUPABASE_SECRET_KEY || e.SUPABASE_SERVICE_ROLE_KEY) &&
    e.DISCORD_CLIENT_ID &&
    e.DISCORD_CLIENT_SECRET &&
    e.APP_ORIGIN
  );

export function databaseHeaders(env: Env): Record<string, string> {
  const key =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    required(env, 'SUPABASE_SECRET_KEY');
  // Modern secret keys are not JWTs. The gateway accepts them via apikey only.
  return key.startsWith('sb_secret_')
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
}

export const studioEnabled = (env: Env) =>
  !!env.AI_PROVIDER_API_KEY && env.AI_STUDIO_ENABLED === 'true';
