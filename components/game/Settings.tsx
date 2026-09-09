'use client';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import type { AudioPrefs } from '@/lib/client/audio';
import { Choice, SectionTitle } from './shared';
export default function Settings({
  prefs,
  setPrefs,
  logout,
}: {
  prefs: AudioPrefs;
  setPrefs: (p: AudioPrefs) => void;
  logout: () => void;
}) {
  return (
    <>
      <SectionTitle
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your kind of cozy."
        description="A few little adjustments to make FurEver feel just right."
      />
      <section className="panel settings-panel">
        <h3>Sound & atmosphere</h3>
        {(['music', 'sfx'] as const).map((key) => (
          <label className="setting-row" key={key}>
            <span>
              {key === 'music'
                ? 'Background music'
                : 'Companion sounds & effects'}
            </span>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPrefs({ ...prefs, [key]: v })}
            />
          </label>
        ))}
        {(['musicVolume', 'sfxVolume'] as const).map((key) => (
          <div className="setting-row" key={key}>
            <label>
              {key === 'musicVolume' ? 'Music volume' : 'Effects volume'} ·{' '}
              {prefs[key]}%
            </label>
            <Slider
              aria-label={key}
              value={[prefs[key]]}
              onValueChange={(v) =>
                setPrefs({ ...prefs, [key]: Array.isArray(v) ? v[0] : v })
              }
              max={100}
              min={0}
            />
          </div>
        ))}
        <Choice
          label="Sanctuary music"
          value={prefs.theme}
          options={['Cozy', 'Dreamy', 'Magical', 'Lo-fi', 'Nature']}
          onChange={(theme) => setPrefs({ ...prefs, theme })}
        />
        <button
          className="secondary"
          onClick={() => setPrefs({ ...prefs, music: false, sfx: false })}
        >
          Mute everything
        </button>
        <h3>Display & comfort</h3>
        <Choice
          label="Visual detail"
          value={prefs.graphics}
          options={['Auto', 'High', 'Low']}
          onChange={(graphics) => setPrefs({ ...prefs, graphics })}
        />
        <p className="muted">
          Reduced-motion preferences are respected automatically. Swipe across
          your companion to pet them, or use the touch-zone buttons with a
          keyboard.
        </p>
        <h3>Your account</h3>
        <p className="muted">
          Your companion is linked to your Discord identity. Signing out keeps
          all of your progress safe.
        </p>
        <button className="secondary" onClick={logout}>
          Sign out of Discord
        </button>
      </section>
    </>
  );
}
