# 📧 Email Configuration Guide for PolicyPal Notifications

## 🎯 Quick Answer: Gmail vs Other Providers

**Yes, Gmail is supported and recommended for development!** The notification system works with multiple email providers.

## 🔧 Configuration Options

### **Option 1: Gmail (Recommended for Development)**

**Pros:**
- ✅ Free for personal use
- ✅ Easy to set up
- ✅ Reliable delivery
- ✅ Good for testing

**Cons:**
- ❌ Daily sending limits (500 emails/day)
- ❌ Not ideal for production scale

**Setup Steps:**
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings → Security → 2-Step Verification
3. Click "App passwords" and generate a new password
4. Use this app password (not your regular Gmail password)

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=PolicyPal <noreply@policypal.com>
```

### **Option 2: SendGrid (Recommended for Production)**

**Pros:**
- ✅ High delivery rates
- ✅ Scalable (100 emails/day free, then paid)
- ✅ Analytics and tracking
- ✅ Professional service

**Setup Steps:**
1. Sign up at sendgrid.com
2. Create an API key
3. Use the API key as password

**Environment Variables:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=PolicyPal <noreply@yourdomain.com>
```

### **Option 3: AWS SES (Enterprise)**

**Pros:**
- ✅ Very cost-effective
- ✅ Highly scalable
- ✅ Enterprise-grade reliability
- ✅ Integrates with AWS ecosystem

**Setup Steps:**
1. Set up AWS account
2. Verify your domain in SES
3. Create SMTP credentials
4. Use the credentials

**Environment Variables:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=PolicyPal <noreply@yourdomain.com>
```

## 🚀 Quick Start with Gmail

1. **Add to your `.env` file:**
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=PolicyPal <noreply@policypal.com>
SUPPORT_EMAIL=support@policypal.com
FRONTEND_URL=http://localhost:4200
```

2. **Test the connection:**
```bash
# Start the backend
npm run start:dev

# Look for this in the logs:
# ✅ Email service connection verified
```

3. **Create a test notification:**
```typescript
// In your policy service or controller
await this.notificationsService.createNotification({
  userId: 'test-user-id',
  type: NotificationType.WELCOME,
  title: 'Welcome to PolicyPal!',
  message: 'This is a test email notification.',
  priority: NotificationPriority.MEDIUM
});
```

## 📊 Provider Comparison

| Provider | Free Tier | Cost | Setup | Best For |
|----------|-----------|------|-------|----------|
| **Gmail** | 500 emails/day | Free | Easy | Development |
| **SendGrid** | 100 emails/day | $15/month | Medium | Production |
| **AWS SES** | 62,000 emails/month | $0.10/1000 | Complex | Enterprise |
| **Mailgun** | 5,000 emails/month | $35/month | Easy | Startups |

## 🔍 Troubleshooting

### Gmail Issues:
- **"Invalid credentials"** → Use App Password, not regular password
- **"Less secure app"** → Enable 2FA and use App Password
- **"Daily limit exceeded"** → Switch to SendGrid or AWS SES

### SendGrid Issues:
- **"Authentication failed"** → Check API key format
- **"Sender not verified"** → Verify your sender email

### AWS SES Issues:
- **"Email not verified"** → Verify your domain/email in SES console
- **"Sandbox mode"** → Request production access

## 🎯 Recommendation

**For PolicyPal:**
- **Development**: Use Gmail (free, easy setup)
- **Production**: Use SendGrid or AWS SES (scalable, reliable)

The notification system is designed to work seamlessly with any SMTP provider, so you can easily switch between them as your needs grow!
