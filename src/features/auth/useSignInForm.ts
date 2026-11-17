import { useState } from 'react';

import { DataError, useSignIn } from '@/data';

export type SignInErrors = { email?: string; password?: string; form?: string };

export function validateSignIn(email: string, password: string): SignInErrors {
  const errors: SignInErrors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = 'Enter your email.';
  else if (!/^[^\s@]+@[^\s@]+$/.test(trimmed)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

/** User-facing text for a failed sign-in; never echoes server internals. */
export function signInErrorMessage(error: unknown): string {
  if (error instanceof DataError && error.code === 'invalid_credentials') return 'Email or password is incorrect.';
  if (error instanceof DataError && error.code === 'over_request_rate_limit') return 'Too many attempts. Wait a minute and try again.';
  if (error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message))) {
    return 'Couldn’t reach the server. Check your connection and try again.';
  }
  return 'Sign in failed. Try again.';
}

/**
 * Email and password sign-in for the single owner (signups are disabled on the server). On success
 * the session query updates and the (auth) layout redirects into the app.
 */
export function useSignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignInErrors>({});
  const signIn = useSignIn();

  const submit = () => {
    if (signIn.isPending) return;
    const found = validateSignIn(email, password);
    setErrors(found);
    if (found.email || found.password) return;
    signIn.mutate(
      { email: email.trim(), password },
      { onError: (error) => setErrors({ form: signInErrorMessage(error) }) },
    );
  };

  return {
    email,
    password,
    setEmail: (v: string) => {
      setEmail(v);
      if (errors.email || errors.form) setErrors((e) => ({ ...e, email: undefined, form: undefined }));
    },
    setPassword: (v: string) => {
      setPassword(v);
      if (errors.password || errors.form) setErrors((e) => ({ ...e, password: undefined, form: undefined }));
    },
    errors,
    pending: signIn.isPending,
    submit,
  };
}
