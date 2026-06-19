import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VillageControls from './VillageControls';

const { mockHasMemberToken, mockEmitDisplayIdChange } = vi.hoisted(() => ({
  mockHasMemberToken: vi.fn(),
  mockEmitDisplayIdChange: vi.fn(),
}));

vi.mock('@/lib/auth/member-token', () => ({
  hasMemberToken: mockHasMemberToken,
}));

vi.mock('@/lib/websocket/tokenBridge', () => ({
  emitDisplayIdChange: mockEmitDisplayIdChange,
}));

describe('VillageControls', () => {
  beforeEach(() => {
    mockHasMemberToken.mockReturnValue(false);
    mockEmitDisplayIdChange.mockReset();
  });

  it('renders login and guide as icon buttons in the right control stack', () => {
    render(<VillageControls />);

    const loginButton = screen.getByRole('button', { name: '로그인' });
    const guideButton = screen.getByRole('button', { name: '가이드' });

    expect(loginButton).toHaveClass('h-12', 'w-12');
    expect(guideButton).toHaveClass('h-12', 'w-12');
    expect(loginButton.parentElement).toHaveStyle({
      bottom: 'calc(224px + env(safe-area-inset-bottom))',
    });
  });

  it('opens the guide dialog from the guide icon button', () => {
    render(<VillageControls />);

    fireEvent.click(screen.getByRole('button', { name: '가이드' }));

    expect(screen.getByRole('dialog', { name: '마을 이용 가이드' })).toBeInTheDocument();
  });
});
