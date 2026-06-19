import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookshelfInteraction from '@/components/library/BookshelfInteraction';
import LibrarianInteraction from '@/components/library/LibrarianInteraction';
import { LIBRARY_LABELS } from '@/components/library/libraryLabels';
import LibraryOverlay from '@/components/library/LibraryOverlay';
import MailNotification from '@/components/library/MailNotification';
import {
  createConfession,
  getConfession,
  listConfessions,
  listLibrarianSimilarConfessions,
  listReceivedLetters,
  markAllReceivedLettersRead,
  sendConfessionLetter,
} from '@/lib/api/confessions';
import {
  onMailRefreshRequested,
  resetMailRefreshBridgeForTest,
} from '@/lib/scene/mailRefreshBridge';
import {
  emitLibraryEntryBlocked,
  emitLibraryInteractionChange,
  emitSceneChange,
  getSceneSnapshot,
  type LibraryInteractionState,
  onLibraryEntryBlocked,
  onLibraryInteractionChange,
  onSceneChange,
  resetSceneBridgeForTest,
} from '@/lib/scene/sceneBridge';
import type { ConfessionDetail, ConfessionLetter, ConfessionSummary } from '@/types/confession';

const { setLoginRequired } = vi.hoisted(() => ({
  setLoginRequired: vi.fn(),
}));

vi.mock('@/store/useChatStore', () => ({
  useChatStore: (selector: (state: { setLoginRequired: typeof setLoginRequired }) => unknown) =>
    selector({ setLoginRequired }),
}));

