import { Injectable } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { NotificationService } from './notification.service';
import { ChatHistory, CreateChatHistoryRequest, ChatSession } from '../models/chat-history.model';

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {
  private readonly endpoint = '/chat-history';

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {}

  createChatSession(chatData: CreateChatHistoryRequest, sessionId: string): Observable<ChatHistory> {
    return this.apiService.post<ChatHistory>(`${this.endpoint}?sessionId=${sessionId}`, chatData)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to save chat session');
          return throwError(() => error);
        })
      );
  }

  getChatHistoryByPolicy(policyId: string): Observable<ChatHistory[]> {
    return this.apiService.get<ChatHistory[]>(`${this.endpoint}/policy/${policyId}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load chat history');
          return throwError(() => error);
        })
      );
  }

  getChatHistoryBySession(sessionId: string): Observable<ChatHistory[]> {
    return this.apiService.get<ChatHistory[]>(`${this.endpoint}/session/${sessionId}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load chat session');
          return throwError(() => error);
        })
      );
  }

  getUserChatSessions(): Observable<ChatSession[]> {
    return this.apiService.get<ChatSession[]>(`${this.endpoint}/sessions`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to load chat sessions');
          return throwError(() => error);
        })
      );
  }

  deleteChatSession(sessionId: string): Observable<void> {
    return this.apiService.delete<void>(`${this.endpoint}/session/${sessionId}`)
      .pipe(
        tap(() => {
          this.notificationService.showSuccess('Chat session deleted successfully!');
        }),
        catchError(error => {
          this.notificationService.showError('Failed to delete chat session');
          return throwError(() => error);
        })
      );
  }

  // Export functionality
  exportChatSession(sessionId: string): Observable<any> {
    return this.apiService.get(`${this.endpoint}/export/session/${sessionId}`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to export chat session');
          return throwError(() => error);
        })
      );
  }

  exportAllChatSessions(): Observable<any> {
    return this.apiService.get(`${this.endpoint}/export/all`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to export chat history');
          return throwError(() => error);
        })
      );
  }

  exportChatHistoryAsPDF(sessionId: string): Observable<Blob> {
    return this.apiService.getBlob(`${this.endpoint}/export/session/${sessionId}/pdf`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to export PDF');
          return throwError(() => error);
        })
      );
  }

  exportChatHistoryAsCSV(sessionId: string): Observable<Blob> {
    return this.apiService.getBlob(`${this.endpoint}/export/session/${sessionId}/csv`)
      .pipe(
        catchError(error => {
          this.notificationService.showError('Failed to export CSV');
          return throwError(() => error);
        })
      );
  }
}
