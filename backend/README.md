# Policy Project Backend

Enterprise-level NestJS backend with MongoDB and JWT authentication.

## Features

- 🚀 **NestJS Framework** - Scalable Node.js framework
- 🗄️ **MongoDB** - Document database with Mongoose ODM
- 🔐 **JWT Authentication** - Secure token-based authentication
- ✅ **Validation** - Request validation with class-validator
- 📚 **Swagger Documentation** - Auto-generated API docs
- 🛡️ **Security** - Global exception filters and logging
- 🏗️ **Modular Architecture** - Clean, maintainable code structure

## Project Structure

```
src/
├── common/                 # Shared utilities
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Auth guards
│   └── interceptors/      # Request/response interceptors
├── modules/               # Feature modules
│   ├── auth/             # Authentication module
│   │   ├── controllers/  # Auth controllers
│   │   ├── dto/          # Data transfer objects
│   │   ├── services/     # Auth services
│   │   └── strategies/   # Passport strategies
│   ├── users/            # Users module
│   │   ├── controllers/  # User controllers
│   │   ├── dto/          # User DTOs
│   │   ├── repositories/ # User repository
│   │   ├── schemas/      # Mongoose schemas
│   │   └── services/     # User services
│   └── policies/         # Policies module
│       ├── controllers/  # Policy controllers
│       ├── dto/          # Policy DTOs
│       ├── repositories/ # Policy repository
│       ├── schemas/      # Mongoose schemas
│       └── services/     # Policy services
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/policy-project
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:4200
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or update the connection string for a cloud instance.

5. **Run the application**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

## API Documentation

Once the application is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. 

### Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/users/profile` - Get current user profile (protected)

### Usage

1. Register or login to get an access token
2. Include the token in the Authorization header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run format` - Format the code

## Deployment

### Environment Variables

Make sure to set these environment variables in production:

```env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Deploy to Render/Heroku

1. **Render**: Connect your GitHub repo and set environment variables
2. **Heroku**: Use the Heroku CLI or connect via GitHub

## CORS Configuration

The application is configured to allow requests from the frontend URL specified in the environment variables. Update `FRONTEND_URL` to match your deployed frontend domain.

## Security Features

- **Global Exception Filter** - Centralized error handling
- **Request Validation** - Automatic DTO validation
- **JWT Authentication** - Secure token-based auth
- **CORS Protection** - Cross-origin request handling
- **Logging Middleware** - Request/response logging

## Module Development

Each module follows a consistent structure:
- **Controllers** - Handle HTTP requests
- **Services** - Business logic
- **Repositories** - Data access layer
- **DTOs** - Data validation and transformation
- **Schemas** - Database models

## Contributing

1. Follow the existing code structure
2. Add proper validation to DTOs
3. Include Swagger documentation
4. Write unit tests for new features
5. Update this README if needed

## License

This project is licensed under the MIT License.
