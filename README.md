# Policy Project - Enterprise Full-Stack Application

A comprehensive enterprise-level full-stack application built with Angular (frontend), NestJS (backend), and MongoDB (database). This project demonstrates modern web development practices with scalable architecture, security best practices, and deployment-ready configuration.

## 🚀 Features

### Backend (NestJS)
- ✅ **Modular Architecture** - Clean separation with controllers, services, repositories, DTOs, and schemas
- ✅ **MongoDB Integration** - Mongoose ODM with schema validation and indexing
- ✅ **JWT Authentication** - Secure token-based authentication with refresh tokens
- ✅ **Request Validation** - Class-validator DTOs with comprehensive validation
- ✅ **Swagger Documentation** - Auto-generated API documentation
- ✅ **Global Exception Handling** - Centralized error handling and logging
- ✅ **Security** - CORS, helmet, rate limiting, and input sanitization
- ✅ **Environment Configuration** - Flexible environment-based configuration

### Frontend (Angular)
- ✅ **Modern Angular 17** - Standalone components and latest features
- ✅ **Material Design** - Consistent and beautiful UI components
- ✅ **Modular Architecture** - Feature modules with lazy loading
- ✅ **Authentication Flow** - Login, registration, and protected routes
- ✅ **HTTP Interceptors** - Automatic token attachment and error handling
- ✅ **Route Guards** - Authentication and authorization protection
- ✅ **Responsive Design** - Mobile-first responsive layouts
- ✅ **TypeScript** - Full type safety and modern JavaScript features

### Deployment
- ✅ **Docker Support** - Containerized applications with multi-stage builds
- ✅ **Cloud Ready** - Configured for Vercel, Netlify, Heroku, and Render
- ✅ **CORS Configuration** - Proper cross-origin resource sharing setup
- ✅ **Environment Variables** - Secure configuration management
- ✅ **Health Checks** - Application health monitoring endpoints

## 📁 Project Structure

```
PolicyProject/
├── backend/                     # NestJS Backend
│   ├── src/
│   │   ├── common/              # Shared utilities (guards, filters, interceptors)
│   │   ├── modules/             # Feature modules
│   │   │   ├── auth/            # Authentication module
│   │   │   ├── users/           # User management module
│   │   │   └── policies/        # Policy management module
│   │   ├── app.module.ts        # Root module
│   │   └── main.ts              # Application entry point
│   ├── Dockerfile               # Docker configuration
│   ├── docker-compose.yml       # Local development setup
│   └── package.json             # Dependencies and scripts
│
├── frontend/                    # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            # Core services and utilities
│   │   │   ├── modules/         # Feature modules (auth, dashboard, policies)
│   │   │   ├── shared/          # Shared components
│   │   │   └── app.component.ts # Root component
│   │   ├── environments/        # Environment configurations
│   │   └── styles.scss          # Global styles
│   ├── Dockerfile               # Docker configuration
│   ├── nginx.conf               # Nginx configuration
│   ├── vercel.json              # Vercel deployment config
│   ├── netlify.toml             # Netlify deployment config
│   └── package.json             # Dependencies and scripts
│
└── README.md                    # This file
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn
- Docker (optional)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PolicyProject
   ```

2. **Start with Docker Compose**
   ```bash
   cd backend
   docker-compose up -d
   ```

   This will start:
   - MongoDB on port 27017
   - Backend API on port 3000
   - Swagger docs at http://localhost:3000/api/docs

3. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

   Frontend will be available at http://localhost:4200

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your MongoDB URI and JWT secret:
   ```env
   MONGODB_URI=mongodb://localhost:27017/policy-project
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   PORT=3000
   FRONTEND_URL=http://localhost:4200
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Start the backend**
   ```bash
   npm run start:dev
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update environment** (if needed)
   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api'
   };
   ```

4. **Start the frontend**
   ```bash
   npm start
   ```

## 🚀 Deployment

### 🎯 **Quick Start: FREE Deployment Guide**

We've created comprehensive deployment guides for deploying PolicyPal **completely FREE**!

**Choose your guide:**

📚 **[Complete Deployment Guide](./deployment/DEPLOYMENT-GUIDE.md)**
- Detailed step-by-step instructions
- All platforms covered
- Troubleshooting included
- **Start here if you're familiar with deployment**

🎓 **[Beginner's Deployment Guide](./deployment/BEGINNER-GUIDE.md)**
- Assumes zero deployment experience
- Screenshots and explanations
- Every single step explained
- **Start here if this is your first deployment**

✅ **[Quick Checklist](./deployment/QUICK-CHECKLIST.md)**
- Printable checklist to track progress
- Quick reference for each step
- **Use alongside other guides**

📊 **[Deployment Summary](./deployment/DEPLOYMENT-SUMMARY.md)**
- Overview of architecture
- Platform explanations
- Request flow diagrams
- **Read this first for the big picture**

### 🆓 FREE Deployment Stack

Your PolicyPal app will be deployed using these FREE platforms:

| Component | Platform | Free Tier | Cost |
|-----------|----------|-----------|------|
| **Frontend** (Angular) | Vercel | Unlimited | $0 |
| **Backend** (NestJS) | Railway | 500 hours/month | $0 |
| **AI Service** (Python) | Render | 750 hours/month | $0 |
| **Database** (MongoDB) | Atlas | 512 MB | $0 |
| **Cache** (Redis) | Upstash | 10K req/day | $0 |
| **Total** | - | - | **$0/month** 🎉 |

### 📦 What You'll Get

After deployment:
- ✅ Live website accessible worldwide
- ✅ Professional URLs (e.g., `https://your-app.vercel.app`)
- ✅ SSL certificates (HTTPS)
- ✅ Auto-deployment on git push
- ✅ Cloud database and caching
- ✅ Email sending configured
- ✅ Production-ready architecture

