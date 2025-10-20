import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  pure: false, // Make it impure to react to language changes
  standalone: true
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private subscription: Subscription = new Subscription();
  private lastKey: string = '';
  private lastParams: { [key: string]: any } = {};
  private lastValue: string = '';
  private currentLanguage: string = '';

  constructor(private languageService: LanguageService) {
    // Subscribe to language changes
    this.subscription.add(
      this.languageService.currentLanguage$.subscribe(lang => {
        this.currentLanguage = lang;
        this.lastValue = ''; // Force re-evaluation
      })
    );
    
    // Subscribe to translation changes
    this.subscription.add(
      this.languageService.translations$.subscribe(translations => {
        this.lastValue = ''; // Force re-evaluation when translations change
      })
    );
  }

  transform(key: string, params?: { [key: string]: any }): string {
    // Always get the latest translation to ensure we have the most up-to-date value
    const currentTranslation = this.languageService.translate(key, params);
    
    // Only update cached values if they've actually changed
    if (this.lastKey !== key || 
        JSON.stringify(this.lastParams) !== JSON.stringify(params) ||
        this.lastValue !== currentTranslation) {
      
      this.lastKey = key;
      this.lastParams = params || {};
      this.lastValue = currentTranslation;
    }

    return this.lastValue;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
