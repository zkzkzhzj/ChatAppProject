import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatInput from '@/components/chat/ChatInput';
import { useChatStore } from '@/store/useChatStore';

const { mockSendVillageMessage, mockSendTypingStatus, mockIsTokenExpired } = vi.hoisted(() => ({
  mockSendVillageMessage: vi.fn(),
  mockSendTypingStatus: vi.fn(),
  mockIsTokenExpired: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/auth', () => ({
  isTokenExpired: mockIsTokenExpired,
}));

vi.mock('@/lib/websocket/realtimeClient', () => ({
  sendTypingStatus: mockSendTypingStatus,
  sendVillageMessage: mockSendVillageMessage,
}));

vi.mock('@/lib/websocket/positionBridge', () => ({
  emitMyTypingUpdate: vi.fn(),
}));

function setLoggedInToken() {
  const payload = JSON.stringify({ role: 'USER' });
  const fakeJwt = `header.${btoa(payload)}.signature`;
  localStorage.setItem('accessToken', fakeJwt);
}

describe('ChatInput', () => {
  beforeEach(() => {
    mockIsTokenExpired.mockReturnValue(false);
    setLoggedInToken();
    useChatStore.setState({ connectionStatus: 'connected' });
    mockSendVillageMessage.mockClear();
    mockSendTypingStatus.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not send while IME is composing', () => {
    render(<ChatInput onLoginRequired={vi.fn()} />);
    const input = screen.getByPlaceholderText('Enter로 전송');
    fireEvent.change(input, { target: { value: '안녕' } });

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(mockSendVillageMessage).not.toHaveBeenCalled();
  });

  it('sends a normal message after composition ends', () => {
    render(<ChatInput onLoginRequired={vi.fn()} />);
    const input = screen.getByPlaceholderText('Enter로 전송');
    fireEvent.change(input, { target: { value: '안녕하세요' } });

    fireEvent.keyDown(input, { key: 'Enter', isComposing: false });

    expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
    expect(mockSendVillageMessage).toHaveBeenCalledWith('안녕하세요');
  });

  it('shows a plain connected member placeholder', () => {
    render(<ChatInput onLoginRequired={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter로 전송')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/@/)).not.toBeInTheDocument();
  });

  it("connectionStatus='connecting' shows connecting placeholder", () => {
    useChatStore.setState({ connectionStatus: 'connecting' });

    render(<ChatInput onLoginRequired={vi.fn()} />);

    expect(screen.getByPlaceholderText('마을에 연결 중...')).toBeInTheDocument();
  });

  it('guest click opens login prompt', () => {
    localStorage.clear();
    useChatStore.setState({ connectionStatus: 'connected' });
    const onLoginRequired = vi.fn();

    render(<ChatInput onLoginRequired={onLoginRequired} />);
    const input = screen.getByPlaceholderText('로그인하면 대화할 수 있어요');
    fireEvent.click(input);

    expect(onLoginRequired).toHaveBeenCalled();
  });

  it('valid token with network error does not open login prompt', () => {
    useChatStore.setState({ connectionStatus: 'error' });
    const onLoginRequired = vi.fn();

    render(<ChatInput onLoginRequired={onLoginRequired} />);
    const input = screen.getByPlaceholderText('연결이 끊겼어요. 잠시 후 다시 시도합니다.');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onLoginRequired).not.toHaveBeenCalled();
    expect(mockSendVillageMessage).not.toHaveBeenCalled();
  });

  it('expired token is treated as logged out', () => {
    mockIsTokenExpired.mockReturnValue(true);
    useChatStore.setState({ connectionStatus: 'error' });
    const onLoginRequired = vi.fn();

    render(<ChatInput onLoginRequired={onLoginRequired} />);
    const input = screen.getByPlaceholderText('연결이 끊겼어요. 다시 로그인해 주세요.');
    fireEvent.click(input);

    expect(onLoginRequired).toHaveBeenCalled();
  });
});
