'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createSuggestion,
  getTodayDashboard,
  listSuggestions,
  recordTodayVisit,
} from '@/lib/api/village-board';
import { hasMemberToken } from '@/lib/auth/member-token';
import {
  getSceneSnapshot,
  onSceneChange,
  onVillageBoardInteractionChange,
  type SceneName,
  type VillageBoardInteractionState,
} from '@/lib/scene/sceneBridge';
import type { Suggestion, VillageDashboard } from '@/types/village-board';

const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 1000;

type Panel = 'suggestions' | null;

export default function VillageBoardOverlay() {
  const snapshot = getSceneSnapshot();
  const [scene, setScene] = useState<SceneName>(snapshot.scene);
  const [interaction, setInteraction] = useState<VillageBoardInteractionState>(
    snapshot.villageBoardInteraction,
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [dashboard, setDashboard] = useState<VillageDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openedSuggestion, setOpenedSuggestion] = useState<Suggestion | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const canCreateSuggestion = hasMemberToken();
  const latestSuggestion = useMemo(() => suggestions[0] ?? null, [suggestions]);

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboard(await getTodayDashboard());
    } catch {
      setDashboard(null);
    }
  }, []);

  const refreshSuggestions = useCallback(async () => {
    try {
      setSuggestions(await listSuggestions());
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    void recordTodayVisit()
      .then((result) => {
        setDashboard(result);
      })
      .catch(() => {
        setDashboard(null);
      });
    void refreshSuggestions();
  }, [refreshSuggestions]);

  useEffect(() => {
    const unsubscribeScene = onSceneChange((nextScene) => {
      setScene(nextScene);
      if (nextScene !== 'village') {
        setPanel(null);
        setOpenedSuggestion(null);
      }
    });
    const unsubscribeInteraction = onVillageBoardInteractionChange((nextInteraction) => {
      setInteraction(nextInteraction);
      if (!nextInteraction.nearDashboard && !nextInteraction.nearSuggestionBoard) {
        setPanel(null);
      }
    });

    return () => {
      unsubscribeScene();
      unsubscribeInteraction();
    };
  }, []);

  useEffect(() => {
    if (scene !== 'village') return;
    if (interaction.nearDashboard) {
      void refreshDashboard();
    }
    if (interaction.nearSuggestionBoard) {
      void refreshSuggestions();
    }
  }, [
    interaction.nearDashboard,
    interaction.nearSuggestionBoard,
    refreshDashboard,
    refreshSuggestions,
    scene,
  ]);

  async function openSuggestions() {
    setPanel('suggestions');
    setMessage('');
    await refreshSuggestions();
  }

  async function handleSubmitSuggestion() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!canCreateSuggestion || !trimmedTitle || !trimmedBody || saving) return;

    setSaving(true);
    setMessage('');
    try {
      await createSuggestion({ title: trimmedTitle, body: trimmedBody });
      setTitle('');
      setBody('');
      setMessage('건의사항을 등록했어요.');
      await refreshSuggestions();
    } catch {
      setMessage('건의사항을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  if (scene !== 'village') return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-[520px] flex-col items-start gap-3 sm:left-4 sm:right-auto sm:mx-0">
        {!panel && interaction.nearDashboard && <DashboardPreview dashboard={dashboard} />}

        {!panel && interaction.nearSuggestionBoard && (
          <SuggestionPreview
            latestSuggestion={latestSuggestion}
            onOpenBoard={() => void openSuggestions()}
            onOpenSuggestion={setOpenedSuggestion}
          />
        )}

        {panel === 'suggestions' && (
          <section
            role="dialog"
            aria-label="건의 게시판"
            className="pointer-events-auto flex max-h-[min(78vh,620px)] w-full min-w-0 flex-col overflow-hidden rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg">건의 게시판</h2>
                <p className="mt-1 text-xs text-bark-muted">마을에 남기는 작은 제안</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                }}
                className="shrink-0 rounded border border-sand px-3 py-1.5 text-sm font-semibold"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 shrink-0 space-y-2">
              {canCreateSuggestion ? (
                <>
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                    }}
                    maxLength={TITLE_MAX_LENGTH}
                    placeholder="제목"
                    className="w-full rounded border border-sand bg-warm-white px-3 py-2 text-sm outline-none"
                  />
                  <textarea
                    value={body}
                    onChange={(event) => {
                      setBody(event.target.value);
                    }}
                    maxLength={BODY_MAX_LENGTH}
                    placeholder="내용"
                    rows={4}
                    className="w-full resize-none rounded border border-sand bg-warm-white px-3 py-2 text-sm leading-6 outline-none"
                  />
                  <div className="flex items-center justify-between gap-3 text-xs text-bark-muted">
                    <span>
                      제목 {title.length} / {TITLE_MAX_LENGTH} · 내용 {body.length} /{' '}
                      {BODY_MAX_LENGTH}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleSubmitSuggestion()}
                      disabled={!title.trim() || !body.trim() || saving}
                      className="shrink-0 rounded bg-bark px-3 py-2 text-sm font-semibold text-cream disabled:opacity-50"
                    >
                      등록
                    </button>
                  </div>
                </>
              ) : (
                <p className="rounded border border-dashed border-sand bg-warm-white/70 px-3 py-3 text-sm text-bark-muted">
                  건의사항 등록은 로그인한 이웃만 할 수 있어요. 게시글은 누구나 볼 수 있습니다.
                </p>
              )}
              {message && (
                <p role="status" className="text-sm font-semibold text-leaf-dark">
                  {message}
                </p>
              )}
            </div>

            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1">
              {suggestions.length === 0 ? (
                <p className="rounded border border-dashed border-sand px-3 py-4 text-center text-sm text-bark-muted">
                  아직 등록된 건의사항이 없어요.
                </p>
              ) : (
                suggestions.map((suggestion) => (
                  <SuggestionListItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    onOpen={setOpenedSuggestion}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {openedSuggestion && (
        <SuggestionDetailDialog
          suggestion={openedSuggestion}
          onClose={() => {
            setOpenedSuggestion(null);
          }}
        />
      )}
    </>
  );
}

function DashboardPreview({ dashboard }: { dashboard: VillageDashboard | null }) {
  return (
    <section
      aria-label="오늘의 방문자"
      className="pointer-events-auto min-h-[148px] w-full min-w-0 rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg">오늘의 방문자</h2>
          <p className="mt-1 text-xs text-bark-muted">{dashboard?.date ?? '오늘'} 기준</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="손님" value={dashboard?.guestCount ?? 0} />
        <Stat label="이웃" value={dashboard?.memberCount ?? 0} />
        <Stat label="총 방문" value={dashboard?.totalCount ?? 0} />
        <Stat label="오늘의 마음" value={dashboard?.confessionCount ?? 0} />
      </div>
    </section>
  );
}

function SuggestionPreview({
  latestSuggestion,
  onOpenBoard,
  onOpenSuggestion,
}: {
  latestSuggestion: Suggestion | null;
  onOpenBoard: () => void;
  onOpenSuggestion: (suggestion: Suggestion) => void;
}) {
  return (
    <section
      aria-label="건의 게시판 미리보기"
      className="pointer-events-auto min-h-[148px] w-full min-w-0 rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg">건의 게시판</h2>
          <p className="mt-1 text-xs text-bark-muted">최근 등록된 제안</p>
        </div>
        <button
          type="button"
          onClick={onOpenBoard}
          className="shrink-0 rounded border border-sand px-3 py-1.5 text-sm font-semibold"
        >
          열기
        </button>
      </div>
      {latestSuggestion ? (
        <button
          type="button"
          onClick={() => {
            onOpenSuggestion(latestSuggestion);
          }}
          className="mt-3 block w-full min-w-0 rounded border border-sand bg-warm-white/80 p-3 text-left transition-colors hover:border-leaf/60"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <h3 className="min-w-0 truncate text-sm font-semibold">{latestSuggestion.title}</h3>
            <StatusBadge status={latestSuggestion.status} />
          </div>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-bark-muted">
            {latestSuggestion.body}
          </p>
        </button>
      ) : (
        <p className="mt-3 rounded border border-dashed border-sand px-3 py-4 text-center text-sm text-bark-muted">
          아직 등록된 건의사항이 없어요.
        </p>
      )}
    </section>
  );
}

function SuggestionListItem({
  suggestion,
  onOpen,
}: {
  suggestion: Suggestion;
  onOpen: (suggestion: Suggestion) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onOpen(suggestion);
      }}
      className="block w-full min-w-0 rounded border border-sand bg-warm-white/80 p-3 text-left transition-colors hover:border-leaf/60"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold">{suggestion.title}</h3>
        <StatusBadge status={suggestion.status} />
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-bark-muted">
        {suggestion.body}
      </p>
      {suggestion.adminComment && (
        <p className="mt-2 truncate rounded bg-cream px-2 py-1 text-sm text-bark">
          {suggestion.adminComment}
        </p>
      )}
      <time className="mt-2 block text-xs text-bark-muted">
        {new Date(suggestion.createdAt).toLocaleString()}
      </time>
    </button>
  );
}

