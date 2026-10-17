import { useEffect } from 'react';
import { Link } from '../../utils/router';
import './LoggedOutHome.css';

const ACTIVE_CLASS = 'logged-out-home-active';
const WORDMARK_SRC = `${import.meta.env.BASE_URL}images/found-wordmark.svg`;

// introPhase: 'playing' (intro video is on top), 'leaving' (video crossfading out), 'done' (no video).
export default function LoggedOutHome({ introPhase = 'done', fadeIn = false }) {
  useEffect(() => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    return () => document.documentElement.classList.remove(ACTIVE_CLASS);
  }, []);

  return (
    <main className={`logged-out-home${fadeIn ? ' is-fade-in' : ''}`}>
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
      <nav className={`logged-out-home__links is-${introPhase}`}>
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
