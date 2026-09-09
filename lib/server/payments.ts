import { Database } from './database';
import { required, type Env } from './env';
import { ensure, GameError, textValue } from '../game/engine';
import { gameConfig } from './game-service';
import { constantEqual, limitedBytes } from './security';
export async function verifyStripe(
  raw: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const parts = signature.split(',').map((x) => x.split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  ensure(
    timestamp &&
      /^\d+$/.test(timestamp) &&
      Math.abs(now / 1000 - Number(timestamp)) <= 300,
    'Webhook timestamp is invalid.',
    400,
  );
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${timestamp}.${raw}`),
      ),
    ),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
  ensure(
    parts.some(([k, v]) => k === 'v1' && constantEqual(v, digest)),
    'Webhook signature is invalid.',
    400,
  );
}
export async function checkout(
  db: Database,
  userId: string,
  packageId: unknown,
  key: string,
) {
  const env = db.env;
  ensure(env.STRIPE_SECRET_KEY, 'Coin purchases are not available yet.', 503);
  const config = await gameConfig(db);
  const pack = config.packages.find((p) => p.id === packageId && p.enabled);
  ensure(pack, 'This pouch is not available.');
  const previous = await db.request<
    {
      id: string;
      coins: number;
      amount: number;
      currency: string;
      package_id: string;
    }[]
  >(
    `payments?user_id=eq.${userId}&request_key=eq.${encodeURIComponent(key)}&select=*`,
  );
  let payment = previous[0];
  if (payment)
    ensure(payment.package_id === packageId, 'Request key already used.', 409);
  else {
    const rows = await db.insert<typeof previous>('payments', {
      id: crypto.randomUUID(),
      user_id: userId,
      package_id: pack.id,
      coins: pack.coins,
      amount: pack.amount,
      currency: pack.currency,
      request_key: key,
    });
    payment = rows[0];
  }
  const data = new URLSearchParams({
    mode: 'payment',
    success_url: `${required(env, 'APP_ORIGIN')}/buy-coins?status=processing`,
    cancel_url: `${required(env, 'APP_ORIGIN')}/buy-coins`,
    'line_items[0][price_data][currency]': payment.currency,
    'line_items[0][price_data][unit_amount]': String(payment.amount),
    'line_items[0][price_data][product_data][name]': `${config.name} · ${pack.name}`,
    'line_items[0][quantity]': '1',
    'metadata[payment_id]': payment.id,
    client_reference_id: userId,
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `furever:${payment.id}`,
    },
    body: data,
    signal: AbortSignal.timeout(20000),
  });
  ensure(
    response.ok,
    'The coin shop could not open checkout. Try again shortly.',
    503,
  );
  const session = (await response.json()) as { id: string; url: string };
  ensure(
    session.url.startsWith('https://checkout.stripe.com/'),
    'Checkout returned an invalid address.',
    503,
  );
  await db.request(`payments?id=eq.${payment.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ external_id: session.id }),
  });
  return { url: session.url };
}
export async function webhook(request: Request, env: Env) {
  const raw = new TextDecoder().decode(await limitedBytes(request, 262144));
  ensure(raw.length < 262144, 'Payload too large.', 413);
  await verifyStripe(
    raw,
    request.headers.get('stripe-signature') ?? '',
    required(env, 'STRIPE_WEBHOOK_SECRET'),
  );
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new GameError('Invalid webhook.');
  }
  if (
    ![
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
    ].includes(event.type)
  )
    return { received: true };
  const session = event.data?.object;
  ensure(session && session.mode === 'payment', 'Invalid checkout.');
  if (session.payment_status !== 'paid') return { received: true };
  const id = textValue(session.metadata?.payment_id, 36);
  ensure(/^[a-f0-9-]{36}$/.test(id), 'Invalid payment reference.');
  const db = new Database(env);
  const credited = await db.rpc<boolean>('settle_credit', {
    p_kind: 'PAYMENT',
    p_id: id,
    p_event: textValue(event.id, 255),
    p_external: textValue(session.id, 255),
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_actor: null,
  });
  return { received: true, credited };
}
