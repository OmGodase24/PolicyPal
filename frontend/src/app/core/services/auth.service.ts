import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';

import { environment } from '@environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  initializeAuth(): void {
    const token = this.getToken();
    const userData = this.getUserData();

    if (token && userData) {
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Only persist auth when a real JWT is returned (not MFA-required response)
          if ((response as any)?.accessToken && (response as any)?.user) {
            this.setToken((response as any).accessToken);
            this.setUserData((response as any).user);
            this.currentUserSubject.next((response as any).user);
            this.isAuthenticatedSubject.next(true);
            this.notificationService.showSuccess('Login successful!');
          }
        }),
        catchError(error => {
          this.notificationService.showError('Login failed. Please check your credentials.');
          return throwError(() => error);
        })
      );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          this.setToken(response.accessToken);
          this.setUserData(response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          this.notificationService.showSuccess('Registration successful!');
        }),
        catchError(error => {
          this.notificationService.showError('Registration failed. Please try again.');
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    this.removeToken();
    this.removeUserData();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth/login']);
    this.notificationService.showSuccess('Logged out successfully');
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/profile`);
  }

  updateProfile(updateData: Partial<User>): Observable<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser?._id) {
      return throwError(() => new Error('No current user found'));
    }

    return this.http.patch<User>(`${environment.apiUrl}/users/${currentUser._id}`, updateData)
      .pipe(
        tap(updatedUser => {
          // Update local storage and current user subject
          this.setUserData(updatedUser);
          this.currentUserSubject.next(updatedUser);
        }),
        catchError(error => {
          this.notificationService.showError('Failed to update profile. Please try again.');
          return throwError(() => error);
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  setUserData(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Call this after alternative login flows (e.g., MFA verification)
  completeLogin(user: User): void {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private getUserData(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  private removeUserData(): void {
    localStorage.removeItem(this.USER_KEY);
  }
}