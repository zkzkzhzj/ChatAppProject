'use client';

import { useEffect, useState } from 'react';

import apiClient from '@/lib/api/client';
import { useChatStore } from '@/store/useChatStore';

interface LoginPromptProps {
  onClose: () => void;
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
      const { data } = await apiClient.post<{ accessToken: string }>('/api/v1/auth/register', {
        email,
        password,
      });
      localStorage.setItem('accessToken', data.accessToken);
      onClose();
      window.location.reload();
    } catch {
      try {
        const { data } = await apiClient.post<{ accessToken: string }>('/api/v1/auth/login', {
          email,
          password,
        });
        localStorage.setItem('accessToken', data.accessToken);
        onClose();
        window.location.reload();
      } catch {
        setError('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-80 rounded-xl bg-zinc-800 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-white">로그인 / 회원가입</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder="이메일"
            required
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
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
            className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-400 outline-none focus:ring-1 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? '처리 중...' : '시작하기'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            닫기
          </button>
        </form>
      </div>
    </div>
  );
}