vi.mock('@/lib/api/confessions', () => ({
  createConfession: vi.fn(),
  getConfession: vi.fn(),
  listConfessions: vi.fn(),
  listLibrarianSimilarConfessions: vi.fn(),
  listReceivedLetters: vi.fn(),
  markAllReceivedLettersRead: vi.fn(),
  sendConfessionLetter: vi.fn(),
}));

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

  it('notifies library entry blocked listeners', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryEntryBlocked(listener);

    emitLibraryEntryBlocked();

    expect(listener).toHaveBeenCalledTimes(1);

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
    render(<MailNotification receivedCount={2} />);

    const mailButton = screen.getByRole('button', { name: /우편 알림 확인/ });
    const popoverId = mailButton.getAttribute('aria-controls');

    expect(mailButton).toBeInTheDocument();
    expect(mailButton.parentElement).toHaveClass('bottom-20');
    expect(mailButton).toHaveAccessibleName('우편 알림 확인, 새 알림 2개');
    expect(mailButton).toHaveAttribute('aria-expanded', 'false');
    expect(popoverId).toBeTruthy();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(mailButton);

    expect(screen.getByRole('status')).toHaveAttribute('id', popoverId);
    expect(screen.getByText('도착한 마음 2')).toBeInTheDocument();
    expect(screen.queryByText(/답장/)).not.toBeInTheDocument();
    expect(screen.queryByText('편지 전문')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '우편 알림 닫기' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('LibrarianInteraction', () => {
  it('renders no ring when the player is away from the librarian', () => {
    render(<LibrarianInteraction near={false} onSubmitBook={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /고민이 있으신가요/ })).not.toBeInTheDocument();
  });

  it('opens counseling and book submission choices near the librarian', async () => {
    const user = userEvent.setup();

    render(<LibrarianInteraction near={true} onSubmitBook={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: '고민 상담하기' }));

    expect(
      screen.getByText('고민 상담은 아직 준비 중입니다. 지금은 마음을 남겨둘 수 있어요.'),
    ).toBeInTheDocument();
  });

  it('hides the speech bubble while the librarian panel is open and restores it after close', async () => {
    const user = userEvent.setup();

    render(<LibrarianInteraction near={true} onSubmitBook={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));

    expect(screen.queryByRole('button', { name: /고민이 있으신가요/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.close }));

    expect(screen.getByRole('button', { name: /고민이 있으신가요/ })).toBeInTheDocument();
  });

  it('clears previous counseling feedback when the panel is reopened', async () => {
    const user = userEvent.setup();

    render(<LibrarianInteraction near={true} onSubmitBook={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.counseling }));
    expect(
      await screen.findByText('고민 상담은 아직 준비 중입니다. 지금은 마음을 남겨둘 수 있어요.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.close }));
    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));

    expect(
      screen.queryByText('고민 상담은 아직 준비 중입니다. 지금은 마음을 남겨둘 수 있어요.'),
    ).not.toBeInTheDocument();
  });
});
describe('LibrarianInteraction quality hardening', () => {
  it('submits a trimmed general book payload', async () => {
    const user = userEvent.setup();
    const onSubmitBook = vi.fn();

    render(<LibrarianInteraction near={true} onSubmitBook={onSubmitBook} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
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

    render(<LibrarianInteraction near={true} onSubmitBook={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
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

    render(<LibrarianInteraction near={true} onSubmitBook={onSubmitBook} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), '   ');
    await user.type(screen.getByLabelText('Book body'), '   ');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    expect(onSubmitBook).not.toHaveBeenCalled();
    expect(screen.getByText('제목과 내용을 모두 입력해 주세요.')).toBeInTheDocument();
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

    render(<LibrarianInteraction near={true} onSubmitBook={onSubmitBook} />);

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
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
      />,
    );

    await user.click(screen.getByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    expect(
      await screen.findByText('도서를 남기지 못했어요. 잠시 후 다시 시도해 주세요.'),
    ).toBeInTheDocument();
  });

  it('connects the trigger aria-expanded and aria-controls values to the opened panel', async () => {
    const user = userEvent.setup();

    render(<LibrarianInteraction near={true} onSubmitBook={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /고민이 있으신가요/ });

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

const makeReceivedLetter = (id: number, body = `도착한 마음 ${String(id)}`): ConfessionLetter => ({
  id,
  confessionId: 1,
  body,
  status: 'SENT' as const,
  authorReadAt: null,
  createdAt: '2026-05-30T00:00:00Z',
});

const makeSelectedBook = (id: number, receivedLetters: ConfessionLetter[] | null = null) => ({
  detail: makeBookDetail(id),
  receivedLetters,
});

const mockedCreateConfession = vi.mocked(createConfession);
const mockedGetConfession = vi.mocked(getConfession);
const mockedListConfessions = vi.mocked(listConfessions);
const mockedListLibrarianSimilarConfessions = vi.mocked(listLibrarianSimilarConfessions);
const mockedListReceivedLetters = vi.mocked(listReceivedLetters);
const mockedMarkAllReceivedLettersRead = vi.mocked(markAllReceivedLettersRead);
const mockedSendConfessionLetter = vi.mocked(sendConfessionLetter);

function setMemberToken() {
  localStorage.setItem('accessToken', `header.${btoa(JSON.stringify({ role: 'MEMBER' }))}.sig`);
}

function resetLibraryOverlayMocks() {
  setLoginRequired.mockReset();
  mockedCreateConfession.mockReset();
  mockedGetConfession.mockReset();
  mockedListConfessions.mockReset();
  mockedListLibrarianSimilarConfessions.mockReset();
  mockedListReceivedLetters.mockReset();
  mockedMarkAllReceivedLettersRead.mockReset();
  mockedSendConfessionLetter.mockReset();
  mockedListConfessions.mockResolvedValue([makeBook(1)]);
  mockedGetConfession.mockResolvedValue(makeBookDetail(1));
  mockedListLibrarianSimilarConfessions.mockResolvedValue([makeBook(2)]);
  mockedListReceivedLetters.mockRejectedValue({ response: { status: 403 } });
  mockedMarkAllReceivedLettersRead.mockResolvedValue(undefined);
  mockedCreateConfession.mockResolvedValue(makeBookDetail(3));
  mockedSendConfessionLetter.mockResolvedValue({
    id: 10,
    confessionId: 1,
    body: 'heart',
    status: 'SENT',
    authorReadAt: null,
    createdAt: '2026-05-30T00:00:00Z',
  });
  localStorage.clear();
}

function enterLibrary(interaction: LibraryInteractionState) {
  act(() => {
    emitSceneChange('library');
    emitLibraryInteractionChange(interaction);
  });
}

describe('LibraryOverlay composition', () => {
  beforeEach(() => {
    resetSceneBridgeForTest();
    resetMailRefreshBridgeForTest();
    resetLibraryOverlayMocks();
  });

  afterEach(() => {
    resetSceneBridgeForTest();
    resetMailRefreshBridgeForTest();
    localStorage.clear();
  });

  it('renders no object interactions outside the library scene', () => {
    render(<LibraryOverlay />);

    expect(screen.queryByRole('button', { name: /고민이 있으신가요/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.bookshelfAction }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /book panel/i })).not.toBeInTheDocument();
  });

  it('renders only the librarian trigger when near the librarian in the library scene', async () => {
    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: true, nearBookshelf: false });

    expect(await screen.findByRole('button', { name: /고민이 있으신가요/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.bookshelfAction }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /book panel/i })).not.toBeInTheDocument();
  });

  it('shows a login-required entry message when library entry is blocked', async () => {
    const user = userEvent.setup();

    render(<LibraryOverlay />);

    act(() => {
      emitLibraryEntryBlocked();
    });

    expect(await screen.findByText(/사서방은 로그인 후 이용할 수 있어요/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(setLoginRequired).toHaveBeenCalledWith(true);
  });

  it('renders the bookshelf trigger and opens loaded book data near the bookshelf', async () => {
    const user = userEvent.setup();

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: false, nearBookshelf: true });

    await waitFor(() => {
      expect(mockedListConfessions).toHaveBeenCalledWith('GENERAL');
    });

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(await screen.findByRole('button', { name: '책 1' }));

    expect(await screen.findByRole('heading', { name: '책 1' })).toBeInTheDocument();
    expect(screen.getByText('본문 1')).toBeInTheDocument();
    expect(mockedGetConfession).toHaveBeenCalledWith(1);
  });

  it('loads received letters for my own book and shows them in the shelf detail', async () => {
    const user = userEvent.setup();
    setMemberToken();
    const mailRefreshListener = vi.fn();
    const unsubscribe = onMailRefreshRequested(mailRefreshListener);
    mockedListReceivedLetters.mockResolvedValue([makeReceivedLetter(20, '누군가 남긴 마음')]);

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: false, nearBookshelf: true });
    await waitFor(() => {
      expect(mockedListConfessions).toHaveBeenCalledWith('GENERAL');
    });

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(await screen.findByRole('button', { name: '책 1' }));

    expect(await screen.findByText('받은 편지')).toBeInTheDocument();
    expect(screen.getByText('누군가 남긴 마음')).toBeInTheDocument();
    expect(mockedListReceivedLetters).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(mockedMarkAllReceivedLettersRead).toHaveBeenCalledTimes(1);
      expect(mailRefreshListener).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.sendHeart }),
    ).not.toBeInTheDocument();

    unsubscribe();
  });

  it('requires login and skips API writes when an anonymous user submits a book', async () => {
    const user = userEvent.setup();

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: true, nearBookshelf: false });
    await user.click(await screen.findByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    await waitFor(() => {
      expect(setLoginRequired).toHaveBeenCalledWith(true);
    });
    expect(mockedCreateConfession).not.toHaveBeenCalled();
  });

  it('requires login and skips API writes when an anonymous user sends a heart', async () => {
    const user = userEvent.setup();

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: false, nearBookshelf: true });
    await waitFor(() => {
      expect(mockedListConfessions).toHaveBeenCalledWith('GENERAL');
    });
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(await screen.findByRole('button', { name: '책 1' }));
    await screen.findByRole('heading', { name: '책 1' });
    await user.type(screen.getByLabelText('마음 내용'), 'heart');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart }));

    await waitFor(() => {
      expect(setLoginRequired).toHaveBeenCalledWith(true);
    });
    expect(mockedSendConfessionLetter).not.toHaveBeenCalled();
  });

  it('submits member books through the API and refreshes the shelf', async () => {
    const user = userEvent.setup();
    setMemberToken();

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: true, nearBookshelf: false });
    await user.click(await screen.findByRole('button', { name: /고민이 있으신가요/ }));
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.leaveBook }));
    await user.type(screen.getByLabelText('Book title'), 'title');
    await user.type(screen.getByLabelText('Book body'), 'body');
    await user.click(screen.getByRole('button', { name: '사서에게 맡기기' }));

    await waitFor(() => {
      expect(mockedCreateConfession).toHaveBeenCalledWith({
        title: 'title',
        body: 'body',
        bookshelf: 'GENERAL',
      });
    });
    expect(mockedListConfessions).toHaveBeenCalledTimes(2);
  });

  it('sends member hearts through the API and requests global mail refresh', async () => {
    const user = userEvent.setup();
    setMemberToken();
    const mailRefreshListener = vi.fn();
    const unsubscribe = onMailRefreshRequested(mailRefreshListener);

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: false, nearBookshelf: true });
    await waitFor(() => {
      expect(mockedListConfessions).toHaveBeenCalledWith('GENERAL');
    });
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(await screen.findByRole('button', { name: '책 1' }));
    await screen.findByRole('heading', { name: '책 1' });
    await user.type(screen.getByLabelText('마음 내용'), 'heart');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart }));

    await waitFor(() => {
      expect(mockedSendConfessionLetter).toHaveBeenCalledWith(1, 'heart');
    });
    await waitFor(() => {
      expect(mailRefreshListener).toHaveBeenCalledTimes(1);
    });

    unsubscribe();
  });

  it('keeps safe empty overlay state when initial library loads fail', async () => {
    const user = userEvent.setup();
    setMemberToken();
    mockedListConfessions.mockRejectedValue(new Error('books failed'));

    render(<LibraryOverlay />);

    enterLibrary({ nearLibrarian: false, nearBookshelf: true });
    await waitFor(() => {
      expect(mockedListConfessions).toHaveBeenCalledWith('GENERAL');
    });

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    expect(screen.queryByRole('button', { name: /book panel/i })).not.toBeInTheDocument();
  });
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(1))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    expect(screen.getByRole('dialog', { name: LIBRARY_LABELS.bookshelfTitle })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '책 1' }));

    expect(await screen.findByRole('heading', { name: '책 1' })).toBeInTheDocument();
    expect(screen.getByText('본문 1')).toBeInTheDocument();
  });

  it('hides the temporary bookshelf trigger while the panel is open and restores it after close', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(1)]}
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(1))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));

    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.bookshelfAction }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.close }));

    expect(
      screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }),
    ).toBeInTheDocument();
  });

  it('selecting a book calls onSelectBook with the book id', async () => {
    const user = userEvent.setup();
    const onSelectBook = vi.fn().mockResolvedValue(makeSelectedBook(2));

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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(3))}
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

  it('shows received letters instead of the heart form for my own book', async () => {
    const user = userEvent.setup();
    const letters = Array.from({ length: 6 }, (_, index) =>
      makeReceivedLetter(index + 1, `받은 마음 ${String(index + 1)}`),
    );

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(11)]}
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(11, letters))}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 11' }));

    expect(await screen.findByText('받은 편지')).toBeInTheDocument();
    expect(screen.getByText('받은 마음 1')).toBeInTheDocument();
    expect(screen.queryByText('받은 마음 6')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: LIBRARY_LABELS.sendHeart }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByText('받은 마음 6')).toBeInTheDocument();
  });

  it('moves to the next page when more than eight books are available', async () => {
    const user = userEvent.setup();
    const books = Array.from({ length: 9 }, (_, index) => makeBook(index + 1));

    render(
      <BookshelfInteraction
        near={true}
        books={books}
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(9))}
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

    expect(
      await screen.findByText('도서를 열지 못했어요. 잠시 후 다시 시도해 주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '책 4' })).not.toBeInTheDocument();
  });

  it('explains when sending a heart to my own book is denied', async () => {
    const user = userEvent.setup();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(5)]}
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(5))}
        onSendHeart={vi.fn().mockRejectedValue({ response: { status: 403 } })}
      />,
    );

    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.bookshelfAction }));
    await user.click(screen.getByRole('button', { name: '책 5' }));
    await screen.findByRole('heading', { name: '책 5' });
    await user.type(screen.getByLabelText('마음 내용'), '고마웠어요');
    await user.click(screen.getByRole('button', { name: LIBRARY_LABELS.sendHeart }));

    expect(
      await screen.findByText('내가 남긴 도서에는 마음을 보낼 수 없어요.'),
    ).toBeInTheDocument();
  });

  it('shows feedback from a normal click when an empty heart body is submitted', async () => {
    const user = userEvent.setup();
    const onSendHeart = vi.fn();

    render(
      <BookshelfInteraction
        near={true}
        books={[makeBook(6)]}
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(6))}
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
    expect(screen.getByText('마음 내용을 입력해 주세요.')).toBeInTheDocument();
  });

  it('prevents repeated book selection while the first selection is pending', async () => {
    const user = userEvent.setup();
    let resolveSelect: ((detail: ReturnType<typeof makeSelectedBook>) => void) | undefined;
    const onSelectBook = vi.fn(
      () =>
        new Promise<ReturnType<typeof makeSelectedBook>>((resolve) => {
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

    resolveSelect?.(makeSelectedBook(7));
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(9))}
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(1))}
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(1))}
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(10))}
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
        onSelectBook={vi.fn().mockResolvedValue(makeSelectedBook(1))}
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
