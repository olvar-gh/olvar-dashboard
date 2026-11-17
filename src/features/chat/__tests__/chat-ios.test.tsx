import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert, Keyboard, StyleSheet, type KeyboardEvent } from 'react-native';

import { renderApp } from '@/components/shell/testing/render-app';
import { ChatError } from '@/data';

async function openChat(prepare?: (app: Awaited<ReturnType<typeof renderApp>>) => Promise<unknown>) {
  const app = await renderApp('/chat');
  if (prepare) await act(() => prepare(app));
  await screen.findByTestId('chat-screen', {}, { timeout: 5000 });
  return app;
}

const cleanups: (() => void)[] = [];
const afterThis = (fn: () => void) => cleanups.push(fn);
afterEach(() => cleanups.splice(0).forEach((fn) => fn()));

describe('iPhone chat screen', () => {
  it('shows the stored conversation and the live reading chips', async () => {
    const app = await openChat();
    const last = app.source.world.chat.at(-1)!;
    expect((await screen.findAllByText(last.content, {}, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(screen.getByTestId('chat-reading-chips')).toBeTruthy();
    expect(within(screen.getByTestId('chat-reading-chips')).getByLabelText(/^Soil moisture /)).toBeTruthy();
  });

  it('marks a stored fallback reply', async () => {
    await openChat();
    expect((await screen.findAllByTestId('chat-error-row')).length).toBeGreaterThan(0);
  });

  it('sends the message as typed and shows the canned reply', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const send = jest.spyOn(app.source, 'sendChat');
    await fireEvent.changeText(screen.getByTestId('chat-input'), '  오늘 물 줘야 해?  ');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(send).toHaveBeenCalledWith(app.source.world.plant.id, '오늘 물 줘야 해?');
    const chat = within(screen.getByTestId('chat-screen'));
    expect(await chat.findByText('오늘 물 줘야 해?')).toBeTruthy();
    expect(await chat.findByText(/Thanks for asking!/, {}, { timeout: 3000 })).toBeTruthy();
    expect(chat.getAllByText('오늘 물 줘야 해?')).toHaveLength(1);
  });

  it('counts down after a 429 and gives the draft back', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    afterThis(() => alert.mockRestore());
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    jest.spyOn(app.source, 'sendChat').mockRejectedValue(new ChatError('rate_limited', 'rate_limited', 150));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Are you thirsty?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect((await screen.findByTestId('chat-rate-limit')).props.children).toMatch(/ask again in 2:(29|30|31)/);
    expect(screen.getByTestId('chat-input').props.value).toBe('Are you thirsty?');
    expect(screen.getByTestId('chat-send').props.accessibilityState).toMatchObject({ disabled: true });
    expect(alert).toHaveBeenCalledWith('Sparks needs a breather', expect.stringMatching(/10 messages every 5 minutes/));
  });

  it('keeps a failed message with a way to retry', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const send = jest.spyOn(app.source, 'sendChat').mockRejectedValueOnce(new ChatError('failed', 'network'));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Hello?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByText(/Not sent\. Couldn’t reach Sparks/)).toBeTruthy();
    expect(screen.getByText('Hello?')).toBeTruthy();
    send.mockRestore();
  });

  it('suggests questions when there is no conversation yet', async () => {
    await openChat((app) => {
      app.source.world.chat.length = 0;
      return app.queryClient.invalidateQueries({ queryKey: ['chat'] });
    });
    expect(await screen.findByTestId('chat-empty')).toBeTruthy();
    expect(screen.getByText('Say hello to Sparks')).toBeTruthy();
    expect(screen.getByText('How am I doing this week?')).toBeTruthy();
  });

  it('offers Retry when the history cannot load', async () => {
    await openChat((app) => {
      jest.spyOn(app.source, 'getChatPage').mockRejectedValue(new Error('offline'));
      return app.queryClient.resetQueries({ queryKey: ['chat'] });
    });
    await waitFor(() => expect(screen.getByTestId('chat-load-error')).toBeTruthy());
  });

  it('keeps the conversation above the keyboard', async () => {
    const shows: ((e: KeyboardEvent) => void)[] = [];
    const listen = Keyboard.addListener.bind(Keyboard);
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((event, fn, ctx) => {
      if (event === 'keyboardWillShow') shows.push(fn as (e: KeyboardEvent) => void);
      return listen(event, fn, ctx);
    });
    afterThis(() => spy.mockRestore());
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const padding = () => StyleSheet.flatten(screen.getByTestId('chat-scroll').props.contentContainerStyle).paddingBottom;
    const before = padding();
    await act(async () => {
      shows.forEach((fn) => fn({ duration: 0, endCoordinates: { height: 336, screenX: 0, screenY: 538, width: 402 } } as KeyboardEvent));
    });
    expect(padding()).toBe(before + 336);
  });
});
