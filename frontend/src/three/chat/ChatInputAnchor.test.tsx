import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatInputAnchor from './ChatInputAnchor';

vi.mock('@/lib/auth', () => ({
  isTokenExpired: () => true,
}));

vi.mock('@/lib/websocket/positionBridge', () => ({
  emitMyTypingUpdate: vi.fn(),
}));

vi.mock('@/lib/websocket/realtimeClient', () => ({
  sendTypingStatus: vi.fn(),
  sendVillageMessage: vi.fn(),
}));

describe('ChatInputAnchor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('Enter opens the chat input and another Enter closes it', async () => {
    render(<ChatInputAnchor sceneManager={null} onLoginRequired={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(await screen.findByRole('textbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('blank Enter inside the input closes the chat input', async () => {
    render(<ChatInputAnchor sceneManager={null} onLoginRequired={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    const input = await screen.findByRole('textbox');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
