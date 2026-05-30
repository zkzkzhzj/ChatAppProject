import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookshelfInteraction from '@/components/library/BookshelfInteraction';
import LibrarianInteraction from '@/components/library/LibrarianInteraction';
import { LIBRARY_LABELS } from '@/components/library/libraryLabels';
import MailNotification from '@/components/library/MailNotification';
import {
  emitLibraryInteractionChange,
  emitSceneChange,
  getSceneSnapshot,
  type LibraryInteractionState,
  onLibraryInteractionChange,
  onSceneChange,
  resetSceneBridgeForTest,
} from '@/lib/scene/sceneBridge';
import type { ConfessionDetail, ConfessionSummary } from '@/types/confession';

describe('sceneBridge', () => {
  beforeEach(() => {
    resetSceneBridgeForTest();
  });

  afterEach(() => {
    resetSceneBridgeForTest();
  });

  it('notifies scene listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onSceneChange(listener);

    expect(listener).toHaveBeenCalledWith('village');

    emitSceneChange('library');

    expect(listener).toHaveBeenLastCalledWith('library');
    expect(getSceneSnapshot().scene).toBe('library');

    unsubscribe();
  });

  it('does not notify scene listeners after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = onSceneChange(listener);

    unsubscribe();
    emitSceneChange('library');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('village');
  });

  it('notifies interaction listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    expect(listener).toHaveBeenCalledWith({ nearLibrarian: false, nearBookshelf: false });

    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenLastCalledWith({ nearLibrarian: true, nearBookshelf: false });
    expect(getSceneSnapshot().interaction).toEqual({ nearLibrarian: true, nearBookshelf: false });

    unsubscribe();
  });

  it('does not notify interaction listeners after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    unsubscribe();
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ nearLibrarian: false, nearBookshelf: false });
  });

  it('does not notify interaction listeners when state is unchanged', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ nearLibrarian: true, nearBookshelf: false });

    unsubscribe();
  });

  it('protects interaction state from caller mutation', () => {
    let listenerState: LibraryInteractionState | undefined;
    const listener = vi.fn((state: LibraryInteractionState) => {
      listenerState = state;
    });
    const state = { nearLibrarian: true, nearBookshelf: false };

    emitLibraryInteractionChange(state);
    state.nearLibrarian = false;
    getSceneSnapshot().interaction.nearBookshelf = true;
    const unsubscribe = onLibraryInteractionChange(listener);

    expect(getSceneSnapshot().interaction).toEqual({
      nearLibrarian: true,
      nearBookshelf: false,
    });
    expect(listener).toHaveBeenCalledWith({
      nearLibrarian: true,
      nearBookshelf: false,
    });

    expect(listenerState).toBeDefined();
    if (!listenerState) {
      throw new Error('Expected listener state to be captured');
    }

    listenerState.nearLibrarian = false;

    expect(getSceneSnapshot().interaction).toEqual({
      nearLibrarian: true,
      nearBookshelf: false,
    });

    unsubscribe();
  });
});

