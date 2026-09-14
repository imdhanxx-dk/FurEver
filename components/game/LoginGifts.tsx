import { Gift, Check } from 'lucide-react';
import type { PlayerState } from '@/lib/game/types';
const gifts = [
  ['◈', '1,000 PC + accessories'],
  ['🍲', '3 Harvest bowls'],
  ['🧪', '2 Stardust elixirs'],
  ['🎟️', '1 Wish ticket'],
  ['💚', '3 Wildflower tonics'],
  ['🎟️', '2 Wish tickets'],
  ['🌌', 'Legendary Aurora aura'],
];
export default function LoginGifts({ state }: { state: PlayerState }) {
  const days = state.loginGifts?.days || 0;
  return (
    <section className="login-gifts panel">
      <div className="panel-heading">
        <h2>
          <Gift size={22} /> Seven days of friendship
        </h2>
        <span>{days}/7 collected</span>
      </div>
      <p>
        Visit on seven different days. Gifts arrive automatically in your
        backpack. Missing a day keeps your progress.
      </p>
      <ol>
        {gifts.map(([icon, label], i) => (
          <li
            key={label}
            className={`${i < days ? 'collected' : ''} ${i === 6 ? 'legendary' : ''}`}
          >
            <small>
              Day {i + 1} {i < days && <Check size={13} />}
            </small>
            <span aria-hidden="true">{icon}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <small>
        Welcome accessories: Meadow ribbon and Moonstone collar. Existing
        players receive a one-time 500 PC top-up from the original welcome gift.
      </small>
    </section>
  );
}
