# Frontend Client Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STOMP 운영 동작을 유지한 채 `useStomp`의 인증, 구독, 메시지 변환 책임을 작은 프론트 모듈로 분리한다.

**Architecture:** 이 작업은 raw WebSocket 전환이 아니다. `useStomp`는 React lifecycle orchestration만 남기고, 토큰 결정은 `realtimeAuth.ts`, STOMP 채널 구독과 bridge fan-out은 `stompRealtimeSubscriptions.ts`로 이동한다. 기존 `stompClient.ts`의 public send/subscribe API는 유지해 `ChatInput`, `PositionSync`, `SceneManager` 호출부를 깨지 않는다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, `@stomp/stompjs`, existing Zustand chat store.

---

## File Structure

- Create: `frontend/src/lib/websocket/realtimeAuth.ts`
  - `useStomp` 내부에 있던 token role parsing, guest token issuing, valid token selection을 담당한다.
- Create: `frontend/src/lib/websocket/realtimeAuth.test.ts`
  - no token, valid token, expired guest refresh, expired member preserve, guest issue failure cases를 검증한다.
- Create: `frontend/src/lib/websocket/stompRealtimeSubscriptions.ts`
  - 채팅/메일/위치/타이핑 STOMP 구독을 한 곳에서 묶고, 들어온 이벤트를 기존 bridge와 store callback으로 전달한다.
- Create: `frontend/src/lib/websocket/stompRealtimeSubscriptions.test.ts`
  - chat message mapping, NPC typing clear, mail refresh, position/typing bridge, cleanup unsubscribe를 검증한다.
- Modify: `frontend/src/lib/websocket/useStomp.ts`
  - 인증 결정과 구독 세부 구현을 새 모듈로 위임한다. reconnect/auth error 정책은 기존 동작 그대로 유지한다.
- Modify: `frontend/src/lib/websocket/useStomp.test.tsx`
  - 새 모듈 mock을 반영하고 기존 401 회귀 테스트를 유지한다.
- Modify: `docs/handover/track-realtime-infra-reset.md`
  - 로드맵 Step 2 `Frontend Client Split`의 상태를 진행/완료로 갱신하고 커밋 해시를 기록한다.

---

### Task 1: Extract Realtime Auth

**Files:**
- Create: `frontend/src/lib/websocket/realtimeAuth.ts`
- Create: `frontend/src/lib/websocket/realtimeAuth.test.ts`

- [ ] **Step 1: Write failing tests for realtime auth**

Create `frontend/src/lib/websocket/realtimeAuth.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureValidRealtimeToken, parseTokenRole } from './realtimeAuth';

const { mockIsTokenExpired } = vi.hoisted(() => ({
  mockIsTokenExpired: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  isTokenExpired: mockIsTokenExpired,
}));

function tokenWithRole(role: 'MEMBER' | 'GUEST'): string {
  const payload = btoa(JSON.stringify({ role }));
  return `header.${payload}.signature`;
}

describe('realtimeAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    mockIsTokenExpired.mockReset();
    vi.restoreAllMocks();
  });

  it('parseTokenRole은 MEMBER/GUEST role을 읽는다', () => {
    expect(parseTokenRole(tokenWithRole('MEMBER'))).toBe('MEMBER');
    expect(parseTokenRole(tokenWithRole('GUEST'))).toBe('GUEST');
  });

  it('parseTokenRole은 잘못된 token이면 null을 반환한다', () => {
    expect(parseTokenRole('broken')).toBeNull();
    expect(parseTokenRole(null)).toBeNull();
  });

  it('저장된 토큰이 없으면 게스트 토큰을 발급해 저장한다', async () => {
    const guest = tokenWithRole('GUEST');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: guest }),
      }),
    );

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(guest);
    expect(localStorage.getItem('accessToken')).toBe(guest);
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/auth/guest', {
      method: 'POST',
    });
  });

  it('저장된 토큰이 유효하면 그대로 반환한다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockIsTokenExpired.mockReturnValue(false);

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(member);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('만료된 게스트 토큰은 제거하고 새 게스트 토큰으로 교체한다', async () => {
    const oldGuest = tokenWithRole('GUEST');
    const newGuest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', oldGuest);
    mockIsTokenExpired.mockReturnValue(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: newGuest }),
      }),
    );

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(newGuest);
    expect(localStorage.getItem('accessToken')).toBe(newGuest);
  });

  it('만료된 멤버 토큰은 자동 게스트 다운그레이드 없이 그대로 반환한다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockIsTokenExpired.mockReturnValue(true);
    vi.stubGlobal('fetch', vi.fn());

    const result = await ensureValidRealtimeToken();

    expect(result).toBe(member);
    expect(localStorage.getItem('accessToken')).toBe(member);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('게스트 토큰 발급 실패 시 null을 반환하고 저장하지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await ensureValidRealtimeToken();

    expect(result).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/realtimeAuth.test.ts
```