describe('MailNotification', () => {
  it('renders compact counts without letter body content', () => {
    render(<MailNotification receivedCount={2} replyCount={1} />);

    const mailButton = screen.getByRole('button', { name: /우편 알림 확인/ });
    const popoverId = mailButton.getAttribute('aria-controls');

    expect(mailButton).toBeInTheDocument();
    expect(mailButton).toHaveAccessibleName('우편 알림 확인, 새 알림 3개');
    expect(mailButton).toHaveAttribute('aria-expanded', 'false');
    expect(popoverId).toBeTruthy();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(mailButton);

    expect(mailButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('id', popoverId);
    expect(screen.getByText('도착한 마음 2')).toBeInTheDocument();
    expect(screen.getByText('답장 1')).toBeInTheDocument();
    expect(screen.queryByText('편지 전문')).not.toBeInTheDocument();
  });
});

describe('LibrarianInteraction', () => {
  it('renders no ring when the player is away from the librarian', () => {
    render(
      <LibrarianInteraction near={false} onSubmitBook={vi.fn()} onRequestCounseling={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: '사서와 이야기하기' })).not.toBeInTheDocument();
  });

  it('opens counseling and book submission choices near the librarian', async () => {
    const user = userEvent.setup();
    const onRequestCounseling = vi.fn();

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={vi.fn()}
        onRequestCounseling={onRequestCounseling}
      />,
    );

    await user.click(screen.getByRole('button', { name: '사서와 이야기하기' }));
    await user.click(screen.getByRole('button', { name: '고민 상담하기' }));

    expect(onRequestCounseling).toHaveBeenCalled();
    expect(screen.getByText('비슷한 마음이 남겨져 있었어요.')).toBeInTheDocument();
  });
});
describe('LibrarianInteraction quality hardening', () => {
  it('prevents repeated counseling requests while the first request is pending', async () => {
    const user = userEvent.setup();
    let resolveCounseling: (() => void) | undefined;
    const onRequestCounseling = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCounseling = resolve;
        }),
    );

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={vi.fn()}
        onRequestCounseling={onRequestCounseling}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));

    const counselingButton = screen.getByRole('button', { name: LIBRARY_LABELS.counseling });
    await user.click(counselingButton);
    await user.click(counselingButton);

    expect(onRequestCounseling).toHaveBeenCalledTimes(1);
    expect(counselingButton).toBeDisabled();

    resolveCounseling?.();
    await screen.findByText('비슷한 마음이 남겨져 있었어요.');
  });

  it('submits a trimmed general book payload', async () => {
    const user = userEvent.setup();
    const onSubmitBook = vi.fn();

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={onSubmitBook}
        onRequestCounseling={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), '  title  ');
    await user.type(screen.getByLabelText('Book body'), '  body  ');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    await waitFor(() => {
      expect(onSubmitBook).toHaveBeenCalledWith({
        title: 'title',
        body: 'body',
        bookshelf: 'GENERAL',
      });
    });
  });

  it('clears fields and shows a success message after successful book submit', async () => {
    const user = userEvent.setup();

    render(
      <LibrarianInteraction near={true} onSubmitBook={vi.fn()} onRequestCounseling={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));

    expect(screen.getByLabelText('Book title')).toHaveValue('');
    expect(screen.getByLabelText('Book body')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent(
      '사서가 조용히 도서를 받아 책장에 꽂아 두었어요.',
    );
  });

  it('does not submit an empty book and shows local feedback', async () => {
    const user = userEvent.setup();
    const onSubmitBook = vi.fn();

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={onSubmitBook}
        onRequestCounseling={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), '   ');
    await user.type(screen.getByLabelText('Book body'), '   ');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    expect(onSubmitBook).not.toHaveBeenCalled();
    expect(screen.getByText('Title and body are required.')).toBeInTheDocument();
  });

  it('prevents repeated book submits while the first submit is pending', async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const onSubmitBook = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={onSubmitBook}
        onRequestCounseling={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');

    const submitButton = screen.getByRole('button', { name: '사서에게 맡기기' });
    await user.click(submitButton);
    await user.click(submitButton);

    expect(onSubmitBook).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();

    resolveSubmit?.();
    await screen.findByText('사서가 조용히 도서를 받아 책장에 꽂아 두었어요.');
  });

  it('shows feedback when an async book submit fails', async () => {
    const user = userEvent.setup();

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={vi.fn().mockRejectedValue(new Error('failed'))}
        onRequestCounseling={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    expect(await screen.findByText('Could not submit book. Please try again.')).toBeInTheDocument();
  });

  it('shows feedback when async counseling request fails', async () => {
    const user = userEvent.setup();

    render(
      <LibrarianInteraction
        near={true}
        onSubmitBook={vi.fn()}
        onRequestCounseling={vi.fn().mockRejectedValue(new Error('failed'))}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.counseling }));

    expect(
      await screen.findByText('Could not request counseling. Please try again.'),
    ).toBeInTheDocument();
  });

  it('connects the trigger aria-expanded and aria-controls values to the opened panel', async () => {
    const user = userEvent.setup();

    render(
      <LibrarianInteraction near={true} onSubmitBook={vi.fn()} onRequestCounseling={vi.fn()} />,
    );

    const trigger = screen.getByRole('button', { name: LIBRARY_LABELS.librarianAction });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');

    const panelId = trigger.getAttribute('aria-controls');
    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    expect(screen.getByRole('dialog')).toHaveAttribute('id', panelId);
  });
});

const makeBook = (id: number): ConfessionSummary => ({
  id,
  title: `책 ${String(id)}`,
  preview: `미리보기 ${String(id)}`,
  bookshelf: 'GENERAL',
  createdAt: '2026-05-30T00:00:00Z',
});

const makeBookDetail = (id: number): ConfessionDetail => ({
  id,
  title: `책 ${String(id)}`,
  body: `본문 ${String(id)}`,
  bookshelf: 'GENERAL',
  status: 'VISIBLE',
  riskLevel: 'LOW',
  createdAt: '2026-05-30T00:00:00Z',
});

