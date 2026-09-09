import { Database } from './database';
import { readPlayer, transact } from './game-service';
import { ensure, textValue } from '../game/engine';
import { databaseHeaders, type Env } from './env';
// Only PNG uploads. Walk every chunk before accepting bytes; no SVG, URLs, or arbitrary formats.
export function validatePng(bytes: Uint8Array) {
  ensure(
    bytes.length >= 45 && bytes.length <= 4 * 1024 * 1024,
    'Upload a PNG no larger than 4 MB.',
  );
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  ensure(
    sig.every((b, i) => bytes[i] === b),
    'The upload must be a valid PNG.',
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  ensure(
    String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR' &&
      view.getUint32(8) === 13,
    'Invalid PNG header.',
  );
  const width = view.getUint32(16),
    height = view.getUint32(20);
  ensure(
    width >= 64 && height >= 64 && width <= 2048 && height <= 2048,
    'Choose a PNG between 64 and 2048 pixels per side.',
  );
  let offset = 8,
    ended = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    ensure(
      length <= bytes.length - offset - 12,
      'PNG contains an invalid chunk.',
    );
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    ensure(type !== 'acTL', 'Animated PNG uploads are not supported.');
    offset += length + 12;
    if (type === 'IEND') {
      ensure(length === 0 && offset === bytes.length, 'Invalid PNG ending.');
      ended = true;
      break;
    }
  }
  ensure(ended, 'PNG is incomplete.');
  return { width, height };
}
export async function generate(
  db: Database,
  userId: string,
  form: FormData,
  key: string,
  admin: boolean,
) {
  const env = db.env;
  ensure(
    env.AI_PROVIDER_API_KEY,
    'The creative studio is not available yet.',
    503,
  );
  ensure(
    env.FILES || env.ASSET_BUCKET,
    'Image storage is not available yet.',
    503,
  );
  const sessionId = textValue(form.get('sessionId'), 100),
    prompt = textValue(
      form.get('prompt') || 'A friendly fantasy companion',
      1000,
    );
  const row = await readPlayer(db, userId),
    g = row.state.generations.find((x) => x.id === sessionId);
  ensure(g && !g.selected, 'Choose an open creation session.');
  const upload = form.get('image');
  let input: Blob | undefined;
  if (upload instanceof File && upload.size) {
    ensure(upload.type === 'image/png', 'Please use a PNG image.');
    const bytes = new Uint8Array(await upload.arrayBuffer());
    validatePng(bytes);
    input = new Blob([bytes], { type: 'image/png' });
  }
  ensure(g.kind !== 'avatar' || input, 'Choose a PNG portrait to transform.');
  const candidateId = crypto.randomUUID();
  const reserved = await transact(
    db,
    userId,
    { action: 'generation_reserve', sessionId, candidateId, prompt },
    `generation:${key}`,
    admin,
  );
  const candidate = reserved.state.generations
    .find((x) => x.id === sessionId)
    ?.candidates.find((x) => x.id === candidateId);
  ensure(
    candidate,
    'This generation request has already been submitted. Refresh to see its result.',
    409,
  );
  try {
    const style = `Create a polished cozy fantasy game ${g.kind === 'avatar' ? 'player portrait' : 'full-body companion, front three-quarter pose, all limbs visible, transparent background, centered with generous padding'}. Nonsexual, fully clothed if humanoid, family-friendly. No text or watermarks. ${prompt}`;
    const data = new FormData();
    data.set('model', String(env.AI_IMAGE_MODEL || 'gpt-image-1'));
    data.set('prompt', style);
    data.set('size', '1024x1024');
    data.set('quality', 'medium');
    data.set('background', g.kind === 'avatar' ? 'opaque' : 'transparent');
    if (input) data.set('image', input, 'portrait.png');
    const response = await fetch(
      `https://api.openai.com/v1/images/${input ? 'edits' : 'generations'}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AI_PROVIDER_API_KEY}`,
          ...(!input ? { 'Content-Type': 'application/json' } : {}),
        },
        body: input ? data : JSON.stringify(Object.fromEntries(data)),
        signal: AbortSignal.timeout(180000),
      },
    );
    ensure(
      response.ok,
      'Your design could not be painted. Please try another prompt.',
      503,
    );
    const generated = (await response.json()) as {
      data: { b64_json: string }[];
    };
    const encoded = generated.data?.[0]?.b64_json;
    ensure(
      encoded && encoded.length < 14_000_000,
      'The studio returned an invalid image.',
      503,
    );
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const objectKey = `${userId}/${candidateId}.png`;
    if (env.FILES)
      await env.FILES.put(objectKey, bytes, {
        httpMetadata: { contentType: 'image/png' },
      });
    else {
      const result = await fetch(
        `${env.SUPABASE_URL}/storage/v1/object/${env.ASSET_BUCKET}/${objectKey}`,
        {
          method: 'POST',
          headers: {
            ...databaseHeaders(env),
            'Content-Type': 'image/png',
          },
          body: bytes,
        },
      );
      ensure(result.ok, 'Could not save the image.', 503);
    }
    await db.insert('assets', {
      id: candidateId,
      user_id: userId,
      object_key: objectKey,
      mime: 'image/png',
      bytes: bytes.length,
    });
    return await transact(
      db,
      userId,
      {
        action: 'generation_finish',
        sessionId,
        candidateId,
        success: true,
        url: `/api/assets/${candidateId}`,
      },
      `generation-done:${candidateId}`,
      admin,
    );
  } catch (error) {
    await transact(
      db,
      userId,
      { action: 'generation_finish', sessionId, candidateId, success: false },
      `generation-failed:${candidateId}`,
      admin,
    );
    throw error;
  }
}
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
