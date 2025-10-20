export interface ChatHistory {
  _id: string;
  policyId: string;
  userId: string;
  sessionId: string;
  question: string;
  answer: string;
  confidence?: number;
  sources?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatHistoryRequest {
  policyId: string;
  question: string;
  answer: string;
  confidence?: number;
  sources?: any[];
}

export interface ChatSession {
  policyId: string;
  sessionId: string;
  lastMessage: Date;
  summary?: string;
  messageCount: number;
  confidence?: number;
  createdAt: Date;
  duration?: number; // in minutes
  userQuestions: string[];
  aiAnswers: string[];
}

export interface ChatExportData {
  sessionId: string;
  policyId: string;
  policyTitle: string;
  createdAt: Date;
  lastMessage: Date;
  duration: number;
  messageCount: number;
  confidence?: number;
  summary?: string;
  messages: ChatMessage[];
  metadata: {
    exportDate: Date;
    exportFormat: 'json' | 'pdf' | 'csv';
    totalMessages: number;
    averageConfidence?: number;
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: any[];
}
