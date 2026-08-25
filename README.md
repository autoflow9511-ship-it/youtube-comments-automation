# YouTube Automation SaaS

A ManyChat-like SaaS platform for YouTube comment automation with email capture and follow-up sequences.

## Features

- **User Authentication**: JWT-based auth with Google OAuth 2.0
- **YouTube Integration**: Connect channels via OAuth, fetch comments, reply automatically
- **Automation Builder**: Visual rule builder with triggers and actions
- **Email Capture**: Landing pages with forms to collect emails
- **Email Sequences**: Automated follow-up emails with custom templates
- **Analytics Dashboard**: Real-time stats on channels, automations, comments, emails
- **Admin Panel**: User management, system monitoring, audit logs
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- TanStack Query (React Query)
- React Router v6
- React Hook Form + Zod
- Headless UI
- Recharts

### Backend
- NestJS (Node.js)
- TypeScript
- **PostgreSQL with Prisma ORM** (Primary)
- **MongoDB with Mongoose** (Alternative/Analytics)
- JWT + Google OAuth 2.0 (Passport.js)
- BullMQ (Redis) for background jobs
- Nodemailer for emails
- Swagger/OpenAPI documentation

### Infrastructure
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+
- Docker + Docker Compose

## Project Structure

```
youtube-automation-saas/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── users/       # User management
│   │   │   ├── channels/    # YouTube channels
│   │   │   ├── automations/ # Automation rules
│   │   │   ├── comments/    # Comment management
│   │   │   ├── emails/      # Email capture & sequences
│   │   │   ├── landing-pages/ # Landing page builder
│   │   │   ├── webhooks/    # YouTube webhooks
│   │   │   ├── analytics/   # Analytics & reporting
│   │   │   ├── admin/       # Admin panel
│   │   │   └── notifications/ # Notifications
│   │   ├── common/          # Shared utilities
│   │   ├── config/          # Configuration
│   │   ├── database/        # Prisma schema & migrations
│   │   ├── guards/          # Auth guards
│   │   ├── decorators/      # Custom decorators
│   │   └── interfaces/      # TypeScript interfaces
│   └── prisma/              # Prisma schema
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   ├── utils/           # Utilities
│   │   ├── types/           # TypeScript types
│   │   ├── styles/          # Global styles
│   │   └── layouts/         # Page layouts
├── docs/                    # Documentation
└── docker-compose.yml       # Development environment
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (Primary database)
- MongoDB 7+ (Alternative/Analytics database)
- Redis 7+
- Google Cloud Console project with YouTube Data API v3 enabled

### Development Setup

1. Clone the repository
2. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Configure environment variables in `.env` files

4. Start with Docker Compose:
   ```bash
   docker-compose up -d
   ```

5. Run database migrations:
   ```bash
   cd backend
   npm run prisma:migrate
   # For MongoDB (optional):
   npm run mongo:migrate
   npm run mongo:seed
   ```

6. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/docs
   - MongoDB: mongodb://localhost:27017

### Manual Setup (without Docker)

1. Start PostgreSQL and Redis locally
2. Backend:
   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run start:dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/youtube_automation
MONGODB_URI=mongodb://localhost:27017/youtube_automation
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
ENCRYPTION_KEY=32-character-encryption-key-here
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/google/callback`
6. Add required scopes:
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

## API Documentation

API documentation is available at `/docs` when running the backend (Swagger UI).

## Database Schema

### PostgreSQL (Primary - Prisma)
Key models:
- **User** - Authentication, profile, subscription
- **Channel** - YouTube channel connection
- **Automation** - Automation rules (trigger + actions)
- **Comment** - YouTube comments
- **EmailCapture** - Emails collected from landing pages
- **EmailSequence** - Automated email sequences
- **LandingPage** - Custom landing pages

See `backend/src/database/schema.prisma` for full schema.

### MongoDB (Alternative - Mongoose)
Key collections:
- **users** - Authentication, profile, subscription
- **channels** - YouTube channel connections
- **automations** - Automation rules with embedded actions
- **comments** - YouTube comments with replies
- **email_captures** - Emails collected from landing pages
- **email_sequences** - Automated email sequences with steps
- **landing_pages** - Custom landing pages with submissions
- **webhook_events** - YouTube webhook events
- **analytics_events** - Event tracking for analytics
- **notifications** - User notifications
- **audit_logs** - Admin audit trail
- **automation_executions** - Automation execution logs

See `backend/src/database/mongodb/schemas/` for full schemas.

**Key differences:**
- MongoDB uses embedded documents for actions/steps (better read performance)
- PostgreSQL uses foreign keys for strict relational integrity
- MongoDB has TTL indexes for auto-cleanup of old events
- MongoDB text indexes for full-text search

## Deployment

### Production Checklist
- [ ] Set strong JWT secrets
- [ ] Configure production database (PostgreSQL + MongoDB)
- [ ] Set up Redis with persistence
- [ ] Configure SMTP for emails
- [ ] Verify Google OAuth app
- [ ] Set up SSL certificates
- [ ] Configure domain
- [ ] Set up monitoring (Sentry, Prometheus)
- [ ] Configure backups (PostgreSQL + MongoDB)
- [ ] Load test

### MongoDB Commands

```bash
# Run all pending migrations
npm run mongo:migrate

# Run migrations up to specific version
npm run mongo:migrate 003

# Rollback a migration
npm run mongo:migrate:down 003

# Check migration status
npm run mongo:migrate:status

# Seed database
npm run mongo:seed

# Seed test data
npm run mongo:seed:test

# Create new migration
npx ts-node src/database/mongodb/migrations/cli.ts create "add new feature"
```

## License

MIT