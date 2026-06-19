export interface VillageDashboard {
  date: string;
  guestCount: number;
  memberCount: number;
  totalCount: number;
  confessionCount: number;
}

export interface DailyVisitResult extends VillageDashboard {
  added: boolean;
}

export type SuggestionAuthorType = 'GUEST' | 'MEMBER';
export type SuggestionStatus = 'OPEN' | 'DONE';

export interface Suggestion {
  id: number;
  authorType: SuggestionAuthorType;
  title: string;
  body: string;
  status: SuggestionStatus;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
}
