import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ConfigService } from './config.service';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: any;
  createdAt: Date;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSocketService {
  private socket: Socket | null = null;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private apiUrl: string;
  private processingNotifications = new Set<string>();
  
  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
    this.initializeConnection();
  }

  public initialize(): void {
    // This method is called from app.component.ts
    // The actual initialization happens in constructor via initializeConnection()
    console.log('🔔 Notification service initialized');
  }

  private initializeConnection(): void {
    // Only connect if user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth && !this.socket) {
        this.connect();
      } else if (!isAuth && this.socket) {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) {
      this.logger.log('❌ No auth token available for WebSocket connection');
      return;
    }

    const socketUrl = this.configService.getSocketUrl();
    this.logger.log(`🔌 Connecting to WebSocket: ${socketUrl}/notifications`);

    this.socket = io(`${socketUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.setupEventListeners();
    this.logger.log('🔌 WebSocket connection initiated');
    
    // Load existing notifications when connection is established
    this.loadInitialNotifications();
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.logger.log('🔌 Disconnected from notification service');
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.logger.log('✅ Notification socket connected');
    });

    this.socket.on('disconnect', () => {
      this.logger.log('⚠️ Notification socket disconnected');
    });

    this.socket.on('connected', (data) => {
      this.logger.log('📱 Notification service ready:', data);
    });

    this.socket.on('notification', (notification: Notification) => {
      this.logger.log('📨 Received notification:', notification);
      this.addNotification(notification);
    });

    this.socket.on('notification_read', (data) => {
      this.logger.log('✅ Notification marked as read:', data);
      // Only update local state, don't call markNotificationAsRead to avoid infinite loop
      this.updateNotificationReadStatus(data.notificationId, true);
    });

    this.socket.on('error', (error) => {
      this.logger.error('❌ Notification socket error:', error);
    });
  }

  private addNotification(notification: Notification): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications];
    this.notificationsSubject.next(updatedNotifications);
    
    if (!notification.isRead) {
      this.updateUnreadCount();
    }
  }

  private updateUnreadCount(): void {
    const notifications = this.notificationsSubject.value;
    const unreadCount = notifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private updateNotificationReadStatus(notificationId: string, isRead: boolean): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n => 
      n._id === notificationId ? { ...n, isRead } : n
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
  }

  markNotificationAsRead(notificationId: string): void {
    if (!notificationId || notificationId === 'undefined') {
      this.logger.error('❌ Invalid notification ID:', notificationId);
      return;
    }

    // Prevent duplicate processing
    if (this.processingNotifications.has(notificationId)) {
      this.logger.log('⏳ Notification already being processed:', notificationId);
      return;
    }

    this.processingNotifications.add(notificationId);

    // Update local state immediately for better UX
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n => 
      n._id === notificationId ? { ...n, isRead: true } : n
    );
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Call backend API to persist the change
    this.http.put(`${this.apiUrl}/notifications/${notificationId}/read`, {}).subscribe({
      next: (response) => {
        this.logger.log('✅ Notification marked as read on server');
        this.processingNotifications.delete(notificationId);
      },
      error: (error) => {
        this.logger.error('❌ Failed to mark notification as read:', error);
        // Revert local change if server call failed
        const revertedNotifications = notifications.map(n => 
          n._id === notificationId ? { ...n, isRead: false } : n
        );
        this.notificationsSubject.next(revertedNotifications);
        this.updateUnreadCount();
        this.processingNotifications.delete(notificationId);
      }
    });
  }

  markAllAsRead(): void {
    // Update local state immediately
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Call backend API to persist the change
    this.http.put(`${this.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.logger.log('✅ All notifications marked as read on server');
      },
      error: (error) => {
        this.logger.error('❌ Failed to mark all notifications as read:', error);
        // Revert local change if server call failed
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
      }
    });
  }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`);
  }

  deleteNotification(notificationId: string): void {
    if (!notificationId || notificationId === 'undefined') {
      this.logger.error('❌ Invalid notification ID for deletion:', notificationId);
      return;
    }

    // Update local state immediately for better UX
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.filter(n => n._id !== notificationId);
    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Call backend API to persist the change
    this.http.delete(`${this.apiUrl}/notifications/${notificationId}`).subscribe({
      next: () => {
        this.logger.log('🗑️ Notification deleted on server');
      },
      error: (error) => {
        this.logger.error('❌ Failed to delete notification:', error);
        // Revert local change if server call failed
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
      }
    });
  }

  deleteAllNotifications(): void {
    // Update local state immediately
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);

    // Call backend API to persist the change
    this.http.delete(`${this.apiUrl}/notifications/all`).subscribe({
      next: () => {
        this.logger.log('🗑️ All notifications deleted on server');
      },
      error: (error) => {
        this.logger.error('❌ Failed to delete all notifications:', error);
        // Revert local change if server call failed
        this.loadInitialNotifications();
      }
    });
  }

  private loadInitialNotifications(): void {
    this.getNotifications().subscribe({
      next: (notifications) => {
        this.logger.log('📥 Loaded initial notifications:', notifications);
        console.log('🔍 First notification structure:', notifications[0]);
        console.log('🔍 First notification keys:', notifications[0] ? Object.keys(notifications[0]) : 'No notifications');
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
      },
      error: (error) => {
        this.logger.error('❌ Failed to load initial notifications:', error);
      }
    });
  }

  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  private get logger() {
    return console;
  }
}