Expected:

```text
FAIL src/lib/websocket/realtimeAuth.test.ts
Cannot find module './realtimeAuth'
```

- [ ] **Step 3: Implement realtimeAuth**

Create `frontend/src/lib/websocket/realtimeAuth.ts`:

```typescript
import { isTokenExpired } from '@/lib/auth';

const TOKEN_KEY = 'accessToken';

export type RealtimeTokenRole = 'MEMBER' | 'GUEST';

export function parseTokenRole(token: string | null): RealtimeTokenRole | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role === 'MEMBER' || payload.role === 'GUEST' ? payload.role : null;
  } catch {
    return null;
  }
}

async function issueGuestToken(): Promise<string | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const res = await fetch(`${apiBase}/api/v1/auth/guest`, { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    return data.accessToken;
  } catch (err) {
    console.warn('[realtimeAuth] 게스트 토큰 발급 실패', err);
    return null;
  }
}

async function issueAndStoreGuestToken(): Promise<string | null> {
  const fresh = await issueGuestToken();
  if (fresh) {
    localStorage.setItem(TOKEN_KEY, fresh);
  }
  return fresh;
}

export async function ensureValidRealtimeToken(): Promise<string | null> {
  const stored = localStorage.getItem(TOKEN_KEY);

  if (!stored) {
    return issueAndStoreGuestToken();
  }

  if (!isTokenExpired(stored)) {
    return stored;
  }

  const role = parseTokenRole(stored);
  if (role === 'GUEST') {
    console.log('[realtimeAuth] 게스트 토큰 만료 임박/만료 — 사전 갱신');
    localStorage.removeItem(TOKEN_KEY);
    return issueAndStoreGuestToken();
  }

  console.warn(
    '[realtimeAuth] 멤버 토큰 만료 임박/만료 — 자동 갱신 미지원, 서버 거부 시 재로그인 필요',
  );
  return stored;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/realtimeAuth.test.ts
```

Expected:

```text
PASS src/lib/websocket/realtimeAuth.test.ts
```

---

### Task 2: Extract STOMP Realtime Subscriptions

**Files:**
- Create: `frontend/src/lib/websocket/stompRealtimeSubscriptions.ts`
- Create: `frontend/src/lib/websocket/stompRealtimeSubscriptions.test.ts`

- [ ] **Step 1: Write failing tests for subscription orchestration**

