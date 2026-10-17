import { useEffect, useState } from 'react';
import { Link } from '../../utils/router';
import './LoggedOutHome.css';

const ACTIVE_CLASS = 'logged-out-home-active';
const WORDMARK_SRC = `${import.meta.env.BASE_URL}images/found-wordmark.svg`;

// The reveal animation plays once per page load (not again when returning from the placeholder pages).
let hasRevealed = false;

// introPhase: 'playing' (intro video is on top), 'leaving' (video crossfading out), 'done' (no video).
export default function LoggedOutHome({ introPhase = 'done' }) {
  const [animate] = useState(() => !hasRevealed);
  const waiting = introPhase === 'playing';

  useEffect(() => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    return () => document.documentElement.classList.remove(ACTIVE_CLASS);
  }, []);

  useEffect(() => {
    if (!waiting) hasRevealed = true;
  }, [waiting]);

  const state = !animate ? '' : waiting ? ' is-waiting' : ' is-revealing';

  return (
    <main className={`logged-out-home${state}`}>
      <div className="logged-out-home__stage">
        <img
          className="logged-out-home__wordmark"
          src={WORDMARK_SRC}
          alt="Found"
          width="1788"
          height="572"
          draggable="false"
          decoding="async"
        />
      </div>
      <nav className="logged-out-home__links">
        <Link to="/create-account" className="logged-out-home__link logged-out-home__link--primary">
          create an account
        </Link>
        <Link to="/sign-in" className="logged-out-home__link logged-out-home__link--secondary">
          sign in
        </Link>
      </nav>
    </main>
  );
}
