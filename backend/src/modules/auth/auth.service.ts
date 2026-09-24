import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { RefreshTokenPayload } from './strategies/jwt-refresh.strategy';
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
import { UserRole, SubscriptionTier, ChannelStatus } from '@prisma/client';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {}

  // ============================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ============================================

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = this.encryptionService.generateRandomString(32);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerificationToken,
        role: UserRole.USER,
        subscriptionTier: SubscriptionTier.FREE,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // TODO: Send verification email
    // await this.sendVerificationEmail(user.email, emailVerificationToken);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // In a production app, you would blacklist the refresh token
    // For now, we just return success (client should delete tokens)
    return { message: 'Logged out successfully' };
  }

  // ============================================
  // EMAIL VERIFICATION
  // ============================================

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return { message: 'If the email exists and is not verified, a verification email has been sent' };
    }

    const emailVerificationToken = this.encryptionService.generateRandomString(32);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken },
    });

    // TODO: Send verification email
    // await this.sendVerificationEmail(user.email, emailVerificationToken);

    return { message: 'If the email exists and is not verified, a verification email has been sent' };
  }

  // ============================================
  // PASSWORD RESET
  // ============================================

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.encryptionService.generateRandomString(32);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Send password reset email
    // await this.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  // ============================================
  // GOOGLE OAUTH & YOUTUBE CHANNEL CONNECTION
  // ============================================

  async googleAuth(dto: GoogleAuthDto) {
    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );

    const { tokens } = await oauth2Client.getToken(dto.code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      throw new UnauthorizedException('Email not provided by Google');
    }

    let user = await this.prisma.user.findFirst({
      where: { email: profile.email },
    });

    if (user) {
      // Update existing user with Google info if needed
      if (!user.avatar && profile.picture) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: profile.picture },
        });
      }
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          avatar: profile.picture,
          isEmailVerified: true,
          role: UserRole.USER,
          subscriptionTier: SubscriptionTier.FREE,
        },
      });
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account deactivated');
    }

    const authTokens = await this.generateTokens(user.id, user.email, user.role);

    // Store Google tokens for YouTube API access
    // This will be handled by the channel connection flow

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
      ...authTokens,
    };
  }

  async getGoogleOAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const state = this.encryptionService.generateRandomString(16);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
    });

    return { url, state };
  }

  async connectYouTubeChannel(userId: string, dto: ConnectYouTubeChannelDto) {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_CALLBACK_URL'),
    );

    oauth2Client.setCredentials({
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
    });

    // Verify the channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [dto.channelInfo.id],
    });

    const channelData = channelResponse.data.items?.[0];
    if (!channelData) {
      throw new BadRequestException('Invalid YouTube channel');
    }

    // Check if channel already connected
    const existingChannel = await this.prisma.channel.findUnique({
      where: { youtubeChannelId: channelData.id },
    });

    if (existingChannel) {
      if (existingChannel.userId !== userId) {
        throw new ConflictException('Channel already connected to another account');
      }
      // Update existing channel
      return this.updateChannelTokens(existingChannel.id, dto.accessToken, dto.refreshToken, dto.tokenExpiresAt);
    }

    // Create new channel
    const encryptedAccessToken = this.encryptionService.encrypt(dto.accessToken);
    const encryptedRefreshToken = this.encryptionService.encrypt(dto.refreshToken);

    return this.prisma.channel.create({
      data: {
        userId,
        youtubeChannelId: channelData.id,
        title: channelData.snippet?.title || 'Unknown Channel',
        description: channelData.snippet?.description,
        customUrl: channelData.snippet?.customUrl,
        thumbnailUrl: channelData.snippet?.thumbnails?.high?.url || channelData.snippet?.thumbnails?.default?.url,
        subscriberCount: parseInt(channelData.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channelData.statistics?.videoCount || '0'),
        viewCount: BigInt(channelData.statistics?.viewCount || '0'),
        status: ChannelStatus.CONNECTED,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(dto.tokenExpiresAt),
        scope: dto.scope,
      },
    });
  }

  private async updateChannelTokens(channelId: string, accessToken: string, refreshToken: string, tokenExpiresAt: string) {
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
    const encryptedRefreshToken = this.encryptionService.encrypt(refreshToken);

    return this.prisma.channel.update({
      where: { id: channelId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(tokenExpiresAt),
        status: ChannelStatus.CONNECTED,
        syncError: null,
      },
    });
  }

  async getUserChannels(userId: string) {
    return this.prisma.channel.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async disconnectChannel(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId },
    });

    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: {
        status: ChannelStatus.DISCONNECTED,
        deletedAt: new Date(),
      },
    });
  }

  // ============================================
  // USER PROFILE
  // ============================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        subscriptionTier: true,
        subscriptionExpiresAt: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        subscriptionTier: true,
        isEmailVerified: true,
      },
    });

    return user;
  }

  // ============================================
  // TOKEN GENERATION
  // ============================================

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return user;
  }
}