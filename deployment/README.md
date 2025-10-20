# PolicyPal Deployment Resources

This folder contains all resources needed for deploying PolicyPal to production.

## 📁 Files Overview

### 📖 Documentation
- **`DEPLOYMENT-GUIDE.md`** - Complete step-by-step deployment guide (start here!)
- **`QUICK-CHECKLIST.md`** - Printable checklist to track progress
- **`README.md`** - This file

### ⚙️ Environment Templates
- **`railway-backend.env.template`** - Backend environment variables for Railway
- **`render-ai-service.env.template`** - AI service environment variables for Render
- **`vercel-frontend.env.template`** - Frontend environment variables for Vercel

### 🛠️ Scripts
- **`health-check.sh`** - Test all deployed services
- **`update-urls.sh`** - Bulk update environment URLs

---

## 🚀 Quick Start

### For First-Time Deployment:

1. **Read the main guide:**
   ```bash
   # Open in your editor or browser
   DEPLOYMENT-GUIDE.md
   ```

2. **Print the checklist:**
   ```bash
   QUICK-CHECKLIST.md
   ```

3. **Follow step by step:**
   - Step 1: MongoDB Atlas
   - Step 2: Upstash Redis
   - Step 3: Railway (Backend)
   - Step 4: Render (AI Service)
   - Step 5: Vercel (Frontend)

---

## 📋 Environment Setup

### 1. Copy Environment Templates

```bash
# Backend (Railway)
cp deployment/railway-backend.env.template deployment/.env.railway
# Edit and fill in your values
code deployment/.env.railway

# AI Service (Render)
cp deployment/render-ai-service.env.template deployment/.env.render
# Edit and fill in your values
code deployment/.env.render

# Frontend (Vercel)
cp deployment/vercel-frontend.env.template deployment/.env.vercel
# Edit and fill in your values
code deployment/.env.vercel
```

### 2. Update Production Environment Files

**Backend:**
```bash
# No file changes needed - set variables in Railway dashboard
```

**AI Service:**
```bash
# No file changes needed - set variables in Render dashboard
```

**Frontend:**
```bash
# Update this file with your deployed URLs:
code frontend/src/environments/environment.prod.ts
```

---

## 🧪 Testing Deployed Services

### Use the Health Check Script

```bash
# Make executable
chmod +x deployment/health-check.sh

# Run checks
./deployment/health-check.sh
```

### Manual Testing

```bash
# Backend
curl https://your-backend.railway.app/health

# AI Service
curl https://your-ai-service.onrender.com/

# Frontend (open in browser)
open https://your-frontend.vercel.app
```

---

## 🔄 Updating Deployment

### When You Make Code Changes:

1. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Services auto-deploy:**
   - ✅ Vercel: Auto-deploys on push (1-2 min)
   - ✅ Railway: Auto-deploys on push (2-3 min)
   - ✅ Render: Auto-deploys on push (5-10 min)

3. **Check deployment status:**
   - Railway: https://railway.app/dashboard
   - Render: https://dashboard.render.com/
   - Vercel: https://vercel.com/dashboard

---

## 🔧 Updating Environment Variables

### Backend (Railway):
```bash
# 1. Go to Railway dashboard
# 2. Select backend service
# 3. Go to Variables tab
# 4. Update variable
# 5. Service redeploys automatically
```

### AI Service (Render):
```bash
# 1. Go to Render dashboard
# 2. Select policypal-ai-service
# 3. Go to Environment tab
# 4. Update variable
# 5. Click "Save Changes"
# 6. Service redeploys automatically
```

### Frontend (Vercel):
```bash
# Option 1: Update environment.prod.ts (recommended)
code frontend/src/environments/environment.prod.ts
# Make changes, commit, and push

# Option 2: Vercel dashboard environment variables
# 1. Go to Vercel dashboard
# 2. Select project → Settings → Environment Variables
# 3. Update variables
# 4. Redeploy from Deployments tab
```

---

## 🚨 Emergency Rollback

### If deployment breaks:

