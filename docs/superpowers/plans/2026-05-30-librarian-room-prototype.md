# Librarian Room Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the left-bottom library panel with an object-driven librarian room prototype: NPC interaction, bookshelf zoom/read flow, send-heart action, and compact mail notifications.

**Architecture:** Keep the current `LibraryOverlay` entry point, but split behavior into focused React components and a small scene interaction bridge. `LibraryScene` owns NPC/bookshelf proximity checks; `SceneManager` emits scene and interaction state to React; React renders only the UI allowed by the active scene and nearby object.

**Tech Stack:** Next.js 16, React 19, TypeScript, Three.js, Vitest, Testing Library, existing confession API client.

---

## File Structure

- Modify `frontend/src/lib/scene/sceneBridge.ts`: add interaction target state and subscription helpers.
- Modify `frontend/src/three/scenes/LibraryScene.ts`: add NPC/bookshelf anchor points, visible NPC/bookshelf props, and proximity methods.
- Modify `frontend/src/three/SceneManager.ts`: emit interaction state every frame while in the library scene.
- Modify `frontend/src/components/library/LibraryOverlay.tsx`: convert from left-bottom book button/panel to scene-bound interaction shell.
- Create `frontend/src/components/library/LibrarianInteraction.tsx`: NPC ring button, counseling panel, and book-submission form.
- Create `frontend/src/components/library/BookshelfInteraction.tsx`: bookshelf ring button, shelf zoom panel, paged book spines, open-book detail, and send-heart form.
- Create `frontend/src/components/library/MailNotification.tsx`: compact lower-right mail notification surface.
- Create `frontend/src/components/library/libraryLabels.ts`: Korean UI labels and helper text used by the components.
- Modify `frontend/src/components/library/LibraryOverlay.test.tsx`: replace old label-only tests with interaction and notification tests.
- Modify `frontend/src/app/globals.css`: add the bookshelf zoom keyframes.

---

### Task 1: Scene Interaction Bridge

**Files:**
- Modify: `frontend/src/lib/scene/sceneBridge.ts`
- Test: `frontend/src/components/library/LibraryOverlay.test.tsx`

- [ ] **Step 1: Write the failing bridge tests**

Replace `frontend/src/components/library/LibraryOverlay.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest';

import {
  emitLibraryInteractionChange,
  emitSceneChange,
  getSceneSnapshot,
  onLibraryInteractionChange,
  onSceneChange,
} from '@/lib/scene/sceneBridge';

describe('sceneBridge', () => {
  it('notifies scene listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onSceneChange(listener);

    expect(listener).toHaveBeenCalledWith('village');

    emitSceneChange('library');

    expect(listener).toHaveBeenLastCalledWith('library');
    expect(getSceneSnapshot().scene).toBe('library');

    unsubscribe();
  });

  it('notifies interaction listeners immediately and on change', () => {
    const listener = vi.fn();
    const unsubscribe = onLibraryInteractionChange(listener);

    expect(listener).toHaveBeenCalledWith({ nearLibrarian: false, nearBookshelf: false });

    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    expect(listener).toHaveBeenLastCalledWith({ nearLibrarian: true, nearBookshelf: false });
    expect(getSceneSnapshot().interaction).toEqual({ nearLibrarian: true, nearBookshelf: false });

    unsubscribe();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: FAIL because `emitLibraryInteractionChange`, `onLibraryInteractionChange`, and `getSceneSnapshot` are not exported.

- [ ] **Step 3: Implement the bridge**

Replace `frontend/src/lib/scene/sceneBridge.ts` with:

```ts
export type SceneName = 'village' | 'library' | 'transitioning';

export type LibraryInteractionState = {
  nearLibrarian: boolean;
  nearBookshelf: boolean;
};

type SceneListener = (scene: SceneName) => void;
type InteractionListener = (state: LibraryInteractionState) => void;

const sceneListeners = new Set<SceneListener>();
const interactionListeners = new Set<InteractionListener>();

