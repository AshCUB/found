// Shared layout, fields, and form behavior for the sign-in and create-account pages.
import { useEffect, useRef, useState } from 'react';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '../../auth/supabase';
import { Link } from '../../utils/router';
import './AuthForm.css';

const ACTIVE_CLASS = 'auth-page-active';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email) {
  if (!email.trim()) return 'please enter your email.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'invalid email address.';
}

// Plain-language messages for errors that can happen on any auth request; null if the caller should decide.
export function commonAuthError(error) {
  if (isAuthRetryableFetchError(error)) return "we couldn't reach the server. check your connection and try again.";
  if (error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') {
    return 'too many attempts. please wait a few minutes and try again.';
  }
  return null;
}

// onSubmit(values) runs only when every field is valid; it may return an error message to show above the button.
export function useAuthForm({ id, initialValues, validate, onSubmit }) {
  const fields = Object.keys(initialValues);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef({});

  // A field is checked when the user leaves it with something typed (so "please enter …" only appears on submit),
  // and its error is hidden again as soon as they edit it.
  const setFieldError = (name, message) =>
    setErrors(({ [name]: _, ...rest }) => (message ? { ...rest, [name]: message } : rest));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const allErrors = validate(values);
    setErrors(allErrors);
    setFormError('');
    const firstInvalid = fields.find((f) => allErrors[f]);
    if (firstInvalid) {
      inputRefs.current[firstInvalid]?.focus();
      return;
    }
    if (!supabase) {
      setFormError("this isn't available right now. please try again later.");
      return;
    }
    setSubmitting(true);
    try {
      const message = await onSubmit(values);
      if (message) setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldId = (name) => `${id}-${name}`;

  const fieldProps = (name) => ({
    id: fieldId(name),
    name,
    ref: (el) => {
      inputRefs.current[name] = el;
    },
    value: values[name],
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      if (errors[name]) setFieldError(name, null);
    },
    onBlur: (e) => {
      if (e.target.value) setFieldError(name, validate({ ...values, [name]: e.target.value })[name]);
    },
    className: 'auth-page__input',
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${fieldId(name)}-error` : undefined,
    required: true,
  });

  return {
    values,
    errors,
    formError,
    submitting,
    handleSubmit,
    fieldId,
    fieldProps,
    reset: () => setValues(initialValues),
  };
}

export function AuthPage({ children }) {
  useEffect(() => {
    document.documentElement.classList.add(ACTIVE_CLASS);
    return () => document.documentElement.classList.remove(ACTIVE_CLASS);
  }, []);

  return (
    <main className="auth-page">
      <Link to="/" className="auth-page__back">back</Link>
      {children}
    </main>
  );
}

export function AuthForm({ form, title, children }) {
  return (
    <form className="auth-page__panel" method="post" onSubmit={form.handleSubmit} noValidate aria-busy={form.submitting}>
      <h1 className="auth-page__title">{title}</h1>
      {children}
    </form>
  );
}

function FieldError({ form, name }) {
  return (
    form.errors[name] && (
      <p id={`${form.fieldId(name)}-error`} className="auth-page__error">
        {form.errors[name]}
      </p>
    )
  );
}

export function TextField({ form, name, label, ...inputProps }) {
  return (
    <div className="auth-page__field">
      <label htmlFor={form.fieldId(name)} className="auth-page__label">{label}</label>
      <input {...form.fieldProps(name)} {...inputProps} />
      <FieldError form={form} name={name} />
    </div>
  );
}

export function EmailField({ form }) {
  return (
    <TextField
      form={form}
      name="email"
      label="email"
      type="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="none"
      spellCheck={false}
    />
  );
}

export function PasswordField({ form, name = 'password', label = 'password', ...inputProps }) {
  const [show, setShow] = useState(false);
  const id = form.fieldId(name);
  return (
    <div className="auth-page__field">
      <label htmlFor={id} className="auth-page__label">{label}</label>
      <div className="auth-page__password">
        <input
          {...form.fieldProps(name)}
          type={show ? 'text' : 'password'}
          autoCapitalize="none"
          spellCheck={false}
          {...inputProps}
        />
        <button
          type="button"
          className="auth-page__toggle"
          onClick={() => setShow((s) => !s)}
          aria-controls={id}
          aria-pressed={show}
          aria-label={show ? 'hide password' : 'show password'}
        >
          {show ? 'hide' : 'show'}
        </button>
      </div>
      <FieldError form={form} name={name} />
    </div>
  );
}

export function FormError({ form }) {
  return (
    form.formError && (
      <p className="auth-page__error auth-page__error--form" role="alert">
        {form.formError}
      </p>
    )
  );
}

export function SubmitButton({ form, label, loadingLabel }) {
  return (
    <button type="submit" className="auth-page__submit" disabled={form.submitting}>
      {form.submitting ? loadingLabel : label}
    </button>
  );
}

export function AuthFooter({ children }) {
  return <p className="auth-page__footer">{children}</p>;
}

export function AuthLink(props) {
  return <Link className="auth-page__link" {...props} />;
}
