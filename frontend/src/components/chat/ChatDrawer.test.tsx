import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ChatDrawer from './ChatDrawer';

vi.mock('@/store/useChatStore', () => ({
  useChatStore: (
    selector: (state: { loginRequired: boolean; setLoginRequired: () => void }) => unknown,
  ) => selector({ loginRequired: false, setLoginRequired: vi.fn() }),
}));

vi.mock('./ChatMessageList', () => ({
  default: () => <div>채팅 메시지 목록</div>,
}));

vi.mock('./LoginPrompt', () => ({
  default: () => <div>로그인</div>,
}));

describe('ChatDrawer', () => {
  it('notifies when the drawer opens and closes so HUD controls can hide', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ChatDrawer onOpenChange={onOpenChange} />);

    const drawer = document.querySelector('aside');
    expect(drawer).toHaveClass('w-[min(360px,calc(100vw-1rem))]');
    expect(drawer).toHaveStyle({
      transform: 'translateX(100%)',
    });

    await user.click(screen.getByRole('button', { name: '채팅 내역 토글' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(drawer).toHaveStyle({
      transform: 'translateX(0)',
    });

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
