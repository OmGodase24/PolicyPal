import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('@modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('@modules/auth/components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    canActivate: [guestGuard],
    loadComponent: () => import('@modules/auth/components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'auth/mfa-verification',
    canActivate: [guestGuard],
    loadComponent: () => import('@modules/auth/components/mfa-verification/mfa-verification.component').then(m => m.MfaVerificationComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadChildren: () => import('@modules/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'rewards',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/dashboard/components/reward-dashboard/reward-dashboard.component').then(m => m.RewardDashboardComponent)
  },
  {
    path: 'policies/compare',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/policies/components/policy-comparison/policy-comparison.component').then(m => m.PolicyComparisonComponent)
  },
  {
    path: 'policies',
    canActivate: [authGuard],
    loadChildren: () => import('@modules/policies/policies.module').then(m => m.PoliciesModule)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () => import('@modules/profile/profile.module').then(m => m.ProfileModule)
  },
  {
    path: 'ai-assistant',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/ai-chat/components/ai-assistant/ai-assistant.component').then(m => m.AIAssistantComponent)
  },
  {
    path: 'ai-chat',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/ai-chat/ai-chat.component').then(m => m.AIChatComponent)
  },
  {
    path: 'ai-chat/:policyId',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/ai-chat/ai-chat.component').then(m => m.AIChatComponent)
  },
  {
    path: 'chat-history',
    canActivate: [authGuard],
    loadComponent: () => import('@modules/chat-history/components/chat-history/chat-history.component').then(m => m.ChatHistoryComponent)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadChildren: () => import('@modules/notifications/notifications.module').then(m => m.NotificationsModule)
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadChildren: () => import('@modules/analytics/analytics.module').then(m => m.AnalyticsModule)
  },
  {
    path: 'offline',
    loadComponent: () => import('@core/components/offline-page/offline-page.component').then(m => m.OfflinePageComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];