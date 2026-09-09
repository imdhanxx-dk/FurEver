export type AudioPrefs = {
  music: boolean;
  sfx: boolean;
  musicVolume: number;
  sfxVolume: number;
  theme: string;
  graphics: string;
};
export const AUDIO_DEFAULTS: AudioPrefs = {
  music: false,
  sfx: true,
  musicVolume: 30,
  sfxVolume: 55,
  theme: 'Cozy',
  graphics: 'Auto',
};
// Original procedural score. All synthesis is local, starts only after a gesture.
export class GameAudio {
  context: AudioContext | null = null;
  musicGain: GainNode | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  step = 0;
  activity = 'home';
  prefs = AUDIO_DEFAULTS;
  start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.context.destination);
    }
    void this.context.resume();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 650);
  }
  update(p: AudioPrefs, activity: string) {
    this.prefs = p;
    this.activity = activity;
    if (this.context && this.musicGain)
      this.musicGain.gain.setTargetAtTime(
        p.music ? (p.musicVolume / 100) * 0.1 : 0,
        this.context.currentTime,
        0.8,
      );
  }
  note(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    music = false,
  ) {
    const c = this.context;
    if (!c) return;
    const oscillator = c.createOscillator(),
      gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(music && this.musicGain ? this.musicGain : c.destination);
    oscillator.start();
    oscillator.stop(c.currentTime + duration + 0.1);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  tick() {
    if (!this.prefs.music) return;
    const scales: Record<string, number[]> = {
      Cozy: [48, 55, 60, 64, 67, 64, 60, 55],
      Dreamy: [45, 52, 57, 60, 64, 60, 57, 52],
      Magical: [50, 57, 62, 65, 69, 74, 69, 65],
      'Lo-fi': [43, 50, 55, 58, 62, 58, 55, 50],
      Nature: [48, 55, 62, 67, 62, 55, 60, 55],
    };
    const melody = scales[this.prefs.theme] || scales.Cozy;
    const battle = this.activity === 'battle';
    const note = melody[this.step++ % melody.length] + (battle ? 12 : 0);
    this.note(
      440 * 2 ** ((note - 69) / 12),
      battle ? 0.45 : 2.4,
      0.35,
      battle ? 'triangle' : 'sine',
      true,
    );
    if (this.step % 4 === 0)
      this.note(440 * 2 ** ((note - 81) / 12), 3, 0.16, 'sine', true);
  }
  react(kind = 'happy', species = 'cat') {
    if (!this.prefs.sfx) return;
    this.start();
    const c = this.context!,
      osc = c.createOscillator(),
      gain = c.createGain(),
      v = (this.prefs.sfxVolume / 100) * 0.09;
    const defensive = kind === 'defensive';
    osc.type = species === 'dog' ? 'triangle' : 'sine';
    const base =
      (species === 'dog' ? 220 : 520) * (0.93 + Math.random() * 0.14);
    osc.frequency.setValueAtTime(base, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      base * (defensive ? 0.55 : 1.4),
      c.currentTime + 0.12,
    );
    osc.frequency.exponentialRampToValueAtTime(base * 0.7, c.currentTime + 0.4);
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(v, c.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.5);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(
        this.prefs.music ? (this.prefs.musicVolume / 100) * 0.03 : 0,
        c.currentTime,
        0.08,
      );
      this.musicGain.gain.setTargetAtTime(
        this.prefs.music ? (this.prefs.musicVolume / 100) * 0.1 : 0,
        c.currentTime + 0.6,
        0.4,
      );
    }
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.context?.close();
    this.context = null;
  }
}
