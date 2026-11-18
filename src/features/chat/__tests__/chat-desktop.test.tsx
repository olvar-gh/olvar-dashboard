// Jest resolves the iOS files, so the desktop parts are rendered directly around the shared model.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { BOTTOM_BAR_CLEARANCE } from '@/components/shell';
import { renderWithFixtures } from '@/components/shell/testing/render-app';
import { ChatError } from '@/data';

import { ChatCard } from '../desktop/ChatCard';
import { ContextCard } from '../desktop/ContextCard';
import { Conversations } from '../desktop/Conversations';
import { useChat } from '../useChat';

const onSelect = jest.fn();

function DesktopChat() {
  const chat = useChat();
  return (
    <>
      <Conversations chat={chat} active={null} onSelect={onSelect} />
      <ChatCard chat={chat} minHeight={864} />
      <ContextCard chat={chat} />
    </>
  );
}

describe('desktop chat', () => {
  it('lists the conversation by day, newest first, and selects a day', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await waitFor(() => expect(screen.getAllByText('Yesterday').length).toBeGreaterThan(0));
    const firstQuestion = source.world.chat.find((m) => m.role === 'user')!;
    expect(screen.getByTestId('chat-conversations')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: /Yesterday/ })[0]);
    expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(firstQuestion).toBeTruthy();
  });

  it('shows what the plant sees with the reading age and gateway', async () => {
    await renderWithFixtures(<DesktopChat />);
    expect(await screen.findByText('What Sparks sees right now'.toUpperCase())).toBeTruthy();
    expect(await screen.findByText(/^Updated \d+ (s|min) ago from olvar-gw$/)).toBeTruthy();
    expect(screen.getByText('Soil moisture')).toBeTruthy();
  });

  it('shows "Based on readings from HH:mm" under answers', async () => {
    await renderWithFixtures(<DesktopChat />);
    expect((await screen.findAllByText(/^Based on readings from \d{2}:\d{2}$/)).length).toBeGreaterThan(0);
  });

  it('sends with a suggestion chip and shows the reply', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat');
    await fireEvent.press(screen.getByRole('button', { name: 'How am I doing this week?' }));
    expect(send).toHaveBeenCalledWith(source.world.plant.id, 'How am I doing this week?');
    expect(await screen.findByText('Sparks is checking its sensors…')).toBeTruthy();
    expect(await screen.findByText(/Thanks for asking!/, {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByTestId('chat-typing')).toBeNull();
  });

  it('keeps an unsent draft when a suggestion chip is sent', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat');
    await fireEvent.changeText(screen.getByTestId('chat-input'), '내일 물 줄까?');
    await fireEvent.press(screen.getByRole('button', { name: 'How am I doing this week?' }));
    expect(send).toHaveBeenCalledWith(source.world.plant.id, 'How am I doing this week?');
    expect(screen.getByTestId('chat-input').props.value).toBe('내일 물 줄까?');
  });

  it('keeps a draft identical to the suggestion chip that is sent', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat');
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'How am I doing this week?');
    await fireEvent.press(screen.getByRole('button', { name: 'How am I doing this week?' }));
    expect(send).toHaveBeenCalledWith(source.world.plant.id, 'How am I doing this week?');
    expect(screen.getByTestId('chat-input').props.value).toBe('How am I doing this week?');
  });

  it('keeps an unsent draft when a failed message is retried', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat').mockRejectedValueOnce(new ChatError('failed', '500'));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Still there?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(screen.getByTestId('chat-input').props.value).toBe('');
    await screen.findByTestId('chat-send-error');
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'And tomorrow?');
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenLastCalledWith(source.world.plant.id, 'Still there?');
    expect(screen.getByTestId('chat-input').props.value).toBe('And tomorrow?');
  });

  it('keeps the composer above the bottom bar on compact web', async () => {
    await renderWithFixtures(<DesktopChat />);
    const composer = await screen.findByTestId('chat-composer');
    expect(StyleSheet.flatten(composer.props.style).bottom).toBe(BOTTOM_BAR_CLEARANCE);
  });

  it('offers Retry after an upstream failure and resends the same text', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat').mockRejectedValueOnce(new ChatError('failed', '500'));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Still there?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByTestId('chat-send-error')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenLastCalledWith(source.world.plant.id, 'Still there?');
  });

  it('shows the rate limit with the rule', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    jest.spyOn(source, 'sendChat').mockRejectedValue(new ChatError('rate_limited', 'rate_limited', 42));
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Again?');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByText(/You can ask again in 0:4\d\. Sparks answers up to 10 messages every 5 minutes/)).toBeTruthy();
  });

  it('shows the offline banner when the device is offline', async () => {
    await renderWithFixtures(<DesktopChat />, { scenario: 'offline' });
    expect(await screen.findByText(/offline since \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.getByText(/^Offline since \d{2}:\d{2} · answers use the last reading$/)).toBeTruthy();
  });

  it('shows failed reads in the context card', async () => {
    await renderWithFixtures(<DesktopChat />, { scenario: 'null-reads' });
    expect((await screen.findAllByText(/^Read failed at \d{2}:\d{2}$/)).length).toBeGreaterThan(0);
  });

  it('sends on Enter but not while a Korean IME composition is being committed', async () => {
    const { source } = await renderWithFixtures(<DesktopChat />);
    await screen.findByTestId('chat-messages');
    const send = jest.spyOn(source, 'sendChat');
    const input = screen.getByTestId('chat-input');
    await fireEvent.changeText(input, '오늘 물 줘야 해');
    const key = (nativeEvent: object) => ({ nativeEvent: { key: 'Enter', ...nativeEvent }, preventDefault: jest.fn() });
    const composing = key({ isComposing: true });
    await fireEvent(input, 'keyPress', composing);
    await fireEvent(input, 'keyPress', key({ isComposing: false, keyCode: 229 }));
    expect(send).not.toHaveBeenCalled();
    expect(composing.preventDefault).not.toHaveBeenCalled();
    expect(input.props.value).toBe('오늘 물 줘야 해');
    await fireEvent(input, 'keyPress', key({ isComposing: false, keyCode: 13 }));
    expect(send).toHaveBeenCalledWith(source.world.plant.id, '오늘 물 줘야 해');
  });
});
