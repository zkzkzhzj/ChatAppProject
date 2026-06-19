'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import MailNotification from '@/components/library/MailNotification';
import { getUnreadReceivedLetterCount } from '@/lib/api/confessions';
import { hasMemberToken } from '@/lib/auth/member-token';
import { onMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';
import { emitDisplayIdChange } from '@/lib/websocket/tokenBridge';
import { useChatStore } from '@/store/useChatStore';
import type { SceneManager } from '@/three/SceneManager';

import AudioControls from './AudioControls';

interface FloatingActionMenuProps {
  sceneManager: SceneManager | null;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
}

interface MailCounts {
  receivedCount: number;
}

const actionClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-cream/95 text-bark shadow-lg backdrop-blur-sm transition-transform hover:scale-105';

const slots = [
  { x: -22, y: -118 },
  { x: -76, y: -96 },
  { x: -108, y: -45 },
  { x: -108, y: 25 },
  { x: -76, y: 78 },
] as const;

export default function FloatingActionMenu({
  sceneManager,
  chatOpen,
  onChatOpenChange,
}: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [member, setMember] = useState(false);
  const [mailCounts, setMailCounts] = useState<MailCounts>({ receivedCount: 0 });
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);

  useEffect(() => {
    const sync = () => {
      setMember(hasMemberToken());
    };
    sync();
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
    };
  }, []);

  const refreshMailCounts = useCallback(async () => {
    if (!hasMemberToken()) {
      setMailCounts({ receivedCount: 0 });
      return;
    }

    try {
      setMailCounts({ receivedCount: await getUnreadReceivedLetterCount() });
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

  const handleAuthClick = () => {
    setOpen(false);
    if (!member) {
      setLoginRequired(true);
      return;
    }

    localStorage.removeItem('accessToken');
    emitDisplayIdChange(null);
    window.location.reload();
  };

  const renderSlot = (index: number, child: ReactNode) => {
    const slot = slots[index];
    return (
      <div
        className="absolute right-1 bottom-1 transition-all duration-200 ease-out"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transitionDelay: open
            ? `${String(index * 35)}ms`
            : `${String((slots.length - index) * 20)}ms`,
          transform: open
            ? `translate(${String(slot.x)}px, ${String(slot.y)}px) scale(1)`
            : 'translate(0, 0) scale(0.72)',
        }}
      >
        {child}
      </div>
    );
  };

  if (chatOpen && !guideOpen) return null;

  return (
    <>
      <div
        className="fixed z-40"
        style={{
          right: 'calc(1rem + env(safe-area-inset-right))',
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {renderSlot(
          0,
          <button
            type="button"
            onClick={() => {
              onChatOpenChange(!chatOpen);
              setOpen(false);
            }}
            aria-label="채팅 내역"
            title="채팅 내역"
            className={`${actionClass} bg-leaf/90 text-cream`}
          >
            <ChatIcon />
          </button>,
        )}
        {renderSlot(1, <MailNotification receivedCount={mailCounts.receivedCount} embedded />)}
        {renderSlot(2, <AudioControls sceneManager={sceneManager} embedded />)}
        {renderSlot(
          3,
          <button
            type="button"
            onClick={handleAuthClick}
            aria-label={member ? '로그아웃' : '로그인'}
            title={member ? '로그아웃' : '로그인'}
            className={actionClass}
          >
            {member ? <LogOutIcon /> : <LogInIcon />}
          </button>,
        )}
        {renderSlot(
          4,
          <button
            type="button"
            onClick={() => {
              setGuideOpen(true);
              setOpen(false);
            }}
            aria-label="가이드"
            title="가이드"
            className={actionClass}
          >
            <GuideIcon />
          </button>,
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
          }}
          aria-label="마을 메뉴"
          aria-expanded={open}
          title="마을 메뉴"
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-bark text-cream shadow-xl ring-1 ring-cream/40 backdrop-blur-sm transition-transform hover:scale-105"
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="마을 이용 가이드"
            className="w-[min(92vw,420px)] rounded border border-sand bg-cream p-5 text-bark shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-lg">마을 이용 가이드</h2>
              <button
                type="button"
                aria-label="가이드 닫기"
                onClick={() => {
                  setGuideOpen(false);
                }}
                className="text-sm font-semibold text-bark-muted hover:text-bark"
              >
                닫기
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-bark-muted">
              <p>
                마음의 고향은 쉽게 말하지 못한 고민과 마음을 조용히 남기고, 언젠가 작은 답장을 받을
                수 있도록 만든 마을입니다.
              </p>
              <p>
                고민 상담은 사서방의 사서에게 말을 걸어 이용할 수 있습니다. 지금은 마음을 책장에
                남기는 기능부터 열려 있고, 상담 안내는 차근차근 준비 중입니다.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ChatIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 1 1 5.8 1c-.5 1.4-2.2 1.8-2.7 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform duration-200"
      style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </>
      )}
    </svg>
  );
}
