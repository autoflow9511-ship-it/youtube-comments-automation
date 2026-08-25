import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile extends Profile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
  provider: string;
  _json: {
    sub: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
  };
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    const user = {
      provider: 'google',
      providerId: profile.id,
      accessToken,
      refreshToken,
      email: profile.emails[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      avatar: profile.photos[0]?.value,
      emailVerified: profile.emails[0]?.verified,
    };

    done(null, user);
  }
}