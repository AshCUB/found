import { useEffect, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { Link } from '../../utils/router';
import { supabase } from '../../auth/supabase';
import { signInAsGuest } from '../../auth/session';
import './LoggedOutHome.css';

const ACTIVE_CLASS = 'logged-out-home-active';
const WORDMARK_SRC = `${import.meta.env.BASE_URL}images/found-wordmark.svg`;

// The reveal animation plays once per page load (not again when returning from the placeholder pages).
let hasRevealed = false;

// Makes the next visit play the reveal again (e.g. after signing out).
export function replayReveal() {
  hasRevealed = false;
}

function guestError(error) {
  if (isAuthRetryableFetchError(error)) return "we couldn't reach the server. check your connection and try again.";
  if (error.code === 'over_request_rate_limit') return 'too many attempts. please wait a few minutes and try again.';
  return "guest mode isn't available right now. please try again later.";
}

// introPhase: 'playing' (intro video is on top), 'leaving' (video crossfading out), 'done' (no video).
export default function LoggedOutHome({ introPhase = 'done' }) {
  const [animate] = useState(() => !hasRevealed);
  const [guestPending, setGuestPending] = useState(false);
  const [error, setError] = useState('');
  const waiting = introPhase === 'playing';

  useEffect(() => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    return () => document.documentElement.classList.remove(ACTIVE_CLASS);
  }, []);

  useEffect(() => {
    if (!waiting) hasRevealed = true;
  }, [waiting]);

  // On success the auth listener in App picks up the new session and routes to onboarding.
  const continueAsGuest = async () => {
    if (guestPending) return;
    setError('');
    if (!supabase) {
      setError("guest mode isn't available right now. please try again later.");
      return;
    }
    setGuestPending(true);
    try {
      await signInAsGuest();
    } catch (err) {
      console.error('Error starting guest session:', err);
      setError(guestError(err));
      setGuestPending(false);
    }
  };

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
        {error && (
          <p className="logged-out-home__error" role="alert">
            {error}
          </p>
        )}
        <Link to="/create-account" className="logged-out-home__link logged-out-home__link--primary">
          create an account
        </Link>
        <Link to="/sign-in" className="logged-out-home__link logged-out-home__link--secondary">
          sign in
        </Link>
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={guestPending}
          aria-busy={guestPending}
          className="logged-out-home__link logged-out-home__link--guest"
        >
          {guestPending ? 'starting…' : 'continue as guest'}
        </button>
      </nav>
    </main>
  );
}
