import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // 인증 API(/auth/*)의 401은 로그인 실패이므로 건드리지 않는다.
      // 그 외 401은 토큰 만료 → 토큰 제거 후 새로고침 (LoginPrompt가 다시 뜬다).
      const url = error.config?.url ?? '';
      if (!url.includes('/auth/')) {
        localStorage.removeItem('accessToken');
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

export default apiClient;
