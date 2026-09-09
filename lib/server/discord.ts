import { Database } from './database';
import { ensure } from '../game/engine';
export async function deliverOutbox(db: Database, id?: string) {
  const rows = await db.request<
    {
      id: string;
      payload: Record<string, string>;
      kind: string;
      attempts: number;
    }[]
  >(
    `outbox?delivered_at=is.null&attempts=lt.10&order=created_at.asc&limit=10${id ? `&id=eq.${id}` : ''}`,
  );
  const url = db.env.DISCORD_ADMIN_WEBHOOK_URL;
  if (!url) return;
  ensure(
    /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(
      String(url),
    ),
    'Discord notification endpoint is not configured correctly.',
    503,
  );
  for (const job of rows) {
    await db.request(`outbox?id=eq.${job.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ attempts: job.attempts + 1 }),
    });
    const response = await fetch(String(url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'FurEver',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: job.kind,
            color: 12575681,
            description: Object.entries(job.payload)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join('\n')
              .slice(0, 3500),
            footer: { text: `Request ${job.id}` },
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok)
      await db.request(`outbox?id=eq.${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ delivered_at: new Date().toISOString() }),
      });
  }
}
