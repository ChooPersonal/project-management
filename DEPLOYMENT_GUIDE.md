# DigitalOcean Deployment Guide

## Quick Start

1. **Upload to GitHub**
   - Create a new repository on GitHub
   - Upload all files from this package
   - Ensure the repository is public or you have proper access configured

2. **Create DigitalOcean App**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect GitHub and select your repository
   - Choose the `main` branch
   - The app will automatically use the configuration from `.do/app.yaml`

3. **Configure Environment Variables**
   In the DigitalOcean dashboard, add these environment variables:

   **Required:**
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: Generate a random 32+ character string

   **Optional (for enhanced features):**
   - `SENDGRID_API_KEY`: For email functionality
   - `NOTION_INTEGRATION_SECRET`: For Notion integration
   - `NOTION_PAGE_URL`: For Notion content import

4. **Deploy**
   - Click "Create Resources"
   - Wait for build and deployment to complete
   - Your app will be available at the provided URL

## Build Process

The deployment will automatically:
1. Install dependencies with `npm ci`
2. Build the frontend and backend with `npm run build`
3. Start the application with `npm start`
4. Create and connect the PostgreSQL database
5. Run database migrations on first startup

## Troubleshooting

### Common Issues

**Build Failures:**
- Ensure all dependencies are in `package.json`
- Check build logs for specific error messages
- Verify import paths are correct (no missing files)

**Database Connection:**
- Database URL is automatically configured
- Check environment variables in app settings
- Verify database is properly provisioned

**Environment Variables:**
- SESSION_SECRET must be set for authentication
- Optional variables can be added later if needed

### Support Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Node.js Deployment Guide](https://docs.digitalocean.com/products/app-platform/languages-frameworks/nodejs/)
- [Database Configuration](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/)

## Cost Estimation

- **App Instance**: $5-12/month (depending on size)
- **PostgreSQL Database**: $15/month (Basic plan)
- **Total**: ~$20-27/month

## Post-Deployment

After successful deployment:
1. Access your application via the provided URL
2. Create the first admin user account
3. Configure application settings
4. Invite team members
5. Start creating projects

The application includes user approval workflow, so initial users may need admin approval before full access.