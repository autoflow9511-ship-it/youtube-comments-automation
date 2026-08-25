import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { LandingPageStatus } from '@prisma/client';
import { StringUtils } from '@common/utils/string.utils';

@Injectable()
export class LandingPagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, params: {
    page?: number;
    limit?: number;
    status?: LandingPageStatus;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId, deletedAt: null };
    if (status) where.status = status;

    const [pages, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return { data: pages, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
      include: { submissions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    if (!page) throw new NotFoundException('Landing page not found');
    return page;
  }

  async create(userId: string, data: {
    channelId?: string;
    name: string;
    title: string;
    description?: string;
    htmlContent: string;
    cssContent?: string;
    jsContent?: string;
    formFields: any[];
    settings?: any;
  }) {
    const slug = StringUtils.generateSlug(data.name);

    return this.prisma.landingPage.create({
      data: {
        userId,
        channelId: data.channelId,
        name: data.name,
        slug,
        title: data.title,
        description: data.description,
        htmlContent: data.htmlContent,
        cssContent: data.cssContent,
        jsContent: data.jsContent,
        formFields: data.formFields,
        settings: data.settings || {},
        status: LandingPageStatus.DRAFT,
      },
    });
  }

  async update(userId: string, id: string, data: any) {
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

  async delete(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found');

    return this.prisma.landingPage.update({
      where: { id },
      data: { deletedAt: new Date(), status: LandingPageStatus.ARCHIVED },
    });
  }

  async publish(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found');

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

  async unpublish(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found');

    return this.prisma.landingPage.update({
      where: { id },
      data: { status: LandingPageStatus.DRAFT, publishUrl: null },
    });
  }

  async submitForm(pageId: string, data: {
    formData: any;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmParams?: any;
  }) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id: pageId, status: LandingPageStatus.PUBLISHED, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found or not published');

    // Create email capture
    const email = data.formData.email;
    if (!email) throw new BadRequestException('Email is required');

    let emailCapture = await this.prisma.emailCapture.findFirst({
      where: { userId: page.userId, email },
    });

    if (!emailCapture) {
      emailCapture = await this.prisma.emailCapture.create({
        data: {
          userId: page.userId,
          channelId: page.channelId,
          landingPageId: page.id,
          email,
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

    // Create submission
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

    // TODO: Trigger email sequence if configured

    return { submission, emailCapture };
  }

  async submitPublicForm(slug: string, formData: Record<string, any>, options: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    utmParams?: Record<string, any>;
  }) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug, status: LandingPageStatus.PUBLISHED, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found or not published');

    return this.submitForm(page.id, {
      formData,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      referrer: options.referrer,
      utmParams: options.utmParams,
    });
  }

  async getSubmissions(userId: string, pageId: string, params: {
    page?: number;
    limit?: number;
  }) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, userId, deletedAt: null },
    });
    if (!page) throw new NotFoundException('Landing page not found');

    const { page: pageNum = 1, limit = 50 } = params;
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
}