'use client';

import { SyntheticEvent, useId, useState } from 'react';

import type { ConfessionBookshelf } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

const BOOK_REQUIRED_MESSAGE = 'Title and body are required.';
const BOOK_SUBMIT_ERROR_MESSAGE = 'Could not submit book. Please try again.';
const COUNSELING_ERROR_MESSAGE = 'Could not request counseling. Please try again.';

interface LibrarianInteractionProps {
  near: boolean;
  onRequestCounseling: () => Promise<void> | void;
  onSubmitBook: (input: {
    title: string;
    body: string;
    bookshelf: ConfessionBookshelf;
  }) => Promise<void> | void;
}

export default function LibrarianInteraction({
  near,
  onRequestCounseling,
  onSubmitBook,
}: LibrarianInteractionProps) {
  const panelId = useId();
  const panelTitleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choices' | 'counseling' | 'write'>('choices');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<'counseling' | 'submit' | null>(null);

  if (!near) return null;

  async function handleCounseling() {
    if (pending) return;

    setPending('counseling');
    setMessage('');

    try {
      await onRequestCounseling();
      setMode('counseling');
      setMessage('비슷한 마음이 남겨져 있었어요.');
    } catch {
      setMessage(COUNSELING_ERROR_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setMessage(BOOK_REQUIRED_MESSAGE);
      return;
    }

    setPending('submit');
    setMessage('');

    try {
      await onSubmitBook({ title: trimmedTitle, body: trimmedBody, bookshelf: 'GENERAL' });
      setTitle('');
      setBody('');
      setMessage('사서가 조용히 도서를 받아 책장에 꽂아 두었어요.');
      setMode('choices');
    } catch {
      setMessage(BOOK_SUBMIT_ERROR_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="fixed left-1/2 bottom-8 z-30 -translate-x-1/2">
      <button
        type="button"
        aria-label={LIBRARY_LABELS.librarianAction}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          setMode('choices');
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cream bg-leaf text-cream shadow-xl"
      >
        <span aria-hidden="true">◎</span>
      </button>

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={panelTitleId}
          className="mt-3 w-[min(92vw,420px)] rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
        >
          <header className="mb-3 flex items-center justify-between">
            <h2 id={panelTitleId} className="font-display text-lg">
              {LIBRARY_LABELS.roomName} 사서
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
              className="text-sm text-bark-muted"
            >
              {LIBRARY_LABELS.close}
            </button>
          </header>

          {mode === 'choices' && (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void handleCounseling()}
                disabled={pending === 'counseling'}
                className="rounded bg-bark px-3 py-2 text-cream"
              >
                {LIBRARY_LABELS.counseling}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('write');
                }}
                className="rounded bg-sand px-3 py-2 text-bark"
              >
                {LIBRARY_LABELS.leaveBook}
              </button>
            </div>
          )}

          {mode === 'counseling' && <p className="text-sm leading-6">{message}</p>}

          {mode === 'write' && (
            <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-2">
              <input
                aria-label="Book title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                className="rounded border border-sand bg-warm-white px-3 py-2"
                placeholder="도서 제목"
                maxLength={120}
              />
              <textarea
                aria-label="Book body"
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                }}
                className="h-32 resize-none rounded border border-sand bg-warm-white p-3"
                placeholder="사서에게 맡길 마음"
                maxLength={3000}
              />
              <button
                type="submit"
                disabled={pending === 'submit'}
                className="rounded bg-bark px-3 py-2 text-cream"
              >
                사서에게 맡기기
              </button>
            </form>
          )}

          {message && mode !== 'counseling' && (
            <p role="status" className="mt-3 text-sm text-leaf-dark">
              {message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
