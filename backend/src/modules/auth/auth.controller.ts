import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { 
  RegisterDto, 
  LoginDto, 
  RefreshTokenDto, 
  ForgotPasswordDto, 
  ResetPasswordDto, 
  VerifyEmailDto,
  GoogleAuthDto,
  ConnectYouTubeChannelDto,
} from './dto';
import { 
  AuthResponseDto, 
  TokenResponseDto, 
  UserResponseDto, 
  GoogleOAuthUrlResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ============================================

  @Public()
  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account with email and password. Returns JWT tokens on success.'
  })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login with email and password',
    description: 'Authenticates user and returns JWT access and refresh tokens.'
  })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Uses refresh token to generate new access and refresh token pair.'
  })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully', type: TokenResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client should discard tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent if applicable' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  // ============================================
  // GOOGLE OAUTH & YOUTUBE CHANNEL CONNECTION
  // ============================================

  @Public()
  @Get('google/url')
  @ApiOperation({ summary: 'Get Google OAuth URL for authentication' })
  @ApiResponse({ status: 200, description: 'Google OAuth URL', type: GoogleOAuthUrlResponseDto })
  async getGoogleOAuthUrl() {
    return this.authService.getGoogleOAuthUrl();
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback (handled by guard)' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    // The guard handles the OAuth flow and attaches user to request
    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    // In production, you'd handle this differently (e.g., redirect with tokens in query params)
    return res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Complete Google OAuth with authorization code',
    description: 'Exchanges authorization code for tokens and creates/updates user.'
  })
  @ApiResponse({ status: 200, description: 'Google authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid authorization code' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Post('youtube/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Connect YouTube channel using Google OAuth tokens',
    description: 'Stores encrypted OAuth tokens and fetches channel info from YouTube API.'
  })
  @ApiResponse({ status: 201, description: 'Channel connected successfully' })
  @ApiResponse({ status: 409, description: 'Channel already connected to another account' })
  @ApiResponse({ status: 400, description: 'Invalid channel data' })
  async connectYouTubeChannel(
    @CurrentUser('id') userId: string,
    @Body() dto: ConnectYouTubeChannelDto,
  ) {
    return this.authService.connectYouTubeChannel(userId, dto);
  }

  @Get('youtube/channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s connected YouTube channels' })
  @ApiResponse({ status: 200, description: 'List of connected channels' })
  async getUserChannels(@CurrentUser('id') userId: string) {
    return this.authService.getUserChannels(userId);
  }

  @Delete('youtube/channels/:channelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect YouTube channel' })
  @ApiResponse({ status: 200, description: 'Channel disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async disconnectChannel(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const channelId = req.params.channelId;
    return this.authService.disconnectChannel(userId, channelId);
  }

  // ============================================
  // USER PROFILE
  // ============================================

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: UserResponseDto })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { firstName?: string; lastName?: string; avatar?: string },
  ) {
    return this.authService.updateProfile(userId, body);
  }
}