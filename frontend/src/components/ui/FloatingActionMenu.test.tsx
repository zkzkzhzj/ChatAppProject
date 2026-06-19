import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FloatingActionMenu from './FloatingActionMenu';

const { mockGetUnreadReceivedLetterCount, mockHasMemberToken, mockSaveMasterVolume } = vi.hoisted(
  () => ({
    mockGetUnreadReceivedLetterCount: vi.fn(),
    mockHasMemberToken: vi.fn(),
    mockSaveMasterVolume: vi.fn(),
  }),
);

vi.mock('@/lib/api/confessions', () => ({
  getUnreadReceivedLetterCount: mockGetUnreadReceivedLetterCount,
}));

vi.mock('@/lib/auth/member-token', () => ({
  hasMemberToken: mockHasMemberToken,
}));

vi.mock('@/lib/websocket/tokenBridge', () => ({
  emitDisplayIdChange: vi.fn(),
}));

vi.mock('@/three/audio/master-volume-store', () => ({
  loadMasterVolume: () => 0.5,
  saveMasterVolume: mockSaveMasterVolume,
}));

describe('FloatingActionMenu', () => {
  beforeEach(() => {
    mockGetUnreadReceivedLetterCount.mockReset();
    mockHasMemberToken.mockReturnValue(false);
    mockGetUnreadReceivedLetterCount.mockResolvedValue(0);
  });

  it('keeps secondary actions hidden until the menu opens', () => {
    render(<FloatingActionMenu sceneManager={null} chatOpen={false} onChatOpenChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '마을 메뉴' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: '채팅 내역' }).parentElement).toHaveStyle({
      opacity: '0',
      pointerEvents: 'none',
    });
  });

  it('hides the menu while the chat drawer is open', () => {
    render(<FloatingActionMenu sceneManager={null} chatOpen={true} onChatOpenChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '마을 메뉴' })).not.toBeInTheDocument();
  });

  it('fans out all five actions from the menu button', () => {
    render(<FloatingActionMenu sceneManager={null} chatOpen={false} onChatOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '마을 메뉴' }));

    expect(screen.getByRole('button', { name: '마을 메뉴' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByRole('button', { name: '채팅 내역' }).parentElement).toHaveStyle({
      opacity: '1',
    });
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    const guideButton = screen.getByRole('button', { name: '가이드' });
    expect(guideButton).toBeInTheDocument();
    expect(guideButton.parentElement).toHaveStyle({
      transform: 'translate(-76px, 78px) scale(1)',
    });
    expect(mockGetUnreadReceivedLetterCount).not.toHaveBeenCalled();
  });

  it('opens chat and guide actions from the fan menu', () => {
    const onChatOpenChange = vi.fn();
    render(
      <FloatingActionMenu
        sceneManager={null}
        chatOpen={false}
        onChatOpenChange={onChatOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '마을 메뉴' }));
    fireEvent.click(screen.getByRole('button', { name: '채팅 내역' }));
    expect(onChatOpenChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: '마을 메뉴' }));
    fireEvent.click(screen.getByRole('button', { name: '가이드' }));
    expect(screen.getByRole('dialog', { name: '마을 이용 가이드' })).toBeInTheDocument();
  });
});
