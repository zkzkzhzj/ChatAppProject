import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
