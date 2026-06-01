'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createConfession,
  getConfession,
  listConfessions,
  listNpcSimilarConfessions,
  listReceivedLetters,
  sendConfessionLetter,
} from '@/lib/api/confessions';
import { emitMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';
import {
  getSceneSnapshot,
  type LibraryInteractionState,
  onLibraryEntryBlocked,
  onLibraryInteractionChange,
  onSceneChange,
  type SceneName,
} from '@/lib/scene/sceneBridge';
import { useChatStore } from '@/store/useChatStore';
import type {
  ConfessionBookshelf,
  ConfessionDetail,
  ConfessionLetter,
  ConfessionSummary,
} from '@/types/confession';

import BookshelfInteraction from './BookshelfInteraction';
import LibrarianInteraction from './LibrarianInteraction';
import { LIBRARY_LABELS } from './libraryLabels';

const LIBRARY_BOOKSHELF: ConfessionBookshelf = 'GENERAL';

function decodeJwtPayload(token: string): unknown {
  const payload = token.split('.')[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  return JSON.parse(atob(padded));
}

function hasMemberToken(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const token = window.localStorage.getItem('accessToken');
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'role' in payload &&
      (payload as { role?: unknown }).role === 'MEMBER'
    );
  } catch {
    return false;
  }
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

export default function LibraryOverlay() {
  const snapshot = getSceneSnapshot();
  const [scene, setScene] = useState<SceneName>(snapshot.scene);
  const [interaction, setInteraction] = useState<LibraryInteractionState>(snapshot.interaction);
  const [books, setBooks] = useState<ConfessionSummary[]>([]);
  const [entryBlocked, setEntryBlocked] = useState(false);
  const setLoginRequired = useChatStore((state) => state.setLoginRequired);

  const refreshBooks = useCallback(async () => {
    try {
      const items = await listConfessions(LIBRARY_BOOKSHELF);
      setBooks(items);
    } catch {
      setBooks([]);
    }
  }, []);

  useEffect(() => {
    const unsubscribeScene = onSceneChange((nextScene) => {
      setScene(nextScene);

      if (nextScene === 'library') {
        setEntryBlocked(false);
        void refreshBooks();
      }
    });
    const unsubscribeInteraction = onLibraryInteractionChange(setInteraction);
    const unsubscribeEntryBlocked = onLibraryEntryBlocked(() => {
      setEntryBlocked(true);
    });

    return () => {
      unsubscribeScene();
      unsubscribeInteraction();
      unsubscribeEntryBlocked();
    };
  }, [refreshBooks]);

  async function handleRequestCounseling() {
    await listNpcSimilarConfessions(LIBRARY_BOOKSHELF);
  }

  async function handleSubmitBook(input: {
    title: string;
    body: string;
    bookshelf: ConfessionBookshelf;
  }) {
    if (!hasMemberToken()) {
      setLoginRequired(true);
      return;
    }

    await createConfession(input);
    await refreshBooks();
  }

  async function handleSelectBook(
    id: number,
  ): Promise<{ detail: ConfessionDetail; receivedLetters: ConfessionLetter[] | null }> {
    const detail = await getConfession(id);
    if (!hasMemberToken()) {
      return { detail, receivedLetters: null };
    }

    try {
      const receivedLetters = await listReceivedLetters(id);
      return { detail, receivedLetters };
    } catch (error) {
      if (getHttpStatus(error) !== 403) {
        throw error;
      }
      return { detail, receivedLetters: null };
    }
  }

  async function handleSendHeart(id: number, body: string) {
    if (!hasMemberToken()) {
      setLoginRequired(true);
      return;
    }

    await sendConfessionLetter(id, body);
    emitMailRefreshRequested();
  }

  if (entryBlocked) {
    return (
      <div className="fixed inset-x-4 bottom-20 z-40 mx-auto w-[min(92vw,420px)] rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl">
        <h2 className="font-display text-lg">사서방은 로그인 후 이용할 수 있어요</h2>
        <p className="mt-2 text-sm leading-6 text-bark-muted">
          남긴 마음과 답장을 안전하게 보관하기 위해 로그인이 필요합니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEntryBlocked(false);
            }}
            className="rounded border border-sand px-3 py-2 text-sm font-semibold text-bark"
          >
            {LIBRARY_LABELS.close}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginRequired(true);
            }}
            className="rounded bg-bark px-3 py-2 text-sm font-semibold text-cream"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (scene !== 'library') return null;

  return (
    <>
      <LibrarianInteraction
        near={interaction.nearLibrarian}
        onRequestCounseling={handleRequestCounseling}
        onSubmitBook={handleSubmitBook}
      />
      <BookshelfInteraction
        near={interaction.nearBookshelf}
        books={books}
        onSelectBook={handleSelectBook}
        onSendHeart={handleSendHeart}
      />
    </>
  );
}
