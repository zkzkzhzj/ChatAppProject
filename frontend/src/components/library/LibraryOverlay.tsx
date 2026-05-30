'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createConfession,
  getConfession,
  getThankReply,
  listConfessions,
  listNpcSimilarConfessions,
  listSentLetters,
  sendConfessionLetter,
} from '@/lib/api/confessions';
import {
  getSceneSnapshot,
  type LibraryInteractionState,
  onLibraryInteractionChange,
  onSceneChange,
  type SceneName,
} from '@/lib/scene/sceneBridge';
import { useChatStore } from '@/store/useChatStore';
import type { ConfessionBookshelf, ConfessionDetail, ConfessionSummary } from '@/types/confession';

import BookshelfInteraction from './BookshelfInteraction';
import LibrarianInteraction from './LibrarianInteraction';
import MailNotification from './MailNotification';

const LIBRARY_BOOKSHELF: ConfessionBookshelf = 'GENERAL';
const MAIL_REPLY_REFRESH_LIMIT = 20;

interface MailCounts {
  receivedCount: number;
  replyCount: number;
}

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

export default function LibraryOverlay() {
  const snapshot = getSceneSnapshot();
  const [scene, setScene] = useState<SceneName>(snapshot.scene);
  const [interaction, setInteraction] = useState<LibraryInteractionState>(snapshot.interaction);
  const [books, setBooks] = useState<ConfessionSummary[]>([]);
  const [mailCounts, setMailCounts] = useState<MailCounts>({
    receivedCount: 0,
    replyCount: 0,
  });
  const setLoginRequired = useChatStore((state) => state.setLoginRequired);

  const refreshBooks = useCallback(async () => {
    try {
      const items = await listConfessions(LIBRARY_BOOKSHELF);
      setBooks(items);
    } catch {
      setBooks([]);
    }
  }, []);

  const refreshMailCounts = useCallback(async () => {
    if (!hasMemberToken()) {
      setMailCounts({ receivedCount: 0, replyCount: 0 });
      return;
    }

    try {
      const sentLetters = await listSentLetters();
      // Bound prototype fan-out until the backend provides an aggregate reply count endpoint.
      const replies = await Promise.all(
        sentLetters.slice(0, MAIL_REPLY_REFRESH_LIMIT).map((letter) => getThankReply(letter.id)),
      );

      setMailCounts({
        // Backend has no global received-letter aggregate endpoint in the prototype.
        receivedCount: 0,
        replyCount: replies.filter((reply) => reply !== null).length,
      });
    } catch {
      setMailCounts({ receivedCount: 0, replyCount: 0 });
    }
  }, []);

  useEffect(() => {
    const unsubscribeScene = onSceneChange((nextScene) => {
      setScene(nextScene);

      if (nextScene === 'library') {
        void refreshBooks();
        void refreshMailCounts();
      }
    });
    const unsubscribeInteraction = onLibraryInteractionChange(setInteraction);

    return () => {
      unsubscribeScene();
      unsubscribeInteraction();
    };
  }, [refreshBooks, refreshMailCounts]);

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

  async function handleSelectBook(id: number): Promise<ConfessionDetail> {
    return getConfession(id);
  }

  async function handleSendHeart(id: number, body: string) {
    if (!hasMemberToken()) {
      setLoginRequired(true);
      return;
    }

    await sendConfessionLetter(id, body);
    await refreshMailCounts();
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
      <MailNotification
        receivedCount={mailCounts.receivedCount}
        replyCount={mailCounts.replyCount}
      />
    </>
  );
}
