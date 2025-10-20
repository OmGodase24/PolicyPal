import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InviteService, CreateInviteRequest, InviteListResponse } from '@core/services/invite.service';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'app-invite-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="invite-management">
      <div class="header">
        <h2>{{ 'rewards.userManagement.userInvitations' | translate }}</h2>
        <p>{{ 'rewards.userManagement.inviteNewUsers' | translate }}</p>
      </div>

      <!-- Create Invite Form -->
      <div class="invite-form-section">
        <h3>{{ 'rewards.userManagement.sendInvitation' | translate }}</h3>
        <form (ngSubmit)="createInvite()" #inviteForm="ngForm">
          <div class="form-group">
            <label for="email">{{ 'rewards.userManagement.emailAddress' | translate }} *</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="inviteData.email"
              required
              email
              class="form-control"
              [placeholder]="'rewards.userManagement.enterEmailAddress' | translate"
              [disabled]="isCreatingInvite">
          </div>


          <div class="form-group">
            <label for="message">{{ 'rewards.userManagement.personalMessage' | translate }}</label>
            <textarea
              id="message"
              name="message"
              [(ngModel)]="inviteData.message"
              class="form-control"
              rows="3"
              [placeholder]="'rewards.userManagement.addPersonalMessage' | translate"
              [disabled]="isCreatingInvite"></textarea>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="!inviteForm.valid || isCreatingInvite">
              <i class="fas fa-paper-plane" [class.fa-spin]="isCreatingInvite"></i>
              {{ isCreatingInvite ? ('rewards.userManagement.sending' | translate) : ('rewards.userManagement.sendInvitation' | translate) }}
            </button>
          </div>
        </form>

        <!-- Success Message -->
        <div class="alert alert-success" *ngIf="inviteSuccess">
          <i class="fas fa-check-circle"></i>
          <strong>{{ 'rewards.userManagement.invitationSentSuccess' | translate }}</strong>
          <p>{{ 'rewards.userManagement.inviteLink' | translate }}: <code>{{ inviteLink }}</code></p>
          <button class="btn btn-sm btn-outline-primary" (click)="copyInviteLink()">
            <i class="fas fa-copy"></i> {{ 'rewards.userManagement.copyLink' | translate }}
          </button>
        </div>

        <!-- Error Message -->
        <div class="alert alert-danger" *ngIf="inviteError">
          <i class="fas fa-exclamation-circle"></i>
          <strong>{{ 'rewards.userManagement.errorLabel' | translate }}:</strong> {{ inviteError || ('rewards.userManagement.failedToSend' | translate) }}
        </div>
      </div>

      <!-- Invites List -->
      <div class="invites-list-section">
        <div class="section-header">
          <h3>{{ 'rewards.userManagement.sentInvitations' | translate }}</h3>
          <div class="invite-stats">
            <span class="stat pending">{{ stats.pending }} {{ 'rewards.userManagement.pending' | translate }}</span>
            <span class="stat used">{{ stats.used }} {{ 'rewards.userManagement.used' | translate }}</span>
            <span class="stat expired">{{ stats.expired }} {{ 'rewards.userManagement.expired' | translate }}</span>
          </div>
        </div>

        <!-- Mobile/Tablet: Show recent invite card -->
        <div *ngIf="isMobile && !showAllInvites && getRecentInvite()" class="recent-invite-card">
          <div class="recent-invite-header">
            <h4>{{ 'rewards.userManagement.recentInvitation' | translate }}</h4>
            <button 
              *ngIf="hasMoreInvites()" 
              class="btn btn-sm btn-outline-primary view-more-btn"
              (click)="toggleShowAllInvites()">
              <i class="fas fa-eye"></i>
              {{ 'rewards.userManagement.viewMore' | translate }}
            </button>
          </div>
          
          <div class="recent-invite-content">
            <div class="invite-info">
              <div class="invite-email">
                <i class="fas fa-envelope"></i>
                {{ getRecentInvite().email }}
              </div>
              <div class="invite-status">
                <span class="status-badge" [ngClass]="'status-' + getRecentInvite().status">
                  {{ getRecentInvite().status | titlecase }}
                </span>
              </div>
              <div class="invite-dates">
                <small class="text-muted">
                  {{ 'rewards.userManagement.created' | translate }}: {{ formatDate(getRecentInvite().createdAt) }}
                </small>
                <small class="text-muted">
                  {{ 'rewards.userManagement.expires' | translate }}: {{ formatDate(getRecentInvite().expiresAt) }}
                </small>
              </div>
            </div>
            
            <div class="invite-actions">
              <button
                class="btn btn-sm btn-outline-primary"
                (click)="resendInvite(getRecentInvite().id)"
                [disabled]="getRecentInvite().status !== 'pending' || isResending[getRecentInvite().id]">
                <i class="fas fa-redo" [class.fa-spin]="isResending[getRecentInvite().id]"></i>
                {{ 'rewards.userManagement.resend' | translate }}
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                (click)="cancelInvite(getRecentInvite().id)"
                [disabled]="getRecentInvite().status !== 'pending' || isCancelling[getRecentInvite().id]">
                <i class="fas fa-times" [class.fa-spin]="isCancelling[getRecentInvite().id]"></i>
                {{ 'rewards.userManagement.cancel' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Desktop/Tablet: Table view (supports View More/Show Less) -->
        <div class="invites-table" *ngIf="(!isMobile || showAllInvites) && invites.length > 0; else noInvites">
          <div class="table-header" [class.mobile-header]="isMobile">
            <div class="col-email">{{ 'rewards.userManagement.email' | translate }}</div>
            <div class="col-status">{{ 'rewards.userManagement.status' | translate }}</div>
            <div class="col-created">{{ 'rewards.userManagement.created' | translate }}</div>
            <div class="col-expires">{{ 'rewards.userManagement.expires' | translate }}</div>
            <div class="col-actions">{{ 'rewards.userManagement.actions' | translate }}</div>
          </div>

          <div class="table-row" *ngFor="let invite of getDisplayedInvites()" [class.mobile-row]="isMobile">
            <div class="col-email">{{ invite.email }}</div>
            <div class="col-status">
              <span class="status-badge" [ngClass]="'status-' + invite.status">
                {{ invite.status | titlecase }}
              </span>
            </div>
            <div class="col-created">{{ formatDate(invite.createdAt) }}</div>
            <div class="col-expires">{{ formatDate(invite.expiresAt) }}</div>
            <div class="col-actions">
              <button
                class="btn btn-sm btn-outline-primary"
                (click)="resendInvite(invite.id)"
                [disabled]="invite.status !== 'pending' || isResending[invite.id]">
                <i class="fas fa-redo" [class.fa-spin]="isResending[invite.id]"></i>
                {{ 'rewards.userManagement.resend' | translate }}
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                (click)="cancelInvite(invite.id)"
                [disabled]="invite.status !== 'pending' || isCancelling[invite.id]">
                <i class="fas fa-times" [class.fa-spin]="isCancelling[invite.id]"></i>
                {{ 'rewards.userManagement.cancel' | translate }}
              </button>
            </div>
          </div>

          <!-- Desktop: View more / Show less controls -->
          <div *ngIf="!isMobile && !showAllInvites && invites.length > 1" class="table-actions">
            <button class="btn btn-outline-primary" (click)="toggleShowAllInvites()">
              <i class="fas fa-eye"></i>
              {{ 'rewards.userManagement.viewMore' | translate }}
            </button>
          </div>

          <div *ngIf="!isMobile && showAllInvites" class="table-actions">
            <button class="btn btn-outline-secondary" (click)="toggleShowAllInvites()">
              <i class="fas fa-eye-slash"></i>
              {{ 'rewards.userManagement.showLess' | translate }}
            </button>
          </div>

          <!-- Mobile: Show less button -->
          <div *ngIf="isMobile && showAllInvites" class="mobile-actions">
            <button class="btn btn-outline-secondary" (click)="toggleShowAllInvites()">
              <i class="fas fa-eye-slash"></i>
              {{ 'rewards.userManagement.showLess' | translate }}
            </button>
          </div>
        </div>

        <ng-template #noInvites>
          <div class="no-invites">
            <i class="fas fa-inbox"></i>
            <p>{{ 'rewards.userManagement.noInvitationsYet' | translate }}</p>
          </div>
        </ng-template>

        <!-- Pagination -->
        <div class="pagination" *ngIf="totalPages > 1">
          <button
            class="btn btn-outline-primary"
            (click)="loadInvites(currentPage - 1)"
            [disabled]="currentPage <= 1">
            {{ 'rewards.userManagement.previous' | translate }}
          </button>
          <span class="page-info">
            {{ 'rewards.userManagement.pageOf' | translate: { current: currentPage, total: totalPages } }}
          </span>
          <button
            class="btn btn-outline-primary"
            (click)="loadInvites(currentPage + 1)"
            [disabled]="currentPage >= totalPages">
            {{ 'rewards.userManagement.next' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .invite-management {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2.5rem;
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.15);
    }

    .header h2 {
      color: white;
      margin-bottom: 0.75rem;
      font-size: 2rem;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 1.1rem;
      margin: 0;
    }

    .invite-form-section {
      background: var(--color-bg-secondary);
      padding: 2rem;
      border-radius: 16px;
      margin-bottom: 2rem;
      border: 1px solid var(--color-border-primary);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .invite-form-section h3 {
      margin-bottom: 1.5rem; /* increase vertical space before first field */
    }

    .invite-form-section:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-control {
      width: 100%;
      padding: 1rem;
      border: 2px solid var(--color-border-primary);
      border-radius: 12px;
      font-size: 1rem;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 16px rgba(59, 130, 246, 0.1);
      transform: translateY(-1px);
    }

    .form-control::placeholder {
      color: var(--color-text-tertiary);
      font-style: italic;
    }

    .form-actions {
      margin-top: 2rem;
      text-align: center;
    }

    .btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    .btn:hover::before {
      left: 100%;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
      color: white;
      border: 2px solid transparent;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
    }

    .btn-outline-primary {
      background-color: transparent;
      color: var(--color-primary);
      border: 2px solid var(--color-primary);
    }

    .btn-outline-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
    }

    .btn-outline-danger {
      background-color: transparent;
      color: var(--color-danger);
      border: 2px solid var(--color-danger);
    }

    .btn-outline-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.25);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }

    .btn-sm {
      padding: 0.75rem 1.25rem;
      font-size: 0.875rem;
      border-radius: 8px;
    }

    .alert {
      padding: 1.25rem;
      border-radius: 12px;
      margin: 1.5rem 0;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-success {
      background: linear-gradient(135deg, var(--color-success-light) 0%, rgba(34, 197, 94, 0.1) 100%);
      color: var(--color-success);
      border-left-color: var(--color-success);
    }

    .alert-danger {
      background: linear-gradient(135deg, var(--color-danger-light) 0%, rgba(239, 68, 68, 0.1) 100%);
      color: var(--color-danger);
      border-left-color: var(--color-danger);
    }

    .invites-list-section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .invites-list-section:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .section-header h3 {
      color: var(--color-text-primary);
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .invite-stats {
      display: flex;
      gap: 1rem;
    }

    .stat {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .stat:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat.pending {
      background: linear-gradient(135deg, var(--color-warning-light) 0%, rgba(245, 158, 11, 0.1) 100%);
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }

    .stat.used {
      background: linear-gradient(135deg, var(--color-success-light) 0%, rgba(34, 197, 94, 0.1) 100%);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }

    .stat.expired {
      background: linear-gradient(135deg, var(--color-danger-light) 0%, rgba(239, 68, 68, 0.1) 100%);
      color: var(--color-danger);
      border: 1px solid var(--color-danger);
    }

    .invites-table {
      display: flex;
      flex-direction: column;
    }

    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
      gap: 1rem;
      padding: 1.5rem 2rem;
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
      font-weight: 700;
      color: var(--color-text-primary);
      border-bottom: 2px solid var(--color-border-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.875rem;
    }

    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 2fr;
      gap: 1rem;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--color-border-primary);
      align-items: center;
      transition: all 0.3s ease;
      position: relative;
    }

    .table-row:hover {
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, rgba(59, 130, 246, 0.05) 100%);
      transform: translateX(4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }

    .table-row::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: var(--color-primary);
      transform: scaleY(0);
      transition: transform 0.3s ease;
    }

    .table-row:hover::before {
      transform: scaleY(1);
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .status-badge:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .status-pending { 
      background: linear-gradient(135deg, var(--color-warning-light) 0%, rgba(245, 158, 11, 0.1) 100%);
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }
    .status-used { 
      background: linear-gradient(135deg, var(--color-success-light) 0%, rgba(34, 197, 94, 0.1) 100%);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }
    .status-expired { 
      background: linear-gradient(135deg, var(--color-danger-light) 0%, rgba(239, 68, 68, 0.1) 100%);
      color: var(--color-danger);
      border: 1px solid var(--color-danger);
    }
    .status-cancelled { 
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, rgba(107, 114, 128, 0.1) 100%);
      color: var(--color-text-tertiary);
      border: 1px solid var(--color-text-tertiary);
    }

    .col-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .no-invites {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--color-text-secondary);
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
    }

    .no-invites i {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      opacity: 0.6;
      color: var(--color-primary);
    }

    .no-invites p {
      font-size: 1.1rem;
      font-weight: 500;
      margin: 0;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
      border-top: 1px solid var(--color-border-primary);
    }

    .page-info {
      color: var(--color-text-secondary);
      font-weight: 600;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Mobile Recent Invite Card */
    .recent-invite-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .recent-invite-card:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .recent-invite-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .recent-invite-header h4 {
      color: var(--color-text-primary);
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }

    .view-more-btn {
      font-size: 0.8rem;
      padding: 0.5rem 1rem;
    }

    .recent-invite-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .invite-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .invite-email {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .invite-email i {
      color: var(--color-primary);
    }

    .invite-status {
      display: flex;
      align-items: center;
    }

    .invite-dates {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .invite-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .mobile-actions {
      padding: 1.5rem;
      text-align: center;
      border-top: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
      margin-top: 1rem;
    }

    .table-actions {
      padding: 1.5rem;
      text-align: center;
      border-top: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
      margin-top: 1rem;
    }

    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .invite-management {
        padding: 1rem;
      }

      .header {
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .header h2 {
        font-size: 1.5rem;
      }

      .invite-form-section {
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .section-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
        padding: 1.5rem;
      }

      .invite-stats {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .stat {
        font-size: 0.75rem;
        padding: 0.375rem 0.75rem;
      }

      .table-header, .table-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
        padding: 1rem;
      }

      .col-email, .col-status, .col-created, .col-expires, .col-actions {
        display: block;
        margin-bottom: 0.5rem;
      }

      .col-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .btn-sm {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
      }
    }

    /* Tablet responsive styles */
    @media (min-width: 769px) and (max-width: 1024px) {
      .invite-management {
        padding: 1.5rem;
      }

      .table-header, .table-row {
        grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
        gap: 0.75rem;
        padding: 1.25rem;
      }

      .col-actions {
        flex-direction: column;
        gap: 0.5rem;
      }

      .btn-sm {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
      }
    }

    /* Dark mode styles - using CSS variables for consistent theming */
    .dark .invite-form-section {
      background: var(--color-bg-secondary);
    }

    .dark .form-group label {
      color: var(--color-text-primary);
    }

    .dark .form-control {
      background-color: var(--color-bg-primary);
      border-color: var(--color-border-primary);
      color: var(--color-text-primary);
    }

    .dark .form-control:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }

    .dark .form-control::placeholder {
      color: var(--color-text-tertiary);
    }

    .dark .header h2 {
      color: var(--color-text-primary);
    }

    .dark .header p {
      color: var(--color-text-secondary);
    }

    .dark h3 {
      color: var(--color-text-primary) !important;
    }

    .dark .section-header h3 {
      color: var(--color-text-primary) !important;
    }

    .dark .invites-list-section {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .section-header {
      background: var(--color-bg-tertiary);
      border-bottom-color: var(--color-border-primary);
    }

    .dark .table-header {
      background: var(--color-bg-tertiary);
      border-bottom-color: var(--color-border-primary);
      color: var(--color-text-primary) !important;
    }

    .dark .table-header * {
      color: var(--color-text-primary) !important;
    }

    .dark .col-email,
    .dark .col-status,
    .dark .col-created,
    .dark .col-expires,
    .dark .col-actions {
      color: var(--color-text-primary) !important;
    }

    .dark .table-header .col-email,
    .dark .table-header .col-status,
    .dark .table-header .col-created,
    .dark .table-header .col-expires,
    .dark .table-header .col-actions {
      color: var(--color-text-primary) !important;
    }

    .dark .table-row .col-email,
    .dark .table-row .col-created,
    .dark .table-row .col-expires {
      color: var(--color-text-primary) !important;
    }

    .dark .table-row {
      background: var(--color-bg-secondary);
      border-bottom-color: var(--color-border-primary);
      color: var(--color-text-primary) !important;
    }

    .dark .table-row * {
      color: var(--color-text-primary) !important;
    }

    .dark .table-row:hover {
      background-color: var(--color-bg-tertiary);
    }

    .dark .stat.pending {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .dark .stat.used {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .dark .stat.expired {
      background-color: var(--color-danger-light);
      color: var(--color-danger);
    }

    .dark .status-pending {
      background-color: var(--color-warning-light);
      color: var(--color-warning);
    }

    .dark .status-used {
      background-color: var(--color-success-light);
      color: var(--color-success);
    }

    .dark .status-expired {
      background-color: var(--color-danger-light);
      color: var(--color-danger);
    }

    .dark .status-cancelled {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-tertiary);
    }

    .dark .no-invites {
      color: var(--color-text-secondary);
    }

    /* Dark mode for mobile components */
    .dark .recent-invite-card {
      background: var(--color-bg-secondary);
      border-color: var(--color-border-primary);
    }

    .dark .recent-invite-header h4 {
      color: var(--color-text-primary);
    }

    .dark .invite-email {
      color: var(--color-text-primary);
    }

    .dark .invite-email i {
      color: var(--color-primary);
    }

    .dark .mobile-actions {
      background: var(--color-bg-tertiary);
      border-top-color: var(--color-border-primary);
    }
  `]
})
export class InviteManagementComponent implements OnInit, OnDestroy {
  inviteData: CreateInviteRequest = {
    email: '',
    message: ''
  };

  invites: any[] = [];
  stats = {
    pending: 0,
    used: 0,
    expired: 0
  };

  currentPage = 1;
  totalPages = 1;
  pageSize = 10;

  isCreatingInvite = false;
  isResending: { [key: string]: boolean } = {};
  isCancelling: { [key: string]: boolean } = {};

  inviteSuccess = false;
  inviteError = '';
  inviteLink = '';

  // Mobile/tablet responsive features
  showAllInvites = false;
  isMobile = false;
  isTablet = false;

  private subscriptions: Subscription[] = [];

  constructor(private inviteService: InviteService, private languageService: LanguageService) {}

  ngOnInit() {
    this.checkScreenSize();
    this.setupResizeListener();
    this.loadInvites();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  createInvite() {
    if (!this.inviteData.email) return;

    this.isCreatingInvite = true;
    this.inviteError = '';
    this.inviteSuccess = false;

    this.subscriptions.push(
      this.inviteService.createInvite(this.inviteData).subscribe({
        next: (response) => {
          this.isCreatingInvite = false;
          if (response.success) {
            this.inviteSuccess = true;
            this.inviteLink = response.invite?.inviteLink || '';
            this.inviteData = { email: '', message: '' };
            this.loadInvites(); // Refresh the list
          } else {
            this.inviteError = response.message;
          }
        },
        error: (error) => {
          this.isCreatingInvite = false;
          this.inviteError = error.error?.message || this.languageService.translate('rewards.userManagement.failedToSend');
        }
      })
    );
  }

  loadInvites(page: number = 1) {
    this.subscriptions.push(
      this.inviteService.getInvites(page, this.pageSize).subscribe({
        next: (response) => {
          this.invites = response.invites;
          this.stats = {
            pending: response.pending,
            used: response.used,
            expired: response.expired
          };
          this.currentPage = page;
          this.totalPages = Math.ceil(response.total / this.pageSize);
        },
        error: (error) => {
          console.error('Failed to load invites:', error);
        }
      })
    );
  }

  resendInvite(inviteId: string) {
    this.isResending[inviteId] = true;

    this.subscriptions.push(
      this.inviteService.resendInvite(inviteId).subscribe({
        next: (response) => {
          this.isResending[inviteId] = false;
          if (response.success) {
            this.loadInvites(this.currentPage);
          }
        },
        error: (error) => {
          this.isResending[inviteId] = false;
          console.error('Failed to resend invite:', error);
        }
      })
    );
  }

  cancelInvite(inviteId: string) {
    const confirmText = this.languageService.translate('rewards.userManagement.confirmCancel');
    if (!confirm(confirmText)) return;

    this.isCancelling[inviteId] = true;

    this.subscriptions.push(
      this.inviteService.cancelInvite(inviteId).subscribe({
        next: (response) => {
          this.isCancelling[inviteId] = false;
          if (response.success) {
            this.loadInvites(this.currentPage);
          }
        },
        error: (error) => {
          this.isCancelling[inviteId] = false;
          console.error('Failed to cancel invite:', error);
        }
      })
    );
  }

  copyInviteLink() {
    if (this.inviteLink) {
      navigator.clipboard.writeText(this.inviteLink).then(() => {
        console.log('Invite link copied to clipboard');
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  // Responsive methods
  private checkScreenSize(): void {
    const width = window.innerWidth;
    this.isMobile = width <= 768;
    this.isTablet = width > 768 && width <= 1024;
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  toggleShowAllInvites(): void {
    this.showAllInvites = !this.showAllInvites;
  }

  getDisplayedInvites(): any[] {
    if (!this.showAllInvites) {
      return this.invites.slice(0, 1); // Show only the most recent invite on all viewports
    }
    return this.invites;
  }

  getRecentInvite(): any {
    return this.invites.length > 0 ? this.invites[0] : null;
  }

  hasMoreInvites(): boolean {
    return this.invites.length > 1;
  }
}
