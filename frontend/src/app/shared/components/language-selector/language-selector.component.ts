import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LanguageService, Language } from '@core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button 
        class="language-toggle"
        (click)="toggleDropdown()"
        [class.active]="isDropdownOpen"
        type="button"
        aria-label="Select language"
      >
        <span class="current-flag">{{ currentLanguage?.flag }}</span>
        <span class="current-name">{{ currentLanguage?.nativeName }}</span>
        <svg 
          class="dropdown-icon" 
          [class.rotated]="isDropdownOpen"
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>
      
      @if (isDropdownOpen) {
        <div class="language-dropdown">
          @for (language of availableLanguages; track language.code) {
            <button
              class="language-option"
              [class.selected]="language.code === currentLanguageCode"
              (click)="selectLanguage(language.code)"
              type="button"
            >
              <span class="flag">{{ language.flag }}</span>
              <span class="name">{{ language.nativeName }}</span>
              <span class="english-name">{{ language.name }}</span>
              @if (language.code === currentLanguageCode) {
                <svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .language-selector {
      position: relative;
      display: inline-block;
    }

    .language-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border-primary);
      border-radius: 0.5rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
      pointer-events: auto;
      position: relative;
      z-index: 1;
    }

    .language-toggle:hover {
      background: var(--color-bg-tertiary);
      border-color: var(--color-primary);
    }

    .language-toggle.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .current-flag {
      font-size: 1.125rem;
    }

    .current-name {
      font-weight: 500;
    }

    .dropdown-icon {
      margin-left: auto;
      transition: transform 0.2s ease;
    }

    .dropdown-icon.rotated {
      transform: rotate(180deg);
    }

    .language-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border-primary);
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 50;
      margin-top: 0.25rem;
      overflow: hidden;
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem;
      background: none;
      border: none;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      text-align: left;
    }

    .language-option:hover {
      background: var(--color-bg-secondary);
    }

    .language-option.selected {
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    .flag {
      font-size: 1.125rem;
      width: 1.5rem;
      text-align: center;
    }

    .name {
      font-weight: 500;
      flex: 1;
    }

    .english-name {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }

    .check-icon {
      color: var(--color-primary);
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      .language-toggle {
        min-width: 100px;
        padding: 0.375rem 0.5rem;
      }

      .current-name {
        display: none;
      }

      .language-option {
        padding: 0.625rem;
      }

      .english-name {
        display: none;
      }
    }
  `]
})
export class LanguageSelectorComponent implements OnInit, OnDestroy {
  availableLanguages: Language[] = [];
  currentLanguage: Language | undefined;
  currentLanguageCode: string = '';
  isDropdownOpen: boolean = false;
  
  private subscription: Subscription = new Subscription();

  constructor(private languageService: LanguageService) {}

  ngOnInit(): void {
    this.availableLanguages = this.languageService.getSupportedLanguages();
    
    // Subscribe to language changes
    this.subscription.add(
      this.languageService.currentLanguage$.subscribe(languageCode => {
        this.currentLanguageCode = languageCode;
        this.currentLanguage = this.languageService.getCurrentLanguageInfo();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleDropdown(): void {
    console.log('Language toggle clicked, current state:', this.isDropdownOpen);
    this.isDropdownOpen = !this.isDropdownOpen;
    console.log('New language dropdown state:', this.isDropdownOpen);
  }

  selectLanguage(languageCode: string): void {
    this.languageService.setLanguage(languageCode);
    this.isDropdownOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-selector')) {
      // Use setTimeout to avoid interfering with immediate click handlers
      setTimeout(() => {
        this.isDropdownOpen = false;
      }, 0);
    }
  }
}
