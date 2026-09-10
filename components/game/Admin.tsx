'use client';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@/components/ui/table';
import { Choice, SectionTitle, type ScreenProps } from './shared';
export default function Admin({ request, notify }: ScreenProps) {
  const [section, setSection] = useState('players'),
    [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [query, setQuery] = useState(''),
    [config, setConfig] = useState(''),
    [revision, setRevision] = useState(0),
    [target, setTarget] = useState(''),
    [currency, setCurrency] = useState('PC'),
    [amount, setAmount] = useState('100'),
    [item, setItem] = useState('food');
  const load = async () => {
    try {
      const r = await request(
        `admin/${section}${section === 'players' ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      const list = r.rows as Record<string, unknown>[];
      setRows(list);
      if (section === 'configuration') {
        setConfig(JSON.stringify(list[0]?.value ?? r.defaults, null, 2));
        setRevision(Number(list[0]?.revision ?? 0));
      }
    } catch (e) {
      notify(String(e));
    }
  };
  useEffect(() => {
    void load();
  }, [section]);
  const mutate = async (data: unknown) => {
    try {
      const r = await request('admin/action', data);
      notify(String(r.message || 'Saved and audited.'));
      await load();
    } catch (e) {
      notify(String(e));
    }
  };
  const columns = Object.keys(rows[0] || {})
    .filter(
      (k) => !['payload', 'state', 'value', 'token_hash', 'csrf'].includes(k),
    )
    .slice(0, 7);
  return (
    <>
      <SectionTitle
        eyebrow="CLUB ADMINISTRATION"
        title="Keep the sanctuary thriving."
        description="Every privileged change is verified and recorded."
      />
      <Tabs value={section} onValueChange={(v) => setSection(String(v))}>
        <TabsList className="category-tabs">
          {[
            'players',
            'economy',
            'mora',
            'security',
            'audit',
            'configuration',
            'outbox',
          ].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {section === 'configuration' ? (
        <section className="panel form-stack">
          <h3>Events, Mora exchange, shop & gacha</h3>
          <p className="muted">
            Changes are validated before saving. Players use Mora exchange and
            earned Pet Coins; real-money checkout is disabled.
          </p>
          <textarea
            className="config-editor"
            rows={24}
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            aria-label="Game configuration JSON"
          />
          <button
            className="primary"
            onClick={() => {
              try {
                void mutate({
                  action: 'configure',
                  revision,
                  config: JSON.parse(config),
                });
              } catch {
                notify('Please enter valid JSON.');
              }
            }}
          >
            Save configuration
          </button>
        </section>
      ) : (
        <>
          <div className="row admin-toolbar">
            {section === 'players' && (
              <>
                <input
                  placeholder="Search Discord username"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search players"
                />
                <button className="secondary" onClick={() => void load()}>
                  Search
                </button>
              </>
            )}
            <button className="secondary" onClick={() => void load()}>
              Refresh
            </button>
            {section === 'outbox' && (
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await request('admin/retry-notifications', {});
                    await load();
                  } catch (e) {
                    notify(String(e));
                  }
                }}
              >
                Retry queued notifications
              </button>
            )}
          </div>
          <div className="panel admin-table">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c}>{c.replaceAll('_', ' ')}</TableHead>
                  ))}
                  {['players', 'mora'].includes(section) && (
                    <TableHead>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={String(r.id ?? i)}>
                    {columns.map((c) => (
                      <TableCell key={c}>
                        {typeof r[c] === 'object'
                          ? JSON.stringify(r[c])
                          : String(r[c] ?? '—')}
                      </TableCell>
                    ))}
                    {section === 'players' && (
                      <TableCell>
                        <button
                          className="text-button"
                          onClick={() => setTarget(String(r.id))}
                        >
                          Adjust
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            void mutate({
                              action: 'suspend',
                              userId: r.id,
                              suspended: !r.suspended,
                            })
                          }
                        >
                          {r.suspended ? 'Restore' : 'Suspend'}
                        </button>
                      </TableCell>
                    )}
                    {section === 'mora' && (
                      <TableCell>
                        {r.status === 'Pending' && (
                          <div className="row">
                            <button
                              className="secondary"
                              onClick={() =>
                                void mutate({
                                  action: 'mora_approve',
                                  id: r.id,
                                })
                              }
                            >
                              Approve verified transfer
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                void mutate({ action: 'mora_reject', id: r.id })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!rows.length && <p className="muted">No records to show.</p>}
          </div>
          {section === 'players' && target && (
            <form
              className="panel form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void mutate({
                  action: 'grant',
                  userId: target,
                  currency,
                  amount: Number(amount),
                  itemId: item,
                });
              }}
            >
              <h3>Adjust player {target}</h3>
              <Choice
                label="Adjustment"
                value={currency}
                options={['PC', 'XP', 'Item']}
                onChange={setCurrency}
              />
              {currency === 'Item' && (
                <label className="field">
                  Item ID
                  <input
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                  />
                </label>
              )}
              <label className="field">
                Amount (negative removes)
                <input
                  type="number"
                  required
                  min="-1000000"
                  max="1000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <button className="primary">Apply audited adjustment</button>
            </form>
          )}
        </>
      )}
    </>
  );
}
