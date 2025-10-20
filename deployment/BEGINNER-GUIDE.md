# 🎓 Complete Beginner's Guide to Deploying PolicyPal

**Never deployed a website before? No problem!** This guide assumes zero deployment experience and walks you through every single step.

## 📚 What You'll Learn

By the end of this guide, you'll have:
- ✅ Your website live on the internet
- ✅ A professional URL people can visit
- ✅ A backend API handling requests
- ✅ An AI service processing documents
- ✅ A database storing user data
- ✅ All running for **FREE**!

**Estimated Time:** 2-3 hours (first time)

---

## 🤔 What is "Deployment"?

**Deployment** = Making your website accessible on the internet

Right now, your app only works on your computer (`localhost:4200`). After deployment, anyone in the world can access it via a URL like `https://policypal.com`.

### Why Multiple Services?

Your app has 3 parts:
1. **Frontend** (Angular) - What users see (HTML, CSS, JavaScript)
2. **Backend** (NestJS) - Handles business logic, authentication, database
3. **AI Service** (Python) - Processes PDFs and AI chat

Each part needs to be deployed separately (but they work together).

---

## 🛠️ Tools You'll Use (All Free!)

| Tool | Purpose | Cost |
|------|---------|------|
| **GitHub** | Store your code | FREE |
| **Vercel** | Host frontend (Angular) | FREE |
| **Railway** | Host backend (NestJS) | FREE (500 hours/month) |
| **Render** | Host AI service (Python) | FREE (750 hours/month) |
| **MongoDB Atlas** | Database | FREE (512MB) |
| **Upstash Redis** | Cache/Session storage | FREE (10K requests/day) |

**Total: $0/month** 🎉

---

## ⚠️ Before You Start

### ✅ Prerequisites Checklist

