'use client';

import { useEffect, useState } from 'react';

import { hasMemberToken } from '@/lib/auth/member-token';
import { emitDisplayIdChange } from '@/lib/websocket/tokenBridge';
import { useChatStore } from '@/store/useChatStore';

export default function VillageControls() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [member, setMember] = useState(false);
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

  const handleAuthClick = () => {
    if (!member) {
      setLoginRequired(true);
      setMenuOpen(false);
      return;
    }

    localStorage.removeItem('accessToken');
    emitDisplayIdChange(null);
    window.location.reload();
  };

  return (
    <>
      <div
        className="fixed z-20"
        style={{
          right: 'calc(1rem + env(safe-area-inset-right))',
          bottom: 'calc(208px + env(safe-area-inset-bottom))',
        }}
      >
        {menuOpen && (
          <div className="absolute right-0 bottom-14">
            <button
              type="button"
              onClick={handleAuthClick}
              aria-label={member ? '로그아웃' : '로그인'}
              title={member ? '로그아웃' : '로그인'}
              className="absolute right-0 bottom-0 flex h-10 w-10 items-center justify-center rounded-full bg-cream/95 text-bark shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
            >
              {member ? <LogOutIcon /> : <LogInIcon />}
            </button>
            <button
              type="button"
              onClick={() => {
                setGuideOpen(true);
                setMenuOpen(false);
              }}
              aria-label="가이드"
              title="가이드"
              className="absolute right-12 bottom-3 flex h-10 w-10 items-center justify-center rounded-full bg-cream/95 text-bark shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
            >
              <GuideIcon />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setMenuOpen((open) => !open);
          }}
          aria-label="마을 메뉴"
          aria-expanded={menuOpen}
          title="마을 메뉴"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/95 text-bark shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
        >
          <MenuIcon />
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
                마음의 고향은 쉽게 말하지 못한 고민과 마음을 조용히 남기고, 누군가의 작은 답장을
                받을 수 있도록 만든 마을입니다.
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

function LogInIcon() {
  return (
    <svg
      width={20}
      height={20}
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
      width={20}
      height={20}
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
      width={20}
      height={20}
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

function MenuIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
