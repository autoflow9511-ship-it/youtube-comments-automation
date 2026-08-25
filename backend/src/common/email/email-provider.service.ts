import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMTPProvider } from './smtp.provider';
import { GmailProvider } from './gmail.provider';
import {
  EmailProvider,
  EmailProviderOptions,
  EmailSendResult,
  EmailProviderConfig,
} from './email-provider.interface';

@Injectable()
export class EmailProviderService implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderService.name);
  private providers: Map<string, EmailProvider> = new Map();
  private defaultProvider: string = 'smtp';

  constructor(
    private configService: ConfigService,
    private smtpProvider: SMTPProvider,
    private gmailProvider: GmailProvider,
  ) {}

  async onModuleInit() {
    // Register providers
    this.providers.set('smtp', this.smtpProvider);
    this.providers.set('gmail', this.gmailProvider);

    // Determine default provider
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER') || 'smtp';
    if (this.providers.has(emailProvider)) {
      this.defaultProvider = emailProvider;
    } else {
      this.logger.warn(`Configured email provider "${emailProvider}" not available, falling back to SMTP`);
      this.defaultProvider = 'smtp';
    }

    this.logger.log(`Email providers initialized. Default: ${this.defaultProvider}`);
  }

  getProvider(name?: string): EmailProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      this.logger.warn(`Provider "${providerName}" not found, using default`);
      return this.providers.get(this.defaultProvider)!;
    }
    
    return provider;
  }

  getAllProviders(): EmailProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  async send(
    options: EmailProviderOptions,
    providerName?: string,
  ): Promise<EmailSendResult> {
    const provider = this.getProvider(providerName);
    return provider.send(options);
  }

  async sendWithFallback(
    options: EmailProviderOptions,
    providerNames?: string[],
  ): Promise<EmailSendResult> {
    const providers = providerNames || [this.defaultProvider, ...this.getAvailableProviders().filter(p => p !== this.defaultProvider)];
    
    let lastError: Error | null = null;
    
    for (const name of providerNames || [this.defaultProvider]) {
      const provider = this.providers.get(name);
      if (!provider) continue;

      try {
        const result = await provider.send(options);
        if (result.success) {
          return result;
        }
        lastError = new Error(result.error || 'Unknown error');
        this.logger.warn(`Provider ${name} failed: ${result.error}, trying next...`);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Provider ${name} threw error: ${error.message}, trying next...`);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'All providers failed',
      errorCode: 'ALL_PROVIDERS_FAILED',
    };
  }

  async validateAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.validateConnection();
      } catch (error) {
        this.logger.error(`Provider ${name} validation failed`, error);
        results[name] = false;
      }
    }
    
    return results;
  }

  getProviderConfig(name?: string): Record<string, any> {
    const provider = this.getProvider(name);
    return provider.getProviderConfig();
  }

  setDefaultProvider(name: string): boolean {
    if (this.providers.has(name)) {
      this.defaultProvider = name;
      this.logger.log(`Default email provider changed to: ${name}`);
      return true;
    }
    return false;
  }
}