# Final Deployment Steps for DigitalOcean

## 1. Push to GitHub (Run these commands in your terminal)

```bash
git remote add origin https://github.com/ChooPersonal/project-management
git add .
git commit -m "Ready for DigitalOcean deployment"
git push -u origin main
```

## 2. DigitalOcean App Platform Setup

1. **Go to DigitalOcean**: https://cloud.digitalocean.com/apps
2. **Create App**: Click "Create App"
3. **Connect GitHub**: 
   - Choose "GitHub" as source
   - Authorize DigitalOcean to access your repositories
   - Select: `ChooPersonal/project-management`
   - Branch: `main`

## 3. App Configuration (Auto-detected)

DigitalOcean will automatically detect:
- **Type**: Node.js application
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Port**: 5000

## 4. Add Database

In the Resources section:
- Click "Add Database"
- **Type**: PostgreSQL
- **Plan**: Basic ($15/month)
- **Version**: 15
- **Name**: Leave as `db`

## 5. Environment Variables

Add these in the Environment Variables section:

**Required:**
```
NODE_ENV=production
SESSION_SECRET=your-random-32-char-string-here
DATABASE_URL=${db.DATABASE_URL}
```

**Optional (if you use these services):**
```
SENDGRID_API_KEY=your-sendgrid-key
NOTION_INTEGRATION_SECRET=your-notion-token
NOTION_PAGE_URL=your-notion-page-url
```

## 6. Review and Deploy

- **App Name**: `xover-management` (or your preferred name)
- **Region**: Choose closest to your users
- **Review costs**: ~$20/month ($5 app + $15 database)
- Click "Create Resources"

## 7. Post-Deployment

After deployment (5-10 minutes):
1. Your app will be live at: `https://your-app-name.ondigitalocean.app`
2. Create your first admin user via the registration page
3. Upload your logo and customize workspace settings

## Troubleshooting

- Check "Runtime Logs" in App Platform if issues occur
- Verify all environment variables are set correctly
- Ensure GitHub repository is accessible

## Cost Breakdown

- **App Instance**: $5/month (Basic)
- **PostgreSQL**: $15/month (Basic)
- **Total**: ~$20/month

Your app includes:
- SSL certificate (free)
- Custom domain support
- Automatic scaling
- 99.95% uptime SLA