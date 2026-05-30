'use client';

import { SyntheticEvent, useState } from 'react';

import type { ConfessionBookshelf } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

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
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choices' | 'counseling' | 'write'>('choices');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  if (!near) return null;

  async function handleCounseling() {
    await onRequestCounseling();
    setMode('counseling');
    setMessage('비슷한 마음이 남겨져 있었어요.');
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitBook({ title, body, bookshelf: 'GENERAL' });
    setTitle('');
    setBody('');
    setMessage('사서가 조용히 도서를 받아 책장에 꽂아 두었어요.');
    setMode('choices');
  }

  return (
    <div className="fixed left-1/2 bottom-8 z-30 -translate-x-1/2">
      <button
        type="button"
        aria-label={LIBRARY_LABELS.librarianAction}
        onClick={() => {
          setOpen(true);
          setMode('choices');
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cream bg-leaf text-cream shadow-xl"
      >
        <span aria-hidden="true">◎</span>
      </button>

      {open && (
        <section className="mt-3 w-[min(92vw,420px)] rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">{LIBRARY_LABELS.roomName} 사서</h2>
            <button
              type="button"
              onClick={() => { setOpen(false); }}
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
                className="rounded bg-bark px-3 py-2 text-cream"
              >
                {LIBRARY_LABELS.counseling}
              </button>
              <button
                type="button"
                onClick={() => { setMode('write'); }}
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
                value={title}
                onChange={(event) => { setTitle(event.target.value); }}
                className="rounded border border-sand bg-warm-white px-3 py-2"
                placeholder="도서 제목"
                maxLength={120}
              />
              <textarea
                value={body}
                onChange={(event) => { setBody(event.target.value); }}
                className="h-32 resize-none rounded border border-sand bg-warm-white p-3"
                placeholder="사서에게 맡길 마음"
                maxLength={3000}
              />
              <button type="submit" className="rounded bg-bark px-3 py-2 text-cream">
                사서에게 맡기기
              </button>
            </form>
          )}

          {message && mode !== 'counseling' && (
            <p className="mt-3 text-sm text-leaf-dark">{message}</p>
          )}
        </section>
      )}
    </div>
  );
}
