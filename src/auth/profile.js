// Reads and writes the signed-in user's row in the Supabase `profiles` table (see supabase/migrations).
// Row-level security limits every request to the user's own row.
import { supabase } from './supabase';
import { DEV_USER_ID } from './session';

export async function fetchOnboardingCompleted(userId) {
  if (userId === DEV_USER_ID) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data?.onboarding_completed;
}

// Upsert so it still works if the profile row is missing (e.g. an account created before the table existed).
export async function markOnboardingCompleted(userId) {
  if (userId === DEV_USER_ID) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, onboarding_completed: true, onboarding_completed_at: new Date().toISOString() });
  if (error) throw error;
}
