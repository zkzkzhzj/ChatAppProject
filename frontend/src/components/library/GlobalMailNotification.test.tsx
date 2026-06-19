import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUnreadReceivedLetterCount, listReceivedLetters } from '@/lib/api/confessions';
import {
  emitMailRefreshRequested,
  resetMailRefreshBridgeForTest,
} from '@/lib/scene/mailRefreshBridge';

import GlobalMailNotification from './GlobalMailNotification';
import { LIBRARY_LABELS } from './libraryLabels';

vi.mock('@/lib/api/confessions', () => ({
  getUnreadReceivedLetterCount: vi.fn(),
  listReceivedLetters: vi.fn(),
}));

const mockedGetUnreadReceivedLetterCount = vi.mocked(getUnreadReceivedLetterCount);
const mockedListReceivedLetters = vi.mocked(listReceivedLetters);

function setMemberToken() {
  const payload = btoa(JSON.stringify({ role: 'MEMBER' }));
  window.localStorage.setItem('accessToken', `header.${payload}.signature`);
}

describe('GlobalMailNotification', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    resetMailRefreshBridgeForTest();
    mockedGetUnreadReceivedLetterCount.mockResolvedValue(0);
  });

  it('renders outside the library and loads received notifications for members', async () => {
    setMemberToken();
    mockedGetUnreadReceivedLetterCount.mockResolvedValue(2);

    render(<GlobalMailNotification />);

    const mailButton = screen.getByRole('button', { name: LIBRARY_LABELS.mailAriaLabel });
    expect(mailButton.parentElement).toHaveClass('bottom-20');

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /우편 알림 확인/ }));

    expect(mockedListReceivedLetters).not.toHaveBeenCalled();
    expect(screen.getByText(`${LIBRARY_LABELS.receivedHeart} 2`)).toBeInTheDocument();
    expect(screen.queryByText(/답장/)).not.toBeInTheDocument();
  });

  it('keeps the global mailbox visible without member credentials', () => {
    render(<GlobalMailNotification />);

    expect(screen.getByRole('button', { name: LIBRARY_LABELS.mailAriaLabel })).toBeInTheDocument();
    expect(mockedGetUnreadReceivedLetterCount).not.toHaveBeenCalled();
  });

  it('refreshes received notifications when another library flow requests it', async () => {
    setMemberToken();
    mockedGetUnreadReceivedLetterCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    render(<GlobalMailNotification />);

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(1);
    });

    emitMailRefreshRequested();

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps received mail unread when the mailbox notification is opened', async () => {
    setMemberToken();
    mockedGetUnreadReceivedLetterCount.mockResolvedValue(2);

    render(<GlobalMailNotification />);

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /우편 알림 확인/ }));

    expect(screen.getByText(`${LIBRARY_LABELS.receivedHeart} 2`)).toBeInTheDocument();
    expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(1);
  });
});
