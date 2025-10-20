# 🚀 Quick Deployment Checklist

Use this checklist to track your deployment progress!

## ✅ Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] All secrets removed from code (no .env files committed)
- [ ] `.gitignore` includes `.env`, `node_modules/`, etc.
- [ ] Local testing complete (app runs without errors)

---

## 📦 Step 1: MongoDB Atlas (Database)

- [ ] Account created: https://mongodb.com/cloud/atlas
- [ ] Free M0 cluster created
- [ ] Database user created (username + password saved)
- [ ] Network access set to `0.0.0.0/0` (or specific IPs)
- [ ] Connection string copied and password replaced
- [ ] Connection string saved in secure notes

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/policypal?retryWrites=true&w=majority
```

---

## ⚡ Step 2: Upstash Redis (Cache)

- [ ] Account created: https://upstash.com
- [ ] Redis database created (regional, free)
- [ ] `UPSTASH_REDIS_REST_URL` copied
- [ ] `UPSTASH_REDIS_REST_TOKEN` copied
- [ ] Credentials saved in secure notes

---

## 🚂 Step 3: Railway (Backend)

- [ ] Account created: https://railway.app
- [ ] Signed in with GitHub
- [ ] New project created from GitHub repo
- [ ] Backend service configured:
  - [ ] Root directory: `backend`
  - [ ] Build command: `npm ci && npm run build`
  - [ ] Start command: `node dist/main.js`
- [ ] Environment variables added (all from template)
- [ ] Public domain generated
- [ ] Backend URL copied: `https://backend-production-xxxx.up.railway.app`
- [ ] Deployment successful (green checkmark)
- [ ] Health check works: `/health` returns 200 OK

**Backend URL:** ___________________________________

---

## 🎨 Step 4: Render (AI Service)

- [ ] Account created: https://render.com
- [ ] Signed in with GitHub
- [ ] New Web Service created from GitHub repo
- [ ] Service configured:
  - [ ] Name: `policypal-ai-service`
  - [ ] Root directory: `ai-service`
  - [ ] Runtime: Python 3
  - [ ] Build command: `pip install -r requirements.txt`
  - [ ] Start command: `uvicorn main:app --host 0.0.0.0 --port 8080`
  - [ ] Instance: Free
- [ ] Environment variables added (all from template)
- [ ] Deployment successful
- [ ] Service URL copied: `https://policypal-ai-service.onrender.com`
- [ ] Health check works: `/` returns 200 OK

**AI Service URL:** ___________________________________

---

## 🎯 Step 5: Update Backend with AI URL

- [ ] Railway dashboard → backend → Variables
- [ ] `AI_SERVICE_URL` updated to Render URL
- [ ] Backend redeployed automatically
- [ ] Backend health check still works

---

## 🌐 Step 6: Vercel (Frontend)

- [ ] `environment.prod.ts` updated with:
  - [ ] `apiUrl`: Railway backend URL + `/api`
  - [ ] `socketUrl`: Railway backend URL
  - [ ] `aiServiceUrl`: Render AI service URL
  - [ ] `websocketUrl`: Railway backend URL with `wss://`
- [ ] Changes committed and pushed to GitHub
- [ ] Account created: https://vercel.com
- [ ] Signed in with GitHub
- [ ] Project imported from GitHub
- [ ] Project configured:
  - [ ] Root directory: `frontend`
  - [ ] Framework: Angular
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist/frontend/browser` (or correct path)
- [ ] Deployment successful
- [ ] Frontend URL copied: `https://policy-pal-xxxx.vercel.app`
- [ ] Site loads in browser (no blank page)

**Frontend URL:** ___________________________________

---

## 🔄 Step 7: Update CORS Settings