let currentScene: SceneName = 'village';
let currentInteraction: LibraryInteractionState = {
  nearLibrarian: false,
  nearBookshelf: false,
};

export function emitSceneChange(scene: SceneName): void {
  currentScene = scene;
  sceneListeners.forEach((listener) => {
    listener(scene);
  });
}

export function onSceneChange(listener: SceneListener): () => void {
  listener(currentScene);
  sceneListeners.add(listener);
  return () => {
    sceneListeners.delete(listener);
  };
}

export function emitLibraryInteractionChange(state: LibraryInteractionState): void {
  if (
    currentInteraction.nearLibrarian === state.nearLibrarian &&
    currentInteraction.nearBookshelf === state.nearBookshelf
  ) {
    return;
  }

  currentInteraction = state;
  interactionListeners.forEach((listener) => {
    listener(state);
  });
}

export function onLibraryInteractionChange(listener: InteractionListener): () => void {
  listener(currentInteraction);
  interactionListeners.add(listener);
  return () => {
    interactionListeners.delete(listener);
  };
}

export function getSceneSnapshot(): {
  scene: SceneName;
  interaction: LibraryInteractionState;
} {
  return {
    scene: currentScene,
    interaction: currentInteraction,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/lib/scene/sceneBridge.ts frontend/src/components/library/LibraryOverlay.test.tsx
git commit -m "Add library interaction scene bridge"
```

---

### Task 2: Library Scene Proximity Anchors

**Files:**
- Modify: `frontend/src/three/scenes/LibraryScene.ts`
- Modify: `frontend/src/three/SceneManager.ts`
- Test: `frontend/src/three/scenes/LibraryScene.test.ts`

- [ ] **Step 1: Write the failing proximity tests**

Create `frontend/src/three/scenes/LibraryScene.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { LibraryScene } from './LibraryScene';

describe('LibraryScene', () => {
  it('detects librarian proximity near the desk', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -2.6);

    expect(scene.isNearLibrarian()).toBe(true);
    expect(scene.isNearBookshelf()).toBe(false);
  });

  it('detects bookshelf proximity near the back wall', () => {
    const scene = new LibraryScene();

    scene.character.position.set(0, 0, -5.1);

    expect(scene.isNearLibrarian()).toBe(false);
    expect(scene.isNearBookshelf()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryScene.test.ts
```

Expected: FAIL because `isNearLibrarian` and `isNearBookshelf` do not exist.

- [ ] **Step 3: Implement anchors and scene props**

In `frontend/src/three/scenes/LibraryScene.ts`, add fields after `private readonly exitZ = 5;`:

```ts
  private readonly librarianAnchor = new THREE.Vector3(0, 0, -2.6);
  private readonly bookshelfAnchor = new THREE.Vector3(0, 0, -5.1);
  private readonly interactionRadius = 1.8;
```

In the constructor, keep the existing build calls and replace `this.buildDeskPlaceholder();` with:

```ts
    this.buildBookshelves();
    this.buildLibrarianDesk();
```

Rename `buildDeskPlaceholder` to `buildLibrarianDesk`, and append this seated NPC mesh at the end of that method:

```ts
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x5b6f8f }),
    );
    body.position.set(0.65, 1.28, -2.15);
    body.castShadow = true;
    this.scene.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0xf1c6a8 }),
    );
    head.position.set(0.65, 1.82, -2.15);
    head.castShadow = true;
    this.scene.add(head);
```

Add methods before `isAtExit()`:

```ts
  isNearLibrarian(): boolean {
    return this.character.position.distanceTo(this.librarianAnchor) < this.interactionRadius;
  }

  isNearBookshelf(): boolean {
    return this.character.position.distanceTo(this.bookshelfAnchor) < this.interactionRadius;
  }
```

In `frontend/src/three/SceneManager.ts`, change the import:

```ts
import { emitLibraryInteractionChange, emitSceneChange } from '@/lib/scene/sceneBridge';
```

After scene transition checks inside `tick`, add:

```ts
      if (this.active === 'library') {
        const libraryScene = sceneObj as LibraryScene;
        emitLibraryInteractionChange({
          nearLibrarian: libraryScene.isNearLibrarian(),
          nearBookshelf: libraryScene.isNearBookshelf(),
        });
      } else {
        emitLibraryInteractionChange({ nearLibrarian: false, nearBookshelf: false });
      }
