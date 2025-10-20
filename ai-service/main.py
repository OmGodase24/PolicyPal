# PolicyPal AI Service - Main FastAPI Application
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import uvicorn

# Load environment variables from .env file
load_dotenv()

# Debug: Show what environment variables are loaded
print(f"🔍 AI Service Environment Variables:")
print(f"🔍 MONGODB_URI: {os.getenv('MONGODB_URI', 'NOT_SET')}")
print(f"🔍 OPENAI_API_KEY: {os.getenv('OPENAI_API_KEY', 'NOT_SET')[:20]}...")
print(f"🔍 CHAT_MODEL: {os.getenv('CHAT_MODEL', 'NOT_SET')}")
print(f"🔍 Current working directory: {os.getcwd()}")
print(f"🔍 .env file path: {os.path.join(os.getcwd(), '.env')}")
print(f"🔍 .env file exists: {os.path.exists('.env')}")

from services.pdf_processor import PDFProcessor
from services.ai_service import AIService
from services.database import DatabaseService
from services.dlp_service import DLPService, DLPScanResult
from services.privacy_service import PrivacyService, PrivacyImpactAssessment
from services.cache import cache
from models.schemas import PolicyDocument, QuestionRequest, AnswerResponse, ComplianceRequest, ComplianceResponse

# Initialize services
pdf_processor = PDFProcessor()
ai_service = AIService()
db_service = DatabaseService()
dlp_service = DLPService()
privacy_service = PrivacyService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    await db_service.connect()
    print("✅ Connected to MongoDB")
    print("🚀 PolicyPal AI Service started successfully!")
    
    # Start cache cleanup task
    asyncio.create_task(periodic_cache_cleanup())
    
    yield
    
    # Shutdown
    await db_service.close()
    print("🛑 PolicyPal AI Service shutdown complete")

async def periodic_cache_cleanup():
    """Clean up expired cache entries every 5 minutes"""
    while True:
        await asyncio.sleep(300)  # 5 minutes
        cache.cleanup_expired()
        print(f"🧹 Cache cleanup completed. Active entries: {len(cache.cache)}")

