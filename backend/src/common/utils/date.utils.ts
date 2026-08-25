import { Injectable } from '@nestjs/common';

@Injectable()
export class DateUtils {
  static now(): Date {
    return new Date();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 86400000);
  }

  static isExpired(date: Date): boolean {
    return date < new Date();
  }

  static formatISO(date: Date): string {
    return date.toISOString();
  }

  static parseISO(dateString: string): Date {
    return new Date(dateString);
  }

  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  static diffInMinutes(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 60000);
  }

  static diffInHours(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 3600000);
  }

  static diffInDays(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / 86400000);
  }

  static toUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  static fromUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  static isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  static getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
}