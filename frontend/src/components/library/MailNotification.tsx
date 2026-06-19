'use client';

import { useId, useState } from 'react';

import { LIBRARY_LABELS } from './libraryLabels';

interface MailNotificationProps {
  receivedCount: number;
  embedded?: boolean;
}

export default function MailNotification({
  receivedCount,
  embedded = false,
}: MailNotificationProps) {
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const mailAriaLabel =
    receivedCount > 0
      ? `${LIBRARY_LABELS.mailAriaLabel}, 새 알림 ${String(receivedCount)}개`
      : LIBRARY_LABELS.mailAriaLabel;

  return (
    <div className={embedded ? 'relative' : 'fixed right-4 bottom-20 z-30'}>
      <button
        type="button"
        aria-label={mailAriaLabel}
        aria-controls={popoverId}
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
        }}
        className={`${embedded ? 'h-9 w-9' : 'h-12 w-12'} relative flex items-center justify-center rounded-full bg-warm-white text-bark shadow-lg ring-1 ring-sand/80 transition-transform hover:scale-105`}
      >
        <span aria-hidden="true" className={embedded ? 'text-base' : 'text-lg'}>
          ✉
        </span>
        {receivedCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-leaf px-1.5 text-xs font-semibold text-cream">
            {receivedCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={popoverId}
          role="status"
          className={`${embedded ? 'absolute right-0 bottom-12' : ''} w-56 rounded border border-sand bg-cream/95 p-3 text-sm text-bark shadow-xl`}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <strong className="text-sm">우편함</strong>
            <button
              type="button"
              aria-label="우편 알림 닫기"
              onClick={() => {
                setOpen(false);
              }}
              className="text-sm font-semibold text-bark-muted hover:text-bark"
            >
              ×
            </button>
          </div>
          <p>
            {LIBRARY_LABELS.receivedHeart} {receivedCount}
          </p>
          <p className="mt-2 text-xs text-bark-muted">자세한 내용은 도서를 열어 확인해 주세요.</p>
        </div>
      )}
    </div>
  );
}
