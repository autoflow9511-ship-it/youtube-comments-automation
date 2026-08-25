export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  tokenId: string;
}

export interface GoogleProfile {
  id: string;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
  provider: string;
}

export interface YouTubeChannelInfo {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    publishedAt: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
  contentDetails: {
    relatedPlaylists: {
      uploads: string;
    };
  };
}