```

In `startTransition`, after `emitSceneChange(this.active);`, add:

```ts
    emitLibraryInteractionChange({ nearLibrarian: false, nearBookshelf: false });
```

In `destroy`, before removing event listeners, add:

```ts
    emitLibraryInteractionChange({ nearLibrarian: false, nearBookshelf: false });
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryScene.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/three/scenes/LibraryScene.ts frontend/src/three/SceneManager.ts frontend/src/three/scenes/LibraryScene.test.ts
git commit -m "Add librarian room proximity anchors"
```

---

### Task 3: Library UI Labels and Mail Notification

**Files:**
- Create: `frontend/src/components/library/libraryLabels.ts`
- Create: `frontend/src/components/library/MailNotification.tsx`
- Test: `frontend/src/components/library/LibraryOverlay.test.tsx`

- [ ] **Step 1: Write failing component tests**

Append to `LibraryOverlay.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';

import MailNotification from '@/components/library/MailNotification';

describe('MailNotification', () => {
  it('renders compact counts without letter body content', () => {
    render(<MailNotification receivedCount={2} replyCount={1} />);

    expect(screen.getByRole('button', { name: '우편 알림 확인' })).toBeInTheDocument();
    expect(screen.getByText('도착한 마음 2')).toBeInTheDocument();
    expect(screen.getByText('답장 1')).toBeInTheDocument();
    expect(screen.queryByText('편지 전문')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: FAIL because `MailNotification` does not exist.

- [ ] **Step 3: Implement labels and notification**

Create `frontend/src/components/library/libraryLabels.ts`:

```ts
export const LIBRARY_LABELS = {
  roomName: '사서방',
  librarianAction: '사서와 이야기하기',
  bookshelfAction: '책장 살펴보기',
  counseling: '고민 상담하기',
  leaveBook: '도서 남기기',
  bookshelfTitle: '마음이 꽂힌 책장',
  sendHeart: '마음 보내기',
  close: '닫기',
  mailAriaLabel: '우편 알림 확인',
  receivedHeart: '도착한 마음',
  reply: '답장',
} as const;
```

Create `frontend/src/components/library/MailNotification.tsx`:

```tsx
'use client';

import { useState } from 'react';

import { LIBRARY_LABELS } from './libraryLabels';

type MailNotificationProps = {
  receivedCount: number;
  replyCount: number;
};

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
          <p>{`${LIBRARY_LABELS.receivedHeart} ${receivedCount}`}</p>
          <p>{`${LIBRARY_LABELS.reply} ${replyCount}`}</p>
          <p className="mt-2 text-xs text-bark-muted">자세한 내용은 도서를 열어 확인해 주세요.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/library/libraryLabels.ts frontend/src/components/library/MailNotification.tsx frontend/src/components/library/LibraryOverlay.test.tsx
git commit -m "Add compact library mail notification"
```

---

### Task 4: Librarian NPC Interaction

**Files:**
- Create: `frontend/src/components/library/LibrarianInteraction.tsx`
- Modify: `frontend/src/components/library/LibraryOverlay.test.tsx`

- [ ] **Step 1: Write failing NPC tests**

Append to `LibraryOverlay.test.tsx`:

```tsx
import userEvent from '@testing-library/user-event';

import LibrarianInteraction from '@/components/library/LibrarianInteraction';

describe('LibrarianInteraction', () => {
  it('renders no ring when the player is away from the librarian', () => {
    render(<LibrarianInteraction near={false} onSubmitBook={vi.fn()} onRequestCounseling={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '사서와 이야기하기' })).not.toBeInTheDocument();
  });

  it('opens counseling and book submission choices near the librarian', async () => {
    const user = userEvent.setup();
    const onRequestCounseling = vi.fn();

    render(
      <LibrarianInteraction near={true} onSubmitBook={vi.fn()} onRequestCounseling={onRequestCounseling} />,
    );

    await user.click(screen.getByRole('button', { name: '사서와 이야기하기' }));
    await user.click(screen.getByRole('button', { name: '고민 상담하기' }));

    expect(onRequestCounseling).toHaveBeenCalled();
    expect(screen.getByText('비슷한 마음이 남겨져 있었어요.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: FAIL because `LibrarianInteraction` does not exist.

- [ ] **Step 3: Implement NPC interaction**

Create `frontend/src/components/library/LibrarianInteraction.tsx`:

```tsx
'use client';

import { FormEvent, useState } from 'react';

import type { ConfessionBookshelf } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

type LibrarianInteractionProps = {
  near: boolean;
  onRequestCounseling: () => Promise<void> | void;
  onSubmitBook: (input: { title: string; body: string; bookshelf: ConfessionBookshelf }) => Promise<void> | void;
};

export default function LibrarianInteraction({ near, onRequestCounseling, onSubmitBook }: LibrarianInteractionProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choices' | 'counseling' | 'write'>('choices');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  if (!near) return null;

  async function handleCounseling() {
    await onRequestCounseling();
    setMode('counseling');
    setMessage('비슷한 마음이 남겨져 있었어요.');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitBook({ title, body, bookshelf: 'GENERAL' });
    setTitle('');
    setBody('');
    setMessage('사서가 조용히 도서를 받아 책장에 꽂아 두었어요.');
    setMode('choices');
  }

  return (
    <div className="fixed left-1/2 bottom-8 z-30 -translate-x-1/2">
      <button
        type="button"
        aria-label={LIBRARY_LABELS.librarianAction}
        onClick={() => {
          setOpen(true);
          setMode('choices');
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-cream bg-leaf text-cream shadow-xl"
      >
        <span aria-hidden="true">◎</span>
      </button>

      {open && (
        <section className="mt-3 w-[min(92vw,420px)] rounded border border-sand bg-cream/95 p-4 text-bark shadow-2xl">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">{LIBRARY_LABELS.roomName} 사서</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-bark-muted">
              {LIBRARY_LABELS.close}
            </button>
          </header>

          {mode === 'choices' && (
            <div className="grid gap-2">
              <button type="button" onClick={() => void handleCounseling()} className="rounded bg-bark px-3 py-2 text-cream">
                {LIBRARY_LABELS.counseling}
              </button>
              <button type="button" onClick={() => setMode('write')} className="rounded bg-sand px-3 py-2 text-bark">
                {LIBRARY_LABELS.leaveBook}
              </button>
            </div>
          )}

          {mode === 'counseling' && <p className="text-sm leading-6">{message}</p>}

          {mode === 'write' && (
            <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded border border-sand bg-warm-white px-3 py-2"
                placeholder="도서 제목"
                maxLength={120}
              />
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="h-32 resize-none rounded border border-sand bg-warm-white p-3"
                placeholder="사서에게 맡길 마음"
                maxLength={3000}
              />
              <button type="submit" className="rounded bg-bark px-3 py-2 text-cream">
                사서에게 맡기기
              </button>
            </form>
          )}

          {message && mode !== 'counseling' && <p className="mt-3 text-sm text-leaf-dark">{message}</p>}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/library/LibrarianInteraction.tsx frontend/src/components/library/LibraryOverlay.test.tsx
git commit -m "Add librarian NPC interaction panel"
```

---

### Task 5: Bookshelf Interaction and Open Book Flow

**Files:**
- Create: `frontend/src/components/library/BookshelfInteraction.tsx`
- Modify: `frontend/src/components/library/LibraryOverlay.test.tsx`

- [ ] **Step 1: Write failing bookshelf tests**

Append to `LibraryOverlay.test.tsx`:

```tsx
import type { ConfessionSummary } from '@/types/confession';
import BookshelfInteraction from '@/components/library/BookshelfInteraction';

const books: ConfessionSummary[] = [
  {
    id: 1,
    title: '잠들지 못한 밤',
    preview: '오늘도 잠이 오지 않았다.',
    bookshelf: 'GENERAL',
    reactionCount: 0,
    letterCount: 0,
    createdAt: '2026-05-30T00:00:00Z',
  },
];

describe('BookshelfInteraction', () => {
  it('opens shelf zoom and then an open book detail', async () => {
    const user = userEvent.setup();
    render(
      <BookshelfInteraction
        near={true}
        books={books}
        onSelectBook={async () => ({
          id: 1,
          title: '잠들지 못한 밤',
          body: '펼쳐진 책 본문',
          bookshelf: 'GENERAL',
          authorId: 10,
          createdAt: '2026-05-30T00:00:00Z',
        })}
        onSendHeart={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '책장 살펴보기' }));
    expect(screen.getByText('마음이 꽂힌 책장')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '잠들지 못한 밤' }));

    expect(await screen.findByText('펼쳐진 책 본문')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '마음 보내기' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: FAIL because `BookshelfInteraction` does not exist.

- [ ] **Step 3: Implement bookshelf interaction**

Create `frontend/src/components/library/BookshelfInteraction.tsx`:

```tsx
'use client';

import { FormEvent, useMemo, useState } from 'react';

import type { ConfessionDetail, ConfessionSummary } from '@/types/confession';

import { LIBRARY_LABELS } from './libraryLabels';

const PAGE_SIZE = 8;

type BookshelfInteractionProps = {
  near: boolean;
  books: ConfessionSummary[];
  onSelectBook: (id: number) => Promise<ConfessionDetail>;
  onSendHeart: (id: number, body: string) => Promise<void> | void;
};

export default function BookshelfInteraction({ near, books, onSelectBook, onSendHeart }: BookshelfInteractionProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ConfessionDetail | null>(null);
  const [heartBody, setHeartBody] = useState('');
  const [message, setMessage] = useState('');

  const pageCount = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const visibleBooks = useMemo(() => {
    return books.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [books, page]);

  if (!near) return null;

  async function openBook(id: number) {
    setMessage('');
    const detail = await onSelectBook(id);
    setSelected(detail);
  }

  async function submitHeart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !heartBody.trim()) return;
    await onSendHeart(selected.id, heartBody.trim());
    setHeartBody('');
    setMessage('마음이 조용히 전해졌어요.');
  }

  return (
    <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4">
      {!open && (
        <button
          type="button"
          aria-label={LIBRARY_LABELS.bookshelfAction}
          onClick={() => setOpen(true)}
          className="rounded-full border-2 border-cream bg-bark px-5 py-3 text-cream shadow-xl"
        >
          {LIBRARY_LABELS.bookshelfAction}
        </button>
      )}

      {open && (
        <section className="w-[min(96vw,980px)] origin-top rounded border border-sand bg-cream/95 p-5 text-bark shadow-2xl transition-transform duration-300 animate-[bookshelfZoom_220ms_ease-out]">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">{LIBRARY_LABELS.bookshelfTitle}</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-bark-muted">
              {LIBRARY_LABELS.close}
            </button>
          </header>

          {!selected && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {visibleBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    aria-label={book.title}
                    onClick={() => void openBook(book.id)}
                    className="h-28 rounded-t-sm border border-bark/20 bg-gradient-to-r from-bark via-[#7b5736] to-bark px-2 py-3 text-left text-cream shadow transition-transform hover:-translate-y-1"
                  >
                    <span className="line-clamp-3 text-sm font-semibold">{book.title}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded bg-sand px-3 py-1">
                  이전
                </button>
                <span className="text-sm">{`${page + 1} / ${pageCount}`}</span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                  className="rounded bg-sand px-3 py-1"
                >
                  다음
                </button>
              </div>
            </>
          )}

          {selected && (
            <article className="mx-auto max-w-2xl rounded border border-sand bg-warm-white p-5 shadow-inner">
              <h3 className="font-display text-xl">{selected.title}</h3>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{selected.body}</p>
              <form onSubmit={(event) => void submitHeart(event)} className="mt-5 grid gap-2">
                <textarea
                  value={heartBody}
                  onChange={(event) => setHeartBody(event.target.value)}
                  className="h-24 resize-none rounded border border-sand bg-cream p-3 text-sm"
                  placeholder="이 도서에 전할 마음"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelected(null)} className="rounded bg-sand px-3 py-2">
                    {LIBRARY_LABELS.close}
                  </button>
                  <button type="submit" className="rounded bg-bark px-3 py-2 text-cream">
                    {LIBRARY_LABELS.sendHeart}
                  </button>
                </div>
              </form>
              {message && <p className="mt-3 text-sm text-leaf-dark">{message}</p>}
            </article>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add animation CSS**

Replace `animate-[bookshelfZoom_220ms_ease-out]` in `BookshelfInteraction.tsx` with `library-bookshelf-zoom`, then append this to `frontend/src/app/globals.css`:

```css
@keyframes bookshelfZoom {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(18px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.library-bookshelf-zoom {
  animation: bookshelfZoom 220ms ease-out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/components/library/BookshelfInteraction.tsx frontend/src/components/library/LibraryOverlay.test.tsx frontend/src/app/globals.css
git commit -m "Add interactive bookshelf reading flow"
```

---

### Task 6: Compose LibraryOverlay with API Data

**Files:**
- Modify: `frontend/src/components/library/LibraryOverlay.tsx`
- Modify: `frontend/src/components/library/LibraryOverlay.test.tsx`

- [ ] **Step 1: Write failing overlay integration tests**

Add module mocks at the top of `LibraryOverlay.test.tsx`:

```tsx
vi.mock('@/lib/api/confessions', () => ({
  createConfession: vi.fn(async () => ({ id: 10 })),
  getConfession: vi.fn(async () => ({
    id: 1,
    title: '잠들지 못한 밤',
    body: '펼쳐진 책 본문',
    bookshelf: 'GENERAL',
    authorId: 10,
    createdAt: '2026-05-30T00:00:00Z',
  })),
  listConfessions: vi.fn(async () => [
    {
      id: 1,
      title: '잠들지 못한 밤',
      preview: '오늘도 잠이 오지 않았다.',
      bookshelf: 'GENERAL',
      reactionCount: 0,
      letterCount: 0,
      createdAt: '2026-05-30T00:00:00Z',
    },
  ]),
  listNpcSimilarConfessions: vi.fn(async () => []),
  listReceivedLetters: vi.fn(async () => [{ id: 4, confessionId: 1, body: 'hidden', createdAt: '2026-05-30T00:00:00Z' }]),
  listSentLetters: vi.fn(async () => [{ id: 5, confessionId: 1, body: 'hidden', createdAt: '2026-05-30T00:00:00Z' }]),
  sendConfessionLetter: vi.fn(async () => undefined),
  getThankReply: vi.fn(async () => ({ id: 7, letterId: 5, body: 'hidden reply', createdAt: '2026-05-30T00:00:00Z' })),
}));
```

Append:

```tsx
import { emitLibraryInteractionChange, emitSceneChange } from '@/lib/scene/sceneBridge';
import LibraryOverlay from '@/components/library/LibraryOverlay';

describe('LibraryOverlay composed flow', () => {
  it('does not render object interactions outside the library scene', () => {
    emitSceneChange('village');
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: true });

    render(<LibraryOverlay />);

    expect(screen.queryByRole('button', { name: '사서와 이야기하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '책장 살펴보기' })).not.toBeInTheDocument();
  });

  it('renders only nearby object interactions in the library scene', async () => {
    emitSceneChange('library');
    emitLibraryInteractionChange({ nearLibrarian: true, nearBookshelf: false });

    render(<LibraryOverlay />);

    expect(await screen.findByRole('button', { name: '사서와 이야기하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '책장 살펴보기' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: FAIL because `LibraryOverlay` still uses the old left-bottom book button and does not subscribe to interaction state.

- [ ] **Step 3: Replace LibraryOverlay composition**

Replace `frontend/src/components/library/LibraryOverlay.tsx` with a composed shell:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import BookshelfInteraction from '@/components/library/BookshelfInteraction';
import LibrarianInteraction from '@/components/library/LibrarianInteraction';
import MailNotification from '@/components/library/MailNotification';
import {
  createConfession,
  getConfession,
  getThankReply,
  listConfessions,
  listNpcSimilarConfessions,
  listReceivedLetters,
  listSentLetters,
  sendConfessionLetter,
} from '@/lib/api/confessions';
import type { LibraryInteractionState, SceneName } from '@/lib/scene/sceneBridge';
import { getSceneSnapshot, onLibraryInteractionChange, onSceneChange } from '@/lib/scene/sceneBridge';
import { useChatStore } from '@/store/useChatStore';
import type { ConfessionBookshelf, ConfessionSummary } from '@/types/confession';

function hasMemberToken(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('accessToken');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: string;
    };
    return payload.role === 'MEMBER';
  } catch {
    return false;
  }
}

export default function LibraryOverlay() {
  const snapshot = getSceneSnapshot();
  const [scene, setScene] = useState<SceneName>(snapshot.scene);
  const [interaction, setInteraction] = useState<LibraryInteractionState>(snapshot.interaction);
  const [books, setBooks] = useState<ConfessionSummary[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [replyCount, setReplyCount] = useState(0);
  const setLoginRequired = useChatStore((state) => state.setLoginRequired);

  const refreshBooks = useCallback(async () => {
    setBooks(await listConfessions('GENERAL'));
  }, []);

  const refreshMail = useCallback(async () => {
    if (!hasMemberToken()) {
      setReceivedCount(0);
      setReplyCount(0);
      return;
    }
    const [received, sent] = await Promise.all([listReceivedLetters(), listSentLetters()]);
    const replies = await Promise.all(sent.map((letter) => getThankReply(letter.id)));
    setReceivedCount(received.length);
    setReplyCount(replies.filter(Boolean).length);
  }, []);

  useEffect(() => onSceneChange(setScene), []);
  useEffect(() => onLibraryInteractionChange(setInteraction), []);

  useEffect(() => {
    if (scene !== 'library') return;
    void refreshBooks();
    void refreshMail();
  }, [refreshBooks, refreshMail, scene]);

  if (scene !== 'library') return null;

  return (
    <>
      <LibrarianInteraction
        near={interaction.nearLibrarian}
        onRequestCounseling={async () => {
          await listNpcSimilarConfessions('GENERAL');
        }}
        onSubmitBook={async (input: { title: string; body: string; bookshelf: ConfessionBookshelf }) => {
          if (!hasMemberToken()) {
            setLoginRequired(true);
            return;
          }
          await createConfession(input);
          await refreshBooks();
        }}
      />
      <BookshelfInteraction
        near={interaction.nearBookshelf}
        books={books}
        onSelectBook={getConfession}
        onSendHeart={async (id, body) => {
          if (!hasMemberToken()) {
            setLoginRequired(true);
            return;
          }
          await sendConfessionLetter(id, body);
          await refreshMail();
        }}
      />
      <MailNotification receivedCount={receivedCount} replyCount={replyCount} />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/components/library/LibraryOverlay.tsx frontend/src/components/library/LibraryOverlay.test.tsx
git commit -m "Compose librarian room overlay"
```

---

### Task 7: Final Verification

**Files:**
- Verify all touched frontend files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm.cmd run test:run -- LibraryOverlay.test.tsx LibraryScene.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full frontend test suite**

Run:

```powershell
npm.cmd run test:run
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS and Next.js build completes.

- [ ] **Step 4: Confirm there are no uncommitted verification fixes**

Run:

```powershell
git status --short
```

Expected: no uncommitted changes from verification commands. Verification failures require returning to the failed implementation task, applying a focused fix there, rerunning that task's checks, and committing from that task.
