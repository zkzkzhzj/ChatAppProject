'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  createSuggestion,
  getTodayDashboard,
  listSuggestions,
  recordTodayVisit,
} from '@/lib/api/village-board';
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

type Panel = 'dashboard' | 'suggestions' | null;

export default function VillageBoardOverlay() {
  const snapshot = getSceneSnapshot();
  const [scene, setScene] = useState<SceneName>(snapshot.scene);
  const [interaction, setInteraction] = useState<VillageBoardInteractionState>(
    snapshot.villageBoardInteraction,
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [dashboard, setDashboard] = useState<VillageDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

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
  }, []);

  useEffect(() => {
    const unsubscribeScene = onSceneChange((nextScene) => {
      setScene(nextScene);
      if (nextScene !== 'village') {
        setPanel(null);
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

  async function openDashboard() {
    setPanel('dashboard');
    await refreshDashboard();
  }

  async function openSuggestions() {
    setPanel('suggestions');
    await refreshSuggestions();
  }

  async function handleSubmitSuggestion() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody || saving) return;

    setSaving(true);
    try {
      await createSuggestion({ title: trimmedTitle, body: trimmedBody });
      setTitle('');
      setBody('');
      await refreshSuggestions();
    } finally {
      setSaving(false);
    }
  }

  if (scene !== 'village') return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-[520px] flex-col items-start gap-3 sm:left-4 sm:right-auto sm:mx-0">
      {!panel && (
        <div className="flex flex-col gap-2">
          {interaction.nearDashboard && (
            <button
              type="button"
              onClick={() => void openDashboard()}
              className="pointer-events-auto rounded border border-sand bg-cream/95 px-4 py-2 text-sm font-semibold text-bark shadow-xl"
            >
              오늘의 방문자 보기
            </button>
          )}
          {interaction.nearSuggestionBoard && (
            <button
              type="button"
              onClick={() => void openSuggestions()}
              className="pointer-events-auto rounded border border-sand bg-cream/95 px-4 py-2 text-sm font-semibold text-bark shadow-xl"
            >
              건의 게시판 열기
            </button>
          )}
        </div>
      )}

      {panel === 'dashboard' && (
        <section
          role="dialog"
          aria-label="오늘의 방문자"
          className="pointer-events-auto max-h-[min(78vh,520px)] w-full overflow-y-auto rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">오늘의 방문자</h2>
              <p className="mt-1 text-xs text-bark-muted">{dashboard?.date ?? '오늘'} 기준</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPanel(null);
              }}
              className="rounded border border-sand px-3 py-1.5 text-sm font-semibold"
            >
              닫기
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="손님" value={dashboard?.guestCount ?? 0} />
            <Stat label="이웃" value={dashboard?.memberCount ?? 0} />
            <Stat label="총 방문" value={dashboard?.totalCount ?? 0} />
            <Stat label="오늘의 마음" value={dashboard?.confessionCount ?? 0} />
          </div>
        </section>
      )}

      {panel === 'suggestions' && (
        <section
          role="dialog"
          aria-label="건의 게시판"
          className="pointer-events-auto flex max-h-[min(78vh,620px)] w-full flex-col overflow-hidden rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">건의 게시판</h2>
              <p className="mt-1 text-xs text-bark-muted">마을에 남기고 싶은 바람</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPanel(null);
              }}
              className="rounded border border-sand px-3 py-1.5 text-sm font-semibold"
            >
              닫기
            </button>
          </div>

          <div className="mt-4 shrink-0 space-y-2">
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
                {body.length} / {BODY_MAX_LENGTH}
              </span>
              <button
                type="button"
                onClick={() => void handleSubmitSuggestion()}
                disabled={!title.trim() || !body.trim() || saving}
                className="rounded bg-bark px-3 py-2 text-sm font-semibold text-cream disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {suggestions.length === 0 ? (
              <p className="rounded border border-dashed border-sand px-3 py-4 text-center text-sm text-bark-muted">
                아직 등록된 건의사항이 없습니다.
              </p>
            ) : (
              suggestions.map((suggestion) => (
                <article
                  key={suggestion.id}
                  className="rounded border border-sand bg-warm-white/80 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate text-sm font-semibold">{suggestion.title}</h3>
                    <span className="shrink-0 text-[11px] text-bark-muted">
                      {suggestion.status === 'DONE' ? '처리 완료' : '접수'}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-bark-muted">
                    {suggestion.body}
                  </p>
                  {suggestion.adminComment && (
                    <p className="mt-2 rounded bg-cream px-2 py-1 text-sm text-bark">
                      {suggestion.adminComment}
                    </p>
                  )}
                  <time className="mt-2 block text-xs text-bark-muted">
                    {new Date(suggestion.createdAt).toLocaleString()}
                  </time>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-sand bg-warm-white/80 px-3 py-3">
      <p className="text-xs text-bark-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}