### Railway Backend:
- [ ] Dashboard → backend → Variables
- [ ] `FRONTEND_URL` updated to Vercel URL (exact, with https://)
- [ ] Backend redeployed
- [ ] No CORS errors in browser console

### Render AI Service:
- [ ] Dashboard → policypal-ai-service → Environment
- [ ] `ALLOWED_ORIGINS` updated to Vercel URL
- [ ] Service redeployed
- [ ] No CORS errors when using AI features

---

## 🧪 Step 8: Testing

### Backend Tests:
- [ ] Health endpoint works: `curl https://backend-url/health`
- [ ] API responds: `curl https://backend-url/api/...`
- [ ] No errors in Railway logs

### AI Service Tests:
- [ ] Health endpoint works: `curl https://ai-service-url/`
- [ ] Service responds to requests
- [ ] No errors in Render logs

### Frontend Tests:
- [ ] Site loads correctly
- [ ] No console errors (F12 → Console)
- [ ] Registration works
- [ ] Email verification received
- [ ] Login works
- [ ] JWT token stored
- [ ] MFA setup works (if enabled)
- [ ] Create policy works
- [ ] Upload PDF works
- [ ] AI chat works
- [ ] All pages responsive (mobile, tablet, desktop)

### Database Tests:
- [ ] MongoDB Atlas → Database → Browse Collections
- [ ] Users created successfully
- [ ] Policies created successfully
- [ ] Data persists correctly

### Integration Tests:
- [ ] Frontend → Backend communication works
- [ ] Backend → AI Service communication works
- [ ] Backend → MongoDB connection stable
- [ ] Backend → Redis connection stable
- [ ] WebSocket connection works (if used)
- [ ] File uploads work
- [ ] Email sending works

---

## 🎨 Step 9: Custom Domain (Optional)

- [ ] Domain purchased (GoDaddy, Namecheap, etc.)
- [ ] Vercel → Project → Settings → Domains
- [ ] Domain added: `yourdomain.com` and `www.yourdomain.com`
- [ ] DNS records added at domain registrar
- [ ] DNS propagation complete (check: https://dnschecker.org)
- [ ] SSL certificate auto-generated by Vercel
- [ ] Site loads at custom domain
- [ ] Update `environment.prod.ts` with custom domain
- [ ] Update Railway `FRONTEND_URL` to custom domain
- [ ] Update Render `ALLOWED_ORIGINS` to custom domain
- [ ] All services redeployed

**Custom Domain:** ___________________________________

---

## 📊 Step 10: Monitoring & Optimization

### Setup Monitoring:
- [ ] Uptime monitoring (e.g., UptimeRobot.com - free)
- [ ] Error tracking (e.g., Sentry.io - free tier)
- [ ] Analytics (e.g., Google Analytics)

### Keep Services Alive (Free Tier):
- [ ] Cron job pinging backend every 14 minutes (cron-job.org)
- [ ] Cron job pinging AI service every 14 minutes

### Backup:
- [ ] MongoDB Atlas automated backups enabled
- [ ] Code backed up in GitHub
- [ ] Environment variables documented securely

### Performance:
- [ ] Images optimized/compressed
- [ ] Caching enabled (Redis)
- [ ] CDN enabled (Vercel automatic)
- [ ] Lazy loading implemented

---

## 🚨 Troubleshooting Checks

If something doesn't work:

- [ ] Check all URLs have `https://` (not `http://`)
- [ ] Check no trailing slashes on URLs (or consistent usage)
- [ ] Check MongoDB connection string password (special chars URL-encoded)
- [ ] Check Railway backend logs for errors
- [ ] Check Render AI service logs for errors
- [ ] Check Vercel build logs for errors
- [ ] Check browser console (F12) for frontend errors
- [ ] Verify all environment variables are set correctly
- [ ] Verify CORS settings match exactly
- [ ] Test each service independently with curl/Postman
- [ ] Check free tier limits not exceeded
- [ ] Wait 1-2 minutes after env var changes (redeploy time)

---

## 📝 Credentials Checklist

**Save these securely (use password manager):**

- [ ] MongoDB connection string
- [ ] MongoDB username & password
- [ ] Upstash Redis URL & token
- [ ] JWT secret
- [ ] SMTP credentials
- [ ] OpenAI API key
- [ ] Railway backend URL
- [ ] Render AI service URL
- [ ] Vercel frontend URL
- [ ] GitHub repository URL

---

## 🎉 Final Verification

- [ ] All services deployed successfully
- [ ] All tests passing
- [ ] No console errors
- [ ] No CORS errors
- [ ] Frontend fully functional
- [ ] Backend API responsive
- [ ] AI service responsive
- [ ] Database connected
- [ ] Redis connected
- [ ] Emails sending
- [ ] File uploads working
- [ ] Mobile responsive
- [ ] Desktop responsive
- [ ] Custom domain working (if applicable)
- [ ] Monitoring setup
- [ ] Backups configured

---

## 💰 Cost Tracking

| Service | Free Tier Limit | Current Usage | Status |
|---------|----------------|---------------|--------|
| Railway | 500 hours/month | _____ hours | ⚠️ Monitor |
| Render | 750 hours/month | _____ hours | ⚠️ Monitor |
| Vercel | Unlimited | - | ✅ OK |
| MongoDB Atlas | 512MB storage | _____ MB | ⚠️ Monitor |
| Upstash Redis | 10,000 req/day | _____ req | ⚠️ Monitor |

**Total Monthly Cost:** $0 (if within limits) 🎉

---

## 🚀 Upgrade Path (When Needed)

When you exceed free tier limits:

- [ ] Railway Hobby Plan: $5/month (no sleep, more hours)
- [ ] Render Starter Plan: $7/month (no sleep, more memory)
- [ ] MongoDB Atlas M10: $9/month (2GB storage)
- [ ] Upstash Pro: $10/month (unlimited requests)
- [ ] Vercel Pro: $20/month (team features, more bandwidth)

---

**Deployment Date:** ___________________________________

**Deployed By:** ___________________________________

**Notes:**
___________________________________________________________
___________________________________________________________
___________________________________________________________

---

**🎊 Congratulations on your deployment!** 🎊

Remember to:
- Monitor usage regularly
- Keep dependencies updated
- Back up your database
- Test new features before deploying
- Document any configuration changes

**Need help?** Refer to `DEPLOYMENT-GUIDE.md` for detailed troubleshooting.