# Initialize FastAPI app
app = FastAPI(
    title="PolicyPal AI Service",
    description="AI-powered policy document Q&A service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for NestJS backend and Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # NestJS backend
        "http://localhost:4200",  # Angular frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    ocr_status = pdf_processor.is_ocr_available()
    return {
        "status": "healthy", 
        "service": "PolicyPal AI Service",
        "ocr_available": ocr_status,
        "features": {
            "text_extraction": True,
            "ocr_extraction": ocr_status,
            "ai_processing": True,
            "compliance_checking": True
        }
    }

@app.get("/debug/chunks")
async def debug_chunks(
    document_id: str = Query(None),
    user_id: str = Query(None)
):
    """Debug endpoint to check what chunks exist in the database"""
    try:
        debug_info = await db_service.debug_chunks(document_id, user_id)
        return debug_info
    except Exception as e:
        return {"error": str(e)}

@app.post("/debug/test-chunk-storage")
async def test_chunk_storage(
    document_id: str = Form(...),
    user_id: str = Form(...),
    text: str = Form(...)
):
    """Test endpoint to manually store and retrieve chunks"""
    try:
        # Create a test chunk
        test_chunk = {
            "text": text,
            "embedding": [0.1] * 1536,  # Mock embedding
            "created_at": datetime.now()
        }
        
        # Store the chunk
        success = await db_service.store_document_chunks(
            chunks=[test_chunk],
            document_id=document_id,
            user_id=user_id
        )
        
        # Try to retrieve it
        chunks = await db_service.get_document_chunks(document_id, user_id)
        
        return {
            "storage_success": success,
            "chunks_found": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/upload-policy", response_model=dict)
async def upload_policy(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    policy_id: str = Form(None)
):
    """
    Upload and process a policy PDF document
    
    1. Extract text from PDF
    2. Split into chunks
    3. Generate embeddings
    4. Store in vector database
    """
    
    try:
        print(f"🔍 AI Service: Received upload request")
        print(f"🔍 File: {file.filename}, Size: {file.size}, Content-Type: {file.content_type}")
        print(f"🔍 User ID: {user_id}, Policy ID: {policy_id}")
        
        # Validate required parameters
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not policy_id:
            raise HTTPException(status_code=400, detail="policy_id is required")
        
        # Validate file
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read file content
        content = await file.read()
        print(f"🔍 File content length: {len(content)} bytes")
        
        # Process PDF
        print(f"🔍 Extracting text from PDF...")
        text = pdf_processor.extract_text_from_bytes(content)
        print(f"🔍 Extracted text length: {len(text)} characters")
        
        if not text.strip():
            ocr_available = pdf_processor.is_ocr_available()
            error_msg = "No text could be extracted from PDF"
            if ocr_available:
                error_msg += ". This appears to be a scanned document, but OCR processing failed."
            else:
                error_msg += ". This appears to be a scanned document, but OCR is not available. Please install Tesseract OCR for scanned document support."
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Store in database
        print(f"🔍 Processing and storing document...")
        document_id = await ai_service.process_and_store_document(
            text=text,
            filename=file.filename,
            user_id=user_id,
            policy_id=policy_id
        )
        print(f"🔍 Document stored with ID: {document_id}")
        
        return {
            "document_id": document_id,
            "message": "Policy uploaded and processed successfully",
            "text_length": len(text),
            "chunks_created": len(text) // 1000 + 1,  # Approximate chunk count
            "extracted_text": text  # Return the extracted text for backend storage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/ask-question", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """
    Ask a question about a specific policy or all user's policies
    
    1. Find relevant document chunks using vector similarity
    2. Send context + question to AI model
    3. Return structured answer
    """
    
    try:
        print(f"🔍 Ask Question: Received request")
        print(f"🔍 Ask Question: Question: {request.question}")
        print(f"🔍 Ask Question: User ID: {request.user_id}")
        print(f"🔍 Ask Question: Policy ID: {request.policy_id}")
        print(f"🔍 Ask Question: Images: {len(request.images) if request.images else 0}")
        
        # Get relevant context from vector search
        relevant_chunks = await ai_service.find_relevant_context(
            question=request.question,
            user_id=request.user_id,
            policy_id=request.policy_id,
            limit=5  # Top 5 most relevant chunks
        )
        
        print(f"🔍 Ask Question: Found {len(relevant_chunks)} relevant chunks")
        
        # Handle image-related questions with REAL image analysis
        if request.images and len(request.images) > 0:
            print(f"🔍 Ask Question: Processing question with {len(request.images)} images")
            
            # Use vision model to analyze images
            try:
                image_analysis = await ai_service.analyze_images_with_vision(
                    images=request.images,
                    question=request.question,
                    policy_context=relevant_chunks
                )
                
                print(f"🔍 Ask Question: Image analysis completed")
                return AnswerResponse(
                    answer=image_analysis,
                    sources=[],
                    confidence=0.7,  # Moderate confidence for vision model responses
                    policy_id=request.policy_id,
                    user_id=request.user_id
                )
            except Exception as e:
                print(f"🔍 Ask Question: Image analysis failed: {e}")
                return AnswerResponse(
                    answer=f"I can see you've uploaded {len(request.images)} image(s) with your question. I attempted to analyze the images but encountered an error. Please describe what you see in the images, and I'll help you understand how it relates to your policy.",
                    sources=[],
                    confidence=0.3,  # Low confidence due to error
                    policy_id=request.policy_id,
                    user_id=request.user_id
                )
        
        # If no chunks found but images are provided, use image context
        if not relevant_chunks and request.images and len(request.images) > 0:
            print("🔍 Ask Question: No chunks found, using image context")
            return AnswerResponse(
                answer=f"I can see you've uploaded {len(request.images)} image(s) with your question. I can help you analyze policy documents, insurance cards, or other policy-related images. Please describe what specific information you're looking for in these images, and I'll do my best to help you understand the content.",
                sources=[],
                confidence=0.5,  # Medium confidence - informational response
                policy_id=request.policy_id,
                user_id=request.user_id
            )
        
        if not relevant_chunks:
            return AnswerResponse(
                answer="I couldn't find any relevant information in your policy documents to answer this question.",
                sources=[],
                confidence=0.2,  # Low confidence - no relevant information found
                policy_id=request.policy_id,
                user_id=request.user_id
            )
        
        # Generate AI response with history and images if provided
        response = await ai_service.generate_answer(
            question=request.question,
            context_chunks=relevant_chunks,
            policy_id=request.policy_id,
            user_id=request.user_id,
            history=request.history,
            images=request.images
        )
        
        return response
        
    except Exception as e:
        print(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")

@app.post("/summarize-policy")
async def summarize_policy(request: dict):
    """
    Generate AI summary for a policy document
    """
    try:
        user_id = request.get("user_id")
        policy_id = request.get("policy_id")
        
        print(f"AI Service: Summarizing policy {policy_id} for user {user_id}")
        
        if not user_id or not policy_id:
            raise HTTPException(status_code=400, detail="user_id and policy_id are required")
        
        # Get policy document from main backend database
        policy_doc = await db_service.get_policy(policy_id, user_id)
        if not policy_doc:
            print(f"AI Service: Policy {policy_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Check if policy has PDF text
        pdf_text = policy_doc.get('pdfText', '')
        if not pdf_text:
            print(f"AI Service: Policy {policy_id} has no PDF text content, trying to reconstruct from chunks...")
            
            # Try to reconstruct text from stored chunks
            try:
                chunks = await db_service.get_document_chunks(policy_id, user_id)
                if chunks:
                    # Reconstruct text from chunks
                    pdf_text = ' '.join([chunk.get('text', '') for chunk in chunks])
                    print(f"AI Service: Reconstructed text from {len(chunks)} chunks: {len(pdf_text)} characters")
                else:
                    print(f"AI Service: No chunks found for policy {policy_id}")
                    raise HTTPException(status_code=400, detail="Policy has no PDF text content and no chunks available")
            except Exception as e:
                print(f"AI Service: Failed to reconstruct text from chunks: {e}")
                raise HTTPException(status_code=400, detail="Policy has no PDF text content")
        else:
            print(f"AI Service: Using stored PDF text: {len(pdf_text)} characters")
        
        print(f"AI Service: Generating summary for policy {policy_id} with {len(pdf_text)} characters")
        
        # Generate summary using AI
        summary = await ai_service.generate_policy_summary(pdf_text)
        
        print(f"AI Service: Successfully generated summary for policy {policy_id}")
        
        return {
            "summary": summary,
            "policy_id": policy_id,
            "user_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")


@app.get("/policies/{document_id}")
async def get_policy_document(document_id: str, user_id: str = None):
    """Get a specific policy document from main backend database"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
            
        print(f"AI Service: Looking for policy {document_id} for user {user_id}")
        document = await db_service.get_policy(document_id, user_id)
        
        if not document:
            print(f"AI Service: Policy {document_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Document not found")
            
        print(f"AI Service: Found policy {document_id} with text length: {len(document.get('pdfText', ''))}")
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting policy document: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting policy document: {str(e)}")

@app.delete("/policies/{document_id}")
async def delete_policy_document(document_id: str, user_id: str = None):
    """Delete a policy document and all its chunks"""
    try:
        success = await db_service.delete_policy_document(document_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting policy document: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting policy document: {str(e)}")

@app.get("/stats")
async def get_stats(user_id: str = None):
    """Get AI service statistics"""
    try:
        stats = await db_service.get_stats(user_id)
        return stats
    except Exception as e:
        print(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

# Compliance Checking Endpoints
@app.post("/compliance/check", response_model=ComplianceResponse)
async def check_compliance(request: ComplianceRequest):
    """
    Check policy compliance against specified regulation framework
    """
    try:
        # Get the policy text from database
        policy = await db_service.get_policy(request.policy_id, request.user_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Get policy text (prefer PDF text if available, otherwise content)
        policy_text = policy.get("pdfText") or policy.get("content", "")
        if not policy_text:
            print(f"AI Service: Policy {request.policy_id} has no PDF text content, trying to reconstruct from chunks...")
            
            # Try to reconstruct text from stored chunks
            try:
                chunks = await db_service.get_document_chunks(request.policy_id, request.user_id)
                if chunks:
                    # Reconstruct text from chunks
                    policy_text = ' '.join([chunk.get('text', '') for chunk in chunks])
                    print(f"AI Service: Reconstructed text from {len(chunks)} chunks: {len(policy_text)} characters")
                else:
                    print(f"AI Service: No chunks found for policy {request.policy_id}")
                    raise HTTPException(status_code=400, detail="No policy text available for compliance checking")
            except Exception as e:
                print(f"AI Service: Failed to reconstruct text from chunks: {e}")
                raise HTTPException(status_code=400, detail="No policy text available for compliance checking")
        else:
            print(f"AI Service: Using stored PDF text: {len(policy_text)} characters")
        
        # Perform compliance check
        compliance_report = await ai_service.check_policy_compliance(
            policy_text=policy_text,
            policy_id=request.policy_id,
            user_id=request.user_id,
            regulation_framework=request.regulation_framework
        )
        
        return ComplianceResponse(
            success=True,
            report=compliance_report,
            message="Compliance check completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking compliance: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking compliance: {str(e)}")

@app.get("/compliance/regulations")
async def get_available_regulations():
    """
    Get list of available regulation frameworks for compliance checking
    """
    try:
        regulations = await ai_service.get_available_regulations()
        return {
            "success": True,
            "regulations": regulations,
            "message": "Available regulations retrieved successfully"
        }
    except Exception as e:
        print(f"Error getting regulations: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting regulations: {str(e)}")

@app.post("/compliance/check-file")
async def check_compliance_from_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    policy_id: str = Form(...),
    regulation_framework: str = Form("insurance_standards")
):
    """
    Check compliance directly from uploaded file
    """
    try:
        # Extract text from uploaded file
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Read file content
        file_content = await file.read()
        
        # Extract text using PDF processor
        extracted_text = pdf_processor.extract_text_from_bytes(file_content)
        if not extracted_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF file")
        
        # Perform compliance check
        compliance_report = await ai_service.check_policy_compliance(
            policy_text=extracted_text,
            policy_id=policy_id,
            user_id=user_id,
            regulation_framework=regulation_framework
        )
        
        return ComplianceResponse(
            success=True,
            report=compliance_report,
            message="Compliance check completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking compliance from file: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking compliance from file: {str(e)}")

@app.post("/compliance/refresh", response_model=ComplianceResponse)
async def refresh_compliance(request: ComplianceRequest):
    """
    Force refresh compliance report using AI analysis (bypasses cache)
    """
    try:
        # Get the policy text from database
        policy = await db_service.get_policy(request.policy_id, request.user_id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        # Get policy text with fallback to chunks
        policy_text = policy.get("pdfText", "")
        if not policy_text:
            print(f"AI Service: Policy {request.policy_id} has no PDF text content, trying to reconstruct from chunks...")
            
            # Try to reconstruct text from stored chunks
            try:
                chunks = await db_service.get_document_chunks(request.policy_id, request.user_id)
                if chunks:
                    # Reconstruct text from chunks
                    policy_text = ' '.join([chunk.get('text', '') for chunk in chunks])
                    print(f"AI Service: Reconstructed text from {len(chunks)} chunks: {len(policy_text)} characters")
                else:
                    print(f"AI Service: No chunks found for policy {request.policy_id}")
                    raise HTTPException(status_code=400, detail="No policy text available for compliance refresh")
            except Exception as e:
                print(f"AI Service: Failed to reconstruct text from chunks: {e}")
                raise HTTPException(status_code=400, detail="No policy text available for compliance refresh")
        else:
            print(f"AI Service: Using stored PDF text: {len(policy_text)} characters")
        
        # Perform fresh compliance check with AI
        compliance_report = await ai_service.refresh_compliance_report(
            policy_text=policy_text,
            policy_id=request.policy_id,
            user_id=request.user_id,
            regulation_framework=request.regulation_framework or "insurance_standards"
        )
        
        return ComplianceResponse(
            success=True,
            report=compliance_report,
            message="Compliance report refreshed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refreshing compliance: {e}")
        raise HTTPException(status_code=500, detail=f"Error refreshing compliance: {str(e)}")

@app.get("/compliance/history/{policy_id}")
async def get_compliance_history(policy_id: str, user_id: str = Query(..., description="User ID")):
    """
    Get compliance report history for a policy
    """
    try:
        history = await ai_service.get_compliance_history(policy_id, user_id)
        
        return {
            "success": True,
            "data": [
                {
                    "overall_score": report.overall_score,
                    "overall_level": report.overall_level.value,
                    "regulation_framework": report.regulation_framework,
                    "generated_at": report.generated_at.isoformat(),
                    "checks": [
                        {
                            "check_name": check.check_name,
                            "level": check.level.value,
                            "score": check.score,
                            "message": check.message,
                            "evidence": check.evidence,
                            "recommendation": check.recommendation
                        }
                        for check in report.checks
                    ]
                }
                for report in history
            ],
            "message": f"Retrieved {len(history)} compliance reports"
        }
        
    except Exception as e:
        print(f"Error getting compliance history: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting compliance history: {str(e)}")

@app.get("/compliance/analytics/{user_id}")
async def get_compliance_analytics(user_id: str):
    """
    Get all compliance reports for a user (for analytics)
    """
    try:
        # Get all compliance reports for the user
        query = {"user_id": user_id}
        results = await db_service.find("compliance_reports", query)
        
        reports = []
        for result in results:
            checks = []
            for check_data in result.get("checks", []):
                checks.append({
                    "check_name": check_data.get("check_name", ""),
                    "level": check_data.get("level", "unknown"),
                    "score": check_data.get("score", 0.0),
                    "message": check_data.get("message", ""),
                    "evidence": check_data.get("evidence", []),
                    "recommendation": check_data.get("recommendation", "")
                })
            
            reports.append({
                "policy_id": result.get("policy_id", ""),
                "user_id": result.get("user_id", ""),
                "overall_score": result.get("overall_score", 0.0),
                "overall_level": result.get("overall_level", "unknown"),
                "regulation_framework": result.get("regulation_framework", ""),
                "generated_at": result.get("generated_at", datetime.now()).isoformat() if isinstance(result.get("generated_at"), datetime) else result.get("generated_at", datetime.now().isoformat()),
                "checks": checks
            })
        
        return {
            "success": True,
            "data": reports,
            "message": f"Retrieved {len(reports)} compliance reports for analytics"
        }
        
    except Exception as e:
        print(f"Error getting compliance analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting compliance analytics: {str(e)}")

# Language Detection and Translation Endpoints
@app.post("/detect-language")
async def detect_language(request: dict):
    """
    Detect the language of the given text
    """
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        detected_language = ai_service.detect_language(text)
        
        return {
            "success": True,
            "language": detected_language,
            "message": f"Language detected as {detected_language}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error detecting language: {e}")
        raise HTTPException(status_code=500, detail=f"Error detecting language: {str(e)}")


@app.post("/translate")
async def translate_text(request: dict):
    """
    Translate text to target language
    """
    try:
        text = request.get("text", "")
        target_language = request.get("target_language", "en")
        source_language = request.get("source_language", "auto")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        if not target_language:
            raise HTTPException(status_code=400, detail="Target language is required")
        
        translated_text = await ai_service.translate_text(text, target_language, source_language)
        
        return {
            "success": True,
            "original_text": text,
            "translated_text": translated_text,
            "source_language": source_language,
            "target_language": target_language,
            "message": "Text translated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error translating text: {e}")
        raise HTTPException(status_code=500, detail=f"Error translating text: {str(e)}")


@app.get("/supported-languages")
async def get_supported_languages():
    """
    Get list of supported languages for translation
    """
    try:
        languages = await ai_service.get_supported_languages()
        
        return {
            "success": True,
            "languages": languages,
            "message": "Supported languages retrieved successfully"
        }
        
    except Exception as e:
        print(f"Error getting supported languages: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting supported languages: {str(e)}")

# DLP (Data Loss Prevention) Endpoints
@app.post("/dlp/scan")
async def scan_policy_dlp(
    policy_text: str = Form(..., description="Policy text content to scan"),
    policy_id: str = Form(..., description="Policy ID"),
    user_id: str = Form(..., description="User ID"),
    custom_patterns: Optional[str] = Form(None, description="Custom regex patterns (JSON array)")
):
    """
    Scan policy content for sensitive data and DLP violations
    """
    try:
        # Check cache first
        cache_key = f"dlp_scan_{policy_id}_{hash(policy_text)}"
        cached_result = cache.get("dlp_scan", policy_id, hash(policy_text))
        
        if cached_result:
            print(f"🚀 DLP scan cache hit for policy {policy_id}")
            return cached_result
        
        # Parse custom patterns if provided
        patterns = None
        if custom_patterns:
            try:
                patterns = json.loads(custom_patterns)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid custom patterns JSON")
        
        # Perform DLP scan
        scan_result = await dlp_service.scan_policy_content(
            policy_text=policy_text,
            policy_id=policy_id,
            user_id=user_id,
            custom_patterns=patterns
        )
        
        # Convert to response format
        response = {
            "success": True,
            "scan_result": {
                "policy_id": scan_result.policy_id,
                "user_id": scan_result.user_id,
                "scan_timestamp": scan_result.scan_timestamp.isoformat(),
                "sensitivity_level": scan_result.sensitivity_level.value,
                "violations": [
                    {
                        "type": v.violation_type.value,
                        "severity": v.severity,
                        "description": v.description,
                        "detected_data": v.detected_data,
                        "location": v.location,
                        "recommendation": v.recommendation,
                        "confidence": v.confidence
                    }
                    for v in scan_result.violations
                ],
                "risk_score": scan_result.risk_score,
                "is_safe_to_publish": scan_result.is_safe_to_publish,
                "recommendations": scan_result.recommendations
            },
            "message": f"DLP scan completed. Found {len(scan_result.violations)} violations."
        }
        
        # Cache the result for 1 hour
        cache.set("dlp_scan", response, 3600, policy_id, hash(policy_text))
        print(f"💾 DLP scan result cached for policy {policy_id}")
        
        return response
        
    except Exception as e:
        print(f"Error in DLP scan: {e}")
        raise HTTPException(status_code=500, detail=f"DLP scan failed: {str(e)}")

# Privacy Controls and GDPR Compliance Endpoints
@app.post("/privacy/impact-assessment")
async def conduct_privacy_impact_assessment(
    policy_text: str = Form(..., description="Policy text content to assess"),
    policy_id: str = Form(..., description="Policy ID"),
    user_id: str = Form(..., description="User ID")
):
    """
    Conduct a Privacy Impact Assessment (PIA) for GDPR compliance
    """
    try:
        # Conduct PIA
        pia_result = await privacy_service.conduct_privacy_impact_assessment(
            policy_text=policy_text,
            policy_id=policy_id,
            user_id=user_id
        )
        
        # Convert to response format
        response = {
            "success": True,
            "pia_result": {
                "policy_id": pia_result.policy_id,
                "user_id": pia_result.user_id,
                "assessment_date": pia_result.assessment_date.isoformat(),
                "data_categories": pia_result.data_categories,
                "processing_purposes": [p.value for p in pia_result.processing_purposes],
                "legal_basis": pia_result.legal_basis,
                "data_subjects": pia_result.data_subjects,
                "retention_period": pia_result.retention_period,
                "risk_level": pia_result.risk_level,
                "compliance_score": pia_result.compliance_score,
                "recommendations": pia_result.recommendations
            },
            "message": f"Privacy Impact Assessment completed. Risk level: {pia_result.risk_level}"
        }
        
        return response
        
    except Exception as e:
        print(f"Error in Privacy Impact Assessment: {e}")
        raise HTTPException(status_code=500, detail=f"PIA failed: {str(e)}")

@app.post("/privacy/generate-policy-template")
async def generate_privacy_policy_template(
    data_categories: str = Form(..., description="Data categories (JSON array)"),
    processing_purposes: str = Form(..., description="Processing purposes (JSON array)"),
    legal_basis: str = Form(..., description="Legal basis (JSON array)")
):
    """
    Generate a GDPR-compliant privacy policy template
    """
    try:
        # Parse input data
        categories = json.loads(data_categories)
        purposes_data = json.loads(processing_purposes)
        legal_basis_data = json.loads(legal_basis)
        
        # Convert purposes to enum
        from services.privacy_service import DataProcessingPurpose
        purposes = []
        for purpose_str in purposes_data:
            try:
                purposes.append(DataProcessingPurpose(purpose_str))
            except ValueError:
                continue  # Skip invalid purposes
        
        # Generate template
        template = await privacy_service.generate_privacy_policy_template(
            data_categories=categories,
            processing_purposes=purposes,
            legal_basis=legal_basis_data
        )
        
        return {
            "success": True,
            "template": template,
            "message": "Privacy policy template generated successfully"
        }
        
    except Exception as e:
        print(f"Error generating privacy policy template: {e}")
        raise HTTPException(status_code=500, detail=f"Template generation failed: {str(e)}")

@app.post("/privacy/consent-record")
async def create_consent_record(
    user_id: str = Form(..., description="User ID"),
    policy_id: str = Form(..., description="Policy ID"),
    consent_type: str = Form(..., description="Type of consent"),
    purpose: str = Form(..., description="Purpose of data processing"),
    legal_basis: str = Form(..., description="Legal basis for processing"),
    evidence: str = Form(..., description="Evidence of consent")
):
    """
    Create a consent record for GDPR compliance tracking
    """
    try:
        consent_record = await privacy_service.create_consent_record(
            user_id=user_id,
            policy_id=policy_id,
            consent_type=consent_type,
            purpose=purpose,
            legal_basis=legal_basis,
            evidence=evidence
        )
        
        return {
            "success": True,
            "consent_record": {
                "consent_id": consent_record.consent_id,
                "user_id": consent_record.user_id,
                "policy_id": consent_record.policy_id,
                "consent_type": consent_record.consent_type,
                "granted": consent_record.granted,
                "granted_at": consent_record.granted_at.isoformat(),
                "purpose": consent_record.purpose,
                "legal_basis": consent_record.legal_basis,
                "evidence": consent_record.evidence
            },
            "message": "Consent record created successfully"
        }
        
    except Exception as e:
        print(f"Error creating consent record: {e}")
        raise HTTPException(status_code=500, detail=f"Consent record creation failed: {str(e)}")

@app.post("/privacy/data-subject-request")
async def process_data_subject_request(
    user_id: str = Form(..., description="User ID"),
    request_type: str = Form(..., description="Type of data subject request"),
    description: str = Form(..., description="Description of the request")
):
    """
    Process a data subject request (GDPR rights)
    """
    try:
        from services.privacy_service import PrivacyRightType
        
        # Convert string to enum
        try:
            right_type = PrivacyRightType(request_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid request type: {request_type}")
        
        dsr = await privacy_service.process_data_subject_request(
            user_id=user_id,
            request_type=right_type,
            description=description
        )
        
        return {
            "success": True,
            "data_subject_request": {
                "request_id": dsr.request_id,
                "user_id": dsr.user_id,
                "request_type": dsr.request_type.value,
                "description": dsr.description,
                "status": dsr.status,
                "created_at": dsr.created_at.isoformat()
            },
            "message": "Data subject request processed successfully"
        }
        
    except Exception as e:
        print(f"Error processing data subject request: {e}")
        raise HTTPException(status_code=500, detail=f"Data subject request processing failed: {str(e)}")


if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    
    print(f"🚀 Starting PolicyPal AI Service on {host}:{port}")
    print(f"🤖 Using model: {os.getenv('CHAT_MODEL', 'gpt-3.5-turbo')}")
    
    uvicorn.run(app, host=host, port=port)