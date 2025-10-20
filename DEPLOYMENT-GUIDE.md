# 🚀 PolicyPal - Complete FREE Deployment Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Prepare Your Code](#step-1-prepare-your-code)
3. [Step 2: Setup MongoDB Atlas (Database)](#step-2-setup-mongodb-atlas-database)
4. [Step 3: Setup Upstash Redis (Cache)](#step-3-setup-upstash-redis-cache)
5. [Step 4: Deploy Backend to Railway](#step-4-deploy-backend-to-railway)
6. [Step 5: Deploy AI Service to Render](#step-5-deploy-ai-service-to-render)
7. [Step 6: Deploy Frontend to Vercel](#step-6-deploy-frontend-to-vercel)
8. [Step 7: Test Your Deployment](#step-7-test-your-deployment)
9. [Step 8: Setup Custom Domain (Optional)](#step-8-setup-custom-domain-optional)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need (All FREE):
- ✅ **GitHub Account** - [Sign up here](https://github.com/signup)
- ✅ **Vercel Account** - [Sign up here](https://vercel.com/signup)
- ✅ **Railway Account** - [Sign up here](https://railway.app/)
- ✅ **Render Account** - [Sign up here](https://render.com/register)
- ✅ **MongoDB Atlas Account** - [Sign up here](https://www.mongodb.com/cloud/atlas/register)
- ✅ **Upstash Account** - [Sign up here](https://upstash.com/)
- ✅ **Git installed** on your computer
- ✅ **Node.js v18+** installed
- ✅ **Text editor** (VS Code recommended)

### ⏱️ Estimated Time: 1-2 hours

---

## Step 1: Prepare Your Code

### 1.1 Push Your Code to GitHub

**If you haven't already:**

```bash
# Open terminal in your project root (C:\Users\om godase\Desktop\PolicyProject)
cd C:\Users\om godase\Desktop\PolicyProject

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for deployment"

# Create a new repository on GitHub
# Go to: https://github.com/new
# Repository name: PolicyPal
# Make it Public
# Don't initialize with README (you already have code)

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/PolicyPal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Your code should now be visible at `https://github.com/YOUR_USERNAME/PolicyPal`

### 1.2 Create `.gitignore` (if not exists)

Create a file named `.gitignore` in your project root:

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc
venv/
.venv/

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.angular/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Uploads
uploads/*
!uploads/.gitkeep
```

**Important:** Never commit `.env` files with secrets!

---

## Step 2: Setup MongoDB Atlas (Database)

### 2.1 Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up with Google/GitHub or email
3. Complete the welcome questionnaire (choose "FREE" tier)

### 2.2 Create a FREE Cluster

1. Click **"Create a Cluster"** or **"Build a Database"**
2. Choose **"M0 FREE"** tier (should be selected by default)
3. **Provider:** AWS (recommended)
4. **Region:** Choose closest to your users (e.g., `us-east-1` for USA)
5. **Cluster Name:** `PolicyPal-Cluster` (or any name)
6. Click **"Create Cluster"** (takes 3-5 minutes)

### 2.3 Setup Database Access

1. On the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. **Authentication Method:** Password
4. **Username:** `policypal_user` (or your choice)
5. **Password:** Click "Autogenerate Secure Password" → **COPY THIS PASSWORD!** (save it somewhere safe)
6. **Database User Privileges:** Select **"Read and write to any database"**
7. Click **"Add User"**

### 2.4 Setup Network Access

1. On the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - ⚠️ For production, you should whitelist specific IPs, but for deployment testing this is fine
4. Click **"Confirm"**

### 2.5 Get Connection String

1. Click **"Database"** in left sidebar
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver:** Node.js
5. **Version:** 4.1 or later
6. **Copy the connection string:** Should look like:
   ```
   mongodb+srv://policypal_user:<password>@policypal-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Replace `<password>`** with the password you copied in step 2.3
8. **Add database name** before the `?`:
   ```
   mongodb+srv://policypal_user:YOUR_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
   ```

**✅ Save this connection string!** You'll need it for backend and AI service.

---

## Step 3: Setup Upstash Redis (Cache)

### 3.1 Create Upstash Account

1. Go to [Upstash](https://upstash.com/)
2. Click **"Sign Up"** (use GitHub for easy login)
3. Verify your email

### 3.2 Create Redis Database

1. Click **"Create Database"** or go to [Console](https://console.upstash.com/)
2. **Name:** `policypal-redis`
3. **Type:** Regional (FREE)
4. **Region:** Choose closest to your Railway backend (e.g., `us-east-1`)
5. **Eviction:** No eviction
6. Click **"Create"**

### 3.3 Get Redis Credentials

1. Click on your newly created database
2. Scroll to **"REST API"** section
3. Copy these values:
   - **UPSTASH_REDIS_REST_URL:** `https://xxx-xxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN:** `AXXXXxxxxx...`

**Alternative:** If using traditional Redis client:
- Copy **"REDIS_URL"** from the **"Redis Connect"** section
- Format: `redis://default:password@host:port`

**✅ Save these credentials!**

---

## Step 4: Deploy Backend to Railway

### 4.1 Create Railway Account

1. Go to [Railway](https://railway.app/)
2. Click **"Login"** or **"Start a New Project"**
3. **Sign in with GitHub** (recommended for easy deployment)
4. Authorize Railway to access your GitHub repositories

### 4.2 Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If you don't see your repos, click **"Configure GitHub App"** and grant access
4. Select your **`PolicyPal`** repository

### 4.3 Setup Backend Service

1. Railway will show a list of detected services
2. Click **"Add a new service"** → **"GitHub Repo"**
3. Select your repo, then set:
   - **Service Name:** `backend`
   - **Root Directory:** Click "Advanced" → Set to `backend`

### 4.4 Configure Build Settings

1. Click on the **`backend`** service
2. Go to **"Settings"** tab
3. Scroll to **"Build"** section:
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `node dist/main.js`
4. Scroll to **"Deploy"** section:
   - **Auto-Deploy:** Should be ON (deploys on every push to `main`)

### 4.5 Add Environment Variables

1. Still in the backend service, click **"Variables"** tab
2. Click **"+ New Variable"**
3. Add each variable one by one (click "+ New Variable" for each):

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://policypal_user:YOUR_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRATION=7d
UPSTASH_REDIS_REST_URL=https://xxx-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxx...
FRONTEND_URL=https://will-update-after-vercel.vercel.app
AI_SERVICE_URL=https://will-update-after-render.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=PolicyPal <your-email@gmail.com>
MFA_APP_NAME=PolicyPal
```

**Important Notes:**
- For `JWT_SECRET`: Generate a secure random string (at least 32 characters)
  ```bash
  # Generate on Windows PowerShell:
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
  
  # Or use an online generator: https://generate-secret.vercel.app/32
  ```
- For Gmail SMTP:
  1. Enable 2-factor authentication on your Gmail
  2. Generate "App Password": Google Account → Security → 2-Step Verification → App Passwords
  3. Use that generated password for `SMTP_PASS`
- We'll update `FRONTEND_URL` and `AI_SERVICE_URL` after deploying those services

### 4.6 Generate Public URL

1. Go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. You'll get a URL like: `https://backend-production-xxxx.up.railway.app`

**✅ Copy this URL!** This is your backend API URL.

### 4.7 Check Deployment Status

1. Go to **"Deployments"** tab
2. Wait for the deployment to complete (usually 2-5 minutes)
3. Status should show **"SUCCESS"** with a green checkmark
4. If failed, click on the deployment to see logs

**Test your backend:**
```bash
# Open browser or use curl:
curl https://backend-production-xxxx.up.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Step 5: Deploy AI Service to Render

### 5.1 Create Render Account

1. Go to [Render](https://render.com/register)
2. Click **"Sign Up"**
3. **Sign up with GitHub** (easiest)
4. Authorize Render to access your repositories

### 5.2 Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect to your **`PolicyPal`** repository
3. If you don't see it, click **"Configure account"** and grant access

### 5.3 Configure Service

**Basic Settings:**
- **Name:** `policypal-ai-service`
- **Region:** Oregon (US West) or closest to you (FREE on all)
- **Branch:** `main`
- **Root Directory:** `ai-service`
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8080`

**Instance Type:**
- Select **"Free"** ($0/month)
- ⚠️ Note: Free tier sleeps after 15 minutes of inactivity (first request takes ~30s to wake up)

### 5.4 Add Environment Variables

Click **"Advanced"** → Scroll to **"Environment Variables"**

Add these variables:

```env
PORT=8080
MONGODB_URI=mongodb+srv://policypal_user:YOUR_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
ALLOWED_ORIGINS=https://will-update-after-vercel.vercel.app
BACKEND_URL=https://backend-production-xxxx.up.railway.app
AI_SERVICE_PORT=8080
LANGCHAIN_MODEL=gpt-4o-mini
LANGCHAIN_TEMPERATURE=0.7
LANGCHAIN_MAX_TOKENS=4000
PDF_MAX_SIZE_MB=50
```

**Important:**
- Get your `OPENAI_API_KEY` from [OpenAI Platform](https://platform.openai.com/api-keys)
- We'll update `ALLOWED_ORIGINS` after deploying frontend
- Replace `BACKEND_URL` with your Railway backend URL from Step 4.6

### 5.5 Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying (takes 5-10 minutes for first deploy)
3. Watch the logs for any errors

### 5.6 Get Service URL

1. Once deployed, you'll see a URL at the top like:
   ```
   https://policypal-ai-service.onrender.com
   ```
2. **✅ Copy this URL!** This is your AI Service URL.

**Test your AI service:**
```bash
# Open browser:
https://policypal-ai-service.onrender.com/
# Should return: {"message":"PolicyPal AI Service is running"}
```

### 5.7 Update Backend Environment

1. Go back to **Railway** dashboard
2. Click on your **backend** service
3. Go to **"Variables"** tab
4. Update **`AI_SERVICE_URL`** to your Render URL:
   ```
   AI_SERVICE_URL=https://policypal-ai-service.onrender.com
   ```
5. Service will automatically redeploy

---

## Step 6: Deploy Frontend to Vercel

### 6.1 Update Environment Configuration

**First, update your Angular environment file:**

Open `frontend/src/environments/environment.prod.ts` and update:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://backend-production-xxxx.up.railway.app/api',
  socketUrl: 'https://backend-production-xxxx.up.railway.app',
  frontendUrl: 'https://will-update-after-vercel.vercel.app',
  aiServiceUrl: 'https://policypal-ai-service.onrender.com',
  uploadUrl: 'https://backend-production-xxxx.up.railway.app/api/upload',
  websocketUrl: 'wss://backend-production-xxxx.up.railway.app',
};
```

**Replace:**
- `backend-production-xxxx.up.railway.app` with your Railway backend URL
- `policypal-ai-service.onrender.com` with your Render AI service URL

**Commit and push these changes:**

```bash
git add frontend/src/environments/environment.prod.ts
git commit -m "Update production URLs for deployment"
git push origin main
```

### 6.2 Create Vercel Account

1. Go to [Vercel](https://vercel.com/signup)
2. Click **"Sign Up with GitHub"**
3. Authorize Vercel to access your repositories

### 6.3 Import Project

1. Click **"Add New..."** → **"Project"**
2. Find your **`PolicyPal`** repository and click **"Import"**
3. If you don't see it, click **"Adjust GitHub App Permissions"**

### 6.4 Configure Project

**Framework Preset:** Vercel should auto-detect Angular

**Root Directory:**
- Click **"Edit"** next to Root Directory
- Select `frontend`

**Build and Output Settings:**
- **Build Command:** `npm run build` (or leave as default)
- **Output Directory:** `dist/frontend/browser` (adjust if your app name is different)
  - To find the correct path: After local build, check `frontend/dist/` folder structure
  - Common paths: `dist/frontend`, `dist/frontend/browser`, or `dist/<app-name>`
- **Install Command:** `npm install`

**Environment Variables:**
Click **"Environment Variables"** and add:

```env
NODE_ENV=production
NG_APP_API_URL=https://backend-production-xxxx.up.railway.app/api
NG_APP_SOCKET_URL=https://backend-production-xxxx.up.railway.app
NG_APP_AI_SERVICE_URL=https://policypal-ai-service.onrender.com
```

**Note:** Angular doesn't use `NG_APP_` prefix by default. These are here if you're reading from `process.env` at build time. If you're using `environment.prod.ts` (which you updated above), you don't need these.

### 6.5 Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy (takes 2-5 minutes)
3. Watch the build logs for errors

### 6.6 Get Your Live URL

1. Once deployed, you'll see:
   ```
   🎉 Your project is live at: https://policy-pal-xxxx.vercel.app
   ```
2. **✅ Copy this URL!** This is your frontend URL.

### 6.7 Update Backend & AI CORS Settings

**Update Railway Backend:**
1. Go to Railway dashboard → backend service → Variables
2. Update:
   ```
   FRONTEND_URL=https://policy-pal-xxxx.vercel.app
   ```
3. Backend will redeploy automatically

**Update Render AI Service:**
1. Go to Render dashboard → policypal-ai-service → Environment
2. Update:
   ```
   ALLOWED_ORIGINS=https://policy-pal-xxxx.vercel.app
   ```
3. Click **"Save Changes"**
4. Render will redeploy automatically

**Update Vercel Frontend (Final URL):**
1. Go back to `environment.prod.ts`
2. Update `frontendUrl`:
   ```typescript
   frontendUrl: 'https://policy-pal-xxxx.vercel.app',
   ```
3. Commit and push:
   ```bash
   git add frontend/src/environments/environment.prod.ts
   git commit -m "Update frontend URL"
   git push origin main
   ```
4. Vercel auto-deploys on push

---

## Step 7: Test Your Deployment

### 7.1 Basic Health Checks

**Test each service:**

```bash
# Backend Health
curl https://backend-production-xxxx.up.railway.app/health
# Expected: {"status":"ok",...}

# AI Service Health
curl https://policypal-ai-service.onrender.com/
# Expected: {"message":"PolicyPal AI Service is running"}

# Frontend (open in browser)
https://policy-pal-xxxx.vercel.app
# Should load login page
```

### 7.2 Test User Registration

1. Open your Vercel URL: `https://policy-pal-xxxx.vercel.app`
2. Go to **Register** page
3. Fill in the form and submit
4. Check if:
   - ✅ Registration works (no console errors)
   - ✅ Email verification sent (check inbox/spam)
   - ✅ User created in MongoDB Atlas:
     - Go to Atlas → Database → Browse Collections
     - Check `users` collection

### 7.3 Test Login & JWT

1. Verify your email (click link in email)
2. Login with credentials
3. Open browser DevTools → Console
4. Check for any errors
5. Verify JWT token is stored (Application → Local Storage or Cookies)

### 7.4 Test MFA (if enabled)

1. Login should trigger MFA setup
2. Scan QR code with authenticator app
3. Enter code and verify

### 7.5 Test Policy Features

1. Create a policy
2. Upload a PDF
3. Check if:
   - ✅ File uploads to backend
   - ✅ AI processing starts
   - ✅ Status updates correctly

### 7.6 Test AI Chat

1. Go to AI Policy Assistant
2. Select a policy
3. Ask a question
4. Verify AI responds correctly

### 7.7 Check Browser Console

Open DevTools (F12) → Console:
- ❌ **No CORS errors** (if you see CORS, check Step 6.7)
- ❌ **No 404 errors** (if you see 404, check environment URLs)
- ❌ **No authentication errors**

---

## Step 8: Setup Custom Domain (Optional)

### 8.1 Add Domain to Vercel (Frontend)

**If you own a domain (e.g., policypal.com):**

1. Go to Vercel → Your Project → Settings → Domains
2. Add your domain: `policypal.com` and `www.policypal.com`
3. Vercel will show DNS records to add
4. Go to your domain registrar (GoDaddy, Namecheap, etc.)
5. Add the DNS records:
   - **Type:** A or CNAME
   - **Name:** @ (for root) or www
   - **Value:** (provided by Vercel)
6. Wait for DNS propagation (5 minutes - 24 hours)
7. Vercel will auto-generate SSL certificate

### 8.2 Update All URLs

Once domain is active, update:

1. **Vercel environment:**
   ```typescript
   frontendUrl: 'https://policypal.com',
   ```

2. **Railway backend variables:**
   ```
   FRONTEND_URL=https://policypal.com
   ```

3. **Render AI service variables:**
   ```
   ALLOWED_ORIGINS=https://policypal.com
   ```

4. Commit, push, and redeploy all services

---

## Troubleshooting

### ❌ Issue: "CORS Error" in Browser Console

**Error:**
```
Access to XMLHttpRequest at 'https://backend...' from origin 'https://frontend...' has been blocked by CORS policy
```

**Solution:**
1. Check Railway backend `FRONTEND_URL` variable matches your Vercel URL exactly (with https://)
2. Check Render AI service `ALLOWED_ORIGINS` matches your Vercel URL
3. Ensure your backend CORS config uses `process.env.FRONTEND_URL`
4. Redeploy backend after changing variables

---

### ❌ Issue: Railway Build Failed

**Error:**
```
Error: Cannot find module 'xyz'
```

**Solution:**
1. Check `package.json` has all dependencies
2. Make sure build command is: `npm ci && npm run build` (not just `npm install`)
3. Check logs for specific missing packages
4. If using private packages, add NPM_TOKEN to Railway variables

---

### ❌ Issue: Render Deploy Failed (Python)

**Error:**
```
ERROR: Could not find a version that satisfies the requirement xyz
```

**Solution:**
1. Check `requirements.txt` has correct package names
2. For packages needing system dependencies (like `tesseract-ocr`):
   - Render free tier has limited system package support
   - Consider removing OCR features for free tier
   - Or upgrade to paid tier with Docker support
3. Check Python version matches (`python:3.11`)

---

### ❌ Issue: Vercel Build Failed (Angular)

**Error:**
```
Error: Module not found
```

**Solution:**
1. Ensure `frontend/package.json` has all dependencies
2. Check output directory path in Vercel settings
3. Make sure `angular.json` build config is correct:
   ```json
   "outputPath": "dist/frontend"
   ```
4. Clear Vercel cache: Settings → General → Clear Cache

---

### ❌ Issue: "Cannot connect to database"

**Error:**
```
MongooseError: connection refused
```

**Solution:**
1. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
2. Verify `MONGODB_URI` connection string is correct
3. Ensure password in connection string doesn't contain special characters (URL encode if needed)
4. Test connection string locally first:
   ```bash
   mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
   ```

---

### ❌ Issue: Redis Connection Failed

**Error:**
```
Error: Redis connection refused
```

**Solution:**
1. Check Upstash Redis credentials are correct
2. If using REST API, ensure you're using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. If using traditional Redis client, use `REDIS_URL` format
4. Check your backend Redis client configuration matches the credential format

---

### ❌ Issue: AI Service Times Out (Render Free Tier)

**Error:**
```
Request timeout after 30 seconds
```

**Solution:**
1. Render free tier "spins down" after 15 minutes of inactivity
2. First request after sleep takes 30-60 seconds
3. Solutions:
   - Add a loading message: "Waking up AI service, please wait..."
   - Use a cron job to ping service every 14 minutes (keep it alive)
   - Upgrade to Render paid tier ($7/month)

---

### ❌ Issue: Environment Variables Not Working

**Error:**
```
Cannot read property 'apiUrl' of undefined
```

**Solution:**
1. For Angular, environment variables are baked in at **build time**, not runtime
2. Don't use `process.env` directly in Angular components
3. Use `environment.prod.ts` file instead
4. Make sure you committed and pushed changes to `environment.prod.ts`
5. Trigger a new deployment in Vercel after updating

---

### ❌ Issue: WebSocket Connection Failed

**Error:**
```
WebSocket connection to 'wss://backend...' failed
```

**Solution:**
1. Use `wss://` (not `ws://`) for HTTPS deployments
2. Check Railway supports WebSockets (it does)
3. Ensure CORS allows WebSocket origins
4. Check Socket.IO version compatibility between frontend/backend

---

### ❌ Issue: File Upload Fails

**Error:**
```
413 Payload Too Large
```

**Solution:**
1. Railway has 100MB request limit
2. Check your backend file size limits:
   ```typescript
   // In main.ts
   app.use(express.json({ limit: '50mb' }));
   app.use(express.urlencoded({ limit: '50mb', extended: true }));
   ```
3. Consider using cloud storage (AWS S3, Cloudinary) for large files

---

### ❌ Issue: Deployment Successful but Page Shows 404

**Vercel Frontend:**
1. Check output directory is correct
2. For Angular, ensure `index.html` is in the root of output directory
3. Add `vercel.json` in frontend folder:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```
4. Commit, push, and redeploy

---

### 📊 Check Service Status

| Service | Status Check |
|---------|-------------|
| **Backend** | `curl https://your-backend.railway.app/health` |
| **AI Service** | `curl https://your-ai.onrender.com/` |
| **Frontend** | Open in browser, check console for errors |
| **MongoDB** | Atlas Dashboard → Metrics → Connections |
| **Redis** | Upstash Dashboard → Metrics → Commands |

---

### 🔍 View Logs

**Railway (Backend):**
1. Dashboard → Backend Service → Deployments
2. Click on latest deployment
3. View real-time logs

**Render (AI Service):**
1. Dashboard → policypal-ai-service → Logs
2. Live tail of logs

**Vercel (Frontend):**
1. Dashboard → Project → Deployments
2. Click on deployment → Build Logs
3. For runtime errors, check browser console (F12)

---

### 💡 Performance Tips

1. **Enable Caching:** Use Redis for expensive operations
2. **Optimize Images:** Compress before uploading
3. **Enable CDN:** Vercel has built-in CDN
4. **Monitor Usage:** Check Railway/Render dashboards for free tier limits
5. **Set up Health Checks:** Keep free tier services alive:
   ```bash
   # Use a free cron service like cron-job.org
   # Ping every 14 minutes:
   curl https://your-backend.railway.app/health
   curl https://your-ai.onrender.com/
   ```

---

### 🆘 Still Having Issues?

1. **Check Service Logs** (Railway, Render, Vercel)
2. **Test Each Service Independently**:
   - Backend: Use Postman/curl
   - AI Service: Test endpoints directly
   - Frontend: Check browser console
3. **Verify Environment Variables** are set correctly
4. **Check Free Tier Limits:**
   - Railway: 500 hours/month
   - Render: 750 hours/month
   - MongoDB Atlas: 512MB storage
   - Upstash Redis: 10,000 requests/day

---

## 🎉 Congratulations!

Your PolicyPal application is now live at:
- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-backend.railway.app
- **AI Service:** https://your-ai.onrender.com

**Total Cost: $0/month** 💰

### Next Steps:
1. ✅ Test all features thoroughly
2. ✅ Monitor usage to stay within free tier limits
3. ✅ Set up custom domain (optional)
4. ✅ Enable monitoring/analytics
5. ✅ Set up automated backups (MongoDB Atlas)
6. ✅ Add error tracking (Sentry, etc.)
7. ✅ Plan for scaling (upgrade when needed)

**Need help?** Check the troubleshooting section or contact support for each platform.

---

**Created for PolicyPal Deployment - Good luck! 🚀**

