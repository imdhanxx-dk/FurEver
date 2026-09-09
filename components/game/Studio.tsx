'use client';
import { useState } from 'react';
import { Sparkles, Lock, Upload, Check } from 'lucide-react';
import { progress } from '@/lib/game/progression';
import { SectionTitle, Choice, type ScreenProps } from './shared';
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
            <Sparkles size={36} />
            <h3>
              {kind === 'avatar'
                ? 'Become part of the story.'
                : 'A spark of imagination.'}
            </h3>
            {!p.ai && (
              <p className="notice">
                The creative studio is awaiting activation by the game owner.
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
                      const result = (await response.json()) as {
                        error: string;
                        message: string;
                      };
                      if (!response.ok) throw new Error(result.error);
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
                      <img src={candidate.url} alt="Your generated design" />
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
                        disabled={p.busy || !!g.selected}
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
                        ) : (
                          'Choose this design'
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
