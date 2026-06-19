import apiClient from '@/lib/api/client';
import { ensureValidRealtimeToken } from '@/lib/websocket/realtimeAuth';
import type { DailyVisitResult, Suggestion, VillageDashboard } from '@/types/village-board';

const DEFAULT_SUGGESTION_LIMIT = 20;

async function ensureVillageToken(): Promise<void> {
  await ensureValidRealtimeToken();
}

export async function recordTodayVisit(): Promise<DailyVisitResult> {
  await ensureVillageToken();
  const { data } = await apiClient.post<DailyVisitResult>('/api/v1/village/visits/today');
  return data;
}

export async function getTodayDashboard(): Promise<VillageDashboard> {
  await ensureVillageToken();
  const { data } = await apiClient.get<VillageDashboard>('/api/v1/village/dashboard/today');
  return data;
}

export async function listSuggestions(): Promise<Suggestion[]> {
  await ensureVillageToken();
  const { data } = await apiClient.get<Suggestion[]>('/api/v1/village/suggestions', {
    params: { limit: DEFAULT_SUGGESTION_LIMIT },
  });
  return data;
}

export async function createSuggestion(input: {
  title: string;
  body: string;
}): Promise<Suggestion> {
  await ensureVillageToken();
  const { data } = await apiClient.post<Suggestion>('/api/v1/village/suggestions', input);
  return data;
}
