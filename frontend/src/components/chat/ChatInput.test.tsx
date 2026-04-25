import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatInput from '@/components/chat/ChatInput';
import { useChatStore } from '@/store/useChatStore';

// ChatInput 의 외부 의존성 모킹 — 네트워크/스토어/브릿지를 격리한다.
// vi.mock 은 호이스팅되므로 mockFn 들도 vi.hoisted 로 선언해야 한다.
const { mockSendVillageMessage, mockSendTypingStatus } = vi.hoisted(() => ({
  mockSendVillageMessage: vi.fn(),
  mockSendTypingStatus: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/lib/websocket/stompClient', () => ({
  sendTypingStatus: mockSendTypingStatus,
  sendVillageMessage: mockSendVillageMessage,
}));

vi.mock('@/lib/websocket/positionBridge', () => ({
  emitMyTypingUpdate: vi.fn(),
  emitNpcTypingUpdate: vi.fn(),
}));

// getTokenSnapshot 이 role !== 'GUEST' 로 인식하는 가짜 JWT 를 localStorage 에 주입.
function setLoggedInToken() {
  const payload = JSON.stringify({ role: 'USER' });
  const fakeJwt = `header.${btoa(payload)}.signature`;
  localStorage.setItem('accessToken', fakeJwt);
}

describe('ChatInput — F-3 IME 회귀 방지', () => {
  beforeEach(() => {
    setLoggedInToken();
    useChatStore.setState({ connectionStatus: 'connected' });
    mockSendVillageMessage.mockClear();
    mockSendTypingStatus.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('한글 IME 조합 중 Enter', () => {
    it('IME 조합 중에는 Enter 가 전송을 발사하지 않는다 (F-3 핵심)', () => {
      // Given: 인증·연결 상태의 입력창에 "안녕" 입력
      render(<ChatInput onLoginRequired={vi.fn()} />);
      const input = screen.getByPlaceholderText(/NPC/);
      fireEvent.change(input, { target: { value: '안녕' } });

      // When: IME 조합 중인 상태로 Enter
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

      // Then
      expect(mockSendVillageMessage).not.toHaveBeenCalled();
    });
  });

  describe('IME 조합 종료 후 Enter', () => {
    it('조합이 끝난 뒤 Enter 는 정상 전송된다', () => {
      // Given
      render(<ChatInput onLoginRequired={vi.fn()} />);
      const input = screen.getByPlaceholderText(/NPC/);
      fireEvent.change(input, { target: { value: '안녕하세요' } });

      // When: 조합 종료 후 Enter
      fireEvent.keyDown(input, { key: 'Enter', isComposing: false });

      // Then
      expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
      expect(mockSendVillageMessage).toHaveBeenCalledWith('안녕하세요', expect.any(Function));
    });
  });

  describe('영문 입력 회귀', () => {
    it('영문 입력 후 Enter 는 기존 동작대로 한 번만 전송한다', () => {
      // Given
      render(<ChatInput onLoginRequired={vi.fn()} />);
      const input = screen.getByPlaceholderText(/NPC/);
      fireEvent.change(input, { target: { value: 'hello world' } });

      // When
      fireEvent.keyDown(input, { key: 'Enter' });

      // Then
      expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
      expect(mockSendVillageMessage).toHaveBeenCalledWith('hello world', expect.any(Function));
    });
  });

  describe('macOS 한글 IME 의 실제 시퀀스 (조합 Enter → 즉시 확정 Enter)', () => {
    it('연속 입력에서도 정확히 1회만 전송된다 (F-3 핵심 회귀 차단)', () => {
      // Given: 사용자가 "안녕하세요" 입력 후 마지막 음절 조합 중
      render(<ChatInput onLoginRequired={vi.fn()} />);
      const input = screen.getByPlaceholderText(/NPC/);
      fireEvent.change(input, { target: { value: '안녕하세요' } });

      // When: macOS 한글 IME 가 보내는 시퀀스 — 조합 중 Enter 직후 확정 Enter
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(input, { key: 'Enter', isComposing: false });

      // Then: 첫 Enter 는 가드로 차단, 두 번째 Enter 만 전송
      expect(mockSendVillageMessage).toHaveBeenCalledTimes(1);
      expect(mockSendVillageMessage).toHaveBeenCalledWith('안녕하세요', expect.any(Function));
    });
  });
});
