import { create } from 'zustand';

import type { ChatMessage } from '@/types/chat';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  isInputFocused: boolean;
  setInputFocused: (focused: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addMessage: (msg) => {
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    });
  },
  setMessages: (msgs) => {
    set({ messages: msgs });
  },

  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => {
    set({ connectionStatus: status });
  },

  isInputFocused: false,
  setInputFocused: (focused) => {
    set({ isInputFocused: focused });
  },
}));