describe('BookshelfInteraction', () => {
  it('renders no bookshelf trigger when the player is away from the bookshelf', () => {
    render(
      <BookshelfInteraction
        near={false}
        books={[makeBook(1)]}
        onSelectBook={vi.fn()}
        onSendHeart={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.bookshelfAction }),
    ).not.toBeInTheDocument();
  });

  it('opens the shelf zoom panel and then an open book detail', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(1)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(1))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    expect(screen.getByRole('dialog', { name: LIBRARY_LABELS.bookshelfTitle })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '책 1' }));

    expect(await screen.findByRole('heading', { name: '책 1' })).toBeInTheDocument();
    expect(screen.getByText('본문 1')).toBeInTheDocument();
  });

  it('selecting a book calls onSelectBook with the book id', async () => {
    const user = userEvent.setup();
    const onSelectBook = vi.fn().mockResolvedValue(makeBookDetail(2));

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(2)]}
        onSelectBook={onSelectBook}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 2' }));

    await waitFor(() => {
      expect(onSelectBook).toHaveBeenCalledWith(2);
    });
  });

  it('heart submit trims body, sends it, clears the field, and shows success', async () => {
    const user = userEvent.setup();
    const onSendHeart = vi.fn();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(3)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(3))}
        onSendHeart={onSendHeart}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 3' }));
    await screen.findByRole('heading', { name: '책 3' });

    const heartBody = screen.getByLabelText('마음 내용');
    await user.type(heartBody, '  고마워요  ');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart }));

    await waitFor(() => {
      expect(onSendHeart).toHaveBeenCalledWith(3, '고마워요');
    });
    expect(heartBody).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('마음이 조용히 전해졌어요.');
  });

  it('moves to the next page when more than eight books are available', async () => {
    const user = userEvent.setup();
    const books = Array.from({ length: 9 }, (_, index) => makeBook(index + 1));

    render(
      <BookshelfInteraction
        near={true}
        books={books}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(9))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    expect(screen.getByRole('button', { name: '책 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '책 9' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('button', { name: '책 9' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '책 1' })).not.toBeInTheDocument();
  });

  it('shows feedback when selecting a book fails', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(4)]}
        onSelectBook={vi.fn().mockRejectedValue(new Error('failed'))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 4' }));

    expect(await screen.findByText('Could not open book. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '책 4' })).not.toBeInTheDocument();
  });

  it('shows feedback when sending a heart fails', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(5)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(5))}
        onSendHeart={vi.fn().mockRejectedValue(new Error('failed'))}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 5' }));
    await screen.findByRole('heading', { name: '책 5' });
    await user.type(screen.getByLabelText('마음 내용'), '고마웠어요');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart }));

    expect(await screen.findByText('Could not send heart. Please try again.')).toBeInTheDocument();
  });

  it('shows feedback from a normal click when an empty heart body is submitted', async () => {
    const user = userEvent.setup();
    const onSendHeart = vi.fn();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(6)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(6))}
        onSendHeart={onSendHeart}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 6' }));
    await screen.findByRole('heading', { name: '책 6' });
    await user.type(screen.getByLabelText('마음 내용'), '   ');

    const submitButton = screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart });
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);

    expect(onSendHeart).not.toHaveBeenCalled();
    expect(screen.getByText('Heart message is required.')).toBeInTheDocument();
  });

  it('prevents repeated book selection while the first selection is pending', async () => {
    const user = userEvent.setup();
    let resolveSelect: ((detail: ConfessionDetail) => void) | undefined;
    const onSelectBook = vi.fn(
      () =>
        new Promise<ConfessionDetail>((resolve) => {
          resolveSelect = resolve;
        }),
    );

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(7), makeBook(8)]}
        onSelectBook={onSelectBook}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    const firstBook = screen.getByRole('button', { name: '책 7' });
    await user.click(firstBook);
    await user.click(screen.getByRole('button', { name: '책 8' }));

    expect(onSelectBook).toHaveBeenCalledTimes(1);
    expect(firstBook).toBeDisabled();

    resolveSelect?.(makeBookDetail(7));
    expect(await screen.findByRole('heading', { name: '책 7' })).toBeInTheDocument();
  });

  it('prevents repeated heart sends while the first send is pending', async () => {
    const user = userEvent.setup();
    let resolveSend: (() => void) | undefined;
    const onSendHeart = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(9)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(9))}
        onSendHeart={onSendHeart}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 9' }));
    await screen.findByRole('heading', { name: '책 9' });
    await user.type(screen.getByLabelText('마음 내용'), '고마웠어요');

    const submitButton = screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart });
    await user.click(submitButton);
    await user.click(submitButton);

    expect(onSendHeart).toHaveBeenCalledTimes(1);
    expect(submitButton).toBeDisabled();

    resolveSend?.();
    await screen.findByText('마음이 조용히 전해졌어요.');
  });

  it('clamps the current page when the books prop shrinks', async () => {
    const user = userEvent.setup();
    const initialBooks = Array.from({ length: 9 }, (_, index) => makeBook(index + 1));
    const { rerender } = render(
      <BookshelfInteraction
        near={true}
        books={initialBooks}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(1))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    rerender(
      <BookshelfInteraction
        near={true}
        books={[makeBook(1)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(1))}
        onSendHeart={vi.fn()}
      />,
    );

    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '책 1' })).toBeInTheDocument();
  });

  it('moves focus into the dialog, closes with Escape, and restores focus to the trigger', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(10)]}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(10))}
        onSendHeart={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction });
    trigger.focus();
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: LIBRARY_LABELS.bookshelfTitle });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('wraps keyboard focus inside the open bookshelf dialog', async () => {
    const user = userEvent.setup();
    const books = Array.from({ length: 9 }, (_, index) => makeBook(index + 1));

    render(
      <BookshelfInteraction
        near={true}
        books={books}
        onSelectBook={vi.fn().mockResolvedValue(makeBookDetail(1))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    const closeButton = screen.getByRole('button', { name: LIBRARY_LABELS.close });
    const nextButton = screen.getByRole('button', { name: '다음' });

    nextButton.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    await user.tab({ shift: true });
    expect(nextButton).toHaveFocus();
  });
});
