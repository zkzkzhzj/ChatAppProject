export type ConfessionBookshelf = 'GENERAL' | 'LONELINESS' | 'RELATIONSHIP' | 'CAREER' | 'FAMILY';

export type ConfessionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMINENT';

export type ConfessionStatus =
  | 'VISIBLE'
  | 'HIDDEN_BY_AUTHOR'
  | 'PENDING_REVIEW'
  | 'HIDDEN_BY_MODERATOR'
  | 'DELETED';

export type ConfessionReactionType = 'CANDLE' | 'HEART' | 'HUG';

export type ConfessionReportReason = 'HARMFUL_CONTENT' | 'SPAM' | 'PERSONAL_INFORMATION' | 'OTHER';

export interface ConfessionSummary {
  id: number;
  title: string;
  preview: string;
  bookshelf: ConfessionBookshelf;
  createdAt: string;
}

export interface ConfessionDetail {
  id: number;
  title: string;
  body: string;
  bookshelf: ConfessionBookshelf;
  status: ConfessionStatus;
  riskLevel: ConfessionRiskLevel;
  createdAt: string;
}

export interface ConfessionLetter {
  id: number;
  confessionId: number;
  body: string;
  status: 'SENT' | 'HIDDEN' | 'DELETED';
  authorReadAt: string | null;
  createdAt: string;
}

export interface ThankReply {
  id: number;
  letterId: number;
  body: string;
  createdAt: string;
}

export interface ConfessionReactionSummary {
  reactionType: ConfessionReactionType;
  count: number;
}

export interface ConfessionReactionResult {
  reactionType: ConfessionReactionType;
  added: boolean;
}

export interface ReportConfessionResult {
  added: boolean;
}
