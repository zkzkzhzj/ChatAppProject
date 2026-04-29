import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatInput from '@/components/chat/ChatInput';
import { useChatStore } from '@/store/useChatStore';

// ChatInput 의 외부 의존성 모킹 — 네트워크/스토어/브릿지를 격리한다.
// vi.mock 은 호이스팅되므로 mockFn 들도 vi.hoisted 로 선언해야 한다.
const { mockSendVillageMessage, mockSendTypingStatus, mockIsTokenExpired } = vi.hoisted(() => ({
  mockSendVillageMessage: vi.fn(),
  mockSendTypingStatus: vi.fn(),
  mockIsTokenExpired: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/auth', () => ({
  isTokenExpired: mockIsTokenExpired,
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

// #42: 멤버 토큰 만료 후 사용자 복구 경로 — 'error' placeholder + 만료 토큰 hasToken=false 회귀
describe('ChatInput — #42 연결 상태별 placeholder 와 만료 토큰 처리', () => {
  beforeEach(() => {
    mockIsTokenExpired.mockReturnValue(false);
    setLoggedInToken();
    mockSendVillageMessage.mockClear();
    mockSendTypingStatus.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("connectionStatus='connecting' → placeholder '마을에 연결 중...'", () => {
    // Given
    useChatStore.setState({ connectionStatus: 'connecting' });

    // When
    render(<ChatInput onLoginRequired={vi.fn()} />);

    // Then
    expect(screen.getByPlaceholderText('마을에 연결 중...')).toBeInTheDocument();
  });

  it("connectionStatus='connected' + 멤버 토큰 → NPC 말걸기 placeholder", () => {
    // Given
    useChatStore.setState({ connectionStatus: 'connected' });

    // When
    render(<ChatInput onLoginRequired={vi.fn()} />);

    // Then
    expect(screen.getByPlaceholderText(/NPC/)).toBeInTheDocument();
  });

  it("connectionStatus='connected' + 토큰 없음 → '로그인 후 대화할 수 있어요'", () => {
    // Given
    localStorage.clear();
    useChatStore.setState({ connectionStatus: 'connected' });

    // When
    render(<ChatInput onLoginRequired={vi.fn()} />);

    // Then
    expect(screen.getByPlaceholderText('로그인 후 대화할 수 있어요')).toBeInTheDocument();
  });

  it("connectionStatus='error' + 토큰 없음(만료 후 제거) → '다시 로그인해 주세요' 안내", () => {
    // Given: useStomp 가 멤버 401 감지하고 토큰을 제거한 상태
    localStorage.clear();
    useChatStore.setState({ connectionStatus: 'error' });

    // When
    render(<ChatInput onLoginRequired={vi.fn()} />);

    // Then: 'connecting' 으로 떨어지지 않고 명시적 재로그인 안내
    expect(screen.getByPlaceholderText('연결이 끊겼어요. 다시 로그인해 주세요')).toBeInTheDocument();
  });

  it("connectionStatus='error' + 토큰 유효(네트워크 일시 끊김) → '잠시 후 다시 시도' 안내 + 거짓 재로그인 모달 차단", () => {
    // Given: 멤버 토큰 유효한데 네트워크 일시 끊김으로 STOMP onError 발생
    useChatStore.setState({ connectionStatus: 'error' });
    const onLoginRequired = vi.fn();

    // When: 사용자가 input 클릭하거나 Enter 로 전송 시도
    render(<ChatInput onLoginRequired={onLoginRequired} />);
    const input = screen.getByPlaceholderText('연결이 끊겼어요. 잠시 후 다시 시도합니다...');
    fireEvent.click(input);
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Then: 자동 재연결 흐름 신뢰 — onLoginRequired 호출 X (행동 분기 검증)
    expect(onLoginRequired).not.toHaveBeenCalled();
    // Then: 메시지도 전송 시도 X (connected 가 아니므로)
    expect(mockSendVillageMessage).not.toHaveBeenCalled();
  });

  it('만료된 토큰은 hasToken=false 로 취급돼 LoginPrompt 진입점이 열린다', () => {
    // Given: localStorage 에 만료 토큰 잔존 + 'error' 상태
    mockIsTokenExpired.mockReturnValue(true);
    useChatStore.setState({ connectionStatus: 'error' });
    const onLoginRequired = vi.fn();

    // When: 사용자가 input 클릭 (만료 토큰이 hasToken=true 로 stale 이면 LoginPrompt 안 뜸 → 영원히 갇힘)
    render(<ChatInput onLoginRequired={onLoginRequired} />);
    // 만료 토큰은 hasToken=false → 'error' + !hasToken 분기로 떨어짐
    const input = screen.getByPlaceholderText('연결이 끊겼어요. 다시 로그인해 주세요');
    fireEvent.click(input);

    // Then: hasToken=false 로 인식돼 LoginPrompt 진입점 호출
    expect(onLoginRequired).toHaveBeenCalled();
  });
});
