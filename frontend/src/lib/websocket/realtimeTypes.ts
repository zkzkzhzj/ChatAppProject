export interface TypingBroadcast {
  id: string;
  typing: boolean;
}

export interface PositionBroadcast {
  id: string;
  userType: 'MEMBER' | 'GUEST' | 'LEAVE';
  x: number;
  y: number;
  z?: number;
}

export interface MailNotificationBroadcast {
  confessionId: number;
  letterId: number;
}
