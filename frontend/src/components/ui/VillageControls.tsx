'use client';

import { useEffect, useState } from 'react';

import { hasMemberToken } from '@/lib/auth/member-token';
import { emitDisplayIdChange } from '@/lib/websocket/tokenBridge';
import { useChatStore } from '@/store/useChatStore';

export default function VillageControls() {
  const [guideOpen, setGuideOpen] = useState(false);
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
      return;
    }

    localStorage.removeItem('accessToken');
    emitDisplayIdChange(null);
    window.location.reload();
  };

  return (
    <>
      <div className="fixed right-4 bottom-56 z-20 grid gap-2">
        <button
          type="button"
          onClick={handleAuthClick}
          className="h-10 rounded-full bg-cream/95 px-4 text-sm font-semibold text-bark shadow-lg ring-1 ring-sand/70 backdrop-blur-sm transition-transform hover:scale-105"
        >
          {member ? '로그아웃' : '로그인'}
        </button>
        <button
          type="button"
          onClick={() => {
            setGuideOpen(true);
          }}
          className="h-10 rounded-full bg-cream/95 px-4 text-sm font-semibold text-bark shadow-lg ring-1 ring-sand/70 backdrop-blur-sm transition-transform hover:scale-105"
        >
          가이드
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
