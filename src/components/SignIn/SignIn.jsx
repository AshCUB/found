import { supabase } from '../../auth/supabase';
import { navigate } from '../../utils/router';
import {
  AuthFooter,
  AuthForm,
  AuthLink,
  AuthPage,
  EmailField,
  FormError,
  PasswordField,
  SubmitButton,
  commonAuthError,
  emailError,
  useAuthForm,
} from '../AuthForm';

function validate({ email, password }) {
  const errors = {};
  const emailMessage = emailError(email);
  if (emailMessage) errors.email = emailMessage;
  if (!password) errors.password = 'please enter your password.';
  return errors;
}

function friendlyError(error) {
  const common = commonAuthError(error);
  if (common) return common;
  switch (error.code) {
    case 'invalid_credentials':
      return 'incorrect email or password.';
    case 'email_not_confirmed':
      return "your email isn't verified yet. check your inbox for the verification link we sent when you signed up.";
    default:
      return 'something went wrong signing you in. please try again.';
  }
}

export default function SignIn() {
  const form = useAuthForm({
    id: 'sign-in',
    initialValues: { email: '', password: '' },
    validate,
    onSubmit: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return friendlyError(error);
      navigate('/', { replace: true });
    },
  });

  return (
    <AuthPage>
      <AuthForm form={form} title="sign in">
        <EmailField form={form} />
        <PasswordField form={form} autoComplete="current-password" />
        <FormError form={form} />
        <SubmitButton form={form} label="sign in" loadingLabel="signing in…" />
        <AuthFooter>
          don't have an account? <AuthLink to="/create-account">create one</AuthLink>
        </AuthFooter>
      </AuthForm>
    </AuthPage>
  );
}
