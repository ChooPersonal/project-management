# Xover Management - Project Management Application

A comprehensive project management application built with React, Node.js, Express, and PostgreSQL, featuring team collaboration and shareable project URLs.

## Features

- **Project Management**: Create, edit, and track projects with priorities and statuses
- **Team Collaboration**: Assign team members and manage project access
- **Shareable URLs**: Generate secure links for external project sharing
- **Rich Text Editing**: Advanced project descriptions with file attachments
- **Real-time Updates**: Live collaboration with WebSocket support
- **Authentication**: Secure user registration and login system
- **Admin Panel**: User management and system administration
- **Responsive Design**: Modern UI built with Tailwind CSS and Radix UI

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Express Sessions with bcrypt
- **File Upload**: Multer for attachment handling
- **Email**: SendGrid integration (optional)
- **Notion**: Integration for content import (optional)

## Deployment to DigitalOcean

This application is configured for deployment on DigitalOcean App Platform.

### Prerequisites

1. DigitalOcean account
2. GitHub repository
3. PostgreSQL database (automatically provisioned)

### Deployment Steps

1. **Upload to GitHub**:
   - Create a new repository on GitHub
   - Upload all files from this package
   - Push to the `main` branch

2. **Configure DigitalOcean App**:
   - Go to DigitalOcean App Platform
   - Create new app from GitHub repository
   - Select your repository and `main` branch
   - App configuration is in `.do/app.yaml`

3. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=(auto-configured)
   SESSION_SECRET=(generate random string)
   SENDGRID_API_KEY=(optional)
   NOTION_INTEGRATION_SECRET=(optional)
   NOTION_PAGE_URL=(optional)
   ```

### Build Configuration

- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20.x
- **Port**: 5000

### Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `projects` - Project data with rich content
- `project_descriptions` - Additional project documentation
- `settings` - Application configuration

Database migrations are handled automatically by Drizzle ORM.

## Development

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Configure DATABASE_URL and other variables
   ```

3. Run database migrations:
   ```bash
   npm run db:push
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

## File Structure

```
├── client/               # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages/routes
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── types/        # TypeScript type definitions
│   └── index.html
├── server/               # Express backend application
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   ├── db.ts             # Database connection
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── .do/                  # DigitalOcean configuration
│   └── app.yaml          # App Platform deployment config
├── Dockerfile            # Container configuration
└── package.json          # Dependencies and scripts
```

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection
- SQL injection prevention via ORM
- Secure file upload handling
- Environment variable protection

## Support

For deployment issues or questions, refer to the DigitalOcean App Platform documentation or contact support.

## License

MIT License - see LICENSE file for details.