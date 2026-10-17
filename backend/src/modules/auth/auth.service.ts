import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
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
import { UserRole, SubscriptionTier, ChannelStatus } from '@database/prisma-compat';
import { google } from 'googleapis';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

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

  // Private installation: user provisioning must happen through a separately
  // authenticated, audited admin workflow. Never accept public registrations.
  async register(_dto: RegisterDto) {
    throw new ForbiddenException('Public registration is disabled');
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash || user.approvedByAdmin !== true) {
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
          approvedByAdmin: true,
        },
      });

      if (!user || user.deletedAt || user.approvedByAdmin !== true) {
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
    // A reset token must never be generated unless a delivery provider is configured.
    // The previous implementation returned a false success without sending an email.
    throw new ServiceUnavailableException('Password reset email delivery is not configured');
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

  private oauthStateSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('OAuth security configuration unavailable');
    return secret;
  }

  private verifyOAuthState(state?: string): void {
    const parts = (state || '').split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid OAuth state');
    const [issuedAt, nonce, mac] = parts;
    if (!/^\d{13}$/.test(issuedAt) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac))
      throw new UnauthorizedException('Invalid OAuth state');
    const age = Date.now() - Number(issuedAt);
    if (age < 0 || age > 5 * 60 * 1000) throw new UnauthorizedException('Expired OAuth state');
    const expected = createHmac('sha256', this.oauthStateSecret()).update(issuedAt + '.' + nonce).digest();
    if (!timingSafeEqual(expected, Buffer.from(mac, 'hex'))) throw new UnauthorizedException('Invalid OAuth state');
  }

  private getGoogleRedirectUri() {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://youtube-comments-automation.vercel.app';
    return `${frontendUrl.replace(/\/$/, '')}/auth/callback`;
  }

  async googleAuth(dto: GoogleAuthDto) {
    this.verifyOAuthState(dto.state);
    // Exchange authorization code using the same redirect URI as the authorization request.
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.getGoogleRedirectUri(),
    );

    const { tokens } = await oauth2Client.getToken(dto.code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email || !profile.verified_email || !profile.id) {
      throw new UnauthorizedException('Email not provided by Google');
    }

    let user = await this.prisma.user.findFirst({
      where: { email: profile.email.toLowerCase() },
    });

    if (user) {
      if (user.deletedAt || user.approvedByAdmin !== true || !user.isEmailVerified ||
          (user.googleSubjectId && user.googleSubjectId !== profile.id)) {
        throw new UnauthorizedException('Access denied');
      }
      // Bind the Google subject once; never replace an existing binding.
      const binding = await this.prisma.getCollection('user').updateOne(
        { id: user.id, deletedAt: null, approvedByAdmin: true,
          $or: [{ googleSubjectId: { $exists: false } }, { googleSubjectId: null }, { googleSubjectId: profile.id }] },
        { $set: { googleSubjectId: profile.id } },
      );
      if (binding.matchedCount !== 1) throw new UnauthorizedException('Access denied');
      // Update existing user with Google info if needed
      if (!user.avatar && profile.picture) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: profile.picture },
        });
      }
    } else {
      // Google identity alone never provisions a private-site account.
      throw new UnauthorizedException('Access denied');
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
      this.getGoogleRedirectUri(),
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const unsignedState = Date.now().toString() + '.' + randomBytes(16).toString('hex');
    const state = unsignedState + '.' + createHmac('sha256', this.oauthStateSecret()).update(unsignedState).digest('hex');

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