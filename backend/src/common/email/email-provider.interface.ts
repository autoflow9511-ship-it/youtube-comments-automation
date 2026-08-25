export interface EmailProviderOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
  path?: string;
  href?: string;
  cid?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  providerResponse?: Record<string, any>;
}

export interface EmailProvider {
  name: string;
  send(options: EmailProviderOptions): Promise<EmailSendResult>;
  validateConnection(): Promise<boolean>;
  getProviderConfig(): Record<string, any>;
}

export interface EmailProviderConfig {
  provider: 'smtp' | 'gmail' | 'sendgrid' | 'mailgun' | 'ses' | 'custom';
  config: Record<string, any>;
}