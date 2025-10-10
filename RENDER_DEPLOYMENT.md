# Render Deployment Guide for RankedPoker

This guide will help you deploy your RankedPoker application to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your Firebase project credentials
3. This repository pushed to GitHub/GitLab/Bitbucket

## Deployment Steps

### 1. Create a New Web Service

1. Log in to your Render dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your repository containing this code

### 2. Configure Build & Deploy Settings

Use the following configuration:

#### Basic Settings
- **Name**: `rankedpoker` (or your preferred name)
- **Region**: Choose the closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: Leave blank (unless repo is in a subdirectory)

#### Build & Deploy
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```

- **Start Command**: 
  ```bash
  npm start
  ```

#### Advanced Settings
- **Node Version**: Select `20.x` or later (recommended: `20`)
- **Auto-Deploy**: `Yes` (deploys automatically on git push)

### 3. Environment Variables

Add the following environment variables in the Render dashboard under "Environment":

#### Required Firebase Variables
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

#### Node Environment
```
NODE_ENV=production
```

**Important**: Replace the values above with your actual Firebase credentials from your Firebase Console.

### 4. Port Configuration

The application is configured to run on port **5000** by default. Render automatically handles port mapping, so no additional configuration is needed.

### 5. Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Render will automatically:
   - Install dependencies
   - Build your application (frontend + backend)
   - Start the production server
   - Provide you with a live URL (e.g., `https://rankedpoker.onrender.com`)

## Post-Deployment

### Verify Deployment
1. Visit your Render-provided URL
2. Test authentication with Google Sign-In
3. Verify Firebase connectivity
4. Check that all features work correctly

### Custom Domain (Optional)
1. Go to your Render service settings
2. Navigate to "Custom Domains"
3. Add your domain and follow the DNS configuration instructions

### Monitoring
- Check the **Logs** tab in Render dashboard for any errors
- Monitor performance in the **Metrics** tab

## Troubleshooting

### Build Fails
- Verify all environment variables are set correctly
- Check the build logs for specific errors
- Ensure Node version is 20.x or higher

### Firebase Connection Issues
- Double-check Firebase environment variables
- Verify Firebase project is active
- Check Firebase Console for any quota limits

### Application Not Loading
- Check Render logs for startup errors
- Verify the start command is `npm start`
- Ensure port 5000 is being used by the server

## Alternative: Render Blueprint (render.yaml)

You can also use a `render.yaml` file for infrastructure as code:

```yaml
services:
  - type: web
    name: rankedpoker
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: VITE_FIREBASE_API_KEY
        sync: false
      - key: VITE_FIREBASE_PROJECT_ID
        sync: false
      - key: VITE_FIREBASE_APP_ID
        sync: false
```

Place this file in your repository root and use Render's "Blueprint" option to deploy.

## Summary

**Build Command**: `npm install && npm run build`  
**Start Command**: `npm start`  
**Required Env Vars**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `NODE_ENV`  
**Port**: 5000 (automatically handled by Render)
