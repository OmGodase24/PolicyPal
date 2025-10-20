export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiTimeout: 30000,
  appName: 'PolicyPal',
  appTagline: 'Smart Policy Management',
  version: '1.0.0',
  socketUrl: 'http://localhost:3000',
  frontendUrl: 'http://localhost:4200',
  environment: 'development',
  
  // DLP Configuration
  dlpEnabled: true,
  dlpAutoScan: true,
  
  // Privacy Configuration
  privacyDashboardEnabled: true,
  consentManagementEnabled: true,
  
  // AI Service Configuration
  aiServiceUrl: 'http://localhost:8000'
};
