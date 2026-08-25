import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import {
  EmailProvider,
  EmailProviderOptions,
  EmailSendResult,
  EmailProviderConfig,
} from './email-provider.interface';

@Injectable()
export class GmailProvider implements EmailProvider {
  private readonly logger = new Logger(GmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailProviderConfig;
  private oauth2Client: any = null;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: 'gmail',
      config: {
        clientId: configService.get<string>('GOOGLE_CLIENT_ID'),
        clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
        refreshToken: configService.get<string>('GMAIL_REFRESH_TOKEN'),
        from: configService.get<string>('email.from'),
        fromName: configService.get<string>('email.fromName'),
      },
    };
  }

  async onModuleInit() {
    if (this.config.config.refreshToken) {
      await this.initializeTransporter();
    } else {
      this.logger.warn('Gmail refresh token not configured, Gmail provider will not work');
    }
  }

  private async initializeTransporter(): Promise<void> {
    const { config } = this.config;

    if (!config.clientId || !config.clientSecret || !config.refreshToken) {
      this.logger.warn('Gmail OAuth configuration incomplete');
      return;
    }

    try {
      this.oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
      );

      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken,
      });

      const { token } = await this.oauth2Client.getAccessToken();

      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('email.from'),
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
          accessToken: token,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      await this.transporter.verify();
      this.logger.log('Gmail OAuth connection verified successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gmail transporter', error);
      throw error;
    }
  }

  get name(): string {
    return 'gmail';
  }

  async send(options: EmailProviderOptions): Promise<EmailSendResult> {
    if (!this.transporter) {
      await this.initializeTransporter();
      if (!this.transporter) {
        return {
          success: false,
          error: 'Gmail transporter not initialized',
          errorCode: 'TRANSPORTER_NOT_INITIALIZED',
        };
      }
    }

    // Refresh access token if needed
    await this.refreshAccessTokenIfNeeded();

    const { config } = this.config;
    const fromEmail = options.from || config.from;
    const fromName = options.fromName || config.fromName;

    try {
      const result = await this.transporter!.sendMail({
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
        headers: options.headers,
        priority: options.priority,
        auth: {
          type: 'OAuth2',
          user: this.configService.get<string>('email.from'),
          accessToken: await this.getAccessToken(),
        },
      });

      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result.response,
      };
    } catch (error) {
      this.logger.error('Failed to send email via Gmail', error);
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'GMAIL_SEND_FAILED',
        providerResponse: error.response,
      };
    }
  }

  private async refreshAccessTokenIfNeeded(): Promise<void> {
    if (!this.oauth2Client) return;

    try {
      const { token } = await this.oauth2Client.getAccessToken();
      if (token && this.transporter) {
        // Update the transporter's auth with new access token
        (this.transporter as any).options.auth.accessToken = token;
      }
    } catch (error) {
      this.logger.warn('Failed to refresh Gmail access token', error);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    const { token } = await this.oauth2Client.getAccessToken();
    return token || '';
  }

  async validateConnection(): Promise<boolean> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }
    
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Gmail connection validation failed', error);
      return false;
    }
  }

  getProviderConfig(): Record<string, any> {
    const { config } = this.config;
    return {
      provider: 'gmail',
      from: config.from,
      fromName: config.fromName,
      hasOAuth: !!config.clientId && !!config.clientSecret && !!config.refreshToken,
    };
  }

  updateConfig(newConfig: Partial<EmailProviderConfig['config']>): void {
    this.config.config = { ...this.config.config, ...newConfig };
    this.transporter = null;
    this.oauth2Client = null;
  }
}