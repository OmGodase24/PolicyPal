# Pydantic Models for API Request/Response
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime
from enum import Enum

class PolicyDocument(BaseModel):
    """Policy document metadata"""
    id: str = Field(alias="_id")
    filename: str
    user_id: str
    policy_id: str
    created_at: datetime

class AnswerResponse(BaseModel):
    """Response model for AI answers"""
    answer: str
    sources: List['SourceInfo']
    confidence: float = Field(ge=0.0, le=1.0, description="AI confidence score from 0.0 to 1.0")
    policy_id: str
    user_id: str

class SourceInfo(BaseModel):
    """Source information for AI answers"""
    chunk_id: str
    text: str
    relevance_score: float

class SummaryResponse(BaseModel):
    """Response model for policy summaries"""
    summary: str
    policy_id: str
    user_id: str

class UploadResponse(BaseModel):
    """Response model for document uploads"""
    success: bool
    document_id: str
    message: str
    chunks_created: int

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    version: str
    database_connected: bool

class QuestionRequest(BaseModel):
    """Request model for asking questions"""
    question: str
    policy_id: str
    user_id: str
    session_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None
    images: Optional[List[str]] = None  # Base64 encoded images for context

class StatsResponse(BaseModel):
    """Database statistics response"""
    policies: int
    chunks: int
    database: str

# Compliance Checking Models
class ComplianceLevel(str, Enum):
    """Compliance level enumeration"""
    COMPLIANT = "compliant"
    PARTIAL = "partial"
    NON_COMPLIANT = "non_compliant"
    UNKNOWN = "unknown"

class ComplianceCheck(BaseModel):
    """Individual compliance check result"""
    check_name: str
    level: ComplianceLevel
    score: float = Field(ge=0.0, le=1.0, description="Compliance score from 0.0 to 1.0")
    message: str
    evidence: List[str]
    recommendation: Optional[str] = None

class ComplianceReport(BaseModel):
    """Overall compliance report for a policy"""
    policy_id: str
    user_id: str
    overall_score: float = Field(ge=0.0, le=1.0, description="Overall compliance score")
    overall_level: ComplianceLevel
    checks: List[ComplianceCheck]
    generated_at: datetime
    regulation_framework: str

class ComplianceRequest(BaseModel):
    """Request model for compliance checking"""
    policy_id: str
    user_id: str
    regulation_framework: Optional[str] = "insurance_standards"

class ComplianceResponse(BaseModel):
    """Response model for compliance checking"""
    success: bool
    report: Optional[ComplianceReport] = None
    message: str