**Vercel (Frontend):**
```bash
# 1. Go to Vercel → Project → Deployments
# 2. Find previous working deployment
# 3. Click three dots → Promote to Production
```

**Railway (Backend):**
```bash
# 1. Go to Railway → Backend → Deployments
# 2. Find previous working deployment
# 3. Click "Redeploy"
```

**Render (AI Service):**
```bash
# 1. Go to Render → Service → Events
# 2. Find previous working deployment
# 3. Click "Rollback to this deploy"
```

---

## 📊 Monitoring

### Check Service Health:

```bash
# Run health checks
./deployment/health-check.sh
```

### Check Logs:

**Railway Backend:**
```bash
# Dashboard → Backend → Deployments → Latest → Logs
```

**Render AI Service:**
```bash
# Dashboard → Service → Logs
```

**Vercel Frontend:**
```bash
# Dashboard → Project → Deployments → Latest → Build Logs
# For runtime errors: Browser console (F12)
```

### Monitor Free Tier Usage:

**Railway:**
- Dashboard → Usage → Check hours used

**Render:**
- Dashboard → Account → Usage

**MongoDB Atlas:**
- Dashboard → Cluster → Metrics → Storage & Connections

**Upstash Redis:**
- Dashboard → Database → Metrics → Commands

---

## 🆘 Common Issues

### CORS Errors:
```bash
# Check these match exactly:
# Railway FRONTEND_URL = Vercel URL
# Render ALLOWED_ORIGINS = Vercel URL
```

### Build Fails:
```bash
# Check build logs in platform dashboard
# Common fixes:
# - Clear cache and redeploy
# - Check package.json dependencies
# - Verify build command is correct
```

### Connection Errors:
```bash
# MongoDB: Check Network Access allows 0.0.0.0/0
# Redis: Verify credentials are correct
# API: Check environment URLs have https://
```

### 404 Errors:
```bash
# Frontend: Check output directory in Vercel
# Backend: Check route paths match
# API: Verify environment.prod.ts URLs are correct
```

---

## 💡 Pro Tips

1. **Keep Services Alive (Free Tier):**
   - Set up cron jobs to ping services every 14 minutes
   - Prevents Render from spinning down
   - Use: https://cron-job.org

2. **Enable Auto-Deploy:**
   - All platforms support GitHub auto-deploy
   - Push to `main` branch deploys automatically

3. **Use Environment Variables:**
   - Never hardcode URLs or secrets
   - Use platform environment variables
   - Keep `.env` files in `.gitignore`

4. **Monitor Costs:**
   - Check usage weekly
   - Set up alerts when approaching limits
   - Plan upgrade path when needed

5. **Test Before Deploy:**
   - Test locally first
   - Use staging environment if available
   - Check all features after deployment

---

## 📚 Additional Resources

### Platform Documentation:
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Upstash Docs](https://docs.upstash.com/)

### Helpful Tools:
- [DNS Checker](https://dnschecker.org/) - Check domain propagation
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html) - Verify SSL certificates
- [Postman](https://www.postman.com/) - Test API endpoints
- [cron-job.org](https://cron-job.org/) - Free cron service to keep apps alive

### Community Support:
- [Vercel Discord](https://vercel.com/discord)
- [Railway Discord](https://discord.gg/railway)
- [Render Community](https://community.render.com/)

---

## 🎯 Deployment Checklist Summary

- [ ] Code on GitHub
- [ ] MongoDB Atlas setup
- [ ] Upstash Redis setup
- [ ] Railway backend deployed
- [ ] Render AI service deployed
- [ ] Vercel frontend deployed
- [ ] All URLs updated
- [ ] CORS configured
- [ ] Full testing complete
- [ ] Monitoring setup
- [ ] Custom domain (optional)

**See `QUICK-CHECKLIST.md` for detailed checklist.**

---

## 🎉 Success!

Once deployed, your app will be live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend.railway.app`
- **AI Service:** `https://your-ai-service.onrender.com`

**Total Cost: $0/month** (within free tier limits)

---

**Questions?** Check `DEPLOYMENT-GUIDE.md` for detailed troubleshooting.

**Good luck with your deployment! 🚀**

