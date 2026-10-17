import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../auth/supabase';
import {
  AuthFooter,
  AuthForm,
  AuthLink,
  AuthPage,
  EmailField,
  FormError,
  PasswordField,
  SubmitButton,
  TextField,
  commonAuthError,
  emailError,
  useAuthForm,
} from '../AuthForm';

const MIN_PASSWORD_LENGTH = 8;

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'please enter your name.';
  const emailMessage = emailError(email);
  if (emailMessage) errors.email = emailMessage;
  if (!password) errors.password = 'please choose a password.';
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `your password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
}

const ALREADY_REGISTERED = 'an account with this email already exists. try logging in instead.';

function friendlyError(error) {
  const common = commonAuthError(error);
  if (common) return common;
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return ALREADY_REGISTERED;
    case 'email_address_invalid':
      return "that email address can't be used. please try a different one.";
    case 'weak_password':
      return 'that password is too easy to guess. try a longer one with a mix of letters, numbers, and symbols.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'new sign-ups are paused right now. please try again later.';
    default:
      return 'something went wrong creating your account. please try again.';
  }
}

export default function SignUp() {
  const [sentTo, setSentTo] = useState(null);
  const successRef = useRef(null);

  const form = useAuthForm({
    id: 'sign-up',
    initialValues: { name: '', email: '', password: '' },
    validate,
    onSubmit: async ({ name, email, password }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        },
      });
      if (error) return friendlyError(error);
      // With email confirmation on, Supabase returns a user with no identities (instead of an error) for an existing email.
      if (data.user && data.user.identities?.length === 0) return ALREADY_REGISTERED;
      form.reset();
      setSentTo(email.trim());
    },
  });

  useEffect(() => {
    if (sentTo) successRef.current?.focus();
  }, [sentTo]);

  return (
    <AuthPage>
      {sentTo ? (
        <section className="auth-page__panel" aria-live="polite">
          <h1 className="auth-page__title" ref={successRef} tabIndex={-1}>check your email</h1>
          <p className="auth-page__text">
            we sent a link to <span className="auth-page__email">{sentTo}</span>. open it to verify your account.
          </p>
          <p className="auth-page__text auth-page__text--muted">
            can't find it? check your spam folder.
          </p>
          <AuthFooter>
            <AuthLink to="/sign-in">log in</AuthLink>
          </AuthFooter>
        </section>
      ) : (
        <AuthForm form={form} title="create an account">
          <TextField form={form} name="name" label="name" type="text" autoComplete="name" autoCapitalize="words" />
          <EmailField form={form} />
          <PasswordField form={form} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} />
          <FormError form={form} />
          <SubmitButton form={form} label="create account" loadingLabel="creating account…" />
          <AuthFooter>
            already have an account? <AuthLink to="/sign-in">log in</AuthLink>
          </AuthFooter>
        </AuthForm>
      )}
    </AuthPage>
  );
}
