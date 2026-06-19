'use client';

import { useCallback, useEffect, useState } from 'react';

import { getUnreadReceivedLetterCount } from '@/lib/api/confessions';
import { hasMemberToken } from '@/lib/auth/member-token';
import { onMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';

import MailNotification from './MailNotification';

interface MailCounts {
  receivedCount: number;
}

export default function GlobalMailNotification() {
  const [mailCounts, setMailCounts] = useState<MailCounts>({
    receivedCount: 0,
  });

  const refreshMailCounts = useCallback(async () => {
    if (!hasMemberToken()) {
      setMailCounts({ receivedCount: 0 });
      return;
    }

    try {
      const unreadReceivedCount = await getUnreadReceivedLetterCount();

      setMailCounts({
        receivedCount: unreadReceivedCount,
      });
    } catch {
      setMailCounts({ receivedCount: 0 });
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

  return <MailNotification receivedCount={mailCounts.receivedCount} />;
}