Create `frontend/src/lib/websocket/stompRealtimeSubscriptions.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessageResponse } from '@/types/chat';

import { subscribeToStompRealtimeChannels } from './stompRealtimeSubscriptions';

const {
  mockEmitChatMessage,
  mockEmitMailRefreshRequested,
  mockEmitNpcTypingUpdate,
  mockEmitPositionUpdate,
  mockEmitTypingUpdate,
  mockSubscribeToChatRoom,
  mockSubscribeToMailNotifications,
  mockSubscribeToPositions,
  mockSubscribeToTyping,
} = vi.hoisted(() => ({
  mockEmitChatMessage: vi.fn(),
  mockEmitMailRefreshRequested: vi.fn(),
  mockEmitNpcTypingUpdate: vi.fn(),
  mockEmitPositionUpdate: vi.fn(),
  mockEmitTypingUpdate: vi.fn(),
  mockSubscribeToChatRoom: vi.fn(),
  mockSubscribeToMailNotifications: vi.fn(),
  mockSubscribeToPositions: vi.fn(),
  mockSubscribeToTyping: vi.fn(),
}));

vi.mock('./chatBridge', () => ({
  emitChatMessage: mockEmitChatMessage,
}));

vi.mock('@/lib/scene/mailRefreshBridge', () => ({
  emitMailRefreshRequested: mockEmitMailRefreshRequested,
}));

vi.mock('./positionBridge', () => ({
  emitNpcTypingUpdate: mockEmitNpcTypingUpdate,
  emitPositionUpdate: mockEmitPositionUpdate,
  emitTypingUpdate: mockEmitTypingUpdate,
}));

vi.mock('./stompClient', () => ({
  subscribeToChatRoom: mockSubscribeToChatRoom,
  subscribeToMailNotifications: mockSubscribeToMailNotifications,
  subscribeToPositions: mockSubscribeToPositions,
  subscribeToTyping: mockSubscribeToTyping,
}));

function subscription() {
  return { unsubscribe: vi.fn() };
}

function userMessage(): MessageResponse {
  return {
    id: 'message-1',
    participantId: 10,
    senderId: 42,
    senderType: 'USER',
    body: '안녕',
    createdAt: '2026-04-08T12:00:00.000Z',
  };
}

function npcMessage(): MessageResponse {
  return {
    ...userMessage(),
    id: 'message-2',
    senderId: null,
    senderType: 'NPC',
    body: '어서 와',
  };
}

describe('subscribeToStompRealtimeChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeToChatRoom.mockReturnValue(subscription());
    mockSubscribeToMailNotifications.mockReturnValue(subscription());
    mockSubscribeToPositions.mockReturnValue(subscription());
    mockSubscribeToTyping.mockReturnValue(subscription());
  });

  it('마을 채팅, 메일, 위치, 타이핑 채널을 구독한다', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
    });

    expect(mockSubscribeToChatRoom).toHaveBeenCalledWith('village', expect.any(Function));
    expect(mockSubscribeToMailNotifications).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToPositions).toHaveBeenCalledWith(expect.any(Function));
    expect(mockSubscribeToTyping).toHaveBeenCalledWith(expect.any(Function));
  });

  it('USER 채팅 메시지를 store와 Three bridge로 전달한다', () => {
    const addMessage = vi.fn();
    subscribeToStompRealtimeChannels({
      addMessage,
      setNpcTyping: vi.fn(),
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(userMessage());

    expect(addMessage).toHaveBeenCalledWith({
      id: 'message-1',
      participantId: 10,
      senderId: 42,
      senderType: 'USER',
      body: '안녕',
      createdAt: '2026-04-08T12:00:00.000Z',
    });
    expect(mockEmitChatMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'message-1' }));
  });

  it('NPC 채팅 메시지는 NPC typing 상태를 해제한다', () => {
    const setNpcTyping = vi.fn();
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping,
    });
    const onMessage = mockSubscribeToChatRoom.mock.calls[0][1] as (msg: MessageResponse) => void;

    onMessage(npcMessage());

    expect(setNpcTyping).toHaveBeenCalledWith(false);
    expect(mockEmitNpcTypingUpdate).toHaveBeenCalledWith(false);
  });

  it('메일, 위치, 타이핑 이벤트를 bridge로 전달한다', () => {
    subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
    });
    const onMail = mockSubscribeToMailNotifications.mock.calls[0][0] as () => void;
    const onPosition = mockSubscribeToPositions.mock.calls[0][0] as (pos: unknown) => void;
    const onTyping = mockSubscribeToTyping.mock.calls[0][0] as (data: unknown) => void;
    const position = { id: 'user-1', userType: 'MEMBER', x: 1, y: 2 };
    const typing = { id: 'user-1', typing: true };

    onMail();
    onPosition(position);
    onTyping(typing);

    expect(mockEmitMailRefreshRequested).toHaveBeenCalledTimes(1);
    expect(mockEmitPositionUpdate).toHaveBeenCalledWith(position);
    expect(mockEmitTypingUpdate).toHaveBeenCalledWith(typing);
  });

  it('cleanup은 모든 구독을 해제한다', () => {
    const subs = [subscription(), subscription(), subscription(), subscription()];
    mockSubscribeToChatRoom.mockReturnValue(subs[0]);
    mockSubscribeToMailNotifications.mockReturnValue(subs[1]);
    mockSubscribeToPositions.mockReturnValue(subs[2]);
    mockSubscribeToTyping.mockReturnValue(subs[3]);

    const cleanup = subscribeToStompRealtimeChannels({
      addMessage: vi.fn(),
      setNpcTyping: vi.fn(),
    });
    cleanup();

    for (const sub of subs) {
      expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/stompRealtimeSubscriptions.test.ts
```

