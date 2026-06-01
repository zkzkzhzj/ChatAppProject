import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getThankReply,
  getUnreadReceivedLetterCount,
  listReceivedLetters,
  listSentLetters,
} from '@/lib/api/confessions';
import {
  emitMailRefreshRequested,
  resetMailRefreshBridgeForTest,
} from '@/lib/scene/mailRefreshBridge';

import GlobalMailNotification from './GlobalMailNotification';
import { LIBRARY_LABELS } from './libraryLabels';

vi.mock('@/lib/api/confessions', () => ({
  getUnreadReceivedLetterCount: vi.fn(),
  getThankReply: vi.fn(),
  listReceivedLetters: vi.fn(),
  listSentLetters: vi.fn(),
}));

const mockedGetUnreadReceivedLetterCount = vi.mocked(getUnreadReceivedLetterCount);
const mockedGetThankReply = vi.mocked(getThankReply);
const mockedListReceivedLetters = vi.mocked(listReceivedLetters);
const mockedListSentLetters = vi.mocked(listSentLetters);

function setMemberToken() {
  const payload = btoa(JSON.stringify({ role: 'MEMBER' }));
  window.localStorage.setItem('accessToken', `header.${payload}.signature`);
}

function makeSentLetter(id: number) {
  return {
    id,
    confessionId: 1,
    body: 'heart',
    status: 'SENT' as const,
    authorReadAt: null,
    createdAt: '2026-05-30T00:00:00Z',
  };
}

describe('GlobalMailNotification', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    resetMailRefreshBridgeForTest();
    mockedGetUnreadReceivedLetterCount.mockResolvedValue(0);
    mockedListSentLetters.mockResolvedValue([]);
    mockedGetThankReply.mockResolvedValue(null);
  });

  it('renders outside the library and loads received and reply notifications for members', async () => {
    setMemberToken();
    mockedGetUnreadReceivedLetterCount.mockResolvedValue(2);
    mockedListSentLetters.mockResolvedValue([makeSentLetter(20)]);
    mockedGetThankReply.mockResolvedValue({
      id: 30,
      letterId: 20,
      body: 'thanks',
      createdAt: '2026-05-30T00:00:00Z',
    });

    render(<GlobalMailNotification />);

    const mailButton = screen.getByRole('button', { name: LIBRARY_LABELS.mailAriaLabel });
    expect(mailButton.parentElement).toHaveClass('bottom-20');

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(1);
      expect(mockedGetThankReply).toHaveBeenCalledWith(20);
    });

    fireEvent.click(screen.getByRole('button', { name: /우편 알림 확인/ }));

    expect(mockedListReceivedLetters).not.toHaveBeenCalled();
    expect(screen.getByText(`${LIBRARY_LABELS.receivedHeart} 2`)).toBeInTheDocument();
    expect(screen.getByText(`${LIBRARY_LABELS.reply} 1`)).toBeInTheDocument();
  });

  it('keeps the global mailbox visible without member credentials', () => {
    render(<GlobalMailNotification />);

    expect(screen.getByRole('button', { name: LIBRARY_LABELS.mailAriaLabel })).toBeInTheDocument();
    expect(mockedGetUnreadReceivedLetterCount).not.toHaveBeenCalled();
    expect(mockedListSentLetters).not.toHaveBeenCalled();
  });

  it('bounds reply count refresh to the first sent letters', async () => {
    setMemberToken();
    mockedListSentLetters.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) => makeSentLetter(index + 1)),
    );

    render(<GlobalMailNotification />);

    await waitFor(() => {
      expect(mockedGetThankReply).toHaveBeenCalledTimes(20);
    });
    expect(mockedGetThankReply).toHaveBeenCalledWith(1);
    expect(mockedGetThankReply).toHaveBeenCalledWith(20);
    expect(mockedGetThankReply).not.toHaveBeenCalledWith(21);
  });

  it('refreshes reply notifications when another library flow requests it', async () => {
    setMemberToken();
    mockedGetUnreadReceivedLetterCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    mockedListSentLetters.mockResolvedValueOnce([]).mockResolvedValueOnce([makeSentLetter(20)]);
    mockedGetThankReply.mockResolvedValue({
      id: 30,
      letterId: 20,
      body: 'thanks',
      createdAt: '2026-05-30T00:00:00Z',
    });

    render(<GlobalMailNotification />);

    await waitFor(() => {
      expect(mockedListSentLetters).toHaveBeenCalledTimes(1);
    });

    emitMailRefreshRequested();

    await waitFor(() => {
      expect(mockedGetUnreadReceivedLetterCount).toHaveBeenCalledTimes(2);
      expect(mockedListSentLetters).toHaveBeenCalledTimes(2);
    });
    expect(mockedGetThankReply).toHaveBeenCalledWith(20);
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
