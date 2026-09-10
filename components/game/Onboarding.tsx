'use client';
import { useState } from 'react';
import Pet from './Pet';
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
        <div className="onboarding-pet">
          <Pet pet={null} audio={null} compact />
        </div>
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
            All starters begin with our sanctuary companion. Create your own
            animated character in the Creative Studio after you meet.
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
