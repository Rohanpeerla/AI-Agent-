export interface GmailMessage {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  category?: 'Urgent' | 'Update' | 'Schedule' | 'Social' | 'General';
  isUnread?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO or formatted
  end: string;   // ISO or formatted
  description?: string;
  location?: string;
  clash?: boolean;
  clashWith?: string;
}

export interface MorningBriefing {
  audioText: string;
  executiveSummary: string;
  timelineClashes: {
    title: string;
    description: string;
    events: string[];
  }[];
  urgentActions: {
    title: string;
    description: string;
    sourceEmailId?: string;
    dueDate?: string;
  }[];
}

export interface AuthState {
  user: any | null;
  accessToken: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
}
