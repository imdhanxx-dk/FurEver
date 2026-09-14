'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { BUILTIN_COMPANIONS } from '@/lib/game/companions';
import { Meter, SectionTitle, type ScreenProps } from './shared';
import Pet from './Pet';
import type { PetCue } from '@/lib/client/companion-motion';
export default function Companions({
  state,
  act,
  busy,
  navigate,
}: ScreenProps) {
  const pet = state.pet!;
  const [name, setName] = useState(pet.name),
    [cue, setCue] = useState<PetCue>();
  const archived = state.generations
    .filter((g) => g.kind !== 'avatar' && g.selected)
    .flatMap((g) =>
      g.candidates.filter(
        (c) =>
          c.id === g.selected &&
          c.status === 'ready' &&
          c.format === 'companion-atlas-v1',
      ),
    );
  const custom = pet.appearance.startsWith('/api/assets/');
  return (
    <>
      <SectionTitle
        eyebrow="YOUR COMPANIONS"
        title={pet.name}
        description="A name of their own. A story you share."
      >
        <button className="secondary" onClick={() => navigate('home')}>
          Back home <ArrowUpRight size={16} />
        </button>
      </SectionTitle>
      <div className="pet-profile-grid">
        <section className="pet-profile-portrait panel">
          <div className="archived-portrait">
            <Pet pet={pet} audio={null} compact cue={cue} />
          </div>
          <div className="row pet-pose-buttons">
            {(['pet', 'paw', 'play', 'rest'] as const).map((m) => (
              <button
                key={m}
                className="secondary"
                onClick={() => setCue({ kind: m, id: Date.now() })}
              >
                {
                  {
                    pet: 'Stroke',
                    paw: 'High five',
                    play: 'Play',
                    rest: 'Sleep',
                  }[m]
                }
              </button>
            ))}
          </div>
          {custom && (
            <small>
              Your saved companion keeps this artwork at home and in battle.
            </small>
          )}
        </section>
        <section className="panel pet-details">
          <h3>Your companion’s name</h3>
          <form
            className="pet-name-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await act({ action: 'rename_pet', name });
            }}
          >
            <label className="field">
              Name
              <input
                key={pet.appearance}
                maxLength={24}
                required
                defaultValue={pet.name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy || !name.trim()}>
              Save name
            </button>
          </form>
          <p>
            {pet.personality} · {pet.species === 'dog' ? 'Dog' : 'Cat'}
          </p>
          <Meter label="Friendship" value={pet.bond} color="#c09285" />
          <button className="text-button" onClick={() => navigate('sanctuary')}>
            Care for {pet.name} <ArrowUpRight size={16} />
          </button>
          <h3>Choose a companion</h3>
          <div className="pet-picker">
            {BUILTIN_COMPANIONS.map((d) => (
              <button
                key={d.id}
                disabled={busy}
                className="pet-choice"
                aria-pressed={
                  pet.appearance === d.url ||
                  (d.id === 'sunbeam' &&
                    pet.appearance === '/assets/companion.webp')
                }
                onClick={async () => {
                  const r = await act({
                    action: 'companion_equip',
                    designId: d.id,
                  });
                  if (r) setName(r.state.pet!.name);
                }}
              >
                <span>{d.icon}</span>
                <span>
                  <strong>{state.petNames?.[d.url] || d.name}</strong>
                  <small>{d.description}</small>
                </span>
              </button>
            ))}
          </div>
          {archived.length > 0 && (
            <details className="archived-looks">
              <summary>Saved creations · {archived.length}</summary>
              {archived.map((d, i) => (
                <button
                  className="secondary"
                  key={d.id}
                  disabled={busy}
                  onClick={async () => {
                    const r = await act({
                      action: 'companion_equip',
                      designId: d.id,
                    });
                    if (r) setName(r.state.pet!.name);
                  }}
                >
                  {state.petNames?.[d.url!] || `Saved companion ${i + 1}`}
                </button>
              ))}
            </details>
          )}
        </section>
      </div>
    </>
  );
}
