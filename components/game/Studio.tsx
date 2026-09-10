'use client';
import { readApiResponse } from '@/lib/client/api';
import { useState } from 'react';
import { Sparkles, Lock, Upload, Check, Palette } from 'lucide-react';
import { progress } from '@/lib/game/progression';
import { SectionTitle, Choice, type ScreenProps } from './shared';
import Pet from './Pet';
export default function Studio(
  p: ScreenProps & { csrf: string; refresh: () => Promise<void> },
) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '',
    kind = path.includes('avatar')
      ? 'avatar'
      : path.includes('fusion')
        ? 'fusion'
        : 'pet';
  const sessions = p.state.generations.filter((g) => g.kind === kind),
    current = sessions.at(-1);
  const [prompt, setPrompt] = useState(
      'A moonlit woodland companion with cream fur and teal accents',
    ),
    [file, setFile] = useState<File | null>(null),
    [generating, setGenerating] = useState(false),
    [combination, setCombination] = useState('Animal + Animal');
  const [previewReady, setPreviewReady] = useState<Record<string, boolean>>({});
  const locked =
    kind === 'fusion' && progress(p.state.xp).level < 10 && !p.admin;
  return (
    <>
      <SectionTitle
        eyebrow={
          kind === 'fusion'
            ? 'WHERE IMAGINATION FINDS A SHAPE'
            : 'MAKE SOMETHING ONLY YOU COULD MAKE'
        }
        title={
          kind === 'avatar'
            ? 'A portrait of your adventure.'
            : kind === 'fusion'
              ? 'The Fusion Lab.'
              : 'Dream up your companion.'
        }
        description="Up to five creations. One favorite to call your own."
      />
      <nav className="studio-kind-nav" aria-label="Creative Studio">
        {(
          [
            ['avatar', 'create-avatar', 'My avatar'],
            ['pet', 'create-pet', 'Companion design'],
            ['fusion', 'fusion-lab', 'Fusion Lab'],
          ] as const
        ).map(([type, route, label]) => (
          <button
            key={type}
            aria-current={kind === type ? 'page' : undefined}
            onClick={() => p.navigate(route)}
          >
            {label}
          </button>
        ))}
      </nav>
      {locked ? (
        <section className="panel empty-state">
          <Lock size={44} />
          <h2>A new kind of magic.</h2>
          <p>Keep growing together. The Fusion Lab opens at level 10.</p>
          <button className="primary" onClick={() => p.navigate('home')}>
            Back to your companion
          </button>
        </section>
      ) : (
        <div className="studio-grid">
          <section className="panel form-stack">
            <div className="studio-intro">
              <Palette />
              <div>
                <h3>
                  {kind === 'avatar'
                    ? 'Your storybook portrait'
                    : 'The imagination workshop'}
                </h3>
                <small>
                  {p.ai ? 'The paints are ready.' : 'The paints are resting.'}
                </small>
              </div>
            </div>
            {!p.ai && (
              <p className="notice">
                Image creation is paused. Your saved designs are still here.
              </p>
            )}
            {!current || current.selected ? (
              <>
                <p>
                  {current?.selected
                    ? 'Your chosen design is saved.'
                    : kind === 'fusion'
                      ? 'One fusion prism opens a session of five attempts.'
                      : 'Open your five-attempt creation session.'}
                </p>
                {kind !== 'avatar' && (
                  <small>
                    Create a companion, try its movements, then make it your
                    pet. Your name, bond and progress stay with you.
                  </small>
                )}
                {(!current || kind === 'fusion') && (
                  <button
                    className="primary"
                    disabled={p.busy || !p.ai}
                    onClick={() =>
                      void p.act({ action: 'generation_open', kind })
                    }
                  >
                    {kind === 'fusion'
                      ? 'Use a fusion prism'
                      : 'Open the studio'}
                  </button>
                )}
              </>
            ) : (
              <>
                {kind === 'fusion' && (
                  <Choice
                    label="Fusion direction"
                    value={combination}
                    options={[
                      'Animal + Animal',
                      'Human + Animal',
                      'Fantasy combination',
                    ]}
                    onChange={setCombination}
                  />
                )}
                <label className="field">
                  {kind === 'avatar'
                    ? 'Portrait PNG (required)'
                    : 'Reference PNG (optional)'}
                  <span className="upload-zone">
                    <Upload size={25} />
                    <span>{file?.name || 'Choose a PNG · up to 4 MB'}</span>
                    <input
                      type="file"
                      accept="image/png"
                      aria-label="Upload reference PNG"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </span>
                </label>
                <label className="field">
                  Your creative direction
                  <textarea
                    rows={4}
                    maxLength={900}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Tell us what makes this companion yours…"
                  />
                </label>
                {kind !== 'avatar' && (
                  <small>
                    Create a companion, try its movements, then make it your
                    pet. Your name, bond and progress stay with you.
                  </small>
                )}
                <small>
                  {current.attempts} / {p.admin ? '∞' : 5} attempts used ·
                  Failed requests count toward the limit.
                </small>
                <button
                  className="primary"
                  disabled={
                    generating ||
                    !p.ai ||
                    (!p.admin && current.attempts >= 5) ||
                    (kind === 'avatar' && !file)
                  }
                  onClick={async () => {
                    setGenerating(true);
                    try {
                      const form = new FormData();
                      form.set('sessionId', current.id);
                      form.set(
                        'prompt',
                        kind === 'fusion'
                          ? `${combination}. ${prompt}`
                          : prompt,
                      );
                      if (file) form.set('image', file);
                      const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: {
                          'x-csrf-token': p.csrf,
                          'idempotency-key': crypto.randomUUID(),
                        },
                        body: form,
                      });
                      const result = await readApiResponse<{ message: string }>(
                        response,
                      );
                      p.notify(result.message);
                    } catch (e) {
                      p.notify(
                        e instanceof Error ? e.message : 'Creation failed.',
                      );
                    } finally {
                      await p.refresh();
                      setGenerating(false);
                    }
                  }}
                >
                  {generating ? 'Painting your story…' : 'Create a design'}{' '}
                  <Sparkles size={17} />
                </button>
                {generating && (
                  <div className="painting-loader">
                    <Sparkles />
                    <p>Sketching, dreaming, adding a little magic.</p>
                    <small>You can return later to see the result.</small>
                  </div>
                )}
              </>
            )}
          </section>
          <section className="candidate-section">
            <h3>Your creations</h3>
            <div className="candidate-grid">
              {sessions.flatMap((g) =>
                g.candidates.map((candidate) => (
                  <div className="panel candidate" key={candidate.id}>
                    {candidate.status === 'ready' ? (
                      candidate.format === 'companion-atlas-v1' ? (
                        <div className="candidate-pet-preview">
                          <Pet
                            pet={null}
                            audio={null}
                            compact
                            design={candidate}
                            onReady={(ready) =>
                              setPreviewReady((previous) =>
                                previous[candidate.id] === ready
                                  ? previous
                                  : { ...previous, [candidate.id]: ready },
                              )
                            }
                          />
                        </div>
                      ) : (
                        <img src={candidate.url} alt="Your generated design" />
                      )
                    ) : (
                      <div className="candidate-empty">
                        <Sparkles />
                        <span>
                          {candidate.status === 'failed'
                            ? 'This attempt could not be completed.'
                            : 'A little magic is in the making…'}
                        </span>
                      </div>
                    )}
                    <small>
                      {new Date(candidate.created).toLocaleDateString()}
                    </small>
                    {candidate.status === 'ready' && (
                      <button
                        className={
                          g.selected === candidate.id ? 'secondary' : 'primary'
                        }
                        disabled={
                          p.busy ||
                          !!g.selected ||
                          (candidate.format === 'companion-atlas-v1' &&
                            !previewReady[candidate.id])
                        }
                        onClick={() =>
                          void p.act({
                            action: 'generation_select',
                            sessionId: g.id,
                            candidateId: candidate.id,
                          })
                        }
                      >
                        {g.selected === candidate.id ? (
                          <>
                            <Check size={15} /> Chosen design
                          </>
                        ) : g.kind === 'avatar' ? (
                          'Choose this portrait'
                        ) : candidate.format === 'companion-atlas-v1' ? (
                          'Make this my pet'
                        ) : (
                          'Save this portrait'
                        )}
                      </button>
                    )}
                  </div>
                )),
              )}
            </div>
            {!sessions.some((g) => g.candidates.length) && (
              <div className="empty-state">
                <Sparkles size={40} />
                <p>Your imagination has a blank canvas.</p>
                <small>Your completed designs will appear here.</small>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
