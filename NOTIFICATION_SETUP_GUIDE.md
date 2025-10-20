# 🔔 Live Notifications with Email Integration - Setup Guide

## 🎯 Overview

This guide will help you set up the comprehensive live notification system with email functionality for PolicyPal. The system includes:

- ✅ **Real-time WebSocket notifications**
- ✅ **Email notifications with beautiful templates**
- ✅ **User notification preferences**
- ✅ **Multi-language support**
- ✅ **Notification bell component**
- ✅ **Scheduled notifications**

## 📋 Prerequisites

1. **SMTP Email Service** (Gmail, SendGrid, AWS SES, etc.)
2. **Node.js 18+** and **npm**
3. **MongoDB** running
4. **Angular 17+** and **NestJS 10+**

## 🚀 Backend Setup

### 1. **Install Dependencies**

```bash
cd backend
npm install nestjs-mailer nodemailer @types/nodemailer handlebars
npm install @nestjs/websockets@^10.0.0 @nestjs/platform-socket.io@^10.0.0 socket.io
npm install @nestjs/schedule
```

### 2. **Environment Configuration**

Add these variables to your `backend/.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=PolicyPal <noreply@policypal.com>

# Support Email
SUPPORT_EMAIL=support@policypal.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:4200
```

### 3. **Gmail Setup (Recommended)**

For Gmail SMTP:

1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

### 4. **Alternative Email Services**

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

## 🎨 Frontend Setup

### 1. **Install Socket.IO Client**

```bash
cd frontend
npm install socket.io-client
```

### 2. **Add Notification Bell to Header**

Update your header component to include the notification bell:

```typescript
// In your header component
import { NotificationBellComponent } from '@shared/components/notification-bell/notification-bell.component';

@Component({
  // ... your component config
  imports: [
    // ... other imports
    NotificationBellComponent
  ],
  template: `
    <header>
      <!-- Your existing header content -->
      
      <!-- Add notification bell -->
      <app-notification-bell></app-notification-bell>
    </header>
  `
})
```

### 3. **Initialize Notification Service**

Add to your `app.component.ts`:

```typescript
import { NotificationSocketService } from '@core/services/notification-socket.service';

export class AppComponent implements OnInit {
  constructor(
    private notificationService: NotificationSocketService
  ) {}

  ngOnInit() {
    // Service auto-connects when user is authenticated
  }
}
```

## 🔧 Usage Examples

### 1. **Creating Notifications from Backend**

```typescript
// In your policy service
import { NotificationsService } from '../notifications/services/notifications.service';

@Injectable()
export class PoliciesService {
  constructor(
    private notificationsService: NotificationsService
  ) {}

  async createPolicy(createPolicyDto: CreatePolicyDto, userId: string) {
    // Create policy logic...
    
    // Send notification
    await this.notificationsService.notifyPolicyCreated(
      userId,
      policy._id,
      policy.title
    );
  }

  async publishPolicy(policyId: string, userId: string) {
    // Publish logic...
    
    await this.notificationsService.createNotification({
      userId,
      type: NotificationType.POLICY_PUBLISHED,
      title: 'Policy Published',
      message: `Your policy "${policy.title}" has been published successfully.`,
      priority: NotificationPriority.MEDIUM,
      metadata: { policyId, policyTitle: policy.title },
      policyId
    });
  }
}
```

### 2. **Scheduled Notifications**

```typescript
// Check for expiring policies daily
@Cron(CronExpression.EVERY_DAY_AT_9AM)
async checkExpiringPolicies() {
  const expiringPolicies = await this.policyModel.find({
    expiryDate: { 
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  for (const policy of expiringPolicies) {
    const daysUntilExpiry = Math.ceil(
      (policy.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    await this.notificationsService.notifyPolicyExpiring(
      policy.userId,
      policy._id,
      policy.title,
      daysUntilExpiry
    );
  }
}
```

### 3. **User Notification Preferences**

```typescript
// Get user preferences
const preferences = await this.notificationsService.getUserPreferences(userId);

// Update preferences
await this.notificationsService.updateUserPreferences(userId, {
  emailEnabled: true,
  inAppEnabled: true,
  emailFrequency: 'immediate',
  typePreferences: new Map([
    [NotificationType.POLICY_EXPIRING, {
      email: true,
      inApp: true,
      push: false
    }]
  ])
});
```

## 📧 Email Templates

The system includes beautiful HTML email templates:

