'use client';
import Pet from './Pet';
import { PawPrint, Compass, Sparkles, Heart } from 'lucide-react';

export default function Entry() {
  return (
    <main className="entry entry-asset-edition">
      <div className="entry-scene" />
      <header className="entry-header">
        <a className="brand asset-brand" href="/" aria-label="FurEver home">
          <img
            src="/assets/asset-furever/regions/logo-branding.webp"
            alt="FurEver · A kinder world for every cat"
          />
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
        <a className="primary large entry-discord-cta" href="/api/auth/login">
          <PawPrint size={20} /> Begin Adventure with Discord <span>↗</span>
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

        <div className="entry-asset-ribbon" aria-label="FurEver game identity">
          <div className="entry-asset-chip">
            <img
              src="/assets/asset-furever/regions/app-icons.webp"
              alt=""
              aria-hidden="true"
            />
            <span>
              <small>YOUR COMPANION</small>
              Always one tap away
            </span>
          </div>
          <div className="entry-asset-chip coin-chip">
            <span className="entry-coin-art" aria-hidden="true" />
            <span>
              <small>PET COIN</small>
              Earn it through play
            </span>
          </div>
        </div>
      </section>

      <div className="entry-pet">
        <Pet pet={null} audio={null} compact />
      </div>
      <footer className="entry-footer">
        EVERY GREAT ADVENTURE BEGINS WITH A LITTLE TRUST.
      </footer>
    </main>
  );
}
