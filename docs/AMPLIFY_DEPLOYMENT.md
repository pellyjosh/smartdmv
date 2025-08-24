# AWS Amplify Deployment Guide

## Prerequisites

- AWS Account with Amplify access
- GitHub repository connected
- RDS PostgreSQL database running

## Step 1: Connect Repository to Amplify

1. **Go to AWS Amplify Console**

   - Navigate to https://console.aws.amazon.com/amplify/
   - Click "Get Started" under "Amplify Hosting"

2. **Connect Repository**

   - Select "GitHub" as your source
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository: `pellyjosh/smartdmv`
   - Select branch: `main`

3. **Configure Build Settings**
   - Amplify will detect your `amplify.yml` file automatically
   - Review the build configuration (should show your amplify.yml content)

## Step 2: Environment Variables

Set these environment variables in Amplify Console:

### Required Variables:

```bash
POSTGRES_URL=postgresql://smartdvm:Rootless123%23@smartdvm.cnug2qlw9kof.eu-north-1.rds.amazonaws.com:5432/smartdvm?sslmode=require
NODE_ENV=production
```

### Optional Variables (add as needed):

```bash
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-amplify-domain.amplifyapp.com
WEBSOCKET_URL=wss://your-websocket-server-domain.com
```

**Important**: The `#` character in your password is percent-encoded as `%23` in the URL.

### To add environment variables:

1. In Amplify Console → Your App → Environment variables
2. Click "Manage variables"
3. Add each variable name and value
4. Click "Save"

## Step 3: Deploy

1. **Trigger Build**

   - Click "Save and deploy" after setting environment variables
   - Or push a commit to trigger automatic deployment

2. **Monitor Build**

   - Watch the build process in real-time
   - Build should complete successfully (we tested `npm run build` locally)

3. **Access Your App**
   - Amplify will provide a URL like: `https://main.d1234567890.amplifyapp.com`
   - Your app will be live at this URL

## Step 4: Custom Domain (Optional)

1. **Add Custom Domain**
   - In Amplify Console → Domain management
   - Add your domain (e.g., `yourvetsystem.com`)
   - Configure DNS as instructed

## Amplify Features You Get:

✅ **Automatic deployments** on push to main branch
✅ **SSL certificate** (HTTPS) automatically
✅ **Global CDN** for fast loading
✅ **Branch-based deployments** for staging
✅ **Environment management** for different stages
✅ **Build optimization** and caching

## Troubleshooting:

- **Build fails**: Check environment variables are set correctly
- **Database connection issues**: Verify RDS security groups allow Amplify IPs
- **Runtime errors**: Check CloudWatch logs in Amplify Console
