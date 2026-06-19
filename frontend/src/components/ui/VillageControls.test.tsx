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

  it('renders a single village menu button in the right control stack', () => {
    render(<VillageControls />);

    const menuButton = screen.getByRole('button', { name: '마을 메뉴' });

    expect(menuButton).toHaveClass('h-12', 'w-12');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
    expect(menuButton.parentElement).toHaveStyle({
      bottom: 'calc(208px + env(safe-area-inset-bottom))',
    });
  });

  it('opens the guide dialog from the guide icon button', () => {
    render(<VillageControls />);

    fireEvent.click(screen.getByRole('button', { name: '마을 메뉴' }));
    fireEvent.click(screen.getByRole('button', { name: '가이드' }));

    expect(screen.getByRole('dialog', { name: '마을 이용 가이드' })).toBeInTheDocument();
  });

  it('shows auth and guide actions around the menu button when expanded', () => {
    render(<VillageControls />);

    fireEvent.click(screen.getByRole('button', { name: '마을 메뉴' }));

    expect(screen.getByRole('button', { name: '로그인' })).toHaveClass('h-10', 'w-10');
    expect(screen.getByRole('button', { name: '가이드' })).toHaveClass('h-10', 'w-10');
  });
});
