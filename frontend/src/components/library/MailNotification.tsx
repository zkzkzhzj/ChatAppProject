'use client';

import { useState } from 'react';

import { LIBRARY_LABELS } from './libraryLabels';

interface MailNotificationProps {
  receivedCount: number;
  replyCount: number;
}

export default function MailNotification({ receivedCount, replyCount }: MailNotificationProps) {
  const [open, setOpen] = useState(false);
  const total = receivedCount + replyCount;

  return (
    <div className="fixed right-4 bottom-24 z-20">
      <button
        type="button"
        aria-label={LIBRARY_LABELS.mailAriaLabel}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-warm-white text-bark shadow-lg ring-1 ring-sand/80 transition-transform hover:scale-105"
      >
        <span aria-hidden="true" className="text-lg">
          ✉
        </span>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-leaf px-1.5 text-xs font-semibold text-cream">
            {total}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 w-48 rounded border border-sand bg-cream/95 p-3 text-sm text-bark shadow-xl">
          <p>
            {LIBRARY_LABELS.receivedHeart} {receivedCount}
          </p>
          <p>
            {LIBRARY_LABELS.reply} {replyCount}
          </p>
          <p className="mt-2 text-xs text-bark-muted">자세한 내용은 도서를 열어 확인해 주세요.</p>
        </div>
      )}
    </div>
  );
}
