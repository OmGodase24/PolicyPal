import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface Translation {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'policypal_language';
  private readonly DEFAULT_LANGUAGE = 'en';
  
  private currentLanguageSubject = new BehaviorSubject<string>(this.DEFAULT_LANGUAGE);
  private translationsSubject = new BehaviorSubject<Translation>({});
  
  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  public translations$ = this.translationsSubject.asObservable();
  
  private translationsCache = new Map<string, Translation>();
  
  public readonly supportedLanguages: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
  ];

  constructor(private http: HttpClient) {
    this.initializeLanguage();
  }

  initializeLanguage(): void {
    // Get saved language from localStorage or detect from browser
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    const browserLanguage = this.detectBrowserLanguage();
    const initialLanguage = savedLanguage || browserLanguage || this.DEFAULT_LANGUAGE;
    
    this.setLanguage(initialLanguage);
  }

  private detectBrowserLanguage(): string {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (!browserLang) return this.DEFAULT_LANGUAGE;
    
    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Check if we support this language
    const supportedCode = this.supportedLanguages.find(lang => lang.code === langCode);
    return supportedCode ? langCode : this.DEFAULT_LANGUAGE;
  }

  setLanguage(languageCode: string): void {
    if (!this.supportedLanguages.find(lang => lang.code === languageCode)) {
      console.warn(`Language ${languageCode} is not supported. Using default language.`);
      languageCode = this.DEFAULT_LANGUAGE;
    }

    this.currentLanguageSubject.next(languageCode);
    localStorage.setItem(this.STORAGE_KEY, languageCode);
    
    // Load translations for the new language
    this.loadTranslations(languageCode);
  }

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  getSupportedLanguages(): Language[] {
    return [...this.supportedLanguages];
  }

  private loadTranslations(languageCode: string): void {
    // Check if translations are already cached
    if (this.translationsCache.has(languageCode)) {
      this.translationsSubject.next(this.translationsCache.get(languageCode)!);
      return;
    }

    // Load translations from file
    this.http.get<Translation>(`/assets/i18n/${languageCode}.json`)
      .pipe(
        catchError(error => {
          console.error(`Failed to load translations for ${languageCode}:`, error);
          // Fallback to English if available, otherwise empty object
          if (languageCode !== 'en') {
            return this.http.get<Translation>('/assets/i18n/en.json').pipe(
              catchError(() => of({}))
            );
          }
          return of({});
        })
      )
      .subscribe(translations => {
        this.translationsCache.set(languageCode, translations);
        this.translationsSubject.next(translations);
      });
  }

  translate(key: string, params?: { [key: string]: any }): string {
    const translations = this.translationsSubject.value;
    let translation = this.getNestedValue(translations, key);
    
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key; // Return the key if translation is missing
    }

    // Replace parameters in translation
    if (params) {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }

    return translation;
  }

  private getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Get translation as Observable
  getTranslation(key: string, params?: { [key: string]: any }): Observable<string> {
    return this.translations$.pipe(
      map(translations => {
        let translation = this.getNestedValue(translations, key);
        
        if (!translation) {
          console.warn(`Translation missing for key: ${key}`);
          return key;
        }

        if (params) {
          Object.keys(params).forEach(param => {
            translation = translation.replace(`{{${param}}}`, params[param]);
          });
        }

        return translation;
      })
    );
  }

  // Check if a translation key exists
  hasTranslation(key: string): boolean {
    const translations = this.translationsSubject.value;
    return this.getNestedValue(translations, key) !== null;
  }

  // Get all translations for a specific section
  getSectionTranslations(section: string): Observable<{ [key: string]: any }> {
    return this.translations$.pipe(
      map(translations => translations[section] || {})
    );
  }

  // Clear cache (useful for development)
  clearCache(): void {
    this.translationsCache.clear();
    this.translationsSubject.next({});
  }

  // Get current language info
  getCurrentLanguageInfo(): Language | undefined {
    return this.supportedLanguages.find(lang => lang.code === this.getCurrentLanguage());
  }
}
