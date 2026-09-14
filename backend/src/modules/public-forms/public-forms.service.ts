import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PublicForm, PublicFormDocument } from '../../database/mongodb/schemas/public-form.schema';
import { FormSubmission, FormSubmissionDocument } from '../../database/mongodb/schemas/form-submission.schema';
import { EmailDeliveryStatus, EmailDeliveryStatusDocument, EmailDeliveryStatusEnum } from '../../database/mongodb/schemas/email-delivery-status.schema';
import { AutomationVideo, AutomationVideoDocument } from '../../database/mongodb/schemas/automation-video.schema';
import { EmailProviderService } from '@common/email/email-provider.service';
import { LandingPagesService } from '@modules/landing-pages/landing-pages.service';
import { PrismaService } from '@database/prisma.service';
import { StringUtils } from '@common/utils/string.utils';

interface FormSubmissionData {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmParams?: Record<string, any>;
}

interface EmailSendData {
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
  automationId: string;
  formSubmissionId: string;
}

@Injectable()
export class PublicFormsService {
  private readonly logger = new Logger(PublicFormsService.name);

  constructor(
    @InjectModel('PublicForm') private publicFormModel: Model<PublicFormDocument>,
    @InjectModel('FormSubmission') private formSubmissionModel: Model<FormSubmissionDocument>,
    @InjectModel('EmailDeliveryStatus') private emailDeliveryStatusModel: Model<EmailDeliveryStatusDocument>,
    @InjectModel('AutomationVideo') private automationVideoModel: Model<AutomationVideoDocument>,
    private emailProviderService: EmailProviderService,
    private landingPagesService: LandingPagesService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // PUBLIC FORM MANAGEMENT
  // ============================================

  async createPublicForm(userId: string, automationId: string, data: {
    name: string;
    title?: string;
    description?: string;
    logoUrl?: string;
    heading?: string;
    formDescription?: string;
    emailPlaceholder?: string;
    submitButtonText?: string;
    successMessage?: string;
    errorMessage?: string;
    privacyConsentText?: string;
    privacyPolicyUrl?: string;
    requireConsent?: boolean;
    emailInputType?: string;
    emailValidationEnabled?: boolean;
    allowedEmailDomains?: string[];
    blockedEmailDomains?: string[];
    settings?: Record<string, any>;
  }) {
    // Verify automation ownership
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, userId, deletedAt: null },
      include: { channel: true },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const publicFormId = StringUtils.generateSlug(data.name);
    let uniqueFormId = publicFormId;
    let counter = 1;

    // Ensure unique publicFormId
    while (await this.publicFormModel.findOne({ publicFormId: uniqueFormId })) {
      uniqueFormId = `${publicFormId}-${counter}`;
      counter++;
    }

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const publicUrl = `${baseUrl}/form/${uniqueFormId}`;

    const form = await this.publicFormModel.create({
      userId: new Types.ObjectId(userId),
      automationId: new Types.ObjectId(automationId),
      channelId: automation.channelId ? new Types.ObjectId(automation.channelId) : undefined,
      publicFormId: uniqueFormId,
      name: data.name,
      title: data.title,
      description: data.description,
      logoUrl: data.logoUrl,
      heading: data.heading,
      formDescription: data.formDescription,
      emailPlaceholder: data.emailPlaceholder,
      submitButtonText: data.submitButtonText,
      successMessage: data.successMessage,
      errorMessage: data.errorMessage,
      privacyConsentText: data.privacyConsentText,
      privacyPolicyUrl: data.privacyPolicyUrl,
      requireConsent: data.requireConsent ?? true,
      emailInputType: data.emailInputType || 'email',
      emailValidationEnabled: data.emailValidationEnabled ?? true,
      allowedEmailDomains: data.allowedEmailDomains,
      blockedEmailDomains: data.blockedEmailDomains,
      settings: data.settings || {},
      publicUrl,
      status: 'draft',
    });

    this.logger.log(`Created public form ${form.publicFormId} for automation ${automationId}`);
    return form;
  }

  async getPublicFormByPublicId(publicFormId: string) {
    const form = await this.publicFormModel.findOne({ 
      publicFormId, 
      status: 'published',
      deletedAt: { $exists: false },
    });

    if (!form) {
      throw new NotFoundException('Form not found or not published');
    }

    return form;
  }

  async getPublicFormById(userId: string, id: string) {
    const form = await this.publicFormModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    return form;
  }

