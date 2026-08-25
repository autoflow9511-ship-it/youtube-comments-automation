import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  EmailProvider,
  EmailProviderOptions,
  EmailSendResult,
  EmailProviderConfig,
} from './email-provider.interface';

@Injectable()
export class SMTPProvider implements EmailProvider {
  private readonly logger = new Logger(SMTPProvider.name);
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailProviderConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: 'smtp',
      config: {
        host: configService.get<string>('email.host'),
        port: configService.get<number>('email.port'),
        secure: configService.get<boolean>('email.secure'),
        auth: {
          user: configService.get<string>('email.user'),
          pass: configService.get<string>('email.pass'),
        },
        from: configService.get<string>('email.from'),
        fromName: configService.get<string>('email.fromName'),
      },
    };
  }

  async onModuleInit() {
    await this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    const { config } = this.config;
    
    if (!config.host || !config.auth?.user || !config.auth?.pass) {
      this.logger.warn('SMTP configuration incomplete, email sending will not work');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
      });

      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SMTP transporter', error);
      throw error;
    }
  }

  get name(): string {
    return 'smtp';
  }

  async send(options: EmailProviderOptions): Promise<EmailSendResult> {
    if (!this.transporter) {
      await this.initializeTransporter();
      if (!this.transporter) {
        return {
          success: false,
          error: 'SMTP transporter not initialized',
          errorCode: 'TRANSPORTER_NOT_INITIALIZED',
        };
      }
    }

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
      });

      return {
        success: true,
        messageId: result.messageId,
        providerResponse: result.response,
      };
    } catch (error) {
      this.logger.error('Failed to send email via SMTP', error);
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'SMTP_SEND_FAILED',
        providerResponse: error.response,
      };
    }
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
      this.logger.error('SMTP connection validation failed', error);
      return false;
    }
  }

  getProviderConfig(): Record<string, any> {
    const { config } = this.config;
    return {
      provider: 'smtp',
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: config.from,
      fromName: config.fromName,
      // Don't expose sensitive credentials
      hasAuth: !!config.auth?.user && !!config.auth?.pass,
    };
  }

  updateConfig(newConfig: Partial<EmailProviderConfig['config']>): void {
    this.config.config = { ...this.config.config, ...newConfig };
    this.transporter = null; // Force reinitialization
  }
}