Expected:

```text
FAIL src/lib/websocket/stompRealtimeSubscriptions.test.ts
Cannot find module './stompRealtimeSubscriptions'
```

- [ ] **Step 3: Implement stompRealtimeSubscriptions**

Create `frontend/src/lib/websocket/stompRealtimeSubscriptions.ts`:

```typescript
import { emitMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';
import type { ChatMessage, MessageResponse } from '@/types/chat';

import { emitChatMessage } from './chatBridge';
import { emitNpcTypingUpdate, emitPositionUpdate, emitTypingUpdate } from './positionBridge';
import {
  subscribeToChatRoom,
  subscribeToMailNotifications,
  subscribeToPositions,
  subscribeToTyping,
} from './stompClient';

const VILLAGE_CHAT_TOPIC = 'village';

interface RealtimeSubscriptionHandlers {
  addMessage: (message: ChatMessage) => void;
  setNpcTyping: (typing: boolean) => void;
}

function toMessage(msg: MessageResponse): ChatMessage {
  return {
    id: msg.id,
    participantId: msg.participantId,
    senderId: msg.senderId,
    senderType: msg.senderType,
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

export function subscribeToStompRealtimeChannels({
  addMessage,
  setNpcTyping,
}: RealtimeSubscriptionHandlers): () => void {
  const chatSub = subscribeToChatRoom(VILLAGE_CHAT_TOPIC, (msg) => {
    console.log('[useStomp] Received message:', msg);
    const chatMsg = toMessage(msg);
    if (chatMsg.senderType === 'NPC') {
      setNpcTyping(false);
      emitNpcTypingUpdate(false);
    }
    addMessage(chatMsg);
    emitChatMessage(chatMsg);
  });

  const mailSub = subscribeToMailNotifications(() => {
    emitMailRefreshRequested();
  });

  const posSub = subscribeToPositions((pos) => {
    emitPositionUpdate(pos);
  });

  const typingSub = subscribeToTyping((data) => {
    emitTypingUpdate(data);
  });

  return () => {
    chatSub.unsubscribe();
    mailSub.unsubscribe();
    posSub.unsubscribe();
    typingSub.unsubscribe();
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/stompRealtimeSubscriptions.test.ts
```

Expected:

```text
PASS src/lib/websocket/stompRealtimeSubscriptions.test.ts
```

---

### Task 3: Refactor useStomp to Orchestrate Only

**Files:**
- Modify: `frontend/src/lib/websocket/useStomp.ts`
- Modify: `frontend/src/lib/websocket/useStomp.test.tsx`

- [ ] **Step 1: Update useStomp tests for extracted modules**

Modify `frontend/src/lib/websocket/useStomp.test.tsx`:

