'use client';
import { useEffect, useState } from 'react';
import { Coins, Mail, ArrowUpRight } from 'lucide-react';
import { SectionTitle, Choice, type ScreenProps } from './shared';
export function BuyCoins({ config, request, payments, notify }: ScreenProps) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <SectionTitle
        eyebrow="A LITTLE EXTRA FOR YOUR ADVENTURE"
        title="Fill your coin pouch."
        description="Pet Coins are also earned through play. Every level is reachable for free."
      />
      {!payments && (
        <p className="notice">
          Coin purchases are awaiting activation by the game owner.
        </p>
      )}
      <div className="packages">
        {config.packages.map((p) => (
          <section className="panel" key={p.id}>
            <Coins size={48} />
            <h3>{p.name}</h3>
            <h2>
              {p.coins.toLocaleString()}
              <small> PC</small>
            </h2>
            <button
              className="primary"
              disabled={busy || !payments || !p.enabled}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await request('payments/checkout', {
                    packageId: p.id,
                  });
                  if (typeof r.url === 'string') window.location.assign(r.url);
                } catch (e) {
                  notify(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {p.enabled
                ? new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: p.currency,
                  }).format(p.amount / 100)
                : 'Coming soon'}{' '}
              <ArrowUpRight size={16} />
            </button>
          </section>
        ))}
      </div>
      <p className="muted">
        Pet Coins have no cash redemption value, cannot be withdrawn, and cannot
        be transferred for real money. Wish tickets are earned through gameplay.
      </p>
    </>
  );
}
export function Mora({ config, request, notify }: ScreenProps) {
  const [amount, setAmount] = useState('1'),
    [reference, setReference] = useState(''),
    [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [busy, setBusy] = useState(false);
  const refresh = () =>
    request('mora')
      .then((r) => setRows(r.rows as Record<string, unknown>[]))
      .catch(() => undefined);
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <>
      <SectionTitle
        eyebrow="YOUR CLUB, YOUR COMMUNITY"
        title="Mora exchange."
        description={`One Mora becomes ${config.moraRate} Pet Coins, after the club administrator verifies the transfer.`}
      />
      <div className="community-grid">
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await request('mora', {
                mora: Number(amount),
                reference,
              });
              notify(String(r.message));
              await refresh();
            } catch (e) {
              notify(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Mora amount
            <input
              required
              type="number"
              min="1"
              max="100000"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            Transfer reference (optional)
            <input
              maxLength={200}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <span className="exchange-amount">
            {(Number(amount) * config.moraRate).toLocaleString()}{' '}
            <small>PC after approval</small>
          </span>
          <p className="muted">
            Submitting a request does not add coins. Your Discord identity is
            attached automatically.
          </p>
          <button className="primary" disabled={busy}>
            Submit for approval
          </button>
        </form>
        <section className="panel">
          <h3>Your exchange requests</h3>
          {!rows.length && <p className="muted">No exchanges yet.</p>}
          {rows.map((r) => (
            <div className="history-row" key={String(r.id)}>
              <div>
                <strong>
                  {String(r.mora)} Mora → {String(r.coins)} PC
                </strong>
                <small>
                  {String(r.status)} · {String(r.reference || 'No reference')}
                </small>
              </div>
              {r.status === 'Pending' && (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await request('mora/cancel', { id: r.id });
                      await refresh();
                    } catch (e) {
                      notify(String(e));
                    }
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
export function Support({ request, notify }: ScreenProps) {
  const [category, setCategory] = useState('Gameplay'),
    [message, setMessage] = useState(''),
    [reference, setReference] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <SectionTitle
        eyebrow="A HELPING HAND"
        title="Contact the club."
        description="A question, an idea, or a little trouble on the trail. We’re listening."
      />
      <form
        className="panel form-stack support-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await request('support', {
              category,
              message,
              requestId: reference,
            });
            notify(String(r.message));
            setMessage('');
          } catch (e) {
            notify(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Mail size={35} />
        <Choice
          label="What is it about?"
          value={category}
          options={[
            'Gameplay',
            'Payments',
            'Mora exchange',
            'Account',
            'Feedback',
          ]}
          onChange={setCategory}
        />
        <label className="field">
          Your message
          <textarea
            required
            minLength={10}
            maxLength={1500}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="field">
          Request ID (optional)
          <input
            maxLength={100}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy}>
          Send to the club administrator
        </button>
      </form>
    </>
  );
}
