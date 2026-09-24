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
  Res,
  Req,
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
import { Request, Response } from 'express';
import { LandingPagesService } from './services/landing-pages.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@modules/auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { LandingPageStatus } from '@prisma/client';

@ApiTags('Landing Pages')
@Controller('landing-pages')
export class LandingPagesController {
  constructor(
    private landingPagesService: LandingPagesService,
  ) {}

  // ============================================
  // PRIVATE LANDING PAGE MANAGEMENT (requires auth)
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all landing pages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: LandingPageStatus })
  @ApiResponse({ status: 200, description: 'List of landing pages' })
  async getLandingPages(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: LandingPageStatus,
  ) {
    return this.landingPagesService.findAll(userId, { page, limit, status });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create landing page' })
  @ApiResponse({ status: 201, description: 'Landing page created' })
  async createLandingPage(
    @CurrentUser('id') userId: string,
    @Body() body: {
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
    },
  ) {
    return this.landingPagesService.create(userId, body);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get landing page by ID' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page details' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async getLandingPage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.landingPagesService.findById(userId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update landing page' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page updated' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async updateLandingPage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.landingPagesService.update(userId, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete landing page' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page deleted' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async deleteLandingPage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.landingPagesService.delete(userId, id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish landing page' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page published' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async publishLandingPage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.landingPagesService.publish(userId, id);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish landing page' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page unpublished' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async unpublishLandingPage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.landingPagesService.unpublish(userId, id);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get landing page submissions' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getSubmissions(
    @CurrentUser('id') userId: string,
    @Param('id') pageId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.landingPagesService.getSubmissions(userId, pageId, { page, limit });
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get landing page statistics' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page statistics' })
  async getStats(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.landingPagesService.getLandingPageStats(userId, id);
  }

  // ============================================
  // PUBLIC LANDING PAGE ENDPOINTS (no auth required)
  // ============================================

  @Get('public/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get public landing page by slug' })
  @ApiParam({ name: 'slug', description: 'Landing page slug' })
  @ApiResponse({ status: 200, description: 'Rendered landing page HTML' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async getPublicLandingPage(
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    const { page, html } = await this.landingPagesService.getPublicLandingPage(slug);
    
    // Set proper headers for HTML rendering
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    return res.send(html);
  }

  @Post('public/:slug/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit landing page form (public)' })
  @ApiParam({ name: 'slug', description: 'Landing page slug' })
  @ApiBody({ schema: { properties: { formData: { type: 'object' }, utmParams: { type: 'object' } } } })
  @ApiResponse({ status: 200, description: 'Form submitted successfully' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async submitPublicForm(
    @Param('slug') slug: string,
    @Body() body: { formData: Record<string, any>; utmParams?: Record<string, any> },
    @Req() req: Request,
  ) {
    return this.landingPagesService.submitPublicForm(slug, body.formData, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
      utmParams: body.utmParams,
    });
  }
}