```typescript
import type { IFrame } from '@stomp/stompjs';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStomp } from './useStomp';

const {
  mockConnectWithAuth,
  mockDisconnectStomp,
  mockEnsureValidRealtimeToken,
  mockParseTokenRole,
  mockSetLoginRequired,
  mockSubscribeToStompRealtimeChannels,
} = vi.hoisted(() => ({
  mockConnectWithAuth: vi.fn(),
  mockDisconnectStomp: vi.fn(),
  mockEnsureValidRealtimeToken: vi.fn(),
  mockParseTokenRole: vi.fn(),
  mockSetLoginRequired: vi.fn(),
  mockSubscribeToStompRealtimeChannels: vi.fn(),
}));

vi.mock('./stompClient', () => ({
  connectWithAuth: mockConnectWithAuth,
  disconnectStomp: mockDisconnectStomp,
}));

vi.mock('./realtimeAuth', () => ({
  ensureValidRealtimeToken: mockEnsureValidRealtimeToken,
  parseTokenRole: mockParseTokenRole,
}));

vi.mock('./stompRealtimeSubscriptions', () => ({
  subscribeToStompRealtimeChannels: mockSubscribeToStompRealtimeChannels,
}));

vi.mock('@/lib/api/client', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('./tokenBridge', () => ({
  emitDisplayIdChange: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getDisplayIdFromToken: vi.fn().mockReturnValue('user-1'),
}));

vi.mock('@/lib/scene/mailRefreshBridge', () => ({
  emitMailRefreshRequested: vi.fn(),
}));

vi.mock('@/store/useChatStore', () => ({
  useChatStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        addMessage: vi.fn(),
        prependMessages: vi.fn(),
        setConnectionStatus: vi.fn(),
        setNpcTyping: vi.fn(),
        setLoginRequired: mockSetLoginRequired,
      }),
    { setState: vi.fn() },
  ),
}));

function tokenWithRole(role: 'MEMBER' | 'GUEST') {
  const payload = btoa(JSON.stringify({ role }));
  return `header.${payload}.signature`;
}

function TestHarness() {
  useStomp();
  return null;
}

function captureOnError(): Promise<(err: IFrame) => void> {
  return waitFor(() => {
    const call = mockConnectWithAuth.mock.calls[0];
    expect(call).toBeDefined();
    return call[2] as (err: IFrame) => void;
  });
}

const tokenInvalidError = {
  command: 'ERROR',
  headers: { message: 'Invalid or expired token' },
} as unknown as IFrame;

describe('useStomp — 멤버 토큰 만료 시 STOMP 자동 reconnect 차단', () => {
  beforeEach(() => {
    mockConnectWithAuth.mockReset();
    mockDisconnectStomp.mockReset();
    mockEnsureValidRealtimeToken.mockReset();
    mockParseTokenRole.mockReset();
    mockSetLoginRequired.mockReset();
    mockSubscribeToStompRealtimeChannels.mockReset();
    mockSubscribeToStompRealtimeChannels.mockReturnValue(vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('멤버 토큰 + 401 ERROR → disconnectStomp 가 호출돼 STOMP 내장 reconnect 까지 끊는다', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockEnsureValidRealtimeToken.mockResolvedValue(member);
    mockParseTokenRole.mockReturnValue('MEMBER');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockDisconnectStomp.mockClear();
    onError(tokenInvalidError);

    expect(mockDisconnectStomp).toHaveBeenCalledTimes(1);
  });

  it('게스트 토큰 + 401 ERROR → disconnectStomp 호출 X (토큰 갱신 후 재연결 흐름 보존)', async () => {
    const guest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', guest);
    mockEnsureValidRealtimeToken.mockResolvedValue(guest);
    mockParseTokenRole.mockReturnValue('GUEST');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockDisconnectStomp.mockClear();
    onError(tokenInvalidError);

    expect(mockDisconnectStomp).not.toHaveBeenCalled();
  });

  it('멤버 토큰 + 401 ERROR → 만료 토큰 localStorage 제거 + setLoginRequired(true) 호출', async () => {
    const member = tokenWithRole('MEMBER');
    localStorage.setItem('accessToken', member);
    mockEnsureValidRealtimeToken.mockResolvedValue(member);
    mockParseTokenRole.mockReturnValue('MEMBER');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockSetLoginRequired.mockClear();
    onError(tokenInvalidError);

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(mockSetLoginRequired).toHaveBeenCalledWith(true);
  });

  it('게스트 토큰 + 401 ERROR → setLoginRequired 호출 X (자동 갱신 흐름 보존)', async () => {
    const guest = tokenWithRole('GUEST');
    localStorage.setItem('accessToken', guest);
    mockEnsureValidRealtimeToken.mockResolvedValue(guest);
    mockParseTokenRole.mockReturnValue('GUEST');
    render(<TestHarness />);
    const onError = await captureOnError();

    mockSetLoginRequired.mockClear();
    onError(tokenInvalidError);

    expect(mockSetLoginRequired).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run useStomp tests to verify they fail before refactor**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/useStomp.test.tsx
```