### 🚀 Quick Deployment (2 hours)

**Prerequisites:**
- GitHub account
- Your code pushed to GitHub
- 2-3 hours of time

**Steps:**
1. Setup MongoDB Atlas (database) - 15 min
2. Setup Upstash Redis (cache) - 10 min
3. Deploy Backend to Railway - 20 min
4. Deploy AI Service to Render - 20 min
5. Deploy Frontend to Vercel - 15 min
6. Connect all services - 10 min
7. Testing - 20 min

**Full guides:** See [`deployment/`](./deployment/) folder

### 🛠️ Deployment Resources

All deployment files are in the `deployment/` folder:

```
deployment/
├── DEPLOYMENT-GUIDE.md              # Complete guide
├── BEGINNER-GUIDE.md                # First-time deployers
├── QUICK-CHECKLIST.md               # Progress tracker
├── DEPLOYMENT-SUMMARY.md            # Overview & diagrams
├── README.md                        # Deployment resources index
├── railway-backend.env.template     # Backend env vars
├── render-ai-service.env.template   # AI service env vars
├── vercel-frontend.env.template     # Frontend env vars
├── health-check.sh                  # Test all services
└── update-production-urls.ps1       # Bulk update URLs
```

### 📝 Environment Templates

Use these templates to configure your deployment:

```bash
# Copy templates and fill in your values
cp deployment/railway-backend.env.template deployment/.env.railway
cp deployment/render-ai-service.env.template deployment/.env.render
cp deployment/vercel-frontend.env.template deployment/.env.vercel
```

### 🧪 Test Your Deployment

After deployment, use the health check script:

```bash
# Update URLs in the script first
chmod +x deployment/health-check.sh
./deployment/health-check.sh
```

### 🆘 Need Help?

- **Troubleshooting:** See [Deployment Guide - Troubleshooting](./deployment/DEPLOYMENT-GUIDE.md#troubleshooting)
- **Beginner issues:** See [Beginner Guide](./deployment/BEGINNER-GUIDE.md)
- **Platform docs:** Links in each guide

## 🔧 Configuration

### CORS Setup

The backend is configured to accept requests from the frontend URL specified in the `FRONTEND_URL` environment variable. Update this for production deployment:

```env
# Development
FRONTEND_URL=http://localhost:4200

# Production
FRONTEND_URL=https://your-frontend-domain.com
```

### Environment Variables

#### Backend
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS

#### Frontend
- `API_URL`: Backend API URL

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api

### Available Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

#### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users` - Get all users (admin)
- `PATCH /api/users/:id` - Update user

#### Policies
- `GET /api/policies` - Get all policies
- `GET /api/policies/my-policies` - Get current user's policies
- `POST /api/policies` - Create new policy
- `GET /api/policies/:id` - Get policy by ID
- `PATCH /api/policies/:id` - Update policy
- `DELETE /api/policies/:id` - Delete policy

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                 # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                 # Unit tests
npm run test:coverage   # Coverage report
npm run e2e             # E2E tests
```

## 🔒 Security Features

### Backend Security
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Input Validation** - class-validator DTOs
- **CORS Protection** - Configured cross-origin requests
- **Rate Limiting** - Request throttling
- **Helmet** - Security headers
- **MongoDB Injection Prevention** - Mongoose sanitization

### Frontend Security
- **JWT Token Management** - Secure token storage and refresh
- **Route Guards** - Authentication and authorization
- **HTTP Interceptors** - Automatic error handling
- **XSS Protection** - Content Security Policy headers
- **Input Sanitization** - Form validation and sanitization

## 🔄 Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement backend API endpoints
   - Create corresponding frontend components
   - Write tests for new functionality

2. **Code Quality**
   - ESLint and Prettier for code formatting
   - TypeScript strict mode
   - Comprehensive error handling
   - Input validation on both frontend and backend

3. **Testing Strategy**
   - Unit tests for services and components
   - Integration tests for API endpoints
   - E2E tests for critical user flows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code structure and conventions
4. Write tests for new features
5. Update documentation as needed
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in each module's README
- Review the API documentation at `/api/docs`
- Create an issue in the repository

## 🎯 Future Enhancements

- [ ] Real-time notifications with WebSockets
- [ ] Advanced search and filtering
- [ ] File upload and document management
- [ ] Audit logging and activity tracking
- [ ] Multi-language support (i18n)
- [ ] Advanced user roles and permissions
- [ ] Integration with external services
- [ ] Mobile application (React Native/Flutter)

---

Built with ❤️ using modern web technologies and best practices.
