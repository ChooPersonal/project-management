# Xover Management - Project Management Application

A full-stack project management application built with React, Express.js, and PostgreSQL.

## Features

- Project creation and management
- Team member collaboration
- Rich text descriptions with file attachments
- Real-time comments and mentions
- Timeline and calendar views
- Notion integration for project imports
- Email notifications

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSockets
- **File Upload**: Multer
- **Authentication**: Passport.js with sessions

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Session
SESSION_SECRET=your-session-secret-here

# Email (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key

# Notion Integration (Optional)
NOTION_INTEGRATION_SECRET=your-notion-integration-token
NOTION_PAGE_URL=your-notion-page-url
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run db:push
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Production Deployment

### DigitalOcean App Platform

1. Push your code to GitHub
2. Create a new App on DigitalOcean App Platform
3. Connect your GitHub repository
4. Use the provided `.do/app.yaml` configuration
5. Set up environment variables in the DigitalOcean dashboard
6. Deploy!

### Docker

Build and run with Docker:

```bash
docker build -t xover-management .
docker run -p 5000:5000 --env-file .env xover-management
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run check` - Type check

## License

MIT