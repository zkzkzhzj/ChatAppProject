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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded border border-sand/70 bg-panel p-5 shadow-2xl">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-moss">ghworld</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">마을에 들어가기</h2>
          <p className="mt-2 text-sm leading-5 text-ink-soft">
            처음 방문했다면 같은 정보로 계정을 만들고 바로 입장합니다.
          </p>
        </div>
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
            className="rounded border-[1.5px] border-sand bg-warm-white px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-moss/60 focus:ring-2 focus:ring-mist"
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
            className="rounded border-[1.5px] border-sand bg-warm-white px-3 py-2.5 text-sm text-ink outline-none transition-all focus:border-moss/60 focus:ring-2 focus:ring-mist"
          />
          {error && <p className="text-xs text-hearth">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-ink py-2.5 text-sm font-semibold text-cream transition-all hover:bg-moss disabled:opacity-50"
          >
            {loading ? '들어가는 중...' : '마을 들어가기'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            나중에 할게요
          </button>
        </form>
      </div>
    </div>
  );
}
