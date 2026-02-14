import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  verifyEmailTemplate,
  passwordResetTemplate,
  familyInviteTemplate,
  accountDeletionRequestedTemplate,
  accountDeletedTemplate,
} from './templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly enabled: boolean;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.from = this.config.get<string>('EMAIL_FROM') || 'ScreenQuest <noreply@screenquest.app>';
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    this.enabled = !!apiKey;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console only');
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const verifyUrl = `${this.appUrl}/api/auth/verify-email?token=${token}`;
    const html = verifyEmailTemplate({ name, verifyUrl });

    return this.send({
      to: email,
      subject: 'Verify your ScreenQuest email',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${this.appUrl}/api/auth/reset-password?token=${token}`;
    const html = passwordResetTemplate({ name, resetUrl });

    return this.send({
      to: email,
      subject: 'Reset your ScreenQuest password',
      html,
    });
  }

  async sendFamilyInviteEmail(
    email: string,
    familyName: string,
    inviterName: string,
    familyCode: string,
  ) {
    const html = familyInviteTemplate({ familyName, inviterName, familyCode });

    return this.send({
      to: email,
      subject: `You're invited to join ${familyName} on ScreenQuest!`,
      html,
    });
  }

  async sendDeletionRequestedEmail(email: string, name: string, gracePeriodEndsAt: Date) {
    const html = accountDeletionRequestedTemplate({
      name,
      gracePeriodEndsAt: gracePeriodEndsAt.toISOString().split('T')[0],
    });

    return this.send({
      to: email,
      subject: 'ScreenQuest Account Deletion Request',
      html,
    });
  }

  async sendAccountDeletedEmail(email: string, name: string) {
    const html = accountDeletedTemplate({ name });

    return this.send({
      to: email,
      subject: 'Your ScreenQuest Account Has Been Deleted',
      html,
    });
  }

  private async send(options: { to: string; subject: string; html: string }) {
    if (!this.enabled || !this.resend) {
      this.logger.log(
        `[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`,
      );
      this.logger.debug(`[DEV EMAIL] Body:\n${options.html}`);
      return { id: 'dev-mode', message: 'Email logged (Resend not configured)' };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
        throw new Error(`Email send failed: ${error.message}`);
      }

      this.logger.log(`Email sent to ${options.to} (id: ${data?.id})`);
      return data;
    } catch (err) {
      this.logger.error(`Email error: ${err.message}`);
      // Don't throw — email failures shouldn't block the main operation
      return null;
    }
  }
}
