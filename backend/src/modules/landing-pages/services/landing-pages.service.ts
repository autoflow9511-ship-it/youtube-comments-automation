import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { QueueService } from '../../../queue/queue.service';
import { LandingPageStatus } from '@prisma/client';
import { StringUtils } from '../../../common/utils/string.utils';

@Injectable()
export class LandingPagesService {
  private readonly logger = new Logger(LandingPagesService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // LANDING PAGE MANAGEMENT
  // ============================================

  async createLandingPage(userId: string, data: {
    channelId?: string;
    name: string;
    title: string;
    description?: string;
    htmlContent: string;
    cssContent?: string;
    jsContent?: string;
    formFields: any[];
    settings?: Record<string, any>;
    seoTitle?: string;
    seoDescription?: string;
    seoImage?: string;
  }) {
    const slug = StringUtils.generateSlug(data.name);
    
    // Check for unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (await this.prisma.landingPage.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return this.prisma.landingPage.create({
      data: {
        userId,
        channelId: data.channelId,
        name: data.name,
        slug: uniqueSlug,
        title: data.title,
        description: data.description,
        htmlContent: data.htmlContent,
        cssContent: data.cssContent,
        jsContent: data.jsContent,
        formFields: data.formFields,
        settings: data.settings || {},
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoImage: data.seoImage,
        status: LandingPageStatus.DRAFT,
      },
    });
  }

  async updateLandingPage(userId: string, id: string, data: any) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        name: data.name,
        title: data.title,
        description: data.description,
        htmlContent: data.htmlContent,
        cssContent: data.cssContent,
        jsContent: data.jsContent,
        formFields: data.formFields,
        settings: data.settings,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoImage: data.seoImage,
        customDomain: data.customDomain,
      },
    });
  }

  async deleteLandingPage(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    return this.prisma.landingPage.update({
      where: { id },
      data: { deletedAt: new Date(), status: LandingPageStatus.ARCHIVED },
    });
  }

  async getLandingPages(userId: string, options?: { page?: number; limit?: number; status?: string }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };
    if (options?.status) where.status = options.status;

    const [pages, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { submissions: true } } },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return { data: pages, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getLandingPage(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
      include: { submissions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async publishLandingPage(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const publishUrl = `${baseUrl}/lp/${page.slug}`;

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        status: LandingPageStatus.PUBLISHED,
        publishUrl,
        publishedAt: new Date(),
      },
    });
  }

  async unpublishLandingPage(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    return this.prisma.landingPage.update({
      where: { id },
      data: { status: LandingPageStatus.DRAFT, publishUrl: null },
    });
  }

  // ============================================
  // FORM SUBMISSION HANDLING
  // ============================================

  async submitForm(pageId: string, data: {
    formData: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmParams?: Record<string, any>;
  }) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id: pageId, status: LandingPageStatus.PUBLISHED, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found or not published');

    const email = data.formData.email;
    if (!email) throw new BadRequestException('Email is required');

    // Create or get email capture
    let emailCapture = await this.prisma.emailCapture.findFirst({
      where: { userId: page.userId, email: email.toLowerCase() },
    });

    if (!emailCapture) {
      emailCapture = await this.prisma.emailCapture.create({
        data: {
          userId: page.userId,
          channelId: page.channelId,
          landingPageId: page.id,
          email: email.toLowerCase(),
          firstName: data.formData.firstName,
          lastName: data.formData.lastName,
          customFields: data.formData,
          source: 'landing_page',
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referrer: data.referrer,
          ...data.utmParams,
        },
      });
    }

    // Create submission record
    const submission = await this.prisma.landingPageSubmission.create({
      data: {
        landingPageId: page.id,
        emailCaptureId: emailCapture.id,
        formData: data.formData,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referrer: data.referrer,
        ...data.utmParams,
      },
    });

    // Trigger email sequences if configured
    // This would be handled by the emails service
    // await this.queueService.addSequenceTriggerJob({ landingPageId: page.id, emailCaptureId: emailCapture.id });

    return { submission, emailCapture };
  }

  async getSubmissions(userId: string, pageId: string, options?: { page?: number; limit?: number }) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    const pageNum = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 100);
    const skip = (pageNum - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.prisma.landingPageSubmission.findMany({
        where: { landingPageId: pageId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { emailCapture: true },
      }),
      this.prisma.landingPageSubmission.count({ where: { landingPageId: pageId } }),
    ]);

    return { data: submissions, meta: { total, page: pageNum, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ============================================
  // PUBLIC LANDING PAGE RENDERING
  // ============================================

  async getPublicLandingPage(slug: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug, status: LandingPageStatus.PUBLISHED, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    // Render the page with form fields
    const renderedHtml = this.renderPage(page);

    return { page, html: renderedHtml };
  }

  private renderPage(page: any): string {
    // Generate form HTML from formFields
    const formFieldsHtml = page.formFields.map((field: any, index: number) => {
      const required = field.required ? 'required' : '';
      const name = field.name;
      const label = field.label;
      const type = field.type || 'text';
      const placeholder = field.placeholder || label;

      let inputHtml = '';
      switch (type) {
        case 'email':
          inputHtml = `<input type="email" name="${name}" id="${name}" placeholder="${placeholder}" ${required} />`;
          break;
        case 'textarea':
          inputHtml = `<textarea name="${name}" id="${name}" placeholder="${placeholder}" ${required}></textarea>`;
          break;
        case 'select':
          const options = field.options?.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('') || '';
          inputHtml = `<select name="${name}" id="${name}" ${required}>${options}</select>`;
          break;
        case 'checkbox':
          inputHtml = `<input type="checkbox" name="${name}" id="${name}" ${required} />`;
          break;
        default:
          inputHtml = `<input type="text" name="${name}" id="${name}" placeholder="${placeholder}" ${required} />`;
      }

      return `
        <div class="form-field">
          <label for="${name}">${label} ${field.required ? '<span class="required">*</span>' : ''}</label>
          ${inputHtml}
        </div>
      `;
    }).join('');

    const html = page.htmlContent
      .replace(/\{\{title\}\}/g, page.title)
      .replace(/\{\{description\}\}/g, page.description || '')
      .replace(/\{\{formFields\}\}/g, formFieldsHtml)
      .replace(/\{\{css\}\}/g, page.cssContent || '')
      .replace(/\{\{js\}\}/g, page.jsContent || '');

    return html;
  }

  async getLandingPageStats(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!page) throw new NotFoundException('Landing page not found');

    const [totalSubmissions, uniqueEmails, conversionRate] = await Promise.all([
      this.prisma.landingPageSubmission.count({ where: { landingPageId: id } }),
      this.prisma.landingPageSubmission.findMany({
        where: { landingPageId: id },
        select: { emailCapture: { select: { email: true } } },
        distinct: ['emailCaptureId'],
      }).then(r => r.length),
      this.prisma.landingPageSubmission.count({ where: { landingPageId: id } }).then(total => {
        // Would need page views to calculate proper conversion rate
        return total > 0 ? 'N/A' : '0%';
      }),
    ]);

    return { totalSubmissions, uniqueEmails, conversionRate };
  }
}