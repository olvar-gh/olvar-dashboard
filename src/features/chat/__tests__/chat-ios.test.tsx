import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert, Keyboard, ScrollView, StyleSheet, type KeyboardEvent } from 'react-native';

import { renderApp } from '@/components/shell/testing/render-app';
import { ChatError } from '@/data';
import { addChatMessage } from '@/data/queries/chat';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ type: 'WIFI', isConnected: true, isInternetReachable: true })),
}));
const network = jest.requireMock<{ getNetworkStateAsync: jest.Mock }>('expo-network');

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

  it('detects being offline before sending and keeps the draft', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const send = jest.spyOn(app.source, 'sendChat');
    network.getNetworkStateAsync.mockResolvedValueOnce({ type: 'NONE', isConnected: false, isInternetReachable: false });
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Are you there?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByTestId('chat-offline')).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByTestId('chat-input').props.value).toBe('Are you there?');
    expect(screen.queryByTestId('chat-typing')).toBeNull();
  });

  /** Stores `content` as a question with no answer, `ageMs` ago, as if the reply never came. */
  function storeQuestion(app: Awaited<ReturnType<typeof renderApp>>, content: string, ageMs: number) {
    const last = app.source.world.chat.at(-1)!;
    app.source.world.chat.push({
      ...last,
      id: last.id + 1000,
      role: 'user',
      reply_to: null,
      error: null,
      content,
      created_at: new Date(Date.now() - ageMs).toISOString(),
    });
    return app.queryClient.resetQueries({ queryKey: ['chat'] });
  }

  it('offers Retry for a stored question that never got an answer, without a second bubble', async () => {
    const app = await openChat((app) => storeQuestion(app, 'Did you get this?', 120_000));
    const row = await screen.findByTestId('chat-unanswered', {}, { timeout: 5000 });
    // The fixture numbers rows from its own counter; store this exchange after the planted question.
    const send = jest.spyOn(app.source, 'sendChat').mockImplementationOnce(async (plantId, message) => {
      const last = app.source.world.chat.at(-1)!;
      const asked = { ...last, id: last.id + 1, plant_id: plantId, role: 'user', content: message, created_at: new Date().toISOString() };
      const reply = { ...asked, id: asked.id + 1, role: 'plant', content: 'Yes, got it.', reply_to: asked.id };
      app.source.world.chat.push(asked, reply);
      return reply;
    });
    await fireEvent.press(within(row).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(send).toHaveBeenCalledWith(app.source.world.plant.id, 'Did you get this?'));
    expect(screen.getAllByText('Did you get this?')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByTestId('chat-typing')).toBeNull(), { timeout: 3000 });
    expect(await screen.findByText('Yes, got it.')).toBeTruthy();
    expect(screen.queryByTestId('chat-unanswered')).toBeNull();
    expect(screen.getAllByText('Did you get this?')).toHaveLength(1);
  });

  it('shows a failed Retry on the original bubble', async () => {
    const app = await openChat((app) => storeQuestion(app, 'Did you get this?', 120_000));
    const row = await screen.findByTestId('chat-unanswered', {}, { timeout: 5000 });
    jest.spyOn(app.source, 'sendChat').mockRejectedValueOnce(new ChatError('failed', 'network'));
    await fireEvent.press(within(row).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByTestId('chat-unanswered')).toHaveTextContent(/Couldn’t reach Sparks/));
    expect(screen.queryByTestId('chat-send-error')).toBeNull();
    expect(screen.getAllByText('Did you get this?')).toHaveLength(1);
  });

  it('does not resend a question answered while the connection was checked', async () => {
    const app = await openChat((app) => storeQuestion(app, 'Did you get this?', 120_000));
    const row = await screen.findByTestId('chat-unanswered', {}, { timeout: 5000 });
    const question = app.source.world.chat.at(-1)!;
    let online!: () => void;
    network.getNetworkStateAsync.mockImplementationOnce(
      () => new Promise((r) => (online = () => r({ type: 'WIFI', isConnected: true, isInternetReachable: true }))),
    );
    const send = jest.spyOn(app.source, 'sendChat');
    const pressed = fireEvent.press(within(row).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(online).toBeDefined());
    await act(async () => {
      addChatMessage(app.queryClient, { ...question, id: question.id + 1, role: 'plant', content: 'Here now.', reply_to: question.id });
    });
    expect((await screen.findAllByText('Here now.')).length).toBeGreaterThan(0);
    await act(async () => online());
    await pressed;
    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByTestId('chat-unanswered')).toBeNull();
  });

  it('says plainly that a Retry was not sent while offline', async () => {
    await openChat((app) => storeQuestion(app, 'Did you get this?', 120_000));
    const row = await screen.findByTestId('chat-unanswered', {}, { timeout: 5000 });
    network.getNetworkStateAsync.mockResolvedValueOnce({ type: 'NONE', isConnected: false, isInternetReachable: false });
    await fireEvent.press(within(row).getByRole('button', { name: 'Retry' }));
    const notice = await screen.findByTestId('chat-offline');
    expect(notice).toHaveTextContent(/Try again when you’re back online/);
    expect(notice).not.toHaveTextContent(/in the box/);
  });

  it('waits before offering Retry for a question that may still be answered', async () => {
    await openChat((app) => storeQuestion(app, 'Just asked', 5_000));
    expect(await screen.findByText('Just asked', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByTestId('chat-unanswered')).toBeNull();
  });

  it('keeps Retry for a stored question when a different send failed', async () => {
    const app = await openChat((app) => storeQuestion(app, 'Did you get this?', 120_000));
    await screen.findByTestId('chat-unanswered', {}, { timeout: 5000 });
    jest.spyOn(app.source, 'sendChat').mockRejectedValueOnce(new ChatError('failed', 'network'));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Something else');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByTestId('chat-send-error')).toBeTruthy();
    expect(screen.getByTestId('chat-unanswered')).toBeTruthy();
  });

  it('shows a question stored before a timeout as unanswered, not as unsent', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    // The server saves the question, then the request times out; no Realtime event arrives.
    jest.spyOn(app.source, 'sendChat').mockImplementationOnce(async (plantId, message) => {
      const last = app.source.world.chat.at(-1)!;
      app.source.world.chat.push({ ...last, id: last.id + 1000, plant_id: plantId, role: 'user', reply_to: null, error: null, content: message, created_at: new Date().toISOString() });
      throw new ChatError('failed', 'timeout');
    });
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Still there?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByTestId('chat-unanswered', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByTestId('chat-send-error')).toBeNull();
    expect(screen.queryByText(/Not sent/)).toBeNull();
    expect(screen.getAllByText('Still there?')).toHaveLength(1);
  });

  it('keeps edits typed while the connection is checked', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    let online!: () => void;
    network.getNetworkStateAsync.mockImplementationOnce(
      () => new Promise((r) => (online = () => r({ type: 'WIFI', isConnected: true, isInternetReachable: true }))),
    );
    const send = jest.spyOn(app.source, 'sendChat');
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'First');
    // Not awaited: the press resolves only once the check below completes.
    const pressed = fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(online).toBeDefined());
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'First, and more');
    await act(async () => online());
    await pressed;
    await waitFor(() => expect(send).toHaveBeenCalledWith(app.source.world.plant.id, 'First'));
    expect(screen.getByTestId('chat-input').props.value).toBe('First, and more');
  });

  it('keeps a draft identical to the suggestion that is tapped', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const send = jest.spyOn(app.source, 'sendChat');
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Do you need water?');
    const chat = within(screen.getByTestId('chat-screen'));
    await fireEvent.press(chat.getByRole('button', { name: 'Do you need water?' }));
    expect(send).toHaveBeenCalledWith(app.source.world.plant.id, 'Do you need water?');
    expect(screen.getByTestId('chat-input').props.value).toBe('Do you need water?');
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

  async function openLongChat() {
    return openChat((app) => {
      const first = app.source.world.chat[0];
      const start = Date.parse(first.created_at) - 120 * 60_000;
      const older = Array.from({ length: 60 }, (_, i) => ({
        ...first,
        id: 100_000 + i,
        role: 'user',
        reply_to: null,
        content: `Older question ${i}`,
        created_at: new Date(start + i * 60_000).toISOString(),
      }));
      app.source.world.chat.unshift(...older);
      return app.queryClient.resetQueries({ queryKey: ['chat'] });
    });
  }

  function scrollTo(y: number, height: number) {
    const scroll = screen.getByTestId('chat-scroll');
    fireEvent(scroll, 'scrollBeginDrag');
    fireEvent.scroll(scroll, {
      nativeEvent: { contentOffset: { x: 0, y }, contentSize: { width: 402, height }, layoutMeasurement: { width: 402, height: 700 } },
    });
  }
  const scrollToTop = () => scrollTo(0, 4000);

  it('shows Retry inline when the earlier messages fail to load', async () => {
    const app = await openLongChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const real = app.source.getChatPage.bind(app.source);
    const page = jest.spyOn(app.source, 'getChatPage').mockRejectedValue(new Error('offline'));
    await act(async () => scrollToTop());
    expect(await screen.findByTestId('chat-older-error')).toBeTruthy();
    page.mockImplementation(real);
    await fireEvent.press(within(screen.getByTestId('chat-older-error')).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByTestId('chat-older-error')).toBeNull());
    expect(page).toHaveBeenLastCalledWith(app.source.world.plant.id, 50, expect.objectContaining({ id: expect.any(Number) }));
  });

  it('does not jump back to the newest message once the reader has scrolled away', async () => {
    const app = await openChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const toEnd = jest.spyOn(ScrollView.prototype as unknown as { scrollToEnd: () => void }, 'scrollToEnd');
    afterThis(() => toEnd.mockRestore());
    await act(async () => scrollToTop());
    toEnd.mockClear();
    await act(async () => {
      fireEvent(screen.getByTestId('chat-scroll'), 'contentSizeChange', 402, 4200);
    });
    expect(toEnd).not.toHaveBeenCalled();
  });

  it('anchors a retried older page where the reader tapped Retry', async () => {
    const app = await openLongChat();
    await screen.findAllByText(app.source.world.chat.at(-1)!.content, {}, { timeout: 5000 });
    const real = app.source.getChatPage.bind(app.source);
    const page = jest.spyOn(app.source, 'getChatPage').mockRejectedValue(new Error('offline'));
    await act(async () => scrollToTop());
    await screen.findByTestId('chat-older-error');
    await act(async () => scrollTo(300, 5000));
    page.mockImplementation(real);
    const scrollToSpy = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (o: object) => void }, 'scrollTo');
    afterThis(() => scrollToSpy.mockRestore());
    await fireEvent.press(within(screen.getByTestId('chat-older-error')).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByTestId('chat-older-error')).toBeNull());
    await waitFor(() => expect(page).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText('Older question 59').length).toBeGreaterThan(0));
    scrollToSpy.mockClear();
    await act(async () => {
      fireEvent(screen.getByTestId('chat-scroll'), 'contentSizeChange', 402, 6000);
    });
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 1300, animated: false });
  });
});
