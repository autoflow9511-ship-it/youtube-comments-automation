import { IsString, IsOptional, IsEmail, IsBoolean, IsArray, IsObject, IsUrl, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicFormDto {
  @ApiProperty({ example: 'PDF Download Form' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Get Your Free PDF' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Enter your email to get the PDF' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'Enter your email to get the PDF' })
  @IsOptional()
  @IsString()
  heading?: string;

  @ApiPropertyOptional({ example: 'We will send the PDF to your email' })
  @IsOptional()
  @IsString()
  formDescription?: string;

  @ApiPropertyOptional({ example: 'Enter your email' })
  @IsOptional()
  @IsString()
  emailPlaceholder?: string;

  @ApiPropertyOptional({ example: 'Get PDF' })
  @IsOptional()
  @IsString()
  submitButtonText?: string;

  @ApiPropertyOptional({ example: 'Check your email for the PDF!' })
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiPropertyOptional({ example: 'Something went wrong. Please try again.' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ example: 'I agree to receive emails' })
  @IsOptional()
  @IsString()
  privacyConsentText?: string;

  @ApiPropertyOptional({ example: 'https://example.com/privacy' })
  @IsOptional()
  @IsUrl()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requireConsent?: boolean;

  @ApiPropertyOptional({ example: 'email' })
  @IsOptional()
  @IsString()
  emailInputType?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailValidationEnabled?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['gmail.com', 'yahoo.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];

  @ApiPropertyOptional({ type: [String], example: ['tempmail.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedEmailDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdatePublicFormDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heading?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailPlaceholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitButtonText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  privacyConsentText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireConsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailInputType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailValidationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedEmailDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedEmailDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customDomain?: string;
}

export class SubmitFormDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  utmParams?: Record<string, any>;
}

export class PublicFormResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  publicFormId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  heading?: string;

  @ApiPropertyOptional()
  formDescription?: string;

  @ApiPropertyOptional()
  emailPlaceholder?: string;

  @ApiPropertyOptional()
  submitButtonText?: string;

  @ApiPropertyOptional()
  successMessage?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  privacyConsentText?: string;

  @ApiPropertyOptional()
  privacyPolicyUrl?: string;

  @ApiProperty()
  requireConsent: boolean;

  @ApiProperty()
  emailInputType: string;

  @ApiProperty()
  emailValidationEnabled: boolean;

  @ApiPropertyOptional()
  allowedEmailDomains?: string[];

  @ApiPropertyOptional()
  blockedEmailDomains?: string[];

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  publicUrl?: string;

  @ApiPropertyOptional()
  customDomain?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}