  async getUserForms(userId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId: new Types.ObjectId(userId), deletedAt: { $exists: false } };
    if (params.status) where.status = params.status;

    const [forms, total] = await Promise.all([
      this.publicFormModel.find(where)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.publicFormModel.countDocuments(where),
    ]);

    return { data: forms, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateForm(userId: string, id: string, data: any) {
    const form = await this.publicFormModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    Object.assign(form, data);
    await form.save();

    this.logger.log(`Updated form ${form.publicFormId}`);
    return form;
  }

  async publishForm(userId: string, id: string) {
    const form = await this.publicFormModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    form.status = 'published';
    form.publishedAt = new Date();
    
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    form.publicUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}/form/${form.publicFormId}`;

    await form.save();
    this.logger.log(`Published form ${form.publicFormId}`);

    return form;
  }

  async unpublishForm(userId: string, id: string) {
    const form = await this.publicFormModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    form.status = 'draft';
    form.publicUrl = undefined;
    await form.save();

    this.logger.log(`Unpublished form ${form.publicFormId}`);
    return form;
  }

  async deleteForm(userId: string, id: string) {
    const form = await this.publicFormModel.findOne({ 
      _id: id, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    form.deletedAt = new Date();
    form.status = 'archived';
    await form.save();

    this.logger.log(`Deleted form ${form.publicFormId}`);
    return form;
  }

  // ============================================
  // FORM SUBMISSION HANDLING
  // ============================================

  async submitForm(publicFormId: string, data: FormSubmissionData, req: any) {
    const form = await this.getPublicFormByPublicId(publicFormId);

    // Validate email
    const email = this.normalizeEmail(data.email);
    if (!this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email address');
    }

    // Check blocked/allowed domains
    if (form.blockedEmailDomains?.length) {
      const domain = email.split('@')[1].toLowerCase();
      if (form.blockedEmailDomains.includes(domain)) {
        throw new BadRequestException('This email domain is not allowed');
      }
    }

    if (form.allowedEmailDomains?.length) {
      const domain = email.split('@')[1].toLowerCase();
      if (!form.allowedEmailDomains.includes(domain)) {
        throw new BadRequestException('This email domain is not allowed');
      }
    }

    // Check consent
    if (form.requireConsent && !data.customFields?.consent) {
      throw new BadRequestException('You must agree to the privacy policy');
    }

    // Check for duplicate submission (same automation, email, video)
    const existingSubmission = await this.formSubmissionModel.findOne({
      automationId: form.automationId,
      email: email.toLowerCase(),
      videoId: data.customFields?.videoId ? new Types.ObjectId(data.customFields.videoId) : undefined,
    });

    if (existingSubmission) {
      throw new ConflictException('This email has already been submitted for this automation');
    }

    // Create form submission
    const submission = await this.formSubmissionModel.create({
      userId: form.userId,
      automationId: form.automationId,
      formId: form._id,
      channelId: form.channelId,
      videoId: data.customFields?.videoId ? new Types.ObjectId(data.customFields.videoId) : undefined,
      commentId: data.customFields?.commentId ? new Types.ObjectId(data.customFields.commentId) : undefined,
      email: email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      customFields: data.customFields || {},
      ipAddress: data.ipAddress || req.ip,
      userAgent: data.userAgent || req.headers['user-agent'],
      referrer: data.referrer || req.headers.referer,
      ...data.utmParams,
      consentGiven: !!data.customFields?.consent,
      consentIp: data.ipAddress || req.ip,
      consentAt: data.customFields?.consent ? new Date() : undefined,
      deliveryStatus: 'pending',
      submittedAt: new Date(),
    });

    this.logger.log(`Form submission received for form ${form.publicFormId}, email: ${email}`);

    // Trigger email automation if configured
    await this.triggerEmailAfterSubmission(form, submission);

    return { 
      success: true, 
      submissionId: submission._id,
      message: form.successMessage || 'Thank you for submitting! Check your email.' 
    };
  }

  private async triggerEmailAfterSubmission(form: PublicFormDocument, submission: FormSubmissionDocument) {
    try {
      // Find automation with SEND_EMAIL action
      const automation = await this.prisma.automation.findUnique({
        where: { id: form.automationId.toString() },
        include: {
          actions: {
            where: { type: 'SEND_EMAIL' },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!automation || !automation.actions.length) {
        this.logger.debug(`No SEND_EMAIL action configured for automation ${form.automationId}`);
        return;
      }

      // Get email configuration from first SEND_EMAIL action
      const emailAction = automation.actions[0];
      const emailConfig = emailAction.config as any;

      if (!emailConfig.subject || !emailConfig.htmlContent) {
        this.logger.warn(`Email action ${emailAction.id} missing subject or content`);
        return;
      }

      // Create email delivery status record
      const deliveryStatus = await this.emailDeliveryStatusModel.create({
        userId: new Types.ObjectId(automation.userId),
        automationId: new Types.ObjectId(automation.id),
        formSubmissionId: submission._id,
        toEmail: submission.email,
        subject: emailConfig.subject,
        status: 'queued',
        provider: 'smtp',
        automationActionId: new Types.ObjectId(emailAction.id),
      });

      // Send email asynchronously
      this.sendEmailAfterSubmission(form, submission, emailAction, deliveryStatus._id)
        .catch(error => {
          this.logger.error(`Failed to send email after submission ${submission._id}`, error);
        });

    } catch (error) {
      this.logger.error(`Error triggering email after submission`, error);
    }
  }

  private async sendEmailAfterSubmission(
    form: PublicFormDocument,
    submission: FormSubmissionDocument,
    emailAction: any,
    deliveryStatusId: Types.ObjectId
  ) {
    try {
      const emailConfig = emailAction.config;
      
      // Interpolate variables
      const context = {
        email: submission.email,
        firstName: submission.firstName,
        lastName: submission.lastName,
        ...submission.customFields,
        automationName: emailAction.automation?.name,
        formTitle: form.title,
      };

      const subject = this.interpolate(emailConfig.subject, context);
      const htmlContent = this.interpolate(emailConfig.htmlContent, context);
      const textContent = emailConfig.textContent 
        ? this.interpolate(emailConfig.textContent, context) 
        : undefined;

      // Update status to processing
      await this.emailDeliveryStatusModel.findByIdAndUpdate(deliveryStatusId, {
        status: 'processing',
      });

      // Send email
      const result = await this.emailProviderService.send({
        to: submission.email,
        subject,
        html: htmlContent,
        text: textContent,
        from: (emailConfig as any).fromEmail,
        fromName: (emailConfig as any).fromName,
      });

      if (result.success) {
        await this.emailDeliveryStatusModel.findByIdAndUpdate(deliveryStatusId, {
          status: 'sent',
          sentAt: new Date(),
          providerMessageId: result.messageId,
          providerResponse: result.providerResponse,
        });
        
        this.logger.log(`Email sent successfully to ${submission.email} for submission ${submission._id}`);
      } else {
        await this.emailDeliveryStatusModel.findByIdAndUpdate(deliveryStatusId, {
          status: 'failed',
          errorMessage: result.error,
          errorCode: result.errorCode,
          providerResponse: result.providerResponse,
        });
        
        this.logger.error(`Failed to send email to ${submission.email}: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Error sending email after submission`, error);
      
      await this.emailDeliveryStatusModel.findByIdAndUpdate(deliveryStatusId, {
        status: 'failed',
        errorMessage: error.message,
      });
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private interpolate(template: string, context: Record<string, any>): string {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (context[key] !== undefined) return String(context[key]);
      return match;
    });
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  async getFormSubmissions(userId: string, formId: string, params: {
    page?: number;
    limit?: number;
    deliveryStatus?: string;
  }) {
    const form = await this.publicFormModel.findOne({ 
      _id: formId, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { formId: new Types.ObjectId(formId) };
    if (params.deliveryStatus) {
      where.deliveryStatus = params.deliveryStatus;
    }

    const [submissions, total] = await Promise.all([
      this.formSubmissionModel.find(where)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('emailDeliveryStatus'),
      this.formSubmissionModel.countDocuments(where),
    ]);

    return { data: submissions, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getFormStats(userId: string, formId: string) {
    const form = await this.publicFormModel.findOne({ 
      _id: formId, 
      userId: new Types.ObjectId(userId),
      deletedAt: { $exists: false },
    });

    if (!form) throw new NotFoundException('Form not found');

    const [totalSubmissions, delivered, failed, pending] = await Promise.all([
      this.formSubmissionModel.countDocuments({ formId: form._id }),
      this.formSubmissionModel.countDocuments({ formId: form._id, deliveryStatus: 'sent' }),
      this.formSubmissionModel.countDocuments({ formId: form._id, deliveryStatus: 'failed' }),
      this.formSubmissionModel.countDocuments({ formId: form._id, deliveryStatus: 'pending' }),
    ]);

    return { totalSubmissions, delivered, failed, pending };
  }
}