export interface ChatMessage {
  id: string;
  participantId: number;
  senderId: number | null;
  senderType: 'USER' | 'NPC';
  body: string;
  createdAt: string;
}

export interface MessageResponse {
  id: string;
  participantId: number;
  senderId: number | null;
  senderType: 'USER' | 'NPC';
  body: string;
  createdAt: string;
}
