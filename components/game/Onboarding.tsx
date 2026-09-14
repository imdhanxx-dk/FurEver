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
    [designId, setDesignId] = useState('sunbeam'),
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
          <Pet
            audio={null}
            compact
            pet={{
              name,
              species: species as 'cat' | 'dog',
              personality: 'Curious',
              hunger: 85,
              happiness: 85,
              cleanliness: 90,
              energy: 100,
              bond: 10,
              appearance: `/assets/${designId === 'starlight' ? 'starlight' : 'companion'}-rig.png`,
              appearanceFormat: 'companion-atlas-v1',
              equipped: [],
            }}
          />
        </div>
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void act({
              action: 'create_pet',
              name,
              species,
              personality,
              designId,
            });
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
            options={['cat', 'dog']}
            onChange={setSpecies}
          />
          <Choice
            label="Companion"
            value={designId}
            options={['sunbeam', 'starlight']}
            onChange={setDesignId}
          />
          <Choice
            label="Personality"
            value={personality}
            options={['Curious', 'Playful', 'Brave', 'Sleepy', 'Shy', 'Calm']}
            onChange={setPersonality}
          />
          <p className="muted">
            Your name, friendship and progress are saved to your Discord
            account.
          </p>
          <button className="primary" disabled={busy || !name.trim()}>
            Meet {name || 'your companion'} ♡
          </button>
          <small>
            Welcome gift: 1,000 PC, a Meadow ribbon and Moonstone collar, plus
            food, elixirs and three wishes. Visit on seven days to earn a
            Legendary Aurora aura.
          </small>
        </form>
      </div>
    </div>
  );
}
