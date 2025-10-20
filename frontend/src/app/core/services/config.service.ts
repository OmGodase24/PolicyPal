import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  getApiUrl(): string {
    return environment.apiUrl || 'https://policypal-production.up.railway.app/api';
  }

  getSocketUrl(): string {
    return environment.socketUrl || 'https://policypal-production.up.railway.app';
  }

  getFrontendUrl(): string {
    return environment.frontendUrl || 'https://policypal-frontend.vercel.app';
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
    return environment.aiServiceUrl || 'https://policypal-k9qt.onrender.com';
  }
}
