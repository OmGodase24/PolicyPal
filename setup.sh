#!/bin/bash

# Policy Project Setup Script
echo "🚀 Setting up Policy Project..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js (v18 or higher) first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if MongoDB is running (optional)
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB is available${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB not detected. You can use Docker Compose or a cloud MongoDB instance.${NC}"
fi

# Setup Backend
echo -e "\n${BLUE}📦 Setting up Backend...${NC}"
cd backend

# Install backend dependencies
if [ -f "package.json" ]; then
    echo "Installing backend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Backend package.json not found${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo -e "${GREEN}✅ .env file created. Please update it with your configuration.${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to update MONGODB_URI and JWT_SECRET in .env${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

cd ..

# Setup Frontend
echo -e "\n${BLUE}📦 Setting up Frontend...${NC}"
cd frontend

# Install frontend dependencies
if [ -f "package.json" ]; then
    echo "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend package.json not found${NC}"
    exit 1
fi

cd ..

# Success message
echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. Update backend/.env with your MongoDB URI and JWT secret"
echo "2. Start MongoDB (if using local instance)"
echo "3. Run the applications:"
echo ""
echo -e "${YELLOW}   Backend:${NC}"
echo "   cd backend"
echo "   npm run start:dev"
echo ""
echo -e "${YELLOW}   Frontend:${NC}"
echo "   cd frontend"
echo "   npm start"
echo ""
echo -e "${YELLOW}   Or use Docker Compose:${NC}"
echo "   cd backend"
echo "   docker-compose up -d"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - API Docs: http://localhost:3000/api/docs"
echo "   - Frontend: http://localhost:4200"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
