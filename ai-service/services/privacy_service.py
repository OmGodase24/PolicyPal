# Privacy Controls and GDPR Compliance Service
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from openai import OpenAI
import os

class PrivacyRightType(Enum):
    RIGHT_TO_ACCESS = "right_to_access"
    RIGHT_TO_RECTIFICATION = "right_to_rectification"
    RIGHT_TO_ERASURE = "right_to_erasure"
    RIGHT_TO_PORTABILITY = "right_to_portability"
    RIGHT_TO_RESTRICT_PROCESSING = "right_to_restrict_processing"
    RIGHT_TO_OBJECT = "right_to_object"
    CONSENT_WITHDRAWAL = "consent_withdrawal"

class DataProcessingPurpose(Enum):
    CONTRACT_PERFORMANCE = "contract_performance"
    LEGITIMATE_INTEREST = "legitimate_interest"
    CONSENT = "consent"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTERESTS = "vital_interests"
    PUBLIC_TASK = "public_task"

@dataclass
class PrivacyImpactAssessment:
    policy_id: str
    user_id: str
    assessment_date: datetime
    data_categories: List[str]
    processing_purposes: List[DataProcessingPurpose]
    legal_basis: List[str]
    data_subjects: List[str]
    retention_period: Optional[str]
    risk_level: str  # low, medium, high
    recommendations: List[str]
    compliance_score: float  # 0.0 to 1.0

@dataclass
class ConsentRecord:
    consent_id: str
    user_id: str
    policy_id: str
    consent_type: str
    granted: bool
    granted_at: datetime
    withdrawn_at: Optional[datetime]
    purpose: str
    legal_basis: str
    evidence: str  # How consent was obtained

@dataclass
class DataSubjectRequest:
    request_id: str
    user_id: str
    request_type: PrivacyRightType
    description: str
    status: str  # pending, in_progress, completed, rejected
    created_at: datetime
    completed_at: Optional[datetime]
    response_data: Optional[Dict[str, Any]]

