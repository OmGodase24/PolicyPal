import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ChatHistoryService } from '@core/services/chat-history.service';
import { PolicyService } from '@core/services/policy.service';
import { NotificationService } from '@core/services/notification.service';
import { ChatHistory, ChatSession } from '@core/models/chat-history.model';
import { Policy } from '@core/models/policy.model';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="chat-history-container">
      <div class="chat-history-content">
        <!-- Header -->
        <div class="chat-history-header">
          <div class="header-main">
            <h1 class="header-title">{{ 'chatHistory.title' | translate }}</h1>
            <p class="header-subtitle">{{ 'chatHistory.subtitle' | translate }}</p>
          </div>
          <div class="header-actions">
            <button (click)="refreshHistory()" class="btn-secondary">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ 'chatHistory.refresh' | translate }}
            </button>
            <button (click)="exportAllChats()" class="btn-primary" [disabled]="!hasChatHistory">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              {{ 'chatHistory.exportAll' | translate }}
            </button>
          </div>
        </div>

        <!-- Filters and Search -->
        <div class="filters-section">
          <div class="search-container">
            <div class="search-input-wrapper">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input type="text" 
                     [placeholder]="'chatHistory.searchPlaceholder' | translate" 
                     class="search-input"
                     [(ngModel)]="searchTerm"
                     (input)="filterChatHistory()">
              @if (searchTerm) {
                <button (click)="clearSearch()" class="clear-search-btn">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              }
            </div>
          </div>

          <div class="filters-row">
            <select [(ngModel)]="selectedPolicy" (change)="filterChatHistory()" class="filter-select">
              <option value="">{{ 'chatHistory.allPolicies' | translate }}</option>
              @for (policy of policies; track policy._id) {
                <option [value]="policy._id">{{ policy.title }}</option>
              }
            </select>

            <select [(ngModel)]="dateRange" (change)="filterChatHistory()" class="filter-select">
              <option value="">{{ 'chatHistory.allTime' | translate }}</option>
              <option value="today">{{ 'chatHistory.today' | translate }}</option>
              <option value="week">{{ 'chatHistory.thisWeek' | translate }}</option>
              <option value="month">{{ 'chatHistory.thisMonth' | translate }}</option>
              <option value="year">{{ 'chatHistory.thisYear' | translate }}</option>
            </select>

            <select [(ngModel)]="sortBy" (change)="sortChatHistory()" class="filter-select">
              <option value="newest">{{ 'chatHistory.newestFirst' | translate }}</option>
              <option value="oldest">{{ 'chatHistory.oldestFirst' | translate }}</option>
              <option value="policy">{{ 'chatHistory.byPolicy' | translate }}</option>
            </select>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-section">
          <div class="stat-card">
            <div class="stat-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ totalChats }}</div>
              <div class="stat-label">{{ 'chatHistory.totalChats' | translate }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ uniquePolicies }}</div>
              <div class="stat-label">{{ 'chatHistory.policiesDiscussed' | translate }}</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ recentChats }}</div>
              <div class="stat-label">{{ 'chatHistory.thisWeek' | translate }}</div>
            </div>
          </div>
        </div>

        <!-- Chat History List -->
        <div class="chat-history-list">
          @if (isLoading) {
            <div class="loading-state">
              <div class="spinner"></div>
              <span>{{ 'chatHistory.loading' | translate }}</span>
            </div>
          } @else if (filteredChatSessions.length === 0) {
            <div class="empty-state">
              <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              <h3>{{ 'chatHistory.noChatHistory' | translate }}</h3>
              <p>{{ 'chatHistory.noChatHistoryDescription' | translate }}</p>
              <button (click)="goToAIAssistant()" class="btn-primary">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                {{ 'chatHistory.startAIChat' | translate }}
              </button>
            </div>
          } @else {
            @for (session of filteredChatSessions; track session.sessionId) {
              <div class="chat-session-card">
                <div class="session-header">
                  <div class="session-info">
                    <h3 class="session-title">{{ getPolicyTitle(session.policyId) }}</h3>
                    <p class="session-meta">
                      {{ session.messageCount }} messages • 
                      {{ session.lastMessage | date:'MMM d, y at h:mm a' }}
                    </p>
                  </div>
                  <div class="session-actions">
                    <button (click)="viewSession(session)" class="action-btn primary">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      {{ 'chatHistory.view' | translate }}
                    </button>
                    <div class="export-dropdown">
                      <button class="action-btn secondary dropdown-toggle" (click)="toggleExportDropdown(session.sessionId)">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        {{ 'chatHistory.export' | translate }}
                        <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>
                      <div class="export-menu" [class.show]="activeExportDropdown === session.sessionId">
                        <button (click)="exportSessionAsJSON(session)" class="export-option">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          {{ 'chatHistory.exportAsJSON' | translate }}
                        </button>
                        <button (click)="exportSessionAsPDF(session)" class="export-option">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                          </svg>
                          {{ 'chatHistory.exportAsPDF' | translate }}
                        </button>
                        <button (click)="exportSessionAsCSV(session)" class="export-option">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          {{ 'chatHistory.exportAsCSV' | translate }}
                        </button>
                      </div>
                    </div>
                    <button (click)="deleteSession(session)" class="action-btn danger">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      {{ 'chatHistory.delete' | translate }}
                    </button>
                  </div>
                </div>
                
                @if (session.summary) {
                  <div class="session-summary">
                    <p>{{ session.summary }}</p>
                  </div>
                }

                <div class="session-stats">
                  <span class="stat-item">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    {{ session.messageCount }} {{ 'chatHistory.messages' | translate }}
                  </span>
                  <span class="stat-item">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ getSessionDuration(session) }}
                  </span>
                  @if (session.confidence) {
                    <span class="stat-item">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {{ (session.confidence * 100).toFixed(0) }}% {{ 'chatHistory.confidence' | translate }}
                    </span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-history-container {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
      padding: 2rem;
    }

    .chat-history-content {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .chat-history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2.5rem;
      padding: 2rem;
      background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
      border: 1px solid var(--color-border-primary);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .chat-history-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--color-primary) 0%, #8b5cf6 50%, var(--color-primary) 100%);
    }

    .header-main {
      flex: 1;
      position: relative;
      z-index: 1;
    }

    .header-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 0.75rem 0;
      color: var(--color-text-primary);
      background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary);
      margin: 0;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      margin-left: 2rem;
      position: relative;
      z-index: 1;
    }

    /* Filters */
    .filters-section {
      margin-bottom: 2.5rem;
      padding: 2rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 16px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(10px);
    }

    .search-container {
      margin-bottom: 1.5rem;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 1.25rem;
      width: 1.5rem;
      height: 1.5rem;
      color: var(--color-text-tertiary);
      pointer-events: none;
      z-index: 1;
      top: 50%;
      transform: translateY(-50%);
      flex-shrink: 0;
    }

    .search-input {
      width: 100%;
      padding: 1rem 4rem 1rem 4rem;
      background: var(--color-bg-primary);
      border: 2px solid var(--color-border-primary);
      border-radius: 12px;
      color: var(--color-text-primary);
      font-size: 1rem;
      font-weight: 500;
      transition: all 0.3s ease;
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .search-input::placeholder {
      color: var(--color-text-tertiary);
    }

    .clear-search-btn {
      position: absolute;
      right: 1.25rem;
      top: 50%;
      transform: translateY(-50%);
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary);
      border: none;
      border-radius: 50%;
      color: var(--color-text-tertiary);
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 2;
    }

    .clear-search-btn:hover {
      background: var(--color-primary);
      color: white;
      transform: translateY(-50%) scale(1.1);
    }

    .filters-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .filter-select {
      padding: 0.875rem 1rem;
      background: var(--color-bg-primary);
      border: 2px solid var(--color-border-primary);
      border-radius: 10px;
      color: var(--color-text-primary);
      font-size: 0.95rem;
      font-weight: 500;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .filter-select:hover {
      border-color: var(--color-primary);
    }

    /* Stats */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
      border: 1px solid var(--color-border-primary);
      border-radius: 16px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--color-primary) 0%, #8b5cf6 100%);
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .stat-content {
      flex: 1;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-text-primary);
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Chat History List */
    .chat-history-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .chat-session-card {
      background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
      border: 1px solid var(--color-border-primary);
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .chat-session-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--color-primary) 0%, #8b5cf6 100%);
    }

    .chat-session-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
      border-color: var(--color-primary);
    }

    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }

    .session-info {
      flex: 1;
    }

    .session-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
      background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .session-meta {
      font-size: 0.95rem;
      color: var(--color-text-secondary);
      margin: 0;
      font-weight: 500;
    }

    .session-actions {
      display: flex;
      gap: 0.75rem;
      margin-left: 1.5rem;
      flex-wrap: wrap;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      position: relative;
      overflow: hidden;
    }

    .action-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .action-btn:hover::before {
      left: 100%;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .action-btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }

    .action-btn.secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 2px solid var(--color-border-primary);
    }

    .action-btn.secondary:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    .action-btn.danger {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      color: #dc2626;
      border: 2px solid #fecaca;
    }

    .action-btn.danger:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      border-color: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
    }

    /* Export Dropdown */
    .export-dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .export-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--color-shadow);
      z-index: 10;
      min-width: 180px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s ease;
    }

    .export-menu.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .export-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .export-option:hover {
      background: var(--color-bg-tertiary);
    }

    .export-option:first-child {
      border-radius: 8px 8px 0 0;
    }

    .export-option:last-child {
      border-radius: 0 0 8px 8px;
    }

    .export-option:only-child {
      border-radius: 8px;
    }

    .session-summary {
      margin-bottom: 1.25rem;
      padding: 1.25rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 12px;
      border-left: 4px solid var(--color-primary);
    }

    .session-summary p {
      font-size: 0.95rem;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.6;
      font-weight: 500;
    }

    .session-stats {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border-primary);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text-tertiary);
      font-weight: 600;
      padding: 0.5rem 1rem;
      background: var(--color-bg-primary);
      border-radius: 8px;
      border: 1px solid var(--color-border-primary);
    }

    .stat-item svg {
      color: var(--color-primary);
    }

    /* Loading and Empty States */
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border-primary);
      border-top: 3px solid var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    .empty-state svg {
      color: var(--color-text-tertiary);
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 1.5rem 0;
    }

    /* Buttons */
    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 0.875rem 1.5rem;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      position: relative;
      overflow: hidden;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:disabled {
      background: var(--color-text-tertiary);
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 2px solid var(--color-border-primary);
    }

    .btn-secondary:hover {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .chat-history-container {
        padding: 1rem;
      }

      .chat-history-header {
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .header-title {
        font-size: 1.5rem;
      }

      .header-actions {
        margin-left: 0;
        width: 100%;
        justify-content: stretch;
        gap: 0.75rem;
      }

      .filters-section {
        padding: 1.5rem;
      }

      .filters-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .filter-select {
        min-width: auto;
        width: 100%;
      }

      .stats-section {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .chat-history-list {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .session-header {
        flex-direction: column;
        gap: 1rem;
      }

      .session-actions {
        margin-left: 0;
        width: 100%;
        justify-content: stretch;
        gap: 0.5rem;
      }

      .action-btn {
        flex: 1;
        justify-content: center;
        padding: 0.75rem 0.5rem;
        font-size: 0.8rem;
      }

      .session-stats {
        flex-direction: column;
        gap: 0.75rem;
      }

      .stat-item {
        justify-content: center;
      }
    }

    /* Dark Mode Enhancements */
    .dark .chat-history-container {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .dark .chat-history-header {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-color: #475569;
    }

    .dark .filters-section {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-color: #475569;
    }

    .dark .stat-card {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-color: #475569;
    }

    .dark .chat-session-card {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-color: #475569;
    }

    .dark .session-summary {
      background: #0f172a;
      border-color: #475569;
    }

    .dark .stat-item {
      background: #0f172a;
      border-color: #475569;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ChatHistoryComponent implements OnInit {
  chatSessions: ChatSession[] = [];
  filteredChatSessions: ChatSession[] = [];
  policies: Policy[] = [];
  isLoading = false;

  // Filters
  searchTerm = '';
  selectedPolicy = '';
  dateRange = '';
  sortBy = 'newest';

  // Export dropdown state
  activeExportDropdown: string | null = null;

  // Stats
  get totalChats(): number {
    return this.chatSessions.length;
  }

  get uniquePolicies(): number {
    const uniquePolicyIds = new Set(this.chatSessions.map(session => session.policyId));
    return uniquePolicyIds.size;
  }

  get recentChats(): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.chatSessions.filter(session => 
      new Date(session.lastMessage) > oneWeekAgo
    ).length;
  }

  get hasChatHistory(): boolean {
    return this.chatSessions.length > 0;
  }

  constructor(
    private chatHistoryService: ChatHistoryService,
    private policyService: PolicyService,
    private notificationService: NotificationService,
    private router: Router,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadChatHistory();
    this.loadPolicies();
  }

  loadChatHistory(): void {
    this.isLoading = true;
    this.chatHistoryService.getUserChatSessions().subscribe({
      next: (sessions: ChatSession[]) => {
        this.chatSessions = sessions;
        this.filteredChatSessions = sessions;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading chat history:', error);
        this.notificationService.showError('Failed to load chat history');
        this.isLoading = false;
      }
    });
  }

  loadPolicies(): void {
    this.policyService.getMyPolicies().subscribe({
      next: (policies: Policy[]) => {
        this.policies = policies;
      },
      error: (error: any) => {
        console.error('Error loading policies:', error);
      }
    });
  }

  filterChatHistory(): void {
    let filtered = [...this.chatSessions];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(session => 
        this.getPolicyTitle(session.policyId).toLowerCase().includes(searchLower) ||
        (session.summary && session.summary.toLowerCase().includes(searchLower))
      );
    }

    // Policy filter
    if (this.selectedPolicy) {
      filtered = filtered.filter(session => session.policyId === this.selectedPolicy);
    }

    // Date range filter
    if (this.dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (this.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(session => 
        new Date(session.lastMessage) >= startDate
      );
    }

    this.filteredChatSessions = filtered;
    this.sortChatHistory();
  }

  sortChatHistory(): void {
    switch (this.sortBy) {
      case 'newest':
        this.filteredChatSessions.sort((a, b) => 
          new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime()
        );
        break;
      case 'oldest':
        this.filteredChatSessions.sort((a, b) => 
          new Date(a.lastMessage).getTime() - new Date(b.lastMessage).getTime()
        );
        break;
      case 'policy':
        this.filteredChatSessions.sort((a, b) => 
          this.getPolicyTitle(a.policyId).localeCompare(this.getPolicyTitle(b.policyId))
        );
        break;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterChatHistory();
  }

  refreshHistory(): void {
    this.loadChatHistory();
    this.notificationService.showInfo('Chat history refreshed');
  }

  getPolicyTitle(policyId: string): string {
    const policy = this.policies.find(p => p._id === policyId);
    return policy?.title || this.languageService.translate('chatHistory.unknownPolicy');
  }

  getSessionDuration(session: ChatSession): string {
    // This would need to be calculated based on first and last message timestamps
    // For now, return a placeholder
    return '15 min';
  }

  viewSession(session: ChatSession): void {
    // Navigate to chat view with session data
    this.router.navigate(['/ai-chat', session.policyId], {
      state: { 
        session: session,
        policy: this.policies.find(p => p._id === session.policyId)
      }
    });
  }

  toggleExportDropdown(sessionId: string): void {
    this.activeExportDropdown = this.activeExportDropdown === sessionId ? null : sessionId;
  }

  exportSessionAsJSON(session: ChatSession): void {
    this.activeExportDropdown = null;
    this.chatHistoryService.exportChatSession(session.sessionId).subscribe({
      next: (exportData: any) => {
        this.downloadExport(exportData, `chat-session-${session.sessionId}.json`);
        this.notificationService.showSuccess('Chat session exported as JSON successfully');
      },
      error: (error: any) => {
        console.error('Error exporting session as JSON:', error);
        this.notificationService.showError('Failed to export chat session as JSON');
      }
    });
  }

  exportSessionAsPDF(session: ChatSession): void {
    this.activeExportDropdown = null;
    this.chatHistoryService.exportChatHistoryAsPDF(session.sessionId).subscribe({
      next: (pdfBlob: Blob) => {
        this.downloadBlob(pdfBlob, `chat-session-${session.sessionId}.pdf`);
        this.notificationService.showSuccess('Chat session exported as PDF successfully');
      },
      error: (error: any) => {
        console.error('Error exporting session as PDF:', error);
        this.notificationService.showError('Failed to export chat session as PDF');
      }
    });
  }

  exportSessionAsCSV(session: ChatSession): void {
    this.activeExportDropdown = null;
    this.chatHistoryService.exportChatHistoryAsCSV(session.sessionId).subscribe({
      next: (csvBlob: Blob) => {
        this.downloadBlob(csvBlob, `chat-session-${session.sessionId}.csv`);
        this.notificationService.showSuccess('Chat session exported as CSV successfully');
      },
      error: (error: any) => {
        console.error('Error exporting session as CSV:', error);
        this.notificationService.showError('Failed to export chat session as CSV');
      }
    });
  }

  exportAllChats(): void {
    this.chatHistoryService.exportAllChatSessions().subscribe({
      next: (exportData: any) => {
        this.downloadExport(exportData, `all-chat-history-${new Date().toISOString().split('T')[0]}.json`);
        this.notificationService.showSuccess('All chat history exported successfully');
      },
      error: (error: any) => {
        console.error('Error exporting all chats:', error);
        this.notificationService.showError('Failed to export chat history');
      }
    });
  }

  deleteSession(session: ChatSession): void {
    if (confirm('Are you sure you want to delete this chat session? This action cannot be undone.')) {
      this.chatHistoryService.deleteChatSession(session.sessionId).subscribe({
        next: () => {
          this.loadChatHistory();
          this.notificationService.showSuccess('Chat session deleted successfully');
        },
        error: (error: any) => {
          console.error('Error deleting session:', error);
          this.notificationService.showError('Failed to delete chat session');
        }
      });
    }
  }

  goToAIAssistant(): void {
    this.router.navigate(['/ai-assistant']);
  }

  private downloadExport(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
