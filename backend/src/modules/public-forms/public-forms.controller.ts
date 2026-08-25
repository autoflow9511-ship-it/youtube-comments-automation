import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { Request } from 'express';
import { PublicFormsService } from './public-forms.service';
import { CreatePublicFormDto, UpdatePublicFormDto, SubmitFormDto, PublicFormResponseDto } from './dto/public-form.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '@modules/auth/guards/optional-jwt-auth.guard';

@ApiTags('Public Forms')
@Controller('forms')
export class PublicFormsController {
  constructor(private publicFormsService: PublicFormsService) {}

  // ============================================
  // PRIVATE FORM MANAGEMENT (requires auth)
  // ============================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new public form' })
  @ApiResponse({ status: 201, description: 'Form created successfully' })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  async createForm(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePublicFormDto,
  ) {
    return this.publicFormsService.createPublicForm(userId, dto.automationId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all forms for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of forms' })
  async getForms(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.publicFormsService.getUserForms(userId, { page, limit, status });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get form by ID' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form details' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getForm(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.publicFormsService.getPublicFormById(userId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form updated successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async updateForm(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePublicFormDto,
  ) {
    return this.publicFormsService.updateForm(userId, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form published successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async publishForm(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.publicFormsService.publishForm(userId, id);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form unpublished successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async unpublishForm(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.publicFormsService.unpublishForm(userId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete form' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form deleted successfully' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async deleteForm(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.publicFormsService.deleteForm(userId, id);
  }

  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get form submissions' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'deliveryStatus', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getSubmissions(
    @CurrentUser('id') userId: string,
    @Param('id') formId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('deliveryStatus') deliveryStatus?: string,
  ) {
    return this.publicFormsService.getFormSubmissions(userId, formId, { page, limit, deliveryStatus });
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get form statistics' })
  @ApiParam({ name: 'id', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form statistics' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getStats(@CurrentUser('id') userId: string, @Param('id') formId: string) {
    return this.publicFormsService.getFormStats(userId, formId);
  }

  // ============================================
  // PUBLIC FORM ENDPOINTS (no auth required)
  // ============================================

@Get('public/:publicFormId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get public form by slug' })
  @ApiParam({ name: 'publicFormId', description: 'Public form slug' })
  @ApiResponse({ status: 200, description: 'Form HTML content' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  async getPublicForm(
    @Param('publicFormId') publicFormId: string,
    @Req() req: Request,
  ) {
    const form = await this.publicFormsService.getPublicFormByPublicId(publicFormId);
    
    // Return form data for frontend rendering
    return {
      id: form._id,
      publicFormId: form.publicFormId,
      title: form.title,
      description: form.description,
      logoUrl: form.logoUrl,
      heading: form.heading,
      formDescription: form.formDescription,
      emailPlaceholder: form.emailPlaceholder,
      submitButtonText: form.submitButtonText,
      successMessage: form.successMessage,
      errorMessage: form.errorMessage,
      privacyConsentText: form.privacyConsentText,
      privacyPolicyUrl: form.privacyPolicyUrl,
      requireConsent: form.requireConsent,
    };
  }

  @Post('public/:publicFormId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit public form' })
  @ApiParam({ name: 'publicFormId', description: 'Public form slug' })
  @ApiResponse({ status: 200, description: 'Form submitted successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 409, description: 'Email already submitted for this automation' })
  async submitPublicForm(
    @Param('publicFormId') publicFormId: string,
    @Body() dto: SubmitFormDto,
    @Req() req: Request,
  ) {
    return this.publicFormsService.submitForm(publicFormId, dto, req);
  }
}