class PrivacyService:
    """
    Privacy Controls and GDPR Compliance service
    Provides tools for data protection, consent management, and privacy rights
    """
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = None
            print("⚠️ OpenAI API key not found - Privacy service will use basic analysis")
    
    async def conduct_privacy_impact_assessment(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str
    ) -> PrivacyImpactAssessment:
        """
        Conduct a Privacy Impact Assessment (PIA) for a policy
        """
        print(f"🔍 Privacy Service: Conducting PIA for policy {policy_id}")
        
        # Analyze policy content for privacy implications
        data_categories = await self._identify_data_categories(policy_text)
        processing_purposes = await self._identify_processing_purposes(policy_text)
        legal_basis = await self._identify_legal_basis(policy_text)
        data_subjects = await self._identify_data_subjects(policy_text)
        retention_period = await self._identify_retention_period(policy_text)
        
        # Calculate risk level and compliance score
        risk_level = self._calculate_privacy_risk(data_categories, processing_purposes)
        compliance_score = await self._calculate_gdpr_compliance_score(
            policy_text, data_categories, processing_purposes, legal_basis
        )
        
        # Generate recommendations
        recommendations = await self._generate_privacy_recommendations(
            data_categories, processing_purposes, legal_basis, risk_level
        )
        
        return PrivacyImpactAssessment(
            policy_id=policy_id,
            user_id=user_id,
            assessment_date=datetime.now(),
            data_categories=data_categories,
            processing_purposes=processing_purposes,
            legal_basis=legal_basis,
            data_subjects=data_subjects,
            retention_period=retention_period,
            risk_level=risk_level,
            recommendations=recommendations,
            compliance_score=compliance_score
        )
    
    async def _identify_data_categories(self, text: str) -> List[str]:
        """Identify what types of personal data are processed"""
        categories = []
        text_lower = text.lower()
        
        # GDPR Article 4 data categories
        data_patterns = {
            "Identity Data": ["name", "identification", "id number", "passport", "driving license"],
            "Contact Data": ["email", "address", "phone", "postal", "location"],
            "Financial Data": ["payment", "bank", "credit", "financial", "transaction"],
            "Health Data": ["health", "medical", "diagnosis", "treatment", "condition"],
            "Biometric Data": ["fingerprint", "face", "voice", "biometric", "iris"],
            "Behavioral Data": ["preferences", "behavior", "activity", "usage", "interaction"],
            "Technical Data": ["ip address", "cookies", "device", "browser", "log"],
            "Marketing Data": ["marketing", "advertising", "preferences", "consent"]
        }
        
        for category, patterns in data_patterns.items():
            if any(pattern in text_lower for pattern in patterns):
                categories.append(category)
        
        return categories
    
    async def _identify_processing_purposes(self, text: str) -> List[DataProcessingPurpose]:
        """Identify the purposes for data processing"""
        purposes = []
        text_lower = text.lower()
        
        purpose_patterns = {
            DataProcessingPurpose.CONTRACT_PERFORMANCE: [
                "contract", "agreement", "service delivery", "fulfillment", "obligation"
            ],
            DataProcessingPurpose.LEGITIMATE_INTEREST: [
                "legitimate interest", "business interest", "improvement", "analytics"
            ],
            DataProcessingPurpose.CONSENT: [
                "consent", "agreement", "opt-in", "permission", "authorization"
            ],
            DataProcessingPurpose.LEGAL_OBLIGATION: [
                "legal requirement", "compliance", "regulation", "law", "statutory"
            ],
            DataProcessingPurpose.VITAL_INTERESTS: [
                "emergency", "vital", "life", "death", "safety", "security"
            ],
            DataProcessingPurpose.PUBLIC_TASK: [
                "public interest", "government", "official", "public service"
            ]
        }
        
        for purpose, patterns in purpose_patterns.items():
            if any(pattern in text_lower for pattern in patterns):
                purposes.append(purpose)
        
        return purposes
    
    async def _identify_legal_basis(self, text: str) -> List[str]:
        """Identify the legal basis for processing under GDPR Article 6"""
        legal_basis = []
        text_lower = text.lower()
        
        basis_patterns = {
            "Consent (Art. 6(1)(a))": ["consent", "agreement", "opt-in", "permission"],
            "Contract (Art. 6(1)(b))": ["contract", "agreement", "service", "performance"],
            "Legal Obligation (Art. 6(1)(c))": ["legal", "obligation", "compliance", "required"],
            "Vital Interests (Art. 6(1)(d))": ["vital", "emergency", "life", "death"],
            "Public Task (Art. 6(1)(e))": ["public", "official", "government", "authority"],
            "Legitimate Interest (Art. 6(1)(f))": ["legitimate interest", "business", "improvement"]
        }
        
        for basis, patterns in basis_patterns.items():
            if any(pattern in text_lower for pattern in patterns):
                legal_basis.append(basis)
        
        return legal_basis
    
    async def _identify_data_subjects(self, text: str) -> List[str]:
        """Identify who the data subjects are"""
        subjects = []
        text_lower = text.lower()
        
        subject_patterns = {
            "Customers": ["customer", "client", "user", "subscriber"],
            "Employees": ["employee", "staff", "worker", "personnel"],
            "Vendors": ["vendor", "supplier", "partner", "contractor"],
            "Visitors": ["visitor", "guest", "website visitor"],
            "Minors": ["child", "minor", "under 18", "juvenile"]
        }
        
        for subject, patterns in subject_patterns.items():
            if any(pattern in text_lower for pattern in patterns):
                subjects.append(subject)
        
        return subjects
    
    async def _identify_retention_period(self, text: str) -> Optional[str]:
        """Identify data retention periods mentioned in the policy"""
        import re
        
        # Look for retention period patterns
        retention_patterns = [
            r"retain.*?(\d+)\s*(?:years?|months?|days?)",
            r"keep.*?(\d+)\s*(?:years?|months?|days?)",
            r"storage.*?(\d+)\s*(?:years?|months?|days?)",
            r"(\d+)\s*(?:years?|months?|days?).*?retention"
        ]
        
        for pattern in retention_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return f"{matches[0]} period found"
        
        return None
    
    def _calculate_privacy_risk(
        self, 
        data_categories: List[str], 
        processing_purposes: List[DataProcessingPurpose]
    ) -> str:
        """Calculate privacy risk level"""
        high_risk_categories = ["Health Data", "Biometric Data", "Financial Data"]
        high_risk_purposes = [DataProcessingPurpose.LEGITIMATE_INTEREST]
        
        high_risk_data = any(cat in high_risk_categories for cat in data_categories)
        high_risk_purpose = any(purpose in high_risk_purposes for purpose in processing_purposes)
        
        if high_risk_data and high_risk_purpose:
            return "high"
        elif high_risk_data or high_risk_purpose:
            return "medium"
        else:
            return "low"
    
    async def _calculate_gdpr_compliance_score(
        self, 
        text: str, 
        data_categories: List[str], 
        processing_purposes: List[DataProcessingPurpose],
        legal_basis: List[str]
    ) -> float:
        """Calculate GDPR compliance score"""
        score = 0.0
        max_score = 10.0
        
        # Check for required GDPR elements
        gdpr_requirements = {
            "Data Controller Info": ["controller", "data controller", "company", "organization"],
            "Purpose Specification": ["purpose", "why", "reason", "objective"],
            "Legal Basis": ["legal basis", "lawful basis", "consent", "contract"],
            "Data Subject Rights": ["rights", "access", "rectification", "erasure"],
            "Retention Period": ["retention", "keep", "store", "period"],
            "Contact Information": ["contact", "email", "address", "phone"],
            "Data Protection Officer": ["dpo", "data protection officer"],
            "Privacy Notice": ["privacy", "notice", "policy", "information"],
            "Consent Mechanism": ["consent", "opt-in", "agreement", "permission"],
            "Data Breach Procedures": ["breach", "incident", "notification", "procedure"]
        }
        
        for requirement, patterns in gdpr_requirements.items():
            if any(pattern in text.lower() for pattern in patterns):
                score += 1.0
        
        return min(score / max_score, 1.0)
    
    async def _generate_privacy_recommendations(
        self, 
        data_categories: List[str], 
        processing_purposes: List[DataProcessingPurpose],
        legal_basis: List[str],
        risk_level: str
    ) -> List[str]:
        """Generate privacy compliance recommendations"""
        recommendations = []
        
        # General GDPR recommendations
        recommendations.append("📋 Ensure clear data controller identification")
        recommendations.append("🎯 Specify clear purposes for data processing")
        recommendations.append("⚖️ Establish lawful basis for each processing activity")
        recommendations.append("👤 Inform data subjects about their rights")
        recommendations.append("⏰ Define data retention periods")
        
        # Risk-specific recommendations
        if risk_level == "high":
            recommendations.append("🚨 HIGH RISK: Consider Data Protection Impact Assessment (DPIA)")
            recommendations.append("🔒 Implement additional security measures")
            recommendations.append("👨‍💼 Appoint a Data Protection Officer (DPO)")
        
        # Category-specific recommendations
        if "Health Data" in data_categories:
            recommendations.append("🏥 Health data detected - ensure HIPAA compliance")
        
        if "Biometric Data" in data_categories:
            recommendations.append("🔐 Biometric data requires special protection measures")
        
        if "Financial Data" in data_categories:
            recommendations.append("💰 Financial data requires PCI DSS compliance")
        
        # Legal basis recommendations
        if not legal_basis:
            recommendations.append("⚠️ No clear legal basis identified - this is required under GDPR")
        
        if DataProcessingPurpose.CONSENT in processing_purposes:
            recommendations.append("✅ Implement clear consent mechanisms")
            recommendations.append("🔄 Enable easy consent withdrawal")
        
        return recommendations
    
    async def create_consent_record(
        self, 
        user_id: str, 
        policy_id: str, 
        consent_type: str,
        purpose: str,
        legal_basis: str,
        evidence: str
    ) -> ConsentRecord:
        """Create a consent record for tracking"""
        consent_id = f"consent_{user_id}_{policy_id}_{int(datetime.now().timestamp())}"
        
        return ConsentRecord(
            consent_id=consent_id,
            user_id=user_id,
            policy_id=policy_id,
            consent_type=consent_type,
            granted=True,
            granted_at=datetime.now(),
            withdrawn_at=None,
            purpose=purpose,
            legal_basis=legal_basis,
            evidence=evidence
        )
    
    async def process_data_subject_request(
        self, 
        user_id: str, 
        request_type: PrivacyRightType,
        description: str
    ) -> DataSubjectRequest:
        """Process a data subject request (GDPR rights)"""
        request_id = f"dsr_{user_id}_{int(datetime.now().timestamp())}"
        
        return DataSubjectRequest(
            request_id=request_id,
            user_id=user_id,
            request_type=request_type,
            description=description,
            status="pending",
            created_at=datetime.now(),
            completed_at=None,
            response_data=None
        )
    
    async def generate_privacy_policy_template(
        self, 
        data_categories: List[str],
        processing_purposes: List[DataProcessingPurpose],
        legal_basis: List[str]
    ) -> str:
        """Generate a GDPR-compliant privacy policy template"""
        
        template = f"""
# Privacy Policy

## Data Controller
[Your Company Name]
[Address]
[Contact Information]

## Data Categories We Process
{', '.join(data_categories) if data_categories else 'No specific categories identified'}

## Purposes of Processing
{', '.join([purpose.value for purpose in processing_purposes]) if processing_purposes else 'No specific purposes identified'}

## Legal Basis
{', '.join(legal_basis) if legal_basis else 'No legal basis specified - REQUIRED'}

## Data Subject Rights
You have the following rights under GDPR:
- Right to access your personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to restrict processing
- Right to object to processing
- Right to withdraw consent

## Data Retention
[Specify retention periods for different data types]

## Contact Information
For privacy-related inquiries: [privacy@yourcompany.com]

## Data Protection Officer
[DPO contact information if applicable]

## Updates to This Policy
[Information about policy updates]
        """
        
        return template.strip()
