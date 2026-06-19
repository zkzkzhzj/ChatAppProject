'use client';

import { SyntheticEvent, useId, useState } from 'react';

import type { ConfessionBookshelf } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

const BOOK_REQUIRED_MESSAGE = '제목과 내용을 모두 입력해 주세요.';
const BOOK_SUBMIT_ERROR_MESSAGE = '도서를 남기지 못했어요. 잠시 후 다시 시도해 주세요.';
const COUNSELING_READY_MESSAGE = '고민 상담은 아직 준비 중입니다. 지금은 마음을 남겨둘 수 있어요.';
const DEFAULT_BOOKSHELF: ConfessionBookshelf = 'GENERAL';

interface LibrarianInteractionProps {
  near: boolean;
  onSubmitBook: (input: {
    title: string;
    body: string;
    bookshelf: ConfessionBookshelf;
  }) => Promise<void> | void;
}

export default function LibrarianInteraction({ near, onSubmitBook }: LibrarianInteractionProps) {
  const panelId = useId();
  const panelTitleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choices' | 'counseling' | 'write'>('choices');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<'counseling' | 'submit' | null>(null);

  if (!near) return null;

  function handleCounseling() {
    if (pending) return;

    setMode('counseling');
    setMessage(COUNSELING_READY_MESSAGE);
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
      await onSubmitBook({ title: trimmedTitle, body: trimmedBody, bookshelf: DEFAULT_BOOKSHELF });
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
    <div className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-[420px] justify-center sm:left-1/2 sm:right-auto sm:bottom-8 sm:block sm:-translate-x-1/2">
      <button
        type="button"
        hidden={open}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          setMode('choices');
          setMessage('');
        }}
        className="relative max-w-[min(86vw,360px)] rounded border-2 border-cream bg-warm-white px-4 py-3 text-left text-sm font-semibold leading-5 text-bark shadow-xl"
      >
        <span className="block">고민이 있으신가요?</span>
        <span className="block text-bark-muted">괜찮다면 사서에게 남겨보시겠어요?</span>
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-cream bg-warm-white"
        />
      </button>

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={panelTitleId}
          className="mt-3 max-h-[min(78vh,640px)] w-full overflow-y-auto rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl sm:w-[min(92vw,420px)]"
        >
          <header className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 bg-cream/95 pb-2">
            <h2 id={panelTitleId} className="truncate font-display text-lg">
              {LIBRARY_LABELS.roomName} 사서
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage('');
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
                onClick={handleCounseling}
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