Expected:

```text
FAIL src/lib/websocket/useStomp.test.tsx
```

The expected failure is that `useStomp.ts` still imports old local helpers or does not call the new mocked modules.

- [ ] **Step 3: Refactor useStomp**

Modify `frontend/src/lib/websocket/useStomp.ts` to:

```typescript
'use client';

import { useEffect, useRef } from 'react';

import type { IFrame } from '@stomp/stompjs';

import apiClient from '@/lib/api/client';
import { getDisplayIdFromToken } from '@/lib/auth';
import { emitMailRefreshRequested } from '@/lib/scene/mailRefreshBridge';
import { useChatStore } from '@/store/useChatStore';
import type { ChatMessage, MessageResponse } from '@/types/chat';

import { ensureValidRealtimeToken, parseTokenRole } from './realtimeAuth';
import { connectWithAuth, disconnectStomp } from './stompClient';
import { subscribeToStompRealtimeChannels } from './stompRealtimeSubscriptions';
import { emitDisplayIdChange } from './tokenBridge';

const RECONNECT_DELAY_MS = 3_000;
const TOKEN_INVALID_MESSAGE = 'Invalid or expired token';
const AUTH_ERROR_THRESHOLD = 1;

function toMessage(msg: MessageResponse): ChatMessage {
  return {
    id: msg.id,
    participantId: msg.participantId,
    senderId: msg.senderId,
    senderType: msg.senderType,
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

export function useStomp(): void {
  const addMessage = useChatStore((s) => s.addMessage);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const setConnectionStatus = useChatStore((s) => s.setConnectionStatus);
  const setNpcTyping = useChatStore((s) => s.setNpcTyping);
  const setLoginRequired = useChatStore((s) => s.setLoginRequired);
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let consecutiveAuthErrors = 0;

    const connect = async () => {
      const token = await ensureValidRealtimeToken();
      if (cancelled) return;

      if (!token) {
        console.error('[useStomp] 토큰 없이 STOMP 연결 불가');
        setConnectionStatus('error');
        return;
      }

      emitDisplayIdChange(getDisplayIdFromToken(token));

      console.log('[useStomp] Connecting to STOMP server');
      setConnectionStatus('connecting');

      const onConnected = () => {
        if (cancelled) return;
        console.log('[useStomp] STOMP connected, subscribing to village chat');
        setConnectionStatus('connected');
        consecutiveAuthErrors = 0;
        emitMailRefreshRequested();

        if (parseTokenRole(token) !== 'GUEST') {
          apiClient
            .get<MessageResponse[]>('/api/v1/chat/messages')
            .then(({ data }) => {
              if (!cancelled) {
                prependMessages(data.map(toMessage).reverse());
              }
            })
            .catch((err: unknown) => {
              console.warn('[useStomp] 히스토리 로드 실패', err);
            });
        }

        unsubscribeRealtimeRef.current?.();
        unsubscribeRealtimeRef.current = subscribeToStompRealtimeChannels({
          addMessage,
          setNpcTyping,
        });
      };

      const onError = (err: IFrame) => {
        console.error('[useStomp] STOMP error:', err);
        setConnectionStatus('error');
        if (cancelled) return;

        const isAuthError = err.headers.message === TOKEN_INVALID_MESSAGE;
        if (isAuthError) {
          consecutiveAuthErrors += 1;
          if (consecutiveAuthErrors >= AUTH_ERROR_THRESHOLD) {
            const stored = localStorage.getItem('accessToken');
            const role = parseTokenRole(stored);
            consecutiveAuthErrors = 0;

            if (role === 'MEMBER') {
              console.warn('[useStomp] 멤버 인증 실패 — 토큰 제거 + 재로그인 진입점 노출');
              localStorage.removeItem('accessToken');
              setLoginRequired(true);
              disconnectStomp();
              return;
            }
            console.log('[useStomp] 게스트 인증 에러 — 토큰 갱신 후 재연결');
            localStorage.removeItem('accessToken');
          }
        }

        setTimeout(() => {
          if (!cancelled) void connect();
        }, RECONNECT_DELAY_MS);
      };

      connectWithAuth(token, onConnected, onError);
    };

    const handleUnload = () => {
      disconnectStomp();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    void connect();

    return () => {
      cancelled = true;
      console.log('[useStomp] Cleanup: disconnecting');
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      unsubscribeRealtimeRef.current?.();
      unsubscribeRealtimeRef.current = null;
      disconnectStomp();
      setConnectionStatus('disconnected');
      emitDisplayIdChange(null);
    };
  }, [addMessage, prependMessages, setConnectionStatus, setNpcTyping, setLoginRequired]);
}
```

