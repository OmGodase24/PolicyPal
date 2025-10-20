import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  hasHapticFeedback: boolean;
  hasCamera: boolean;
  hasGeolocation: boolean;
  hasPushNotifications: boolean;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MobileService {
  private deviceInfoSubject = new BehaviorSubject<DeviceInfo>(this.getInitialDeviceInfo());
  public deviceInfo$ = this.deviceInfoSubject.asObservable();

  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  constructor() {
    this.setupResizeListener();
    this.setupOrientationListener();
    this.setupOnlineListener();
    this.setupPWAInstallPrompt();
  }

  private getInitialDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    return {
      isMobile: screenWidth < 768,
      isTablet: screenWidth >= 768 && screenWidth < 1024,
      isDesktop: screenWidth >= 1024,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      screenWidth,
      screenHeight,
      orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
      platform: this.detectPlatform(userAgent),
      hasHapticFeedback: 'vibrate' in navigator,
      hasCamera: this.checkCameraSupport(),
      hasGeolocation: 'geolocation' in navigator,
      hasPushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
      isOnline: navigator.onLine
    };
  }

  private detectPlatform(userAgent: string): 'ios' | 'android' | 'desktop' | 'unknown' {
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else if (/windows|macintosh|linux/.test(userAgent)) {
      return 'desktop';
    }
    return 'unknown';
  }

  private checkCameraSupport(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  private setupResizeListener(): void {
    fromEvent(window, 'resize')
      .pipe(
        debounceTime(100),
        map(() => this.getUpdatedDeviceInfo())
      )
      .subscribe(deviceInfo => {
        this.deviceInfoSubject.next(deviceInfo);
      });
  }

  private setupOrientationListener(): void {
    fromEvent(window, 'orientationchange')
      .pipe(
        debounceTime(100),
        map(() => this.getUpdatedDeviceInfo())
      )
      .subscribe(deviceInfo => {
        this.deviceInfoSubject.next(deviceInfo);
      });
  }

  private setupOnlineListener(): void {
    fromEvent(window, 'online')
      .pipe(startWith(navigator.onLine))
      .subscribe(() => {
        this.isOnlineSubject.next(true);
        this.updateDeviceInfo();
      });

    fromEvent(window, 'offline')
      .subscribe(() => {
        this.isOnlineSubject.next(false);
        this.updateDeviceInfo();
      });
  }

  private setupPWAInstallPrompt(): void {
    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (event) => {
      // Store the event for later use
      (window as any).deferredPrompt = event;
    });
  }

  private getUpdatedDeviceInfo(): DeviceInfo {
    const currentInfo = this.deviceInfoSubject.value;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    return {
      ...currentInfo,
      isMobile: screenWidth < 768,
      isTablet: screenWidth >= 768 && screenWidth < 1024,
      isDesktop: screenWidth >= 1024,
      screenWidth,
      screenHeight,
      orientation: screenWidth > screenHeight ? 'landscape' : 'portrait',
      isOnline: navigator.onLine
    };
  }

  private updateDeviceInfo(): void {
    this.deviceInfoSubject.next(this.getUpdatedDeviceInfo());
  }

  // Public methods
  getCurrentDeviceInfo(): DeviceInfo {
    return this.deviceInfoSubject.value;
  }

  isMobile(): boolean {
    return this.deviceInfoSubject.value.isMobile;
  }

  isTablet(): boolean {
    return this.deviceInfoSubject.value.isTablet;
  }

  isDesktop(): boolean {
    return this.deviceInfoSubject.value.isDesktop;
  }

  isTouchDevice(): boolean {
    return this.deviceInfoSubject.value.isTouchDevice;
  }

  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  // Haptic feedback
  vibrate(pattern: number | number[] = 50): void {
    if (this.deviceInfoSubject.value.hasHapticFeedback) {
      navigator.vibrate(pattern);
    }
  }

  // Camera access
  async requestCameraAccess(): Promise<MediaStream | null> {
    if (!this.deviceInfoSubject.value.hasCamera) {
      throw new Error('Camera not supported on this device');
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (error) {
      console.error('Camera access denied:', error);
      return null;
    }
  }

  // Geolocation
  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!this.deviceInfoSubject.value.hasGeolocation) {
      throw new Error('Geolocation not supported on this device');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  // Push notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.deviceInfoSubject.value.hasPushNotifications) {
      throw new Error('Push notifications not supported on this device');
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  // PWA install prompt
  async showInstallPrompt(): Promise<boolean> {
    const deferredPrompt = (window as any).deferredPrompt;
    
    if (!deferredPrompt) {
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      (window as any).deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  // Check if PWA is installed
  isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  // Get safe area insets for mobile devices
  getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
    };
  }

  // Share API
  async share(data: ShareData): Promise<boolean> {
    if (!navigator.share) {
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }

  // Copy to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      this.vibrate(50); // Haptic feedback
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }

  // Get device memory info (if available)
  getDeviceMemory(): number | null {
    return (navigator as any).deviceMemory || null;
  }

  // Get connection info
  getConnectionInfo(): any {
    return (navigator as any).connection || null;
  }

  // Check if device is low-end
  isLowEndDevice(): boolean {
    const memory = this.getDeviceMemory();
    const connection = this.getConnectionInfo();
    
    return (
      (memory && memory <= 2) ||
      (connection && connection.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType))
    );
  }
}
