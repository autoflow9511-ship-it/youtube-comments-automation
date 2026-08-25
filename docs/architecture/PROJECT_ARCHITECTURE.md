# YouTube Automation SaaS - Project Architecture

## Overview
A ManyChat-like SaaS platform for YouTube comment automation with email capture and follow-up sequences.

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **UI Components**: Headless UI + Custom components
- **Build Tool**: Vite

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Google OAuth 2.0 (Passport.js)
- **Email**: Nodemailer (SMTP)
- **Queue**: BullMQ (Redis) for background jobs
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI

### Infrastructure
- **Database**: PostgreSQL 15+
- **Cache/Queue**: Redis 7+
- **Storage**: AWS S3 / Local for file uploads
- **Deployment**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   (React)       │     │   (NestJS)      │     │   Database      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐ ┌───────────┐ ┌──────────┐
              │  Redis  │ │   YouTube │ │   SMTP   │
              │ (Cache/ │ │   API     │ │  Server  │
              │ Queue)  │ │           │ │          │
              └─────────┘ └───────────┘ └──────────┘
```

## Module Structure

### Backend Modules
```
src/
├── modules/
│   ├── auth/              # Authentication (JWT, Google OAuth, Refresh tokens)
│   ├── users/             # User management, profiles, subscriptions
│   ├── channels/          # YouTube channel connection & management
│   ├── automations/       # Automation rules builder & execution
│   ├── comments/          # Comment fetching, processing, replies
│   ├── emails/            # Email capture, sequences, sending
│   ├── landing-pages/     # Landing page builder & hosting
│   ├── webhooks/          # YouTube webhook handling (PubSubHubbub)
│   ├── analytics/         # Statistics, reporting, dashboards
│   ├── admin/             # Admin panel, user management, monitoring
│   └── notifications/     # In-app notifications, email notifications
├── common/                # Shared utilities, exceptions, filters, pipes
├── config/                # Configuration management
├── database/              # Prisma schema, migrations, seeds
├── guards/                # Auth guards, role guards
├── decorators/            # Custom decorators (CurrentUser, Roles, etc.)
├── interfaces/            # Shared TypeScript interfaces
└── utils/                 # Helper functions
```

### Frontend Structure
```
src/
├── components/
│   ├── ui/                # Reusable UI components (Button, Input, Modal, etc.)
│   ├── forms/             # Form components with validation
│   ├── charts/            # Chart components for analytics
│   └── automation-builder/# Visual automation flow builder
├── pages/
│   ├── auth/              # Login, Register, OAuth callback
│   ├── dashboard/         # Main dashboard with stats
│   ├── automations/       # Automation list, builder, details
│   ├── channels/          # Channel connection, management
│   ├── landing-pages/     # Landing page builder, list
│   ├── analytics/         # Detailed analytics views
│   ├── admin/             # Admin panel pages
│   └── settings/          # User settings, billing
├── layouts/               # Page layouts (AuthLayout, DashboardLayout)
├── hooks/                 # Custom React hooks
├── contexts/              # React contexts (Auth, Theme, etc.)
├── services/              # API services, API client
├── utils/                 # Helper functions
├── types/                 # TypeScript types
└── styles/                # Global styles, Tailwind config
```

## Database Schema (Prisma)

### Core Models
- **User** - Authentication, profile, subscription
- **Channel** - YouTube channel connection (OAuth tokens)
- **Automation** - Automation rules (trigger + actions)
- **AutomationAction** - Individual actions within automation
- **Comment** - YouTube comments fetched via API/webhook
- **CommentReply** - Replies sent by automations
- **EmailCapture** - Emails collected from landing pages
- **EmailSequence** - Automated email sequences
- **EmailLog** - Sent email tracking
- **LandingPage** - Custom landing pages
- **LandingPageSubmission** - Form submissions
- **AnalyticsEvent** - Event tracking for analytics
- **WebhookEvent** - Incoming webhook logs
- **Notification** - User notifications
- **AuditLog** - Admin audit trail

## Authentication Flow

### JWT Token Strategy
- **Access Token**: 15 minutes, RS256, stored in memory
- **Refresh Token**: 7 days, HTTP-only cookie, rotation enabled
- **Google OAuth**: PKCE flow, state parameter for CSRF protection

### Role-Based Access Control
- **USER** - Standard user, manages own channels/automations
- **ADMIN** - Full system access, user management
- **SUPER_ADMIN** - System configuration, audit logs

## YouTube Integration

### OAuth Scopes Required
- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/youtube.force-ssl` (for replies)
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

### Comment Processing
1. **PubSubHubbub Webhook** - Real-time comment notifications
2. **Polling Fallback** - Periodic API polling for reliability
3. **Keyword Matching** - Trigger automations on keyword match
4. **Rate Limiting** - Respect YouTube API quotas

## Automation Engine

### Trigger Types
- **Comment Keyword** - Match keywords in new comments
- **Comment Regex** - Advanced pattern matching
- **New Video** - Trigger on new video upload
- **Channel Milestone** - Subscriber count milestones

### Action Types
- **Reply to Comment** - Post reply via YouTube API
- **Send Landing Page Link** - DM or reply with link
- **Collect Email** - Show landing page form
- **Send Email** - Trigger email sequence
- **Add Tag** - Tag user for segmentation
- **Webhook** - Call external webhook

### Execution Flow
```
New Comment → Keyword Match → Queue Job → Execute Actions → Log Result
```

## Email System

### Providers
- SMTP (configurable per user or system-wide)
- Support for SendGrid, Mailgun, Amazon SES via SMTP

### Features
- Template system with variables
- Sequence builder (delay, conditions)
- Open/click tracking
- Unsubscribe management
- Bounce/complaint handling

## Security Considerations

### Data Protection
- Encrypt OAuth tokens at rest (AES-256)
- HTTPS everywhere
- CORS configured per environment
- Rate limiting on all endpoints
- Input validation & sanitization
- SQL injection prevention (Prisma)

### Compliance
- GDPR: Data export, deletion, consent
- CAN-SPAM: Unsubscribe in emails
- YouTube API Terms of Service

## Scalability Strategy

### Horizontal Scaling
- Stateless API servers
- Redis for session/cache
- BullMQ workers for background jobs
- Database read replicas

### Background Jobs
- Comment fetching & processing
- Email sending
- Webhook delivery
- Analytics aggregation
- Token refresh

## Monitoring & Observability

- **Logging**: Winston (structured JSON logs)
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Error Tracking**: Sentry
- **Health Checks**: Kubernetes-ready endpoints

## Development Workflow

### Environment Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Docker Compose (Production-like)
```yaml
services:
  postgres:
    image: postgres:15
  redis:
    image: redis:7
  backend:
    build: ./backend
  frontend:
    build: ./frontend
```

## API Versioning
- URL versioning: `/api/v1/`
- Deprecation policy: 6 months notice
- Changelog maintained in docs/api/CHANGELOG.md

## Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] SMTP credentials verified
- [ ] YouTube OAuth app verified
- [ ] Redis persistence configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured
- [ ] Load testing completed