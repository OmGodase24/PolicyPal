# PolicyPal AI Integration Setup Guide

## 🎯 Overview

This guide will help you integrate AI-powered policy Q&A into your existing PolicyPal application.

## 📋 Prerequisites

1. **OpenAI API Key** - Get from https://platform.openai.com/api-keys
2. **Python 3.11+** installed
3. **Docker & Docker Compose** (optional, for containerized setup)
4. **MongoDB** running (existing or new instance)

## 🚀 Quick Start

### 1. **Set Up AI Service**

```bash
# Navigate to AI service directory
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp env.example .env

# Edit .env file with your settings
# OPENAI_API_KEY=your_openai_api_key_here
# MONGODB_URI=mongodb://localhost:27017/policypal_ai
```

### 2. **Update NestJS Backend**

```bash
# Add AI module to your backend
cd backend

# Install new dependencies
npm install @nestjs/axios multer @types/multer form-data

# Add AI_SERVICE_URL to your backend .env
echo "AI_SERVICE_URL=http://localhost:8000" >> .env
```

Add the AI module to your `app.module.ts`:

```typescript
import { AIModule } from './modules/ai/ai.module';

@Module({
  imports: [
    // ... existing imports
    AIModule,
  ],
  // ...
})
export class AppModule {}
```

### 3. **Update Angular Frontend**

The AI chat component is already created. Add routing in your Angular app:

```typescript
// In your routing module
{
  path: 'ai-chat',
  loadComponent: () => import('./modules/ai-chat/ai-chat.component')
    .then(m => m.AIChatComponent),
  canActivate: [AuthGuard]
}
```

Add navigation link in your header:

```html
<a routerLink="/ai-chat" class="nav-link-inactive">
  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
  </svg>
  AI Assistant
</a>
```

## 🐳 **Docker Setup (Recommended)**

### 1. **Start All Services**

```bash
# Create .env file in root directory
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Start all services
docker-compose -f docker-compose.ai.yml up -d

# Check service health
docker-compose -f docker-compose.ai.yml ps
```

### 2. **Service URLs**
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **AI Service**: http://localhost:8000
- **AI Service Docs**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

## 🔧 **Manual Setup**

### 1. **Start MongoDB**
```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 mongo:7.0

# Or use your existing MongoDB instance
```

### 2. **Start AI Service**
```bash
cd ai-service
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. **Start Backend**
```bash
cd backend
npm run start:dev
```

### 4. **Start Frontend**
```bash
cd frontend
npm start
```

## 🧪 **Testing the Integration**

### 1. **Upload a Policy**
1. Navigate to http://localhost:4200/ai-chat
2. Click "Upload Policy" and select a PDF file
3. Wait for processing to complete

### 2. **Ask Questions**
Try these example questions:
- "What is my deductible?"
- "Which hospitals are covered?"
- "How do I file a claim?"
- "What's the coverage percentage for specialists?"

### 3. **API Testing**
```bash
# Health check
curl http://localhost:8000/health

# Upload policy (replace with actual file)
curl -X POST "http://localhost:8000/upload-policy" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@policy.pdf" \
  -F "user_id=test_user"

# Ask question
curl -X POST "http://localhost:8000/ask-question" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is my deductible?",
    "user_id": "test_user"
  }'
```

## ⚙️ **Configuration Options**

### **AI Service Settings** (ai-service/.env)
```env
# Model Configuration
EMBEDDING_MODEL=text-embedding-ada-002
CHAT_MODEL=gpt-3.5-turbo
MAX_TOKENS=800
MAX_CONTEXT_TOKENS=12000

# Processing Settings
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
SIMILARITY_THRESHOLD=0.7
MAX_SEARCH_RESULTS=5

# File Processing
MAX_FILE_SIZE=10485760  # 10MB
```

### **Backend Settings** (backend/.env)
```env
# AI Service Integration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=30000
```

## 🔒 **Security Considerations**

1. **API Keys**: Never commit API keys to version control
2. **File Uploads**: Validate file types and sizes
3. **Rate Limiting**: Implement rate limiting for AI endpoints
4. **User Authorization**: Ensure users can only access their own policies
5. **Data Privacy**: Consider data retention policies for uploaded documents

## 📊 **Monitoring & Logging**

### **Health Checks**
- AI Service: `GET /health`
- Vector Search: Monitor similarity scores
- Token Usage: Track OpenAI API usage

### **Performance Metrics**
- Upload time vs file size
- Processing time for embeddings
- Response time for questions
- Accuracy feedback from users

## 🔄 **Production Deployment**

### 1. **Environment Variables**
```env
# Production settings
NODE_ENV=production
OPENAI_API_KEY=your_production_api_key
MONGODB_URI=mongodb://your_production_db
AI_SERVICE_URL=https://your-ai-service-domain.com
```

### 2. **Scaling Considerations**
- Use **MongoDB Atlas Vector Search** for better performance
- Consider **Pinecone** or **Weaviate** for vector storage
- Implement **Redis** for caching frequently asked questions
- Add **load balancing** for AI service
- Use **AWS S3** or similar for PDF storage

### 3. **Alternative Models**
For cost optimization, consider:
- **Local LLMs**: Llama 2, Mistral, or Code Llama
- **Smaller Embeddings**: text-embedding-3-small
- **Custom Fine-tuning**: Train on insurance-specific data

## 🆘 **Troubleshooting**

### **Common Issues**

1. **"OpenAI API Error"**
   - Check API key validity
   - Verify sufficient credits
   - Check rate limits

2. **"PDF Processing Failed"**
   - Ensure PDF is text-based (not scanned)
   - Check file size limits
   - Verify file permissions

3. **"No Relevant Context Found"**
   - Check if embeddings were generated
   - Verify similarity threshold settings
   - Review question phrasing

4. **"Service Connection Failed"**
   - Verify all services are running
   - Check network connectivity
   - Review Docker container logs

### **Debug Commands**
```bash
# Check AI service logs
docker-compose -f docker-compose.ai.yml logs ai-service

# Check database contents
docker exec -it policypal-mongodb mongosh policypal_ai

# Test API endpoints
curl -v http://localhost:8000/health
```

## 🎓 **Next Steps**

1. **Analytics**: Add usage analytics and user feedback
2. **Improvements**: Implement conversation memory
3. **Features**: Add policy comparison capabilities
4. **Integration**: Connect with external insurance APIs
5. **Mobile**: Create mobile app with same AI features

## 📚 **Additional Resources**

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LangChain Documentation](https://docs.langchain.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Vector Search](https://www.mongodb.com/products/atlas/vector-search)

---

**🎉 Congratulations!** You now have a fully functional AI-powered policy Q&A system integrated with PolicyPal!
