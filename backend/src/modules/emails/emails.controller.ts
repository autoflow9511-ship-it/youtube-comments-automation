import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EmailsService } from './services/emails.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  CreateEmailSequenceDto, 
  UpdateEmailSequenceDto, 
  SendEmailDto,
  EmailSequenceResponseDto,
  EmailLogResponseDto,
  EmailCaptureResponseDto,
} from './dto/email.dto';
import { EmailStatus } from '@prisma/client';

@ApiTags('Emails')
@Controller('emails')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailsController {
  constructor(private emailsService: EmailsService) {}

  // ============================================
  // EMAIL SEQUENCES
  // ============================================

  @Get('sequences')
  @ApiOperation({ summary: 'Get all email sequences' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of email sequences' })
  async getSequences(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.emailsService.getEmailSequences(userId, { page, limit });
  }

  @Post('sequences')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create email sequence' })
  @ApiResponse({ status: 201, description: 'Email sequence created', type: EmailSequenceResponseDto })
  async createSequence(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmailSequenceDto,
  ) {
    return this.emailsService.createEmailSequence(userId, dto);
  }

  @Get('sequences/:id')
  @ApiOperation({ summary: 'Get email sequence by ID' })
  @ApiParam({ name: 'id', description: 'Sequence ID' })
  @ApiResponse({ status: 200, description: 'Email sequence details' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async getSequence(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const sequence = await this.prisma.emailSequence.findFirst({
      where: { id, userId, deletedAt: null },
      include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
    });

    if (!sequence) throw new NotFoundException('Sequence not found');
    return sequence;
  }

  @Put('sequences/:id')
  @ApiOperation({ summary: 'Update email sequence' })
  @ApiParam({ name: 'id', description: 'Sequence ID' })
  @ApiResponse({ status: 200, description: 'Sequence updated' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async updateSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailSequenceDto,
  ) {
    return this.emailsService.updateEmailSequence(id, userId, dto);
  }

  @Delete('sequences/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete email sequence' })
  @ApiParam({ name: 'id', description: 'Sequence ID' })
  @ApiResponse({ status: 200, description: 'Sequence deleted' })
  @ApiResponse({ status: 404, description: 'Sequence not found' })
  async deleteSequence(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.emailsService.deleteEmailSequence(id, userId);
  }

  @Post('sequences/:id/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll email capture in sequence' })
  @ApiParam({ name: 'id', description: 'Sequence ID' })
  @ApiBody({ schema: { properties: { emailCaptureId: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  async enrollInSequence(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { emailCaptureId: string },
  ) {
    return this.emailsService.enrollInSequence(id, body.emailCaptureId);
  }

  // ============================================
  // EMAIL SENDING
  // ============================================

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a single email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: SendEmailDto,
  ) {
    return this.emailsService.sendEmail({ userId, ...dto });
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiResponse({ status: 200, description: 'Bulk emails sent' })
  async sendBulkEmails(
    @CurrentUser('id') userId: string,
    @Body() body: { emails: Array<{ toEmail: string; subject: string; htmlContent: string; textContent?: string; fromEmail?: string }> },
  ) {
    return this.emailsService.sendBulkEmails(body.emails.map(e => ({ userId, ...e })));
  }

  // ============================================
  // EMAIL LOGS
  // ============================================

  @Get('logs')
  @ApiOperation({ summary: 'Get email logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED'] })
  @ApiQuery({ name: 'emailCaptureId', required: false, type: String })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Email logs' })
  async getLogs(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('emailCaptureId') emailCaptureId?: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    return this.emailsService.getEmailLogs(userId, { page, limit, status: status as any, emailCaptureId, enrollmentId });
  }

  @Get('logs/stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Time period in days (default 30)' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  async getEmailStats(@CurrentUser('id') userId: string, @Query('days') days?: number) {
    return this.emailsService.getEmailStats(userId, days || 30);
  }

  // ============================================
  // EMAIL CAPTURES
  // ============================================

  @Get('captures')
  @ApiOperation({ summary: 'Get email captures' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'automationId', required: false, type: String })
  @ApiQuery({ name: 'landingPageId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Email captures' })
  async getCaptures(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('channelId') channelId?: string,
    @Query('automationId') automationId?: string,
    @Query('landingPageId') landingPageId?: string,
    @Query('search') search?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.emailsService.getEmailCaptures(userId, { page, limit, channelId, automationId, landingPageId, search, fromDate, toDate });
  }

  @Post('captures')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture email (e.g., from landing page submission)' })
  @ApiResponse({ status: 201, description: 'Email captured' })
  async captureEmail(
    @CurrentUser('id') userId: string,
    @Body() body: {
      email: string;
      channelId?: string;
      automationId?: string;
      landingPageId?: string;
      firstName?: string;
      lastName?: string;
      customFields?: Record<string, any>;
      source?: string;
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      utmParams?: Record<string, any>;
    },
  ) {
    return this.emailsService.captureEmail({ userId, ...body });
  }

  @Post('captures/:id/unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe email' })
  @ApiParam({ name: 'id', description: 'Email capture ID' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribe(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const capture = await this.prisma.emailCapture.findFirst({ where: { id, userId } });
    if (!capture) throw new NotFoundException('Email capture not found');
    return this.emailsService.unsubscribeEmail(capture.email, userId);
  }

  @Post('captures/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email' })
  @ApiParam({ name: 'id', description: 'Email capture ID' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verify(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const capture = await this.prisma.emailCapture.findFirst({ where: { id, userId } });
    if (!capture) throw new NotFoundException('Email capture not found');
    return this.emailsService.verifyEmail(capture.email, userId);
  }
}