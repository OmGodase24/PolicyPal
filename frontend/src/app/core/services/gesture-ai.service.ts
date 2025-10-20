import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'longpress' | 'doubletap' | 'rotate';
  direction?: 'left' | 'right' | 'up' | 'down';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  velocity: number;
  scale?: number;
  rotation?: number;
  timestamp: Date;
}

export interface GestureAIResponse {
  action: 'analyze' | 'summarize' | 'translate' | 'highlight' | 'search' | 'navigate';
  confidence: number;
  data?: any;
  suggestions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GestureAIService {
  private gestureSubject = new BehaviorSubject<GestureEvent | null>(null);
  private isEnabled = new BehaviorSubject<boolean>(true);
  private sensitivity = new BehaviorSubject<number>(0.5);

  // Gesture detection thresholds
  private readonly SWIPE_THRESHOLD = 50;
  private readonly VELOCITY_THRESHOLD = 0.3;
  private readonly LONG_PRESS_DURATION = 500;
  private readonly DOUBLE_TAP_DURATION = 300;

  private touchStartTime = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private longPressTimer: any = null;

  get gesture$(): Observable<GestureEvent | null> {
    return this.gestureSubject.asObservable();
  }

  get isEnabled$(): Observable<boolean> {
    return this.isEnabled.asObservable();
  }

  get sensitivity$(): Observable<number> {
    return this.sensitivity.asObservable();
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled.next(enabled);
  }

  setSensitivity(sensitivity: number): void {
    this.sensitivity.next(Math.max(0, Math.min(1, sensitivity)));
  }

  initializeGestureDetection(element: HTMLElement): void {
    if (!element) return;

    // Touch events
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

    // Mouse events for desktop testing
    element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    element.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled.value) return;

    const touch = event.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      this.triggerGesture({
        type: 'longpress',
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: this.touchStartX,
        endY: this.touchStartY,
        duration: this.LONG_PRESS_DURATION,
        velocity: 0,
        timestamp: new Date()
      });
    }, this.LONG_PRESS_DURATION);

    event.preventDefault();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled.value) return;

    // Cancel long press if user moves
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled.value) return;

    const touch = event.changedTouches[0];
    const endTime = Date.now();
    const duration = endTime - this.touchStartTime;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Cancel long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Detect gesture type
    if (duration < this.DOUBLE_TAP_DURATION && distance < 20) {
      // Check for double tap
      const timeSinceLastTap = endTime - this.lastTapTime;
      const distanceFromLastTap = Math.sqrt(
        Math.pow(touch.clientX - this.lastTapX, 2) + 
        Math.pow(touch.clientY - this.lastTapY, 2)
      );

      if (timeSinceLastTap < this.DOUBLE_TAP_DURATION && distanceFromLastTap < 30) {
        this.triggerGesture({
          type: 'doubletap',
          startX: this.touchStartX,
          startY: this.touchStartY,
          endX: touch.clientX,
          endY: touch.clientY,
          duration,
          velocity,
          timestamp: new Date()
        });
      } else {
        this.lastTapTime = endTime;
        this.lastTapX = touch.clientX;
        this.lastTapY = touch.clientY;
      }
    } else if (distance > this.SWIPE_THRESHOLD && velocity > this.VELOCITY_THRESHOLD) {
      // Detect swipe direction
      let direction: 'left' | 'right' | 'up' | 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      this.triggerGesture({
        type: 'swipe',
        direction,
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: touch.clientX,
        endY: touch.clientY,
        duration,
        velocity,
        timestamp: new Date()
      });
    }

    event.preventDefault();
  }

  private handleTouchCancel(event: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // Mouse event handlers for desktop testing
  private handleMouseDown(event: MouseEvent): void {
    this.touchStartTime = Date.now();
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
  }

  private handleMouseMove(event: MouseEvent): void {
    // Mouse move handling if needed
  }

  private handleMouseUp(event: MouseEvent): void {
    const endTime = Date.now();
    const duration = endTime - this.touchStartTime;
    const deltaX = event.clientX - this.touchStartX;
    const deltaY = event.clientY - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    if (duration < this.DOUBLE_TAP_DURATION && distance < 20) {
      this.triggerGesture({
        type: 'doubletap',
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: event.clientX,
        endY: event.clientY,
        duration,
        velocity,
        timestamp: new Date()
      });
    } else if (distance > this.SWIPE_THRESHOLD && velocity > this.VELOCITY_THRESHOLD) {
      let direction: 'left' | 'right' | 'up' | 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      this.triggerGesture({
        type: 'swipe',
        direction,
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: event.clientX,
        endY: event.clientY,
        duration,
        velocity,
        timestamp: new Date()
      });
    }
  }

  private triggerGesture(gesture: GestureEvent): void {
    this.gestureSubject.next(gesture);
  }

  interpretGesture(gesture: GestureEvent, context: string = ''): GestureAIResponse {
    const sensitivity = this.sensitivity.value;

    switch (gesture.type) {
      case 'swipe':
        return this.interpretSwipeGesture(gesture, context, sensitivity);
      case 'longpress':
        return this.interpretLongPressGesture(gesture, context, sensitivity);
      case 'doubletap':
        return this.interpretDoubleTapGesture(gesture, context, sensitivity);
      case 'pinch':
        return this.interpretPinchGesture(gesture, context, sensitivity);
      case 'rotate':
        return this.interpretRotateGesture(gesture, context, sensitivity);
      default:
        return {
          action: 'navigate',
          confidence: 0.1,
          suggestions: ['Unknown gesture detected']
        };
    }
  }

  private interpretSwipeGesture(gesture: GestureEvent, context: string, sensitivity: number): GestureAIResponse {
    const direction = gesture.direction!;
    const velocity = gesture.velocity;

    if (velocity < sensitivity) {
      return {
        action: 'navigate',
        confidence: 0.3,
        suggestions: ['Swipe faster for better detection']
      };
    }

    switch (direction) {
      case 'left':
        return {
          action: 'analyze',
          confidence: 0.8,
          data: { analysisType: 'compliance' },
          suggestions: ['Analyzing policy compliance...']
        };
      case 'right':
        return {
          action: 'summarize',
          confidence: 0.8,
          data: { summaryType: 'brief' },
          suggestions: ['Generating policy summary...']
        };
      case 'up':
        return {
          action: 'highlight',
          confidence: 0.7,
          data: { highlightType: 'important' },
          suggestions: ['Highlighting important sections...']
        };
      case 'down':
        return {
          action: 'search',
          confidence: 0.7,
          data: { searchType: 'keywords' },
          suggestions: ['Searching for keywords...']
        };
      default:
        return {
          action: 'navigate',
          confidence: 0.5,
          suggestions: ['Gesture recognized but action unclear']
        };
    }
  }

  private interpretLongPressGesture(gesture: GestureEvent, context: string, sensitivity: number): GestureAIResponse {
    return {
      action: 'highlight',
      confidence: 0.9,
      data: { highlightType: 'context_menu' },
      suggestions: ['Showing context menu...']
    };
  }

  private interpretDoubleTapGesture(gesture: GestureEvent, context: string, sensitivity: number): GestureAIResponse {
    return {
      action: 'analyze',
      confidence: 0.8,
      data: { analysisType: 'quick' },
      suggestions: ['Quick analysis in progress...']
    };
  }

  private interpretPinchGesture(gesture: GestureEvent, context: string, sensitivity: number): GestureAIResponse {
    const scale = gesture.scale || 1;
    
    if (scale > 1.2) {
      return {
        action: 'highlight',
        confidence: 0.7,
        data: { highlightType: 'zoom_in' },
        suggestions: ['Zooming in for detailed view...']
      };
    } else if (scale < 0.8) {
      return {
        action: 'summarize',
        confidence: 0.7,
        data: { summaryType: 'overview' },
        suggestions: ['Zooming out for overview...']
      };
    }

    return {
      action: 'navigate',
      confidence: 0.5,
      suggestions: ['Pinch gesture detected']
    };
  }

  private interpretRotateGesture(gesture: GestureEvent, context: string, sensitivity: number): GestureAIResponse {
    return {
      action: 'translate',
      confidence: 0.6,
      data: { translationType: 'rotate_view' },
      suggestions: ['Rotating document view...']
    };
  }

  cleanup(element: HTMLElement): void {
    if (!element) return;

    element.removeEventListener('touchstart', this.handleTouchStart);
    element.removeEventListener('touchmove', this.handleTouchMove);
    element.removeEventListener('touchend', this.handleTouchEnd);
    element.removeEventListener('touchcancel', this.handleTouchCancel);
    element.removeEventListener('mousedown', this.handleMouseDown);
    element.removeEventListener('mousemove', this.handleMouseMove);
    element.removeEventListener('mouseup', this.handleMouseUp);

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
