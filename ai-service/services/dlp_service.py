# Data Loss Prevention Service
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
from openai import OpenAI
import os

class DataSensitivityLevel(Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"

class DLPViolationType(Enum):
    PII_EXPOSURE = "pii_exposure"
    FINANCIAL_DATA = "financial_data"
    HEALTH_RECORDS = "health_records"
    CREDENTIALS = "credentials"
    CUSTOM_PATTERN = "custom_pattern"

@dataclass
class DLPViolation:
    violation_type: DLPViolationType
    severity: str  # low, medium, high, critical
    description: str
    detected_data: str
    location: str  # line number or section
    recommendation: str
    confidence: float  # 0.0 to 1.0

@dataclass
class DLPScanResult:
    policy_id: str
    user_id: str
    scan_timestamp: datetime
    sensitivity_level: DataSensitivityLevel
    violations: List[DLPViolation]
    risk_score: float  # 0.0 to 1.0
    is_safe_to_publish: bool
    recommendations: List[str]

class DLPService:
    """
    Data Loss Prevention service that scans policy content for sensitive information
    and provides protection recommendations
    """
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = None
            print("⚠️ OpenAI API key not found - DLP will use pattern matching only")
    
    async def scan_policy_content(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        custom_patterns: Optional[List[str]] = None
    ) -> DLPScanResult:
        """
        Comprehensive DLP scan of policy content
        """
        print(f"🔍 DLP Service: Scanning policy {policy_id} for sensitive data")
        
        violations = []
        
        # 1. Scan for PII (Personally Identifiable Information)
        pii_violations = await self._scan_for_pii(policy_text)
        violations.extend(pii_violations)
        
        # 2. Scan for financial data
        financial_violations = await self._scan_for_financial_data(policy_text)
        violations.extend(financial_violations)
        
        # 3. Scan for health records
        health_violations = await self._scan_for_health_records(policy_text)
        violations.extend(health_violations)
        
        # 4. Scan for credentials
        credential_violations = await self._scan_for_credentials(policy_text)
        violations.extend(credential_violations)
        
        # 5. Scan for custom patterns
        if custom_patterns:
            custom_violations = await self._scan_custom_patterns(policy_text, custom_patterns)
            violations.extend(custom_violations)
        
        # 6. AI-powered content classification
        if self.client:
            ai_violations = await self._ai_content_scan(policy_text)
            violations.extend(ai_violations)
        
        # 7. Determine overall sensitivity level and risk
        sensitivity_level = self._determine_sensitivity_level(violations)
        risk_score = self._calculate_risk_score(violations)
        is_safe = self._is_safe_to_publish(violations, risk_score)
        
        # 8. Generate recommendations
        recommendations = self._generate_recommendations(violations, sensitivity_level)
        
        return DLPScanResult(
            policy_id=policy_id,
            user_id=user_id,
            scan_timestamp=datetime.now(),
            sensitivity_level=sensitivity_level,
            violations=violations,
            risk_score=risk_score,
            is_safe_to_publish=is_safe,
            recommendations=recommendations
        )
    
    async def _scan_for_pii(self, text: str) -> List[DLPViolation]:
        """Scan for Personally Identifiable Information"""
        violations = []
        
        # Email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        for email in emails:
            violations.append(DLPViolation(
                violation_type=DLPViolationType.PII_EXPOSURE,
                severity="medium",
                description="Email address detected",
                detected_data=email,
                location=f"Line {text[:text.find(email)].count(chr(10)) + 1}",
                recommendation="Consider redacting or removing email addresses",
                confidence=0.95
            ))
        
        # Phone numbers (various formats)
        phone_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # US format
            r'\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b',  # (123) 456-7890
            r'\b\+1[-.]?\d{3}[-.]?\d{3}[-.]?\d{4}\b'  # +1 format
        ]
        
        for pattern in phone_patterns:
            phones = re.findall(pattern, text)
            for phone in phones:
                violations.append(DLPViolation(
                    violation_type=DLPViolationType.PII_EXPOSURE,
                    severity="medium",
                    description="Phone number detected",
                    detected_data=phone,
                    location=f"Line {text[:text.find(phone)].count(chr(10)) + 1}",
                    recommendation="Consider redacting phone numbers",
                    confidence=0.90
                ))
        
        # Social Security Numbers
        ssn_pattern = r'\b\d{3}-?\d{2}-?\d{4}\b'
        ssns = re.findall(ssn_pattern, text)
        for ssn in ssns:
            violations.append(DLPViolation(
                violation_type=DLPViolationType.PII_EXPOSURE,
                severity="critical",
                description="Social Security Number detected",
                detected_data=ssn,
                location=f"Line {text[:text.find(ssn)].count(chr(10)) + 1}",
                recommendation="IMMEDIATELY redact SSN - this is highly sensitive data",
                confidence=0.95
            ))
        
        # Credit Card Numbers
        cc_pattern = r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
        ccs = re.findall(cc_pattern, text)
        for cc in ccs:
            violations.append(DLPViolation(
                violation_type=DLPViolationType.FINANCIAL_DATA,
                severity="critical",
                description="Credit card number detected",
                detected_data=cc,
                location=f"Line {text[:text.find(cc)].count(chr(10)) + 1}",
                recommendation="IMMEDIATELY redact credit card numbers",
                confidence=0.90
            ))
        
        return violations
    
    async def _scan_for_financial_data(self, text: str) -> List[DLPViolation]:
        """Scan for financial information"""
        violations = []
        
        # Bank account numbers (basic pattern)
        bank_pattern = r'\b\d{8,17}\b'
        bank_numbers = re.findall(bank_pattern, text)
        
        # Additional context checking for bank numbers
        financial_context = ['account', 'bank', 'routing', 'checking', 'savings']
        for number in bank_numbers:
            context_found = any(context in text.lower() for context in financial_context)
            if context_found and len(number) >= 8:
                violations.append(DLPViolation(
                    violation_type=DLPViolationType.FINANCIAL_DATA,
                    severity="high",
                    description="Potential bank account number detected",
                    detected_data=number,
                    location=f"Line {text[:text.find(number)].count(chr(10)) + 1}",
                    recommendation="Verify if this is financial data and redact if necessary",
                    confidence=0.70
                ))
        
        return violations
    
    async def _scan_for_health_records(self, text: str) -> List[DLPViolation]:
        """Scan for health information (HIPAA)"""
        violations = []
        
        # Medical record numbers
        mrn_pattern = r'\bMRN[:\s]*\d{6,12}\b'
        mrns = re.findall(mrn_pattern, text, re.IGNORECASE)
        for mrn in mrns:
            violations.append(DLPViolation(
                violation_type=DLPViolationType.HEALTH_RECORDS,
                severity="high",
                description="Medical record number detected",
                detected_data=mrn,
                location=f"Line {text[:text.find(mrn)].count(chr(10)) + 1}",
                recommendation="Redact medical record numbers - HIPAA violation risk",
                confidence=0.95
            ))
        
        # Health insurance numbers
        insurance_pattern = r'\b(?:insurance|policy)[:\s]*\d{6,12}\b'
        insurance_numbers = re.findall(insurance_pattern, text, re.IGNORECASE)
        for ins_num in insurance_numbers:
            violations.append(DLPViolation(
                violation_type=DLPViolationType.HEALTH_RECORDS,
                severity="high",
                description="Health insurance number detected",
                detected_data=ins_num,
                location=f"Line {text[:text.find(ins_num)].count(chr(10)) + 1}",
                recommendation="Redact health insurance numbers - HIPAA violation risk",
                confidence=0.80
            ))
        
        return violations
    
    async def _scan_for_credentials(self, text: str) -> List[DLPViolation]:
        """Scan for passwords, API keys, tokens"""
        violations = []
        
        # API keys (common patterns)
        api_key_patterns = [
            r'\b[A-Za-z0-9]{32,}\b',  # Generic long alphanumeric
            r'\bsk-[A-Za-z0-9]{20,}\b',  # OpenAI style
            r'\bpk_[A-Za-z0-9]{20,}\b',  # Stripe style
        ]
        
        for pattern in api_key_patterns:
            keys = re.findall(pattern, text)
            for key in keys:
                violations.append(DLPViolation(
                    violation_type=DLPViolationType.CREDENTIALS,
                    severity="critical",
                    description="Potential API key or credential detected",
                    detected_data=key[:10] + "..." + key[-4:],  # Masked
                    location=f"Line {text[:text.find(key)].count(chr(10)) + 1}",
                    recommendation="IMMEDIATELY remove API keys and credentials",
                    confidence=0.85
                ))
        
        return violations
    
    async def _scan_custom_patterns(self, text: str, patterns: List[str]) -> List[DLPViolation]:
        """Scan for custom regex patterns"""
        violations = []
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                violations.append(DLPViolation(
                    violation_type=DLPViolationType.CUSTOM_PATTERN,
                    severity="medium",
                    description="Custom pattern match detected",
                    detected_data=str(match),
                    location=f"Line {text[:text.find(str(match))].count(chr(10)) + 1}",
                    recommendation="Review custom pattern match",
                    confidence=0.80
                ))
        
        return violations
    
    async def _ai_content_scan(self, text: str) -> List[DLPViolation]:
        """Use AI to identify sensitive content that pattern matching might miss"""
        if not self.client:
            return []
        
        try:
            prompt = f"""
            Analyze the following text for sensitive information that should be protected:
            
            Text: {text[:2000]}  # Limit to avoid token limits
            
            Look for:
            1. Personal information (names, addresses, IDs)
            2. Financial data (account numbers, amounts, transactions)
            3. Health information (medical conditions, treatments)
            4. Business secrets (proprietary information, trade secrets)
            5. Legal sensitive information (case numbers, court records)
            
            Respond with JSON format:
            {{
                "violations": [
                    {{
                        "type": "pii|financial|health|business|legal",
                        "severity": "low|medium|high|critical",
                        "description": "What was found",
                        "data": "The sensitive data",
                        "recommendation": "What to do"
                    }}
                ]
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            violations = []
            
            for violation in result.get("violations", []):
                violations.append(DLPViolation(
                    violation_type=DLPViolationType.PII_EXPOSURE,  # Default type
                    severity=violation.get("severity", "medium"),
                    description=violation.get("description", ""),
                    detected_data=violation.get("data", ""),
                    location="AI detected",
                    recommendation=violation.get("recommendation", ""),
                    confidence=0.75
                ))
            
            return violations
            
        except Exception as e:
            print(f"⚠️ AI content scan failed: {e}")
            return []
    
    def _determine_sensitivity_level(self, violations: List[DLPViolation]) -> DataSensitivityLevel:
        """Determine overall sensitivity level based on violations"""
        if not violations:
            return DataSensitivityLevel.PUBLIC
        
        critical_count = sum(1 for v in violations if v.severity == "critical")
        high_count = sum(1 for v in violations if v.severity == "high")
        
        if critical_count > 0:
            return DataSensitivityLevel.RESTRICTED
        elif high_count > 2:
            return DataSensitivityLevel.CONFIDENTIAL
        elif high_count > 0 or len(violations) > 3:
            return DataSensitivityLevel.INTERNAL
        else:
            return DataSensitivityLevel.PUBLIC
    
    def _calculate_risk_score(self, violations: List[DLPViolation]) -> float:
        """Calculate overall risk score (0.0 to 1.0)"""
        if not violations:
            return 0.0
        
        severity_weights = {
            "critical": 1.0,
            "high": 0.7,
            "medium": 0.4,
            "low": 0.1
        }
        
        total_weight = sum(severity_weights.get(v.severity, 0.5) for v in violations)
        max_possible = len(violations) * 1.0
        
        return min(total_weight / max_possible, 1.0)
    
    def _is_safe_to_publish(self, violations: List[DLPViolation], risk_score: float) -> bool:
        """Determine if content is safe to publish"""
        critical_violations = [v for v in violations if v.severity == "critical"]
        return len(critical_violations) == 0 and risk_score < 0.7
    
    def _generate_recommendations(self, violations: List[DLPViolation], sensitivity_level: DataSensitivityLevel) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if not violations:
            recommendations.append("✅ No sensitive data detected - content appears safe")
            return recommendations
        
        # Group violations by type
        violation_types = {}
        for v in violations:
            if v.violation_type not in violation_types:
                violation_types[v.violation_type] = []
            violation_types[v.violation_type].append(v)
        
        # Generate specific recommendations
        if DLPViolationType.PII_EXPOSURE in violation_types:
            recommendations.append("🔒 Remove or redact personally identifiable information (PII)")
        
        if DLPViolationType.FINANCIAL_DATA in violation_types:
            recommendations.append("💰 Remove or redact financial data and account numbers")
        
        if DLPViolationType.HEALTH_RECORDS in violation_types:
            recommendations.append("🏥 Remove or redact health information - HIPAA compliance required")
        
        if DLPViolationType.CREDENTIALS in violation_types:
            recommendations.append("🔑 Remove all API keys, passwords, and credentials immediately")
        
        # General recommendations based on sensitivity level
        if sensitivity_level == DataSensitivityLevel.RESTRICTED:
            recommendations.append("⚠️ Content classified as RESTRICTED - review before publishing")
        elif sensitivity_level == DataSensitivityLevel.CONFIDENTIAL:
            recommendations.append("🔒 Content classified as CONFIDENTIAL - limit access")
        
        return recommendations
