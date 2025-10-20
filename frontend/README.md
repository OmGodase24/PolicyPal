# Policy Project Frontend

Enterprise-level Angular frontend application with Material Design and modern architecture.

## Features

- 🚀 **Angular 17** - Latest Angular framework with standalone components
- 🎨 **Material Design** - Beautiful and consistent UI components
- 🔐 **JWT Authentication** - Secure token-based authentication
- 🛡️ **Route Guards** - Protected routes and navigation
- 📱 **Responsive Design** - Mobile-first responsive layouts
- 🏗️ **Modular Architecture** - Clean, scalable code organization
- 🔄 **Lazy Loading** - Optimized module loading
- 🎯 **TypeScript** - Type-safe development

## Project Structure

```
src/
├── app/
│   ├── core/                    # Core functionality
│   │   ├── components/          # Shared core components
│   │   ├── guards/              # Route guards
│   │   ├── interceptors/        # HTTP interceptors
│   │   ├── models/              # Data models/interfaces
│   │   └── services/            # Core services
│   ├── modules/                 # Feature modules
│   │   ├── auth/                # Authentication module
│   │   ├── dashboard/           # Dashboard module
│   │   ├── policies/            # Policies management
│   │   └── profile/             # User profile
│   ├── shared/                  # Shared components/utilities
│   ├── app.component.ts         # Root component
│   ├── app.config.ts            # App configuration
│   └── app.routes.ts            # Route configuration
├── environments/                # Environment configurations
├── assets/                      # Static assets
└── styles.scss                  # Global styles
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Update `src/environments/environment.ts` for development:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:3000/api'
   };
   ```
   
   Update `src/environments/environment.prod.ts` for production:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://your-backend-api.com/api'
   };
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   ng serve
   ```

   The application will be available at `http://localhost:4200`

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run build:prod` - Build for production with optimizations
- `npm test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint the code
- `npm run e2e` - Run end-to-end tests
- `npm run analyze` - Analyze bundle size

## Architecture

### Core Module
Contains essential services and utilities used throughout the app:
- **AuthService** - Authentication and user management
- **ApiService** - HTTP client wrapper
- **NotificationService** - Toast notifications
- **LoadingService** - Global loading state

### Feature Modules
Each feature is organized as a lazy-loaded module:
- **AuthModule** - Login and registration
- **DashboardModule** - Main dashboard with statistics
- **PoliciesModule** - Policy CRUD operations
- **ProfileModule** - User profile management

### Guards and Interceptors
- **AuthGuard** - Protects authenticated routes
- **GuestGuard** - Redirects authenticated users
- **AuthInterceptor** - Adds JWT tokens to requests
- **ErrorInterceptor** - Global error handling

## Authentication Flow

1. User logs in through `/auth/login`
2. JWT token is stored in localStorage
3. AuthInterceptor adds token to all API requests
4. AuthGuard protects routes requiring authentication
5. Token expiration triggers automatic logout

## Deployment

### Build for Production

```bash
npm run build:prod
```

This creates a `dist/` folder with optimized production files.

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**
   Set `API_URL` in Vercel dashboard to your backend URL.

### Deploy to Netlify

1. **Build the project**
   ```bash
   npm run build:prod
   ```

2. **Deploy to Netlify**
   - Drag and drop the `dist/policy-project-frontend` folder to Netlify
   - Or connect your Git repository for automatic deployments

3. **Configure Redirects**
   Create `dist/policy-project-frontend/_redirects`:
   ```
   /*    /index.html   200
   ```

### Environment Variables

Set these environment variables in your deployment platform:

- `API_URL` - Backend API URL (e.g., `https://your-backend.herokuapp.com/api`)

## Features Overview

### Authentication
- Login and registration forms
- JWT token management
- Automatic token refresh
- Protected route navigation

### Dashboard
- User statistics overview
- Recent policies display
- Quick action buttons
- Responsive card layout

### Policy Management
- Create, read, update, delete policies
- Status management (draft, published, archived)
- Tag-based organization
- Search and filtering

### Profile Management
- View and edit user information
- Account status display
- Security settings

## Styling

The application uses Angular Material with a custom theme:
- **Primary Color**: Indigo
- **Accent Color**: Pink
- **Typography**: Roboto font family
- **Responsive Design**: Mobile-first approach

Custom SCSS utilities are available in `src/styles.scss` for:
- Layout utilities (margins, padding)
- Typography helpers
- Animation classes
- Responsive breakpoints

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run e2e
```

### Coverage Report
```bash
npm run test:coverage
```

## Performance Optimization

- **Lazy Loading** - Modules loaded on demand
- **OnPush Change Detection** - Optimized change detection
- **TrackBy Functions** - Efficient list rendering
- **Bundle Analysis** - Monitor bundle size
- **Tree Shaking** - Remove unused code

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Write unit tests for new features
4. Follow Angular style guide
5. Update documentation as needed

## License

This project is licensed under the MIT License.
