import { Injectable } from '@nestjs/common';

export enum QueueName { COMMENTS='comments', AUTOMATIONS='automations', EMAILS='emails', WEBHOOKS='webhooks' }
export interface CommentJobData { channelId:string; videoId?:string; pageToken?:string }
export interface AutomationJobData { executionId:string; automationId:string; triggerData:Record<string,any> }
export interface EmailJobData { emailLogId:string; toEmail:string; subject:string; htmlContent:string; textContent?:string }
export interface WebhookJobData { eventId:string; channelId:string; eventType:string; payload:Record<string,any> }

@Injectable()
export class QueueService {
  async addCommentJob(data:CommentJobData){ return { id:`local-comment-${Date.now()}`, data }; }
  async addAutomationJob(data:AutomationJobData){ return { id:`local-automation-${Date.now()}`, data }; }
  async addEmailJob(data:EmailJobData){ return { id:`local-email-${Date.now()}`, data }; }
  async addWebhookJob(data:WebhookJobData){ return { id:`local-webhook-${Date.now()}`, data }; }
  async addScheduledCommentFetch(channelId:string){ return { id:`local-schedule-${channelId}` }; }
  async removeScheduledCommentFetch(channelId:string){ return { removed:true, channelId }; }
  async getQueueStats(){ return { comments:{waiting:0,active:0,completed:0,failed:0,delayed:0}, automations:{waiting:0,active:0,completed:0,failed:0,delayed:0}, emails:{waiting:0,active:0,completed:0,failed:0,delayed:0}, webhooks:{waiting:0,active:0,completed:0,failed:0,delayed:0} }; }
}