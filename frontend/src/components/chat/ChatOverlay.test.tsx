import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatOverlay from '@/components/chat/ChatOverlay';
import { useChatStore } from '@/store/useChatStore';

/**
 * #42: 멤버 토큰 만료 시 useStomp 가 setLoginRequired(true) 를 호출하면
 *      ChatOverlay 가 LoginPrompt 를 자동 표시해야 한다.
 *      구 동작은 showLoginPrompt 로컬 state 만 봐서 사용자가 input 을 클릭해야 LoginPrompt 가 떴는데,
 *      hasToken=true 로 stale 인 만료 토큰 케이스에선 그 진입점 자체가 막힘 → 영원히 'error' 갇힘.
 */

vi.mock('@/lib/websocket/useStomp', () => ({
  useStomp: vi.fn(),
}));

vi.mock('@/hooks/useResize', () => ({
  useResize: () => [240, vi.fn()] as const,
}));

// 본 테스트 범위 밖 컴포넌트 — 가벼운 stub
vi.mock('@/components/chat/ChatInput', () => ({
  default: () => <div data-testid="chat-input-stub" />,
}));

vi.mock('@/components/chat/ChatMessageList', () => ({
  default: () => <div data-testid="chat-message-list-stub" />,
}));

// LoginPrompt 는 실제 렌더 — "마을에 들어가기" 헤더로 검증.
// 외부 네트워크는 격리.
vi.mock('@/lib/api/client', () => ({
  default: { post: vi.fn() },
}));

describe('ChatOverlay — #42 loginRequired 자동 LoginPrompt 표시', () => {
  beforeEach(() => {
    useChatStore.setState({
      loginRequired: false,
      isInputFocused: false,
    });
  });

  afterEach(() => {
    useChatStore.setState({ loginRequired: false });
  });

  it('초기 상태(loginRequired=false) 에서는 LoginPrompt 가 렌더되지 않는다', () => {
    // When
    render(<ChatOverlay />);

    // Then: 헤더·이메일·비밀번호 input 모두 없어야 함 (단순 텍스트 없음 X, 모달 자체가 안 떠있음)
    expect(screen.queryByText('마을에 들어가기')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('이메일')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('비밀번호')).not.toBeInTheDocument();
  });

  it('loginRequired=true 로 바뀌면 LoginPrompt 가 자동 렌더된다', () => {
    // Given: useStomp 가 멤버 401 감지하고 setLoginRequired(true) 호출한 상태
    useChatStore.setState({ loginRequired: true });

    // When
    render(<ChatOverlay />);

    // Then: ChatInput 클릭 없이도 LoginPrompt 가 즉시 떠있어 재로그인 가능
    expect(screen.getByText('마을에 들어가기')).toBeInTheDocument();
    // Then: 실제 입력 가능한 form 요소까지 렌더되어 사용자가 즉시 재로그인 진행 가능
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /마을 들어가기/ })).toBeInTheDocument();
  });

  it('LoginPrompt onClose 시 store 의 loginRequired 가 false 로 복구되고 모달도 사라진다', () => {
    // Given: loginRequired=true 로 LoginPrompt 가 표시된 상태
    useChatStore.setState({ loginRequired: true });
    render(<ChatOverlay />);
    expect(screen.getByText('마을에 들어가기')).toBeInTheDocument();

    // When: 사용자가 "나중에 할게요" 클릭
    fireEvent.click(screen.getByRole('button', { name: /나중에 할게요/ }));

    // Then: 다음 사이클을 위해 플래그가 정리됨 (true 인 채로 남으면 닫아도 다시 뜸)
    expect(useChatStore.getState().loginRequired).toBe(false);
    // Then: 모달 자체도 사라져야 함 (자동 닫힘 검증)
    expect(screen.queryByText('마을에 들어가기')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('이메일')).not.toBeInTheDocument();
  });
});
