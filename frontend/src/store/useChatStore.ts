import { create } from 'zustand';

import type { ChatMessage } from '@/types/chat';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  addSystemMessage: (body: string) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  prependMessages: (msgs: ChatMessage[]) => void;

  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  isInputFocused: boolean;
  setInputFocused: (focused: boolean) => void;

  npcTyping: boolean;
  setNpcTyping: (typing: boolean) => void;

  /**
   * 멤버 토큰 만료/거부로 명시적 재로그인이 필요한 상태.
   * useStomp 가 401 감지 시 true 로 set → ChatOverlay 가 LoginPrompt 자동 표시.
   * LoginPrompt onClose 시 false 로 복구.
   */
  loginRequired: boolean;
  setLoginRequired: (required: boolean) => void;
}

let systemMsgCounter = 0;

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => {
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    });
  },
  addSystemMessage: (body) => {
    const msg: ChatMessage = {
      id: `system-${String(Date.now())}-${String(++systemMsgCounter)}`,
      participantId: 0,
      senderId: null,
      senderType: 'SYSTEM',
      body,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },
  setMessages: (msgs) => {
    set({ messages: msgs });
  },
  prependMessages: (msgs) => {
    set((s) => {
      const existingIds = new Set(s.messages.map((m) => m.id));
      const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
      return { messages: [...newMsgs, ...s.messages] };
    });
  },

  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  isInputFocused: false,
  setInputFocused: (focused) => {
    set({ isInputFocused: focused });
  },

  npcTyping: false,
  setNpcTyping: (typing) => {
    set({ npcTyping: typing });
  },

  loginRequired: false,
  setLoginRequired: (required) => {
    set({ loginRequired: required });
  },
}));