- [ ] You have a **GitHub account** (if not, create one at https://github.com/signup)
- [ ] Your code is working locally (can run `npm start` without errors)
- [ ] You have **Node.js** installed (check: `node --version` in terminal)
- [ ] You have **Git** installed (check: `git --version` in terminal)
- [ ] You have a **valid email address** (you'll need to verify accounts)
- [ ] You have **2-3 hours** of uninterrupted time

### 📝 What You'll Need to Create

During this process, you'll create accounts on 6 platforms. Use the **same email** for all to keep things organized.

**Pro Tip:** Use a password manager (like Bitwarden, 1Password, or LastPass) to store all your credentials.

---

## 📖 Part 1: Understanding the Process

### The Big Picture

```
Your Computer (Local)
    ↓
GitHub (Code Storage)
    ↓
├─→ Vercel (Frontend)
├─→ Railway (Backend)
└─→ Render (AI Service)
    ↓
MongoDB Atlas (Database)
Upstash Redis (Cache)
```

### Step-by-Step Overview

1. **Push code to GitHub** - So deployment platforms can access it
2. **Setup database (MongoDB)** - Store users, policies, etc.
3. **Setup cache (Redis)** - Fast data access
4. **Deploy backend** - Handle API requests
5. **Deploy AI service** - Process PDFs and chat
6. **Deploy frontend** - User interface
7. **Connect everything** - Make them talk to each other
8. **Test** - Make sure everything works!

**Let's begin!**

---

## 🚀 Part 2: Detailed Step-by-Step Instructions

---

## Step 1: Push Your Code to GitHub

### Why?
Deployment platforms need to access your code. GitHub stores it in the cloud.

### Instructions:

#### 1.1 Create a GitHub Account
1. Go to https://github.com/signup
2. Enter your email
3. Create a password (strong one!)
4. Choose a username (lowercase, no spaces)
5. Complete the puzzle verification
6. Check your email and verify

#### 1.2 Install Git (if not installed)
**Windows:**
- Download from https://git-scm.com/download/win
- Run installer (keep all default settings)
- Restart your computer

**Check if installed:**
```powershell
git --version
# Should show: git version 2.x.x
```

#### 1.3 Configure Git (First Time Only)
```powershell
# Set your name (use your real name)
git config --global user.name "Your Name"

# Set your email (use your GitHub email)
git config --global user.email "your-email@gmail.com"

# Verify
git config --list
```

#### 1.4 Create Repository on GitHub
1. Go to https://github.com/new
2. **Repository name:** `PolicyPal` (or your preferred name)
3. **Description:** "Full-stack policy management application"
4. **Public** (keep selected - it's free)
5. **DO NOT** check "Initialize with README" (you already have code)
6. Click **"Create repository"**

You'll see a page with instructions - **keep this page open!**

#### 1.5 Push Your Code

Open **PowerShell** in your project folder:
```powershell
# Navigate to your project
cd "C:\Users\om godase\Desktop\PolicyProject"

# Check if Git is already initialized
git status
# If error "not a git repository", run:
git init

# Add all files
git add .

# Commit (save) all files
git commit -m "Initial commit for deployment"

# Connect to GitHub (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/PolicyPal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**You'll be prompted to login:**
- Modern Git: Opens browser to authenticate
- Older Git: Enter username + password (or Personal Access Token)

**✅ Success Check:** Go to `https://github.com/YOUR_USERNAME/PolicyPal` - you should see your code!

**❌ Common Errors:**

| Error | Solution |
|-------|----------|
| `fatal: not a git repository` | Run `git init` first |
| `fatal: remote origin already exists` | Run `git remote remove origin` then try again |
| `Authentication failed` | Use Personal Access Token instead of password ([guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)) |
| `src refspec main does not exist` | Run `git branch -M main` before pushing |

---

## Step 2: Setup MongoDB Atlas (Database)

### Why?
Your app needs to store data (users, policies, documents). MongoDB Atlas is a free cloud database.

### Instructions:

#### 2.1 Create Account
1. Go to https://www.mongodb.com/cloud/atlas/register
2. **Sign up method:** Choose "Google" (easiest) or email
3. Complete verification
4. You'll see a welcome screen

#### 2.2 Answer Questions
MongoDB will ask about your use case:
- **What are you building?** Select "I'm learning MongoDB"
- **What do you plan to use?** Check "Cloud database"
- **What is your goal?** Select "Build a new application"
- Click **"Finish"**

#### 2.3 Create FREE Cluster
1. You'll see "Deploy a cloud database" page
2. Click **"Create"** under **M0 (FREE)**
3. **Cloud Provider:** Keep "AWS" selected
4. **Region:** Choose closest to your users:
   - USA: `us-east-1 (N. Virginia)` or `us-west-2 (Oregon)`
   - Europe: `eu-west-1 (Ireland)`
   - Asia: `ap-south-1 (Mumbai)` or `ap-southeast-1 (Singapore)`
5. **Cluster Name:** Keep default or change to `PolicyPal-Cluster`
6. Click **"Create Cluster"** (wait 3-5 minutes)

**You'll see a loading screen** - this is normal!

#### 2.4 Security Setup

**Step A: Create Database User**

You'll see "Security Quickstart" screen:

1. **Authentication Method:** "Username and Password" (selected by default)
2. **Username:** Enter `policypal_user` (or any name you like)
3. **Password:** 
   - Click **"Autogenerate Secure Password"**
   - **IMPORTANT:** Click "Copy" and save it somewhere safe!
   - You'll need this password later!
4. Click **"Create User"**

**Step B: Setup Network Access**

1. **Where would you like to connect from?** 
2. Select **"My Local Environment"**
3. Click **"Add My Current IP Address"**
4. **ALSO** click **"Add a Different IP Address"**:
   - IP Address: `0.0.0.0/0`
   - Description: "Allow from anywhere (for deployment)"
5. Click **"Add Entry"**
6. Click **"Finish and Close"**

**Why `0.0.0.0/0`?** This allows your deployed services (Railway, Render) to connect. For production, you'd whitelist specific IPs, but this works for now.

#### 2.5 Get Connection String

1. You'll see your cluster dashboard
2. Click **"Connect"** button (big green button)
3. Choose **"Connect your application"**
4. **Driver:** Node.js
5. **Version:** 4.1 or later
6. You'll see a connection string like:
   ```
   mongodb+srv://policypal_user:<password>@policypal-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **Copy this string**
8. **Replace `<password>`** with your actual password (from Step 2.4)
9. **Add database name** by inserting `/policypal` before the `?`:
   ```
   mongodb+srv://policypal_user:YOUR_ACTUAL_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
   ```

**✅ Save this final connection string!** You'll need it multiple times.

**Example of what it should look like:**
```
mongodb+srv://policypal_user:aB3$xYz9@policypal-cluster.abc12.mongodb.net/policypal?retryWrites=true&w=majority
```

**⚠️ Important:** If your password contains special characters like `@`, `#`, `$`, you need to URL-encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`

**❌ Common Errors:**

| Error | Solution |
|-------|----------|
| "Authentication failed" | Check password is correct and URL-encoded |
| "Connection refused" | Check Network Access allows `0.0.0.0/0` |
| "Could not connect" | Wait 5 minutes after creating cluster |

---

## Step 3: Setup Upstash Redis (Cache)

### Why?
Redis stores temporary data for fast access (sessions, cache). Makes your app faster!

### Instructions:

#### 3.1 Create Account
1. Go to https://upstash.com/
2. Click **"Sign Up"** (top right)
3. **Sign up with GitHub** (easiest - uses your GitHub account)
4. Authorize Upstash to access your GitHub
5. You'll be redirected to Upstash console

#### 3.2 Create Redis Database
1. You'll see "Create Your First Database" screen
2. Click **"Create Database"** button
3. Fill in details:
   - **Name:** `policypal-redis`
   - **Type:** **Regional** (free option)
   - **Region:** Choose same as your MongoDB region
     - Example: If MongoDB is in `us-east-1`, choose `us-east-1` here too
   - **TLS:** Keep enabled
   - **Eviction:** No eviction
4. Click **"Create"**

**Wait 10-20 seconds** for creation.

#### 3.3 Get Redis Credentials

You'll see your database dashboard with connection details:

1. Scroll to **"REST API"** section
2. **Copy these two values:**
   - **UPSTASH_REDIS_REST_URL:** 
     - Looks like: `https://us1-some-string.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN:**
     - Looks like: `AYAAbGF...` (long string)

**✅ Save both values!** You'll need them for backend deployment.

**Alternative (if your backend uses traditional Redis client):**
- Scroll to **"Redis Connect"** section
- Copy **"REDIS_URL"**:
  - Looks like: `redis://default:password@endpoint.upstash.io:port`

**Most likely, you'll use the REST API version.**

---

## Step 4: Deploy Backend to Railway

### Why?
Your backend handles all business logic, authentication, database operations. Railway hosts it for free.

### Instructions:

#### 4.1 Create Account
1. Go to https://railway.app/
2. Click **"Login"** or **"Start a New Project"**
3. **Login with GitHub** (recommended - easiest deployment)
4. Authorize Railway to access your GitHub
5. You'll see Railway dashboard

#### 4.2 Create New Project
1. Click **"New Project"** (purple button, top right)
2. Select **"Deploy from GitHub repo"**
3. You'll see a list of your repositories
4. **If you don't see your `PolicyPal` repo:**
   - Click **"Configure GitHub App"**
   - Select "All repositories" or choose `PolicyPal` specifically
   - Click "Save"
   - Go back to Railway and refresh
5. Click on **`PolicyPal`** repository

#### 4.3 Configure Backend Service

Railway will try to auto-detect your services:

1. If it shows multiple folders, select **`backend`**
2. If it doesn't show anything:
   - Click **"Add a new service"** → **"GitHub Repo"**
   - Select your repo
   - Railway will start deploying

**BUT WAIT!** We need to configure it first:

1. Click on the service card (should say "backend" or your repo name)
2. Go to **"Settings"** tab (gear icon)
3. Scroll to **"Service Settings"**:
   - **Service Name:** `backend` (if not already)
4. Scroll to **"Source"**:
   - **Root Directory:** Type `backend` and press Enter
   - This tells Railway your backend code is in the `backend` folder

#### 4.4 Configure Build & Start Commands

Still in Settings:

1. Scroll to **"Build"** section:
   - **Build Command:** `npm ci && npm run build`
   - This installs dependencies and compiles TypeScript

2. Scroll to **"Deploy"** section:
   - **Start Command:** `node dist/main.js`
   - This runs your compiled backend

3. **Auto-Deploy:** Keep ON (deploys automatically on push)

4. Click away or press **"Save"** if you see it

#### 4.5 Add Environment Variables

This is the most important part! Your backend needs these to work.

1. Click on your backend service (if not already there)
2. Go to **"Variables"** tab (second icon from left)
3. Click **"+ New Variable"** button
4. Add each variable below **one by one**:

**Add these variables:**

```env
NODE_ENV=production
```
*Click "+ New Variable" after each*

```env
PORT=8080
```

```env
MONGODB_URI=mongodb+srv://policypal_user:YOUR_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
```
*(Replace with your actual MongoDB connection string from Step 2.5)*

```env
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_MIN_32_CHARACTERS
```
*(Generate a random string - see instructions below)*

**How to generate JWT_SECRET:**
- Open PowerShell and run:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```
- Copy the output and use it as `JWT_SECRET`
- Or visit: https://generate-secret.vercel.app/32

Continue adding:

```env
JWT_EXPIRATION=7d
```

```env
UPSTASH_REDIS_REST_URL=https://us1-your-endpoint.upstash.io
```
*(From Step 3.3)*

```env
UPSTASH_REDIS_REST_TOKEN=AYAAbGF...your-token
```
*(From Step 3.3)*

```env
FRONTEND_URL=https://temporary-placeholder.vercel.app
```
*(We'll update this after deploying frontend - use any placeholder for now)*

```env
AI_SERVICE_URL=https://temporary-placeholder.onrender.com
```
*(We'll update this after deploying AI service)*

**Email/SMTP Variables (for sending emails):**

If using Gmail:

```env
SMTP_HOST=smtp.gmail.com
```

```env
SMTP_PORT=587
```

```env
SMTP_SECURE=false
```

```env
SMTP_USER=your-email@gmail.com
```
*(Your actual Gmail address)*

```env
SMTP_PASS=your-app-specific-password
```
*(See instructions below)*

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" (if not already)
3. Go to "App passwords"
4. Generate a new password for "Mail" / "Other (Custom name)"
5. Copy the 16-character password (no spaces)
6. Use it as `SMTP_PASS`

```env
EMAIL_FROM=PolicyPal <your-email@gmail.com>
```

```env
MFA_APP_NAME=PolicyPal
```

**Click "Add" after entering each variable.**

#### 4.6 Generate Public URL

1. Still in your backend service, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** button
4. Railway will generate a URL like:
   ```
   https://backend-production-abc123.up.railway.app
   ```
5. **✅ COPY THIS URL!** Save it somewhere - you'll need it multiple times

#### 4.7 Wait for Deployment

1. Click on **"Deployments"** tab (rocket icon)
2. You'll see a deployment in progress
3. Wait 2-5 minutes (first deployment takes longer)
4. **Status should change to:**
   - Building... → Success ✓
   - Deploying... → Success ✓

**If deployment fails:**
- Click on the failed deployment
- Read the logs (error messages)
- Common issues:
  - Build command wrong: Check it's `npm ci && npm run build`
  - Start command wrong: Check it's `node dist/main.js`
  - Missing dependencies: Check `backend/package.json` exists

#### 4.8 Test Your Backend

Open a new browser tab and visit:
```
https://your-backend-url.railway.app/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"2025-10-20T..."}
```

**If you see this, SUCCESS! ✅**

**If you see an error:**
- 502 Bad Gateway: Backend crashed - check logs in Railway
- 404 Not Found: Health endpoint doesn't exist - check your code
- Connection timeout: Still starting up - wait 1 minute and try again

---

## Step 5: Deploy AI Service to Render

### Why?
Your AI service processes PDFs and handles chat. Render hosts Python apps for free.

### Instructions:

#### 5.1 Create Account
1. Go to https://render.com/register
2. Click **"Sign Up"**
3. **Sign up with GitHub** (easiest option)
4. Authorize Render to access your repositories
5. Complete email verification if prompted

#### 5.2 Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. You'll see "Create a new Web Service" page
4. Click **"Connect" next to GitHub** (if not already connected)
5. Find your **`PolicyPal`** repository and click **"Connect"**
6. **If you don't see it:**
   - Click **"Configure account"**
   - Grant access to `PolicyPal` repository
   - Go back and refresh

#### 5.3 Configure Service

Fill in these details:

**Basic Settings:**
- **Name:** `policypal-ai-service` (must be unique globally)
- **Region:** Oregon (US West) - **free** on all regions
- **Branch:** `main`
- **Root Directory:** `ai-service`
  - This is the folder where your Python code is
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
  - This installs Python packages
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8080`
  - This starts your FastAPI server

**Instance Type:**
- Scroll down to **"Instance Type"**
- Select **"Free"** ($0/month)
- ⚠️ Note: "Spins down with inactivity" means service sleeps after 15 minutes. First request after sleep takes ~30 seconds to wake up.

#### 5.4 Add Environment Variables

Scroll down to **"Environment Variables"** section:

Click **"Add Environment Variable"** and add these:

```env
PORT=8080
```

```env
MONGODB_URI=mongodb+srv://policypal_user:YOUR_PASSWORD@policypal-cluster.xxxxx.mongodb.net/policypal?retryWrites=true&w=majority
```
*(Your MongoDB connection string from Step 2.5)*

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```
*(Your OpenAI API key - see instructions below)*

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Go to https://platform.openai.com/api-keys
4. Click **"Create new secret key"**
5. Give it a name: "PolicyPal Production"
6. Copy the key (starts with `sk-proj-...`)
7. **Save it immediately** - you won't see it again!

```env
ALLOWED_ORIGINS=https://temporary-placeholder.vercel.app
```
*(Placeholder - we'll update after frontend deployment)*

```env
BACKEND_URL=https://backend-production-abc123.up.railway.app
```
*(Your Railway backend URL from Step 4.6)*

```env
AI_SERVICE_PORT=8080
```

```env
LANGCHAIN_MODEL=gpt-4o-mini
```

```env
LANGCHAIN_TEMPERATURE=0.7
```

```env
LANGCHAIN_MAX_TOKENS=4000
```

```env
PDF_MAX_SIZE_MB=50
```

#### 5.5 Deploy

1. Double-check all settings
2. Click **"Create Web Service"** button (bottom)
3. Render starts building and deploying
4. You'll see logs in real-time
5. **Wait 5-10 minutes** (first deployment compiles everything)

**Deployment stages:**
- Building... (installing Python packages)
- Deploying...
- Live ✓

#### 5.6 Get Service URL

Once deployed (status shows "Live"):

1. At the top of the page, you'll see your service URL:
   ```
   https://policypal-ai-service.onrender.com
   ```
2. **✅ COPY THIS URL!** You'll need it for frontend and backend.

#### 5.7 Test AI Service

Open a new browser tab:
```
https://your-ai-service.onrender.com/
```

**Expected response:**
```json
{"message":"PolicyPal AI Service is running"}
```

**✅ If you see this, SUCCESS!**

**If you see an error:**
- 502/503: Service is still starting - wait 1 minute
- Build failed: Check logs in Render dashboard
- Python errors: Check your `requirements.txt` has all packages

#### 5.8 Update Backend with AI Service URL

Now that AI service is deployed, update backend:

1. Go back to **Railway** dashboard
2. Click on **backend** service
3. Go to **"Variables"** tab
4. Find `AI_SERVICE_URL`
5. Click on it and update to your Render URL:
   ```
   AI_SERVICE_URL=https://policypal-ai-service.onrender.com
   ```
6. Click "Update" or press Enter
7. Backend will automatically redeploy (takes 1-2 minutes)

---

## Step 6: Deploy Frontend to Vercel

### Why?
Your frontend is what users see. Vercel is the best (and free!) platform for Angular/React/Next.js apps.

### Instructions:

#### 6.1 Update Environment File

**IMPORTANT:** Before deploying, update your production URLs:

1. Open `frontend/src/environments/environment.prod.ts` in your code editor
2. Update these values:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://backend-production-abc123.up.railway.app/api',
  socketUrl: 'https://backend-production-abc123.up.railway.app',
  frontendUrl: 'https://temporary-placeholder.vercel.app', // We'll update this after deployment
  aiServiceUrl: 'https://policypal-ai-service.onrender.com',
  uploadUrl: 'https://backend-production-abc123.up.railway.app/api/upload',
  websocketUrl: 'wss://backend-production-abc123.up.railway.app', // Note: wss:// not https://
};
```

**Replace:**
- `backend-production-abc123.up.railway.app` with your Railway backend URL (from Step 4.6)
- `policypal-ai-service.onrender.com` with your Render AI service URL (from Step 5.6)

3. **Save the file**
4. **Commit and push to GitHub:**

```powershell
git add frontend/src/environments/environment.prod.ts
git commit -m "Update production URLs"
git push origin main
```

#### 6.2 Create Vercel Account
1. Go to https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your repositories
4. You'll be redirected to Vercel dashboard

#### 6.3 Import Project
1. Click **"Add New..."** button (top right)
2. Select **"Project"**
3. You'll see "Import Git Repository" page
4. Find your **`PolicyPal`** repository
5. Click **"Import"**

**If you don't see your repository:**
- Click **"Adjust GitHub App Permissions"**
- Grant access to `PolicyPal`
- Go back and refresh

#### 6.4 Configure Project

**Framework Preset:**
- Vercel should auto-detect "Angular"
- If not, select "Angular" from dropdown

**Root Directory:**
- Click **"Edit"** next to "Root Directory"
- Select `frontend` folder
- Click "Continue"

**Build and Output Settings:**
Click to expand if not already visible:

- **Build Command:** `npm run build` (keep default)
  - Or use: `ng build --configuration production`
- **Output Directory:** `dist/frontend/browser`
  - **IMPORTANT:** This path depends on your Angular version
  - Check your local `frontend/dist/` folder after running `npm run build`
  - Common paths:
    - Angular 17+: `dist/frontend/browser`
    - Angular 16: `dist/frontend`
    - Custom: Check `angular.json` → `projects.yourapp.architect.build.options.outputPath`
- **Install Command:** `npm install` (keep default)

**Environment Variables (Optional):**
- For now, skip this section
- We already updated `environment.prod.ts`

#### 6.5 Deploy

1. Review all settings
2. Click **"Deploy"** button
3. Vercel starts building
4. You'll see build logs in real-time
5. **Wait 3-5 minutes** for first deployment

**Build stages:**
- Cloning repository...
- Installing dependencies... (npm install)
- Building... (ng build)
- Uploading...
- Deployed ✓

#### 6.6 Get Your Live URL

Once deployment succeeds:

1. You'll see a **"Congratulations"** screen with confetti 🎉
2. Your live URL will be shown:
   ```
   https://policy-pal-abc123xyz.vercel.app
   ```
3. Click **"Visit"** to open your live site
4. **✅ COPY THIS URL!** This is your production frontend URL

#### 6.7 Test Your Frontend

1. Open your Vercel URL in browser
2. You should see your PolicyPal login page
3. **Check browser console** (Press F12 → Console tab)
4. Look for errors:
   - ❌ CORS errors: Backend CORS not configured (we'll fix next)
   - ❌ 404 errors: Wrong API URL in environment file
   - ✅ No errors: Good to proceed!

#### 6.8 Update Backend & AI Service CORS

Now update your backend and AI service to allow requests from your frontend:

**Update Railway Backend:**

1. Go to **Railway** dashboard
2. Click **backend** service
3. Go to **"Variables"** tab
4. Find `FRONTEND_URL`
5. Update to your Vercel URL:
   ```
   FRONTEND_URL=https://policy-pal-abc123xyz.vercel.app
   ```
6. Backend will redeploy automatically (1-2 minutes)

**Update Render AI Service:**

1. Go to **Render** dashboard
2. Click **policypal-ai-service**
3. Go to **"Environment"** tab (left sidebar)
4. Find `ALLOWED_ORIGINS`
5. Click **"Edit"**
6. Update to your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://policy-pal-abc123xyz.vercel.app
   ```
7. Click **"Save Changes"**
8. Service will redeploy automatically (2-5 minutes)

**Wait for both to redeploy** before testing.

#### 6.9 Update Frontend URL (Final Step)

Update your `environment.prod.ts` with the actual Vercel URL:

1. Edit `frontend/src/environments/environment.prod.ts`
2. Update `frontendUrl`:
   ```typescript
   frontendUrl: 'https://policy-pal-abc123xyz.vercel.app',
   ```
3. Save, commit, and push:
   ```powershell
   git add frontend/src/environments/environment.prod.ts
   git commit -m "Update frontend URL with actual Vercel domain"
   git push origin main
   ```
4. Vercel will auto-deploy (2-3 minutes)

---

## Step 7: Complete Testing

### 7.1 Test Backend Health

```
https://your-backend.railway.app/health
```
**Expected:** `{"status":"ok",...}`

### 7.2 Test AI Service Health

```
https://your-ai-service.onrender.com/
```
**Expected:** `{"message":"PolicyPal AI Service is running"}`

### 7.3 Test Frontend

1. Open: `https://your-app.vercel.app`
2. Should load without errors
3. **Press F12 → Console**
4. Should see no CORS errors

### 7.4 Test User Registration

1. Click **"Sign Up"** or **"Register"**
2. Fill in the form
3. Submit
4. **Check for:**
   - ✅ No console errors
   - ✅ Success message
   - ✅ Email received (check spam)

### 7.5 Verify Database

1. Go to **MongoDB Atlas** dashboard
2. Click **"Database"** → **"Browse Collections"**
3. You should see `policypal` database
4. Expand `users` collection
5. Your registered user should be there!

### 7.6 Test Login

1. Verify email (click link in email)
2. Go back to your app
3. Login with credentials
4. Should successfully login and see dashboard

### 7.7 Test Core Features

- [ ] Create a policy
- [ ] Upload a PDF
- [ ] View policies list
- [ ] Use AI chat (may take 30s first time on Render free tier)
- [ ] Test on mobile (responsive design)

**🎉 If everything works, CONGRATULATIONS! You've successfully deployed your first full-stack application!**

---

## 🎨 Part 3: Optional Enhancements

### Add Custom Domain (Optional)

If you own a domain (e.g., `policypal.com`):

#### On Vercel:
1. Go to your project → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain: `policypal.com`
4. Follow DNS instructions from Vercel
5. Add DNS records at your domain registrar (GoDaddy, Namecheap, etc.)
6. Wait for DNS propagation (5 min - 24 hours)
7. Vercel auto-generates SSL certificate

#### Update Environment URLs:
After custom domain is active, update all URLs to use `policypal.com` instead of `vercel.app` URL.

---

## 🚨 Part 4: Troubleshooting Guide

### Problem: CORS Error in Browser

**Error in console:**
```
Access to XMLHttpRequest at 'https://backend...' from origin 'https://frontend...' 
has been blocked by CORS policy
```

**Solution:**
1. Check Railway backend `FRONTEND_URL` variable
2. Must match your Vercel URL EXACTLY (including https://)
3. No trailing slash
4. Update and wait for redeploy

---

### Problem: Cannot Connect to Database

**Error:**
```
MongooseError: connection refused
```

**Solutions:**
1. Check MongoDB Atlas Network Access allows `0.0.0.0/0`
2. Verify connection string password is correct
3. Special characters in password must be URL-encoded:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
4. Test connection string locally first

---

### Problem: Railway Build Failed

**Error in logs:**
```
Error: Cannot find module 'xyz'
```

**Solutions:**
1. Check `backend/package.json` exists and has all dependencies
2. Build command should be: `npm ci && npm run build`
3. Check root directory is set to `backend`
4. Try clearing build cache: Settings → General → Clear Cache

---

### Problem: Vercel Shows 404

**Site shows "404 Not Found"**

**Solutions:**
1. Check output directory path in settings
2. For Angular, add `vercel.json` in `frontend/` folder:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```
3. Commit, push, and redeploy

---

### Problem: Render Service Times Out

**Error:**
```
Request timeout / 503 Service Unavailable
```

**Solution:**
- Render free tier sleeps after 15 minutes
- First request takes 30-60 seconds to wake up
- Add a loading message: "Waking up AI service..."
- Or set up a cron job to ping every 14 minutes

---

## 📊 Part 5: Monitoring Your Deployment

### Check Usage (Stay in Free Tier)

**Railway:**
- Dashboard → Usage
- Monitor: Hours used / 500 hours free

**Render:**
- Dashboard → Account → Usage
- Monitor: Hours used / 750 hours free

**MongoDB Atlas:**
- Dashboard → Metrics
- Monitor: Storage used / 512MB free

**Upstash Redis:**
- Dashboard → Metrics
- Monitor: Commands / 10,000 daily free

### Set Up Monitoring (Recommended)

1. **Uptime Monitoring:** https://uptimerobot.com/ (free)
   - Monitors if your site is up
   - Alerts you if it goes down

2. **Error Tracking:** https://sentry.io/ (free tier)
   - Tracks errors in production
   - Helps debug issues

### Keep Services Alive (Optional)

Free tier services "sleep" after inactivity. To keep them alive:

1. Go to https://cron-job.org/ (free)
2. Create account
3. Add cron jobs to ping:
   - Backend: `https://your-backend.railway.app/health` every 14 minutes
   - AI Service: `https://your-ai-service.onrender.com/` every 14 minutes

---

## 🎓 Part 6: What You've Learned

Congratulations! You now know:

- ✅ How to use Git and GitHub
- ✅ How to deploy a full-stack application
- ✅ How to manage cloud databases (MongoDB Atlas)
- ✅ How to use caching (Redis)
- ✅ How to configure environment variables
- ✅ How to manage CORS
- ✅ How to read deployment logs
- ✅ How to troubleshoot common issues
- ✅ How to monitor your application

**You're now a DevOps engineer!** 🎉

---

## 📚 Part 7: Next Steps

### Immediate:
- [ ] Test all features thoroughly
- [ ] Set up monitoring (UptimeRobot)
- [ ] Bookmark your platform dashboards
- [ ] Document your URLs in a password manager

### Short-term:
- [ ] Set up custom domain
- [ ] Enable error tracking (Sentry)
- [ ] Set up automated backups
- [ ] Add health check cron jobs

### Long-term:
- [ ] Monitor usage regularly
- [ ] Plan upgrade path when needed
- [ ] Learn about CI/CD pipelines
- [ ] Explore other cloud platforms (AWS, Google Cloud)

---

## 🆘 Need Help?

### Check These First:
1. This guide's troubleshooting section
2. Platform documentation (links below)
3. Your deployment logs

### Platform Documentation:
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)

### Community Support:
- [Railway Discord](https://discord.gg/railway)
- [Render Community](https://community.render.com/)
- [Vercel Discord](https://vercel.com/discord)
- [Stack Overflow](https://stackoverflow.com/) (tag your questions appropriately)

---

## 🎉 Final Checklist

- [ ] Code on GitHub
- [ ] MongoDB Atlas database created
- [ ] Upstash Redis created
- [ ] Railway backend deployed and healthy
- [ ] Render AI service deployed and healthy
- [ ] Vercel frontend deployed and accessible
- [ ] All environment variables configured
- [ ] CORS configured correctly
- [ ] All URLs updated
- [ ] User registration works
- [ ] Login works
- [ ] Core features tested
- [ ] Mobile responsive
- [ ] No console errors
- [ ] URLs documented

**Total Cost: $0/month** 💰

---

**You did it! Your app is now live and accessible to anyone in the world!** 🌍

Share your URL with friends, add it to your portfolio, or put it on your resume. You've accomplished something amazing!

**Good luck with your project! 🚀**

---

*Created for PolicyPal - Your first deployment made easy*

