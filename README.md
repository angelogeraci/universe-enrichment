# Universe Enrichment Platform

A Next.js application for AI-powered criteria generation and Facebook Marketing API integration for precise advertising targeting.

## Overview

Universe Enrichment is a comprehensive platform that leverages OpenAI to generate intelligent criteria from category lists and integrates with Facebook Marketing API to find relevant advertising interests with similarity scoring.

## Key Features

### 🤖 AI-Powered Criteria Generation
- **OpenAI Integration**: Automatic criteria generation from category hierarchies
- **Intelligent Processing**: Multi-step enrichment with progress tracking
- **Batch Processing**: Configurable batch sizes with pause controls
- **Error Recovery**: Robust error handling and retry mechanisms

### 📊 Facebook Marketing API Integration
- **Interest Discovery**: Find Facebook advertising interests matching your criteria
- **Smart Scoring**: Advanced similarity algorithm with brand/model detection
- **Quality Classification**: Automatic relevance scoring (High/Medium/Low)
- **Audience Estimation**: Country-specific audience size calculations
- **Best Match Detection**: Intelligent selection of optimal interests

### 🎯 Project Management
- **Project Creation**: Multi-step wizard with country and category selection
- **Progress Tracking**: Real-time enrichment progress with ETA calculations
- **Bulk Operations**: Multiple criteria selection and batch actions
- **Export Capabilities**: XLSX export with full data and suggestions

### 📋 Category Management
- **Hierarchical Categories**: Support for complex category structures
- **AND Criteria**: Optional additional criteria per category
- **Category Lists**: Reusable category templates
- **Public/Private**: Visibility control for shared category lists

### 🔧 Administration
- **Settings Control**: Facebook API rate limiting and scoring thresholds
- **Prompt Management**: Customizable OpenAI prompt templates
- **Logs Monitoring**: Detailed enrichment logs and debugging
- **User Management**: Role-based access control (Admin/User)

## Technology Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **UI Components**: Tailwind CSS + Shadcn/ui
- **API Integration**: OpenAI GPT-4, Facebook Marketing API
- **Testing**: Jest + React Testing Library + Cypress E2E
- **Deployment**: Cloudflare Pages (recommended) or Vercel

## Environment Variables

```bash
# Database
DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require&connect_timeout=60"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Facebook Marketing API
FACEBOOK_ACCESS_TOKEN="your-facebook-access-token"
```

## Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd universe-enrichment
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Database setup**
```bash
npx prisma migrate deploy
npx prisma generate
```

5. **Create admin user** (optional)
```bash
node scripts/create-user.js
```

6. **Start development server**
```bash
npm run dev
```

## API Documentation

### Core Endpoints

- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Enrichment Endpoints

- `POST /api/enrichment` - Start project enrichment
- `GET /api/projects/slug/[slug]/progress` - Get enrichment progress
- `PUT /api/projects/slug/[slug]/control` - Control enrichment (pause/resume/cancel)

### Facebook Integration

- `POST /api/facebook/suggestions` - Get Facebook interest suggestions
- `POST /api/facebook/suggestions/[critereId]` - Get suggestions for specific criteria

### Admin Endpoints

- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings
- `GET /api/admin/logs` - Get enrichment logs

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── app/               # Main application pages
│   ├── login/             # Authentication
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI components (Shadcn)
│   └── *.tsx             # Feature components
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── hooks/                # React hooks

prisma/
├── migrations/           # Database migrations
└── schema.prisma        # Database schema

cypress/
├── e2e/                 # End-to-end tests
└── support/             # Test utilities
```

## Testing

### Unit Tests
```bash
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### E2E Tests
```bash
npm run cypress:open      # Interactive mode
npm run test:e2e          # Headless mode
```

### All Tests
```bash
npm run test:all          # Run all tests
```

## Deployment

### Cloudflare Pages (Recommended)

1. **Push to GitHub** (already done)
2. **Connect to Cloudflare Pages**
3. **Set build configuration**:
   - Build command: `npm run build`
   - Output directory: `.next`
   - Node.js version: `18`
4. **Add environment variables** in Cloudflare dashboard
5. **Deploy**

### Vercel (Alternative)

1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

## Facebook API Setup

1. **Create Facebook App** at [developers.facebook.com](https://developers.facebook.com)
2. **Add Marketing API** product
3. **Generate Access Token** with appropriate permissions
4. **Add token to environment variables**

For detailed setup instructions, see `FACEBOOK_SETUP.md`.

## Scoring Algorithm

The Facebook interest scoring system uses a sophisticated algorithm:

- **Textual Similarity** (25%): String matching and semantic similarity
- **Contextual Score** (25%): Relevance to search context
- **Brand Score** (30%): Prioritizes brands over specific models
- **Audience Score** (15%): Considers audience size
- **Interest Type** (5%): Interest category weighting

### Quality Thresholds

- 🟢 **Very High** (≥80%): Perfect match - auto-select recommended
- 🟡 **High** (≥60%): Very good match - recommended
- 🟠 **Medium** (≥30%): Acceptable match - review recommended
- 🔴 **Low** (15-29%): Doubtful match - **NOT RELEVANT**
- ⚫ **Non-relevant** (<15%): No match - **REJECTED**

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## Support

For technical support or questions:
- Create an issue in the GitHub repository
- Check the admin logs for detailed error information
- Review the Facebook API documentation for integration issues

## License

This project is proprietary software. All rights reserved.
