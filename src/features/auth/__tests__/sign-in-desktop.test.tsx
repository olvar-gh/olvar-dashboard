// Jest resolves the iOS files, so the desktop variant is imported by its path.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from '@/data/fixtures/generate';

import { SignInScreen } from '../SignInScreen.web';

describe('desktop sign-in screen', () => {
  const button = 'Sign in';
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
