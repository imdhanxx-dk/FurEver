'use client';
import { useState } from 'react';
import { PawPrint, Compass, Sparkles, Heart } from 'lucide-react';
export default function Entry() {
  const [greeting, setGreeting] = useState('A new friendship is waiting.');
  return (
    <main className="entry">
      <div className="entry-scene" />
      <header className="entry-header">
        <a className="brand" href="/">
          <PawPrint /> FurEver<span>COMPANIONS & ADVENTURES</span>
        </a>
        <span className="pill">✦ A world to call home</span>
      </header>
      <section className="entry-content">
        <div className="eyebrow">YOUR STORY STARTS WITH A PAW</div>
        <h1>
          A little companion.
          <br />
          <em>A grand adventure.</em>
        </h1>
        <p>
          Meet your forever friend. Grow together, follow your curiosity, and
          find a little magic in every day.
        </p>
        <a className="primary large" href="/api/auth/login">
          <PawPrint size={20} /> Begin with Discord <span>↗</span>
        </a>
        <small>Your companion and progress follow your Discord identity.</small>
        <div className="entry-features">
          <span>
            <Heart /> Care & connect
          </span>
          <span>
            <Compass /> Explore ten worlds
          </span>
          <span>
            <Sparkles /> Create your companion
          </span>
        </div>
      </section>
      <button
        className="entry-pet"
        onClick={() => setGreeting('Mrrp! I think we’re going to be friends.')}
        aria-label="Greet your future companion"
      >
        <img
          src="/assets/companion.webp"
          alt="A fluffy cream companion with a teal crystal pendant"
        />
        <span className="speech">{greeting}</span>
      </button>
      <footer className="entry-footer">
        EVERY GREAT ADVENTURE BEGINS WITH A LITTLE TRUST.
      </footer>
    </main>
  );
}
