'use client';
import { useState } from 'react';
import { Choice, type ScreenProps, SectionTitle } from './shared';
export default function Onboarding({
  act,
  busy,
}: Pick<ScreenProps, 'act' | 'busy'>) {
  const [name, setName] = useState('Mochi'),
    [species, setSpecies] = useState('cat'),
    [personality, setPersonality] = useState('Curious');
  return (
    <div className="onboarding">
      <SectionTitle
        eyebrow="CHAPTER ONE"
        title="Someone wonderful is waiting."
        description="Choose a companion. The friendship is yours to grow."
      />
      <div className="onboarding-grid">
        <img
          className="onboarding-pet"
          src="/assets/companion.webp"
          alt="Your new companion"
        />
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void act({ action: 'create_pet', name, species, personality });
          }}
        >
          <label className="field">
            Their name
            <input
              maxLength={24}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What will you call them?"
            />
          </label>
          <Choice
            label="Starter species"
            value={species}
            options={['cat', 'dog', 'fusion']}
            onChange={setSpecies}
          />
          <Choice
            label="Personality"
            value={personality}
            options={['Curious', 'Playful', 'Brave', 'Sleepy', 'Shy', 'Calm']}
            onChange={setPersonality}
          />
          <p className="muted">
            Start with our sanctuary companion design, then make their
            appearance your own in the creative studio.
          </p>
          <button className="primary" disabled={busy || !name.trim()}>
            Meet {name || 'your companion'} ♡
          </button>
          <small>
            Your starter backpack includes food, elixirs, growth nectar, and
            three wishes.
          </small>
        </form>
      </div>
    </div>
  );
}
