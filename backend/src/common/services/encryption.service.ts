import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = configService.get<string>('encryption.key');
    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
    }
    this.key = Buffer.from(encryptionKey, 'utf-8');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted1 = cipher.update(text, 'utf8');
    const encrypted2 = cipher.final();
    const encrypted = Buffer.concat([encrypted1, encrypted2]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted1 = decipher.update(encrypted);
    const decrypted2 = decipher.final();
    return Buffer.concat([decrypted1, decrypted2]).toString('utf8');
  }

  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateApiKey(): { key: string; prefix: string; hash: string } {
    const prefix = 'ya_live_';
    const randomPart = this.generateRandomString(24);
    const key = prefix + randomPart;
    const hash = this.hash(key);
    return { key, prefix: prefix.slice(0, -1), hash };
  }

  verifyApiKey(key: string, hash: string): boolean {
    return this.hash(key) === hash;
  }
}