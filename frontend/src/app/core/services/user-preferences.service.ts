import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SummaryLevel } from '../models/summary-level.model';

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly PREFERENCE_KEY = 'policyPal_userPreferences';
  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.getDefaultPreferences());
  public preferences$ = this.preferencesSubject.asObservable();

  constructor() {
    this.loadPreferences();
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      defaultSummaryLevel: SummaryLevel.STANDARD,
      theme: 'light'
    };
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.PREFERENCE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        this.preferencesSubject.next({ ...this.getDefaultPreferences(), ...preferences });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  private savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.PREFERENCE_KEY, JSON.stringify(preferences));
      this.preferencesSubject.next(preferences);
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  getDefaultSummaryLevel(): SummaryLevel {
    return this.preferencesSubject.value.defaultSummaryLevel;
  }

  setDefaultSummaryLevel(level: SummaryLevel): void {
    const currentPreferences = this.preferencesSubject.value;
    this.savePreferences({
      ...currentPreferences,
      defaultSummaryLevel: level
    });
  }

  getPreferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    const currentPreferences = this.preferencesSubject.value;
    this.savePreferences({
      ...currentPreferences,
      ...updates
    });
  }
}

export interface UserPreferences {
  defaultSummaryLevel: SummaryLevel;
  theme: 'light' | 'dark';
}
