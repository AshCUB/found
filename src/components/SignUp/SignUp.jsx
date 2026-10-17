import { useEffect, useRef, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '../../auth/supabase';
import { Link } from '../../utils/router';
import './SignUp.css';

const ACTIVE_CLASS = 'sign-up-active';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ['name', 'email', 'password'];

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'please enter your name.';
  if (!email.trim()) errors.email = 'please enter your email.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "that doesn't look like an email address. check for typos?";
  if (!password) errors.password = 'please choose a password.';
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = `your password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
}

const ALREADY_REGISTERED = 'an account with this email already exists. try logging in instead.';

function friendlyError(error) {
  if (isAuthRetryableFetchError(error)) return "we couldn't reach the server. check your connection and try again.";
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return ALREADY_REGISTERED;
    case 'email_address_invalid':
      return "that email address can't be used. please try a different one.";
    case 'weak_password':
      return 'that password is too easy to guess. try a longer one with a mix of letters, numbers, and symbols.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'too many attempts. please wait a few minutes and try again.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'new sign-ups are paused right now. please try again later.';
    default:
      return 'something went wrong creating your account. please try again.';
  }
}

export default function SignUp() {
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const inputRefs = { name: useRef(null), email: useRef(null), password: useRef(null) };
  const successRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    return () => document.documentElement.classList.remove(ACTIVE_CLASS);
  }, []);

  useEffect(() => {
    if (sentTo) successRef.current?.focus();
  }, [sentTo]);

  const handleChange = (e) => {
    const next = { ...values, [e.target.name]: e.target.value };
    setValues(next);
    if (touched[e.target.name]) setErrors(validate(next));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (!values[name]) return;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const found = validate(values);
    setErrors(found);
    setTouched({ name: true, email: true, password: true });
    setFormError('');
    const firstInvalid = FIELDS.find((f) => found[f]);
    if (firstInvalid) {
      inputRefs[firstInvalid].current?.focus();
      return;
    }
    if (!supabase) {
      setFormError("sign-up isn't available right now. please try again later.");
      return;
    }

    setSubmitting(true);
    const email = values.email.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        data: { name: values.name.trim() },
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    setSubmitting(false);

    if (error) {
      setFormError(friendlyError(error));
      return;
    }
    // With email confirmation on, Supabase returns a user with no identities (instead of an error) for an existing email.
    if (data.user && data.user.identities?.length === 0) {
      setFormError(ALREADY_REGISTERED);
      return;
    }
    setValues({ name: '', email: '', password: '' });
    setSentTo(email);
  };

  const fieldProps = (name) => ({
    id: `sign-up-${name}`,
    name,
    ref: inputRefs[name],
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    className: 'sign-up__input',
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `sign-up-${name}-error` : undefined,
    required: true,
  });

  const fieldError = (name) =>
    errors[name] && (
      <p id={`sign-up-${name}-error`} className="sign-up__error">
        {errors[name]}
      </p>
    );

  return (
    <main className="sign-up">
      <Link to="/" className="sign-up__back">back</Link>

      {sentTo ? (
        <section className="sign-up__panel" aria-live="polite">
          <h1 className="sign-up__title" ref={successRef} tabIndex={-1}>check your email</h1>
          <p className="sign-up__text">
            we sent a link to <span className="sign-up__email">{sentTo}</span>. open it to verify your account.
          </p>
          <p className="sign-up__text sign-up__text--muted">
            can't find it? check your spam folder.
          </p>
          <p className="sign-up__footer">
            <Link to="/sign-in" className="sign-up__link">log in</Link>
          </p>
        </section>
      ) : (
        <form className="sign-up__panel" method="post" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
          <h1 className="sign-up__title">create an account</h1>

          <div className="sign-up__field">
            <label htmlFor="sign-up-name" className="sign-up__label">name</label>
            <input {...fieldProps('name')} type="text" autoComplete="name" autoCapitalize="words" />
            {fieldError('name')}
          </div>

          <div className="sign-up__field">
            <label htmlFor="sign-up-email" className="sign-up__label">email</label>
            <input
              {...fieldProps('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
            {fieldError('email')}
          </div>

          <div className="sign-up__field">
            <label htmlFor="sign-up-password" className="sign-up__label">password</label>
            <div className="sign-up__password">
              <input
                {...fieldProps('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                minLength={MIN_PASSWORD_LENGTH}
              />
              <button
                type="button"
                className="sign-up__toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-controls="sign-up-password"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'hide password' : 'show password'}
              >
                {showPassword ? 'hide' : 'show'}
              </button>
            </div>
            {fieldError('password')}
          </div>

          {formError && (
            <p className="sign-up__error sign-up__error--form" role="alert">
              {formError}
            </p>
          )}

          <button type="submit" className="sign-up__submit" disabled={submitting}>
            {submitting ? 'creating account…' : 'create account'}
          </button>

          <p className="sign-up__footer">
            already have an account? <Link to="/sign-in" className="sign-up__link">log in</Link>
          </p>
        </form>
      )}
    </main>
  );
}
