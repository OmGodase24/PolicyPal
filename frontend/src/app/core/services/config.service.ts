import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  getApiUrl(): string {
    return environment.apiUrl || 'http://localhost:3000/api';
  }

  getSocketUrl(): string {
    return environment.socketUrl || 'http://localhost:3000';
  }

  getFrontendUrl(): string {
    return environment.frontendUrl || 'http://localhost:4200';
  }

  isProduction(): boolean {
    return environment.production;
  }

  getEnvironment(): string {
    return environment.environment || 'development';
  }

  // DLP Configuration
  isDLPEnabled(): boolean {
    return environment.dlpEnabled !== undefined ? environment.dlpEnabled : true;
  }

  isDLPAutoScanEnabled(): boolean {
    return environment.dlpAutoScan !== undefined ? environment.dlpAutoScan : false;
  }

  // Privacy Configuration
  isPrivacyDashboardEnabled(): boolean {
    return environment.privacyDashboardEnabled !== undefined ? environment.privacyDashboardEnabled : true;
  }

  isConsentManagementEnabled(): boolean {
    return environment.consentManagementEnabled !== undefined ? environment.consentManagementEnabled : true;
  }

  // AI Service Configuration
  getAIServiceUrl(): string {
    return environment.aiServiceUrl || 'http://localhost:8000';
  }
}
