'use client';

import { SyntheticEvent, useId, useMemo, useState } from 'react';

import type { ConfessionDetail, ConfessionSummary } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

const BOOKS_PER_PAGE = 8;
const HEART_SUCCESS_MESSAGE = '마음이 조용히 전해졌어요.';

interface BookshelfInteractionProps {
  near: boolean;
  books: ConfessionSummary[];
  onSelectBook: (id: number) => Promise<ConfessionDetail>;
  onSendHeart: (id: number, body: string) => Promise<void> | void;
}

export default function BookshelfInteraction({
  near,
  books,
  onSelectBook,
  onSendHeart,
}: BookshelfInteractionProps) {
  const panelId = useId();
  const panelTitleId = useId();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ConfessionDetail | null>(null);
  const [heartBody, setHeartBody] = useState('');
  const [message, setMessage] = useState('');
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [sendingHeart, setSendingHeart] = useState(false);

  const pageCount = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
  const currentBooks = useMemo(
    () => books.slice(page * BOOKS_PER_PAGE, page * BOOKS_PER_PAGE + BOOKS_PER_PAGE),
    [books, page],
  );

  if (!near) return null;

  async function handleSelectBook(id: number) {
    if (selectingId !== null) return;

    setSelectingId(id);
    setMessage('');

    try {
      const detail = await onSelectBook(id);
      setSelected(detail);
      setHeartBody('');
    } finally {
      setSelectingId(null);
    }
  }

  async function handleSendHeart(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sendingHeart) return;

    const trimmedBody = heartBody.trim();
    if (!trimmedBody) return;

    setSendingHeart(true);
    setMessage('');

    try {
      await onSendHeart(selected.id, trimmedBody);
      setHeartBody('');
      setMessage(HEART_SUCCESS_MESSAGE);
    } finally {
      setSendingHeart(false);
    }
  }

  return (
    <div className="fixed right-6 bottom-8 z-30">
      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
        }}
        className="rounded border-2 border-cream bg-bark px-4 py-3 text-sm font-semibold text-cream shadow-xl"
      >
        {LIBRARY_LABELS.bookshelfAction}
      </button>

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-labelledby={panelTitleId}
          className="library-bookshelf-zoom mt-3 w-[min(92vw,520px)] rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
        >
          <header className="mb-4 flex items-center justify-between gap-4">
            <h2 id={panelTitleId} className="font-display text-xl">
              {LIBRARY_LABELS.bookshelfTitle}
            </h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelected(null);
                setMessage('');
              }}
              className="text-sm text-bark-muted"
            >
              {LIBRARY_LABELS.close}
            </button>
          </header>

          {selected ? (
            <article className="grid gap-4">
              <div className="rounded border border-sand bg-warm-white p-4">
                <h3 className="font-display text-lg">{selected.title}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.body}</p>
              </div>

              <form onSubmit={(event) => void handleSendHeart(event)} className="grid gap-2">
                <label className="text-sm font-semibold" htmlFor={`${panelId}-heart-body`}>
                  마음 내용
                </label>
                <textarea
                  id={`${panelId}-heart-body`}
                  value={heartBody}
                  onChange={(event) => {
                    setHeartBody(event.target.value);
                  }}
                  className="h-24 resize-none rounded border border-sand bg-warm-white p-3"
                  maxLength={1000}
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setHeartBody('');
                      setMessage('');
                    }}
                    className="rounded border border-sand px-3 py-2 text-sm text-bark"
                  >
                    {LIBRARY_LABELS.close}
                  </button>
                  <button
                    type="submit"
                    disabled={sendingHeart}
                    className="rounded bg-leaf px-3 py-2 text-sm font-semibold text-cream disabled:opacity-60"
                  >
                    {LIBRARY_LABELS.sendHeart}
                  </button>
                </div>
              </form>

              {message && (
                <p role="status" className="text-sm text-leaf-dark">
                  {message}
                </p>
              )}
            </article>
          ) : (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {currentBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    aria-label={book.title}
                    disabled={selectingId !== null}
                    onClick={() => void handleSelectBook(book.id)}
                    className="min-h-24 rounded border border-bark/20 bg-sand px-3 py-4 text-left text-sm font-semibold text-bark shadow-sm disabled:opacity-60"
                  >
                    <span className="line-clamp-3">{book.title}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((current) => Math.max(0, current - 1));
                  }}
                  className="rounded border border-sand px-3 py-2 text-sm disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-sm text-bark-muted">
                  {page + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount - 1}
                  onClick={() => {
                    setPage((current) => Math.min(pageCount - 1, current + 1));
                  }}
                  className="rounded border border-sand px-3 py-2 text-sm disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