- [ ] **Step 4: Run useStomp tests to verify they pass**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/useStomp.test.tsx
```

Expected:

```text
PASS src/lib/websocket/useStomp.test.tsx
```

---

### Task 4: Integration Verification and Track Update

**Files:**
- Modify: `docs/handover/track-realtime-infra-reset.md`

- [ ] **Step 1: Run focused frontend websocket tests**

Run:

```powershell
pnpm.cmd test:run src/lib/websocket/realtimeAuth.test.ts src/lib/websocket/stompRealtimeSubscriptions.test.ts src/lib/websocket/useStomp.test.tsx
```

Expected:

```text
PASS src/lib/websocket/realtimeAuth.test.ts
PASS src/lib/websocket/stompRealtimeSubscriptions.test.ts
PASS src/lib/websocket/useStomp.test.tsx
```

- [ ] **Step 2: Run TypeScript check**

Run:

```powershell
pnpm.cmd build
```

Expected:

```text
Compiled successfully
```

If `pnpm.cmd build` is too slow or fails for unrelated Next build environment reasons, run:

```powershell
npx tsc --noEmit
```

Expected:

```text
No TypeScript errors
```

- [ ] **Step 3: Update track file**

In `docs/handover/track-realtime-infra-reset.md`, update the roadmap row for Step 2 after the implementation commit exists. Replace `<implementation-commit-sha>` with the actual commit hash:

```markdown
| 2 | Frontend Client Split: STOMP 유지 상태에서 실시간 클라이언트 책임 분리 | 완료 | #127 | <implementation-commit-sha> |
```

Also append under `## 3. 현재 단계 상세`:

```markdown
Frontend Client Split 완료:

- `useStomp`는 React lifecycle orchestration만 담당한다.
- 토큰 결정은 `realtimeAuth.ts`로 분리했다.
- STOMP 채널 구독과 bridge fan-out은 `stompRealtimeSubscriptions.ts`로 분리했다.
- 운영 경로는 여전히 STOMP `/ws`이며 raw WS 전환은 하지 않았다.
```

- [ ] **Step 4: Commit implementation**

Run:

```powershell
git add frontend/src/lib/websocket/realtimeAuth.ts frontend/src/lib/websocket/realtimeAuth.test.ts frontend/src/lib/websocket/stompRealtimeSubscriptions.ts frontend/src/lib/websocket/stompRealtimeSubscriptions.test.ts frontend/src/lib/websocket/useStomp.ts frontend/src/lib/websocket/useStomp.test.tsx docs/handover/track-realtime-infra-reset.md
git commit -m "Split frontend realtime client responsibilities"
```

Expected:

```text
[chore/realtime-infra-reset-design <sha>] Split frontend realtime client responsibilities
```

---

## Self-Review

- Spec coverage: This plan implements the next step chosen by the audit: Frontend Client Split. It does not introduce raw WebSocket cutover.
- Placeholder scan: No unknown file paths or unresolved type names are used. The roadmap commit cell is explicitly filled with the actual implementation hash after the commit exists.
- Type consistency: `RealtimeTokenRole`, `subscribeToStompRealtimeChannels`, and callback signatures are defined before use.
