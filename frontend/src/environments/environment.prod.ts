export const environment = {
  production: true,
  apiUrl: 'https://your-policypal-backend.com/api',
  apiTimeout: 30000,
  appName: 'PolicyPal',
  appTagline: 'Smart Policy Management',
  version: '1.0.0',
  socketUrl: 'https://your-policypal-backend.com',
  frontendUrl: 'https://your-policypal-frontend.com',
  environment: 'production',
  
  // DLP Configuration
  dlpEnabled: true,
  dlpAutoScan: false, // Disable auto-scan in production for performance
  
  // Privacy Configuration
  privacyDashboardEnabled: true,
  consentManagementEnabled: true,
  
  // AI Service Configuration
  aiServiceUrl: 'https://your-policypal-ai-service.com'
};
