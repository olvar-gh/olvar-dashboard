import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from '@/data/fixtures/generate';

import { DataError } from '@/data';

import { SignInScreen } from '../SignInScreen';
import { signInErrorMessage, validateSignIn } from '../useSignInForm';

describe('validateSignIn', () => {
  it.each([
    ['', '', { email: 'Enter your email.', password: 'Enter your password.' }],
    ['owner', 'x', { email: 'Enter a valid email address.' }],
    [' owner@olvar.app ', 'x', {}],
  ])('%p / %p', (email, password, errors) => {
    expect(validateSignIn(email, password)).toEqual(errors);
  });
});

describe('signInErrorMessage', () => {
  it.each([
    [new DataError('Invalid login credentials', 'invalid_credentials'), 'Email or password is incorrect.'],
    [
      new DataError('Request rate limit reached', 'over_request_rate_limit'),
      'Too many attempts. Wait a minute and try again.',
    ],
    [new TypeError('Failed to fetch'), 'Couldn’t reach the server. Check your connection and try again.'],
    [new DataError('Database error querying schema', 'unexpected_failure'), 'Sign in failed. Try again.'],
  ])('%p', (error, message) => {
    expect(signInErrorMessage(error)).toBe(message);
  });
});

describe('iPhone sign-in screen', () => {
  const button = 'Sign In';
  it('validates before calling the server', async () => {
    const { source } = await renderWithFixtures(<SignInScreen />, { signedIn: false });
    const signIn = jest.spyOn(source.auth, 'signIn');
    await fireEvent.press(await screen.findByRole('button', { name: button }));
    expect(await screen.findByText('Enter your email.')).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows the server rejection and clears it on edit', async () => {
    await renderWithFixtures(<SignInScreen />, { signedIn: false });
    await fireEvent.changeText(await screen.findByTestId('sign-in-email'), FIXTURE_EMAIL);
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'nope');
    await fireEvent.press(screen.getByRole('button', { name: button }));
    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), FIXTURE_PASSWORD);
    expect(screen.queryByText('Email or password is incorrect.')).toBeNull();
  });

  it('signs in with a trimmed email on submit from the password field', async () => {
    const { source } = await renderWithFixtures(<SignInScreen />, { signedIn: false });
    const signIn = jest.spyOn(source.auth, 'signIn');
    await fireEvent.changeText(await screen.findByTestId('sign-in-email'), ` ${FIXTURE_EMAIL} `);
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), FIXTURE_PASSWORD);
    await fireEvent(screen.getByTestId('sign-in-password'), 'submitEditing');
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(FIXTURE_EMAIL, FIXTURE_PASSWORD));
    expect(await source.auth.getSession()).toMatchObject({ email: FIXTURE_EMAIL });
  });
});
