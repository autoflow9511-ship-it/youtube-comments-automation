import { Injectable } from '@nestjs/common';

@Injectable()
export class StringUtils {
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static truncate(text: string, length: number, suffix: string = '...'): string {
    if (text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  }

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  static capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  static camelToSnake(text: string): string {
    return text.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  static snakeToCamel(text: string): string {
    return text.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static generateSlug(base: string, existingSlugs: string[] = []): string {
    let slug = this.slugify(base);
    let counter = 1;
    let uniqueSlug = slug;

    while (existingSlugs.includes(uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${'x'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  static maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '****';
    return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
  }

  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  static generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}${timestamp}${random}`;
  }
}