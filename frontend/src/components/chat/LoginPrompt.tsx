'use client';

import { useEffect, useState } from 'react';

import apiClient from '@/lib/api/client';
import { useChatStore } from '@/store/useChatStore';

interface LoginPromptProps {
  onClose: () => void;
}

async function authenticate(email: string, password: string): Promise<string> {
  try {
    const { data } = await apiClient.post<{ accessToken: string }>('/api/v1/auth/register', {
      email,
      password,
    });
    return data.accessToken;
  } catch {
    // 회원가입 실패(이미 가입됨 등) → 로그인 시도
  }

  const { data } = await apiClient.post<{ accessToken: string }>('/api/v1/auth/login', {
    email,
    password,
  });
  return data.accessToken;
}

export default function LoginPrompt({ onClose }: LoginPromptProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setInputFocused = useChatStore((s) => s.setInputFocused);

  useEffect(() => {
    setInputFocused(true);
    return () => {
      setInputFocused(false);
    };
  }, [setInputFocused]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await authenticate(email, password);
      localStorage.setItem('accessToken', token);
      onClose();
      window.location.reload();
    } catch {
      setError('로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-80 rounded-3xl border-2 border-sand bg-cream p-6 shadow-xl">
        <h2 className="mb-1 font-display text-lg font-semibold text-bark">마을에 들어가기</h2>
        <p className="mb-4 text-xs text-bark-muted">처음이면 자동으로 가입돼요</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder="이메일"
            required
            autoFocus
            className="rounded-xl border-[1.5px] border-sand bg-warm-white px-3 py-2.5 text-sm text-bark outline-none transition-all focus:border-leaf/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            placeholder="비밀번호"
            required
            minLength={8}
            className="rounded-xl border-[1.5px] border-sand bg-warm-white px-3 py-2.5 text-sm text-bark outline-none transition-all focus:border-leaf/40"
          />
          {error && <p className="text-xs text-hearth">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-leaf py-2.5 font-display text-sm font-medium text-cream transition-all hover:bg-leaf-dark disabled:opacity-50"
          >
            {loading ? '들어가는 중...' : '마을 들어가기'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-bark-muted transition-colors hover:text-bark"
          >
            나중에 할게요
          </button>
        </form>
      </div>
    </div>
  );
}