function SuggestionDetailDialog({
  suggestion,
  onClose,
}: {
  suggestion: Suggestion;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="건의사항 상세"
        className="flex max-h-[min(78vh,640px)] w-[min(92vw,460px)] min-w-0 flex-col overflow-hidden rounded border border-sand bg-cream text-bark shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-sand bg-cream px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg">{suggestion.title}</h3>
            <div className="mt-1">
              <StatusBadge status={suggestion.status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-semibold text-bark-muted hover:text-bark"
          >
            닫기
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-6">{suggestion.body}</p>
          {suggestion.adminComment && (
            <div className="mt-4 rounded border border-sand bg-warm-white p-3">
              <p className="text-xs font-semibold text-bark-muted">답변</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                {suggestion.adminComment}
              </p>
            </div>
          )}
        </div>
        <time className="block shrink-0 border-t border-sand bg-cream px-5 py-3 text-xs text-bark-muted">
          {new Date(suggestion.createdAt).toLocaleString()}
        </time>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: Suggestion['status'] }) {
  return (
    <span className="shrink-0 rounded bg-sand px-2 py-0.5 text-[11px] text-bark-muted">
      {status === 'DONE' ? '처리 완료' : '접수'}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded border border-sand bg-warm-white/80 px-3 py-3">
      <p className="truncate text-xs text-bark-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}
