'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  getThankReply,
  getUnreadReceivedLetterCount,
  listSentLetters,
} from '@/lib/api/confessions';
import { hasMemberToken } from '@/lib/auth/member-token';
import { onMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';

import MailNotification from './MailNotification';

const MAIL_REPLY_REFRESH_LIMIT = 20;

interface MailCounts {
  receivedCount: number;
  replyCount: number;
}

export default function GlobalMailNotification() {
  const [mailCounts, setMailCounts] = useState<MailCounts>({
    receivedCount: 0,
    replyCount: 0,
  });

  const refreshMailCounts = useCallback(async () => {
    if (!hasMemberToken()) {
      setMailCounts({ receivedCount: 0, replyCount: 0 });
      return;
    }

    try {
      const [unreadReceivedCount, sentLetters] = await Promise.all([
        getUnreadReceivedLetterCount(),
        listSentLetters(),
      ]);
      // Bound prototype fan-out until the backend provides an aggregate reply count endpoint.
      const replies = await Promise.all(
        sentLetters.slice(0, MAIL_REPLY_REFRESH_LIMIT).map((letter) => getThankReply(letter.id)),
      );

      setMailCounts({
        receivedCount: unreadReceivedCount,
        replyCount: replies.filter((reply) => reply !== null).length,
      });
    } catch {
      setMailCounts({ receivedCount: 0, replyCount: 0 });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshMailCounts();
    }, 0);
    const unsubscribe = onMailRefreshRequested(() => {
      void refreshMailCounts();
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [refreshMailCounts]);

  return (
    <MailNotification receivedCount={mailCounts.receivedCount} replyCount={mailCounts.replyCount} />
  );
}
