import { useEffect, useState } from 'react';
import { fetchOnboardingCompleted, markOnboardingCompleted } from '../auth/profile';

// Onboarding status for the signed-in user, loaded from their Supabase profile.
// completed is undefined while loading (or after an error), so callers can show a loading state instead of guessing.
export function useOnboarding(userId) {
  const [state, setState] = useState({ userId: undefined, completed: undefined, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setState({ userId, completed: undefined, error: null });
    fetchOnboardingCompleted(userId).then(
      (completed) => active && setState({ userId, completed, error: null }),
      (error) => active && setState({ userId, completed: undefined, error }),
    );
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  // Ignore results that belong to a previous user (e.g. right after switching accounts).
  const current = state.userId === userId ? state : { completed: undefined, error: null };

  const complete = async () => {
    await markOnboardingCompleted(userId);
    setState({ userId, completed: true, error: null });
  };

  return {
    completed: current.completed,
    error: current.error,
    complete,
    retry: () => setAttempt((n) => n + 1),
  };
}
