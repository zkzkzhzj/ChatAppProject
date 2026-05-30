import apiClient from '@/lib/api/client';
import type {
  ConfessionBookshelf,
  ConfessionDetail,
  ConfessionLetter,
  ConfessionReactionResult,
  ConfessionReactionSummary,
  ConfessionReactionType,
  ConfessionReportReason,
  ConfessionSummary,
  ReportConfessionResult,
  ThankReply,
} from '@/types/confession';

export async function listConfessions(
  bookshelf?: ConfessionBookshelf,
): Promise<ConfessionSummary[]> {
  const { data } = await apiClient.get<ConfessionSummary[]>('/api/v1/confessions', {
    params: { bookshelf, limit: 30 },
  });
  return data;
}

export async function getConfession(confessionId: number): Promise<ConfessionDetail> {
  const { data } = await apiClient.get<ConfessionDetail>(
    `/api/v1/confessions/${String(confessionId)}`,
  );
  return data;
}

export async function createConfession(input: {
  title: string;
  body: string;
  bookshelf: ConfessionBookshelf;
}): Promise<ConfessionDetail> {
  const { data } = await apiClient.post<ConfessionDetail>('/api/v1/confessions', input);
  return data;
}

export async function sendConfessionLetter(
  confessionId: number,
  body: string,
): Promise<ConfessionLetter> {
  const { data } = await apiClient.post<ConfessionLetter>(
    `/api/v1/confessions/${String(confessionId)}/letters`,
    { body },
  );
  return data;
}

export async function listSentLetters(): Promise<ConfessionLetter[]> {
  const { data } = await apiClient.get<ConfessionLetter[]>('/api/v1/confessions/me/letters');
  return data;
}

export async function listReceivedLetters(confessionId?: number): Promise<ConfessionLetter[]> {
  if (confessionId === undefined) {
    return [];
  }

  const { data } = await apiClient.get<ConfessionLetter[]>(
    `/api/v1/confessions/me/${String(confessionId)}/letters`,
  );
  return data;
}

export async function sendThankReply(letterId: number, body: string): Promise<ThankReply> {
  const { data } = await apiClient.post<ThankReply>(
    `/api/v1/confessions/me/letters/${String(letterId)}/thank-reply`,
    { body },
  );
  return data;
}

export async function getThankReply(letterId: number): Promise<ThankReply | null> {
  const response = await apiClient.get<ThankReply | ''>(
    `/api/v1/confessions/me/letters/${String(letterId)}/thank-reply`,
    { validateStatus: (status) => status === 200 || status === 204 },
  );
  return response.status === 204 ? null : (response.data as ThankReply);
}

export async function listReactions(confessionId: number): Promise<ConfessionReactionSummary[]> {
  const { data } = await apiClient.get<ConfessionReactionSummary[]>(
    `/api/v1/confessions/${String(confessionId)}/reactions`,
  );
  return data;
}

export async function addReaction(
  confessionId: number,
  reactionType: ConfessionReactionType,
): Promise<ConfessionReactionResult> {
  const { data } = await apiClient.post<ConfessionReactionResult>(
    `/api/v1/confessions/${String(confessionId)}/reactions`,
    { reactionType },
  );
  return data;
}

export async function reportConfession(
  confessionId: number,
  reason: ConfessionReportReason,
): Promise<ReportConfessionResult> {
  const { data } = await apiClient.post<ReportConfessionResult>(
    `/api/v1/confessions/${String(confessionId)}/reports`,
    { reason },
  );
  return data;
}

export async function listNpcSimilarConfessions(
  bookshelf?: ConfessionBookshelf,
): Promise<ConfessionSummary[]> {
  const { data } = await apiClient.get<ConfessionSummary[]>(
    '/api/v1/library/npc/similar-confessions',
    {
      params: { bookshelf, limit: 5 },
    },
  );
  return data;
}