- **Policy Created** - Welcome new policies
- **Policy Expiring** - Urgent renewal reminders  
- **Compliance Completed** - AI analysis results
- **Welcome** - Onboarding emails
- **System Maintenance** - Service updates

Templates are located in `backend/src/templates/email/` and use Handlebars for dynamic content.

## 🔔 Notification Types

| Type | Description | Priority | Channels |
|------|-------------|----------|----------|
| `POLICY_CREATED` | New policy created | Medium | Email + In-App |
| `POLICY_UPDATED` | Policy modified | Low | In-App |
| `POLICY_PUBLISHED` | Policy published | Medium | Email + In-App |
| `POLICY_EXPIRING` | Policy expiring soon | High | Email + In-App |
| `POLICY_EXPIRED` | Policy expired | Urgent | Email + In-App |
| `COMPLIANCE_CHECK_COMPLETED` | AI compliance done | Medium | Email + In-App |
| `AI_CHAT_SESSION_STARTED` | Chat session started | Low | In-App |
| `SYSTEM_MAINTENANCE` | System updates | Medium | Email + In-App |
| `SECURITY_ALERT` | Security issues | Urgent | Email + In-App |
| `WELCOME` | User onboarding | Medium | Email |

## 🎛️ Frontend Components

### Notification Bell Component

```typescript
// Features:
- Real-time notification display
- Unread count badge
- Mark as read functionality
- Click to navigate to related content
- Responsive design
- Multi-language support
```

### Notification Service

```typescript
// Features:
- WebSocket connection management
- Automatic reconnection
- Notification state management
- User preference handling
```

## 🧪 Testing

### 1. **Test Email Connection**

```bash
# In backend directory
npm run start:dev

# Check logs for:
# ✅ Email service connection verified
```

### 2. **Test WebSocket Connection**

```bash
# Open browser console and check for:
# 🔌 Connected to notification service
# ✅ Notification service ready
```

### 3. **Test Notification Flow**

1. Create a new policy
2. Check for in-app notification
3. Check email inbox
4. Verify notification preferences

## 🚀 Deployment

### Environment Variables for Production

```env
# Production SMTP
SMTP_HOST=your-production-smtp-host
SMTP_PORT=587
SMTP_USER=your-production-email
SMTP_PASS=your-production-password
SMTP_FROM=PolicyPal <noreply@yourdomain.com>

# Production URLs
FRONTEND_URL=https://yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com
```

### Docker Configuration

Add to your `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
      - FRONTEND_URL=${FRONTEND_URL}
```

## 📊 Monitoring

### Notification Metrics

- **Delivery Rate**: Track email delivery success
- **Read Rate**: Monitor notification engagement
- **User Preferences**: Analyze notification settings
- **Error Logs**: Monitor failed notifications

### Health Checks

```typescript
// Add to your health check endpoint
@Get('health/notifications')
async checkNotificationHealth() {
  const emailHealth = await this.emailService.testConnection();
  const socketHealth = this.notificationsGateway.getConnectedUsersCount();
  
  return {
    email: emailHealth,
    websocket: socketHealth > 0,
    connectedUsers: socketHealth
  };
}
```

## 🎯 Next Steps

1. **Customize Email Templates** - Modify templates in `backend/src/templates/email/`
2. **Add Push Notifications** - Integrate with Firebase or similar
3. **Analytics Integration** - Track notification performance
4. **Advanced Scheduling** - Add timezone support and quiet hours
5. **Bulk Notifications** - Send to multiple users
6. **Notification History** - Archive old notifications

## 🆘 Troubleshooting

### Common Issues

**Email not sending:**
- Check SMTP credentials
- Verify firewall settings
- Test with different email providers

**WebSocket connection fails:**
- Check CORS configuration
- Verify authentication tokens
- Check network connectivity

**Notifications not appearing:**
- Verify user preferences
- Check notification service logs
- Ensure WebSocket connection is active

### Debug Mode

Enable debug logging:

```typescript
// In your service
private readonly logger = new Logger(NotificationsService.name);
this.logger.debug('Debug information here');
```

## 📚 API Documentation

The notification system provides these endpoints:

- `GET /notifications` - Get user notifications
- `POST /notifications` - Create notification
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/read-all` - Mark all as read
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

Full API documentation available at `/api/docs` when running the backend.

---

🎉 **Congratulations!** You now have a comprehensive live notification system with email integration for PolicyPal!
