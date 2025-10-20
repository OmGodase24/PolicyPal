import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Notification, NotificationType } from '../schemas/notification.schema';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
    this.loadEmailTemplates();
  }

  private initializeTransporter(): void {
    const useGmail = this.configService.get<string>('SMTP_SERVICE', '').toLowerCase() === 'gmail';

    const smtpConfig: any = useGmail
      ? {
          service: 'gmail',
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'), // App Password if 2FA
          },
        }
      : {
          host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false), // true for 465
          auth: {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          },
        };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.logger.log('📧 Email service initialized');
  }

  private loadEmailTemplates(): void {
    // Use process.cwd() to get the project root, then navigate to templates
    const templatesDir = path.join(process.cwd(), 'templates/email');
    
    try {
      this.logger.log(`📁 Looking for email templates in: ${templatesDir}`);
      
      if (fs.existsSync(templatesDir)) {
        const templateFiles = fs.readdirSync(templatesDir);
        this.logger.log(`📄 Found template files: ${templateFiles.join(', ')}`);
        
        templateFiles.forEach(file => {
          if (file.endsWith('.hbs') || file.endsWith('.html')) {
            const templateName = file.replace(/\.(hbs|html)$/, '');
            const templateContent = fs.readFileSync(
              path.join(templatesDir, file), 
              'utf8'
            );
            const template = handlebars.compile(templateContent);
            this.templates.set(templateName, template);
            this.logger.log(`📄 Loaded email template: ${templateName}`);
          }
        });
        
        this.logger.log(`📋 Total templates loaded: ${this.templates.size}`);
        this.logger.log(`📋 Available templates: ${Array.from(this.templates.keys()).join(', ')}`);
      } else {
        this.logger.warn(`⚠️ Templates directory does not exist: ${templatesDir}`);
      }
    } catch (error) {
      this.logger.warn('⚠️ Could not load email templates, using default templates');
      this.logger.error(`❌ Template loading error: ${error.message}`);
    }
  }

  async sendNotificationEmail(
    to: string,
    notification: Notification,
    userData?: any
  ): Promise<boolean> {
    try {
      const templateName = this.getTemplateName(notification.type);
      const template = this.templates.get(templateName) || this.getDefaultTemplate();
      
      const emailData = {
        ...notification,
        user: userData,
        appName: 'PolicyPal',
        appUrl: this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200'),
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@policypal.com'),
        currentYear: new Date().getFullYear(),
      };

      const html = template(emailData);
      const subject = this.getEmailSubject(notification);

      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'PolicyPal <noreply@policypal.com>'),
        to,
        subject,
        html,
        text: this.generateTextVersion(notification),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${to}: ${result.messageId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      return false;
    }
  }

  private getTemplateName(type: NotificationType): string {
    const templateMap = {
      [NotificationType.POLICY_CREATED]: 'policy-created',
      [NotificationType.POLICY_UPDATED]: 'policy-updated',
      [NotificationType.POLICY_PUBLISHED]: 'policy-published',
      [NotificationType.POLICY_EXPIRING]: 'policy-expiring',
      [NotificationType.POLICY_EXPIRED]: 'policy-expired',
      [NotificationType.COMPLIANCE_CHECK_COMPLETED]: 'compliance-completed',
      [NotificationType.AI_CHAT_SESSION_STARTED]: 'chat-session-started',
      [NotificationType.SYSTEM_MAINTENANCE]: 'system-maintenance',
      [NotificationType.SECURITY_ALERT]: 'security-alert',
      [NotificationType.WELCOME]: 'welcome',
    };

    return templateMap[type] || 'default';
  }

  private getEmailSubject(notification: Notification): string {
    const subjectMap = {
      [NotificationType.POLICY_CREATED]: 'New Policy Created - PolicyPal',
      [NotificationType.POLICY_UPDATED]: 'Policy Updated - PolicyPal',
      [NotificationType.POLICY_PUBLISHED]: 'Policy Published - PolicyPal',
      [NotificationType.POLICY_EXPIRING]: 'Policy Expiring Soon - PolicyPal',
      [NotificationType.POLICY_EXPIRED]: 'Policy Expired - PolicyPal',
      [NotificationType.COMPLIANCE_CHECK_COMPLETED]: 'Compliance Check Completed - PolicyPal',
      [NotificationType.AI_CHAT_SESSION_STARTED]: 'AI Chat Session Started - PolicyPal',
      [NotificationType.SYSTEM_MAINTENANCE]: 'System Maintenance Notice - PolicyPal',
      [NotificationType.SECURITY_ALERT]: 'Security Alert - PolicyPal',
      [NotificationType.WELCOME]: 'Welcome to PolicyPal!',
    };

    return subjectMap[notification.type] || 'Notification from PolicyPal';
  }

  private getDefaultTemplate(): HandlebarsTemplateDelegate {
    return handlebars.compile(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{title}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{appName}}</h1>
          </div>
          <div class="content">
            <h2>{{title}}</h2>
            <p>{{message}}</p>
            {{#if metadata.actionUrl}}
            <p><a href="{{metadata.actionUrl}}" class="button">Take Action</a></p>
            {{/if}}
          </div>
          <div class="footer">
            <p>© {{currentYear}} {{appName}}. All rights reserved.</p>
            <p>Need help? Contact us at {{supportEmail}}</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  private generateTextVersion(notification: Notification): string {
    return `
${notification.title}

${notification.message}

${notification.metadata.actionUrl ? `Action required: ${notification.metadata.actionUrl}` : ''}

---
PolicyPal Notification System
    `.trim();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error(`❌ Email service connection failed: ${error.message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetUrl: string): Promise<void> {
    try {
      this.logger.log(`🔍 Looking for password-reset template...`);
      this.logger.log(`📋 Available templates: ${Array.from(this.templates.keys()).join(', ')}`);
      
      let template = this.templates.get('password-reset');
      
      // Fallback: create template inline if not found
      if (!template) {
        this.logger.warn(`⚠️ Template 'password-reset' not found, using inline template`);
        const inlineTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - PolicyPal</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; }
        .container { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #1f2937; }
        .message { font-size: 16px; margin-bottom: 30px; color: #4b5563; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 0; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Reset Your Password</h1>
        </div>
        <div class="content">
            <div class="greeting">Hi {{firstName}},</div>
            <div class="message">
                We received a request to reset your PolicyPal account password. If you didn't make this request, you can safely ignore this email.
            </div>
            <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset My Password</a>
            </div>
            <div class="message">
                If the button above doesn't work, you can copy and paste this link into your browser:<br><br>
                <a href="{{resetUrl}}" style="color: #3b82f6; word-break: break-all;">{{resetUrl}}</a>
            </div>
        </div>
        <div class="footer">
            <p>This email was sent by PolicyPal. If you have any questions, contact us at {{supportEmail}}</p>
        </div>
    </div>
</body>
</html>`;
        
        template = handlebars.compile(inlineTemplate);
        this.templates.set('password-reset', template);
      }

      this.logger.log(`✅ Using password-reset template, compiling...`);

      const html = template({
        firstName,
        resetUrl,
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL', 'support@policypal.com')
      });

      const mailOptions = {
        from: this.configService.get<string>('SMTP_FROM', 'PolicyPal <noreply@policypal.com>'),
        to: email,
        subject: 'Reset Your PolicyPal Password',
        html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }
}
