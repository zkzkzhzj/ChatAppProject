'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ConfessionDetail, ConfessionLetter, ConfessionSummary } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

const BOOKS_PER_PAGE = 8;
const LETTERS_PER_PAGE = 5;
const HEART_SUCCESS_MESSAGE = '마음이 조용히 전해졌어요.';
const SELECT_ERROR_MESSAGE = '도서를 열지 못했어요. 잠시 후 다시 시도해 주세요.';
const HEART_ERROR_MESSAGE = '마음을 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
const HEART_ACCESS_DENIED_MESSAGE = '내가 남긴 도서에는 마음을 보낼 수 없어요.';
const EMPTY_HEART_MESSAGE = '마음 내용을 입력해 주세요.';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface BookshelfInteractionProps {
  near: boolean;
  books: ConfessionSummary[];
  onSelectBook: (id: number) => Promise<SelectedBookResult>;
  onSendHeart: (id: number, body: string) => Promise<void> | void;
}

interface SelectedBookResult {
  detail: ConfessionDetail;
  receivedLetters: ConfessionLetter[] | null;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  );
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return undefined;
  }

  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null || !('status' in response)) {
    return undefined;
  }

  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function getHeartErrorMessage(error: unknown): string {
  return getHttpStatus(error) === 403 ? HEART_ACCESS_DENIED_MESSAGE : HEART_ERROR_MESSAGE;
}

export default function BookshelfInteraction({
  near,
  books,
  onSelectBook,
  onSendHeart,
}: BookshelfInteractionProps) {
  const panelId = useId();
  const panelTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ConfessionDetail | null>(null);
  const [receivedLetters, setReceivedLetters] = useState<ConfessionLetter[] | null>(null);
  const [letterPage, setLetterPage] = useState(0);
  const [heartBody, setHeartBody] = useState('');
  const [message, setMessage] = useState('');
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [sendingHeart, setSendingHeart] = useState(false);

  const pageCount = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));
  const effectivePage = Math.min(page, pageCount - 1);
  const currentBooks = useMemo(
    () =>
      books.slice(effectivePage * BOOKS_PER_PAGE, effectivePage * BOOKS_PER_PAGE + BOOKS_PER_PAGE),
    [books, effectivePage],
  );
  const receivedLetterCount = receivedLetters?.length ?? 0;
  const letterPageCount = Math.max(1, Math.ceil(receivedLetterCount / LETTERS_PER_PAGE));
  const effectiveLetterPage = Math.min(letterPage, letterPageCount - 1);
  const currentLetters = useMemo(
    () =>
      (receivedLetters ?? []).slice(
        effectiveLetterPage * LETTERS_PER_PAGE,
        effectiveLetterPage * LETTERS_PER_PAGE + LETTERS_PER_PAGE,
      ),
    [receivedLetters, effectiveLetterPage],
  );

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setLetterPage((current) => Math.min(current, letterPageCount - 1));
  }, [letterPageCount]);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setSelected(null);
    setReceivedLetters(null);
    setLetterPage(0);
    setMessage('');
    triggerRef.current?.focus();
  }, []);

  const handlePanelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePanel();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsOutsidePanel =
        !(activeElement instanceof HTMLElement) || !panel.contains(activeElement);

      if (event.shiftKey) {
        if (focusIsOutsidePanel || activeElement === panel || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (focusIsOutsidePanel || activeElement === panel || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [closePanel],
  );

  if (!near) return null;

  async function handleSelectBook(id: number) {
    if (selectingId !== null) return;

    setSelectingId(id);
    setMessage('');

    try {
      const result = await onSelectBook(id);
      setSelected(result.detail);
      setReceivedLetters(result.receivedLetters);
      setLetterPage(0);
      setHeartBody('');
    } catch {
      setMessage(SELECT_ERROR_MESSAGE);
    } finally {
      setSelectingId(null);
    }
  }

  async function handleSendHeart(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sendingHeart) return;

    const trimmedBody = heartBody.trim();
    if (!trimmedBody) {
      setMessage(EMPTY_HEART_MESSAGE);
      return;
    }

    setSendingHeart(true);
    setMessage('');

    try {
      await onSendHeart(selected.id, trimmedBody);
      setHeartBody('');
      setMessage(HEART_SUCCESS_MESSAGE);
    } catch (error) {
      setMessage(getHeartErrorMessage(error));
    } finally {
      setSendingHeart(false);
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-[560px] justify-end sm:inset-x-auto sm:right-20">
      <button
        ref={triggerRef}
        type="button"
        hidden={open}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
        }}
        className="h-12 rounded border-2 border-cream bg-bark px-4 text-sm font-semibold text-cream shadow-xl"
      >
        {LIBRARY_LABELS.bookshelfAction}
      </button>

      {open && (
        <section
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={panelTitleId}
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          className="library-bookshelf-zoom mt-3 max-h-[min(78vh,680px)] w-full overflow-y-auto rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl sm:w-[min(92vw,520px)]"
        >
          <header className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-4 bg-cream/95 pb-2">
            <h2 id={panelTitleId} className="truncate font-display text-xl">
              {LIBRARY_LABELS.bookshelfTitle}
            </h2>
            <button
              type="button"
              onClick={() => {
                closePanel();
              }}
              className="text-sm font-semibold text-bark"
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

              {receivedLetters ? (
                <div className="grid gap-3">
                  <h4 className="text-sm font-semibold">받은 편지</h4>
                  {currentLetters.length > 0 ? (
                    <div className="grid gap-2">
                      {currentLetters.map((letter) => (
                        <article
                          key={letter.id}
                          className="rounded border border-sand bg-warm-white p-3"
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6">{letter.body}</p>
                          <time className="mt-2 block text-xs text-bark-muted">
                            {new Date(letter.createdAt).toLocaleString()}
                          </time>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded border border-sand bg-warm-white p-3 text-sm text-bark-muted">
                      아직 도착한 편지가 없어요.
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={effectiveLetterPage === 0}
                      onClick={() => {
                        setLetterPage((current) => Math.max(0, current - 1));
                      }}
                      className="rounded border border-sand px-3 py-2 text-sm disabled:opacity-40"
                    >
                      이전
                    </button>
                    <span className="text-sm text-bark">
                      {effectiveLetterPage + 1} / {letterPageCount}
                    </span>
                    <button
                      type="button"
                      disabled={effectiveLetterPage >= letterPageCount - 1}
                      onClick={() => {
                        setLetterPage((current) => Math.min(letterPageCount - 1, current + 1));
                      }}
                      className="rounded border border-sand px-3 py-2 text-sm disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>
              ) : (
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
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingHeart}
                      className="rounded bg-bark px-3 py-2 text-sm font-semibold text-cream disabled:opacity-60"
                    >
                      {LIBRARY_LABELS.sendHeart}
                    </button>
                  </div>
                </form>
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
                  disabled={effectivePage === 0}
                  onClick={() => {
                    setPage((current) => Math.max(0, current - 1));
                  }}
                  className="rounded border border-sand px-3 py-2 text-sm disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-sm text-bark">
                  {effectivePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={effectivePage >= pageCount - 1}
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

          {message && (
            <p role="status" className="mt-4 text-sm font-semibold text-leaf-dark">
              {message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
