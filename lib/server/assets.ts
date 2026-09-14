import { Database } from './database';
import { ensure } from '../game/engine';
import { databaseHeaders, type Env } from './env';
export async function getAsset(db: Database, userId: string, id: string) {
  ensure(/^[a-f0-9-]{36}$/.test(id), 'Invalid image.', 404);
  const rows = await db.request<{ object_key: string }[]>(
    `assets?id=eq.${id}&user_id=eq.${userId}&select=object_key`,
  );
  ensure(rows[0], 'This image is not yours.', 404);
  const env: Env = db.env;
  if (env.FILES) {
    const file = await env.FILES.get(rows[0].object_key);
    ensure(file, 'Image not found.', 404);
    return new Response(file.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  const result = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/authenticated/${env.ASSET_BUCKET}/${rows[0].object_key}`,
    { headers: databaseHeaders(env) },
  );
  ensure(result.ok, 'Image unavailable.', 404);
  return new Response(result.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
