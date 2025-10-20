export const environment = {
  production: true,
  apiUrl: 'https://policypal-production.up.railway.app/api',
  apiTimeout: 30000,
  appName: 'PolicyPal',
  appTagline: 'Smart Policy Management',
  version: '1.0.0',
  socketUrl: 'https://policypal-production.up.railway.app',
  frontendUrl: 'https://policypal-frontend.vercel.app', // Will be updated after Vercel deployment
  environment: 'production',
  
  // DLP Configuration
  dlpEnabled: true,
  dlpAutoScan: false, // Disable auto-scan in production for performance
  
  // Privacy Configuration
  privacyDashboardEnabled: true,
  consentManagementEnabled: true,
  
  // AI Service Configuration
  aiServiceUrl: 'https://policypal-k9qt.onrender.com'
};
