# Deployment Guide for mira.consultare.io

## Pre-Deployment Checklist

Your application is now configured for production deployment on the subdomain `mira.consultare.io`. Here's what has been updated:

### ✅ Changes Made

1. **Next.js Configuration (`next.config.js`)**
   - Added `output: 'standalone'` for better server deployment
   - Added CORS headers configuration for API routes
   - Added support for base path configuration (if needed)

2. **API Routes CORS Support**
   - Added CORS headers to `/api/test-connection` route
   - Added CORS headers to `/api/execute-query` route
   - Added OPTIONS handlers for CORS preflight requests

### 📋 Environment Variables (Optional)

Create a `.env.local` file in the root directory with the following variables (if needed):

```env
# Base path for the application (leave empty for subdomain hosting)
NEXT_PUBLIC_BASE_PATH=

# Allowed origin for CORS (use specific domain for production)
NEXT_PUBLIC_ALLOWED_ORIGIN=https://mira.consultare.io

# Node environment
NODE_ENV=production
```

**Note:** The application will work without these environment variables, but setting `NEXT_PUBLIC_ALLOWED_ORIGIN` to your specific domain is recommended for better security.

### 🚀 Deployment Steps on Linode

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

   Or use a process manager like PM2:
   ```bash
   pm2 start npm --name "mira-app" -- start
   ```

3. **Configure Nginx (if using as reverse proxy):**
   ```nginx
   server {
       listen 80;
       server_name mira.consultare.io;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Set up SSL Certificate:**
   - Use Let's Encrypt with Certbot
   ```bash
   certbot --nginx -d mira.consultare.io
   ```

### 🔒 Security Notes

- The application accepts SAP B1 server URLs and credentials from users (stored in browser memory only)
- No hardcoded credentials in the codebase
- CORS is configured to allow requests from your subdomain
- For production, consider restricting `NEXT_PUBLIC_ALLOWED_ORIGIN` to your specific domain

### 📝 Important Notes

- **No code changes needed** - The application is already configured to work with any subdomain
- **SAP B1 Connection**: Users will configure their SAP B1 server URL through the UI settings panel
- **OpenAI API Key**: Users will provide their own OpenAI API key through the settings panel
- The application doesn't store any credentials server-side - all settings are managed client-side

### ✅ Ready for Deployment

Your application is ready to be deployed to `mira.consultare.io` on your Linode server. No additional code changes are required!

