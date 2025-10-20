# Compliance Checking Service
import re
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from dataclasses import dataclass
import asyncio
from openai import OpenAI
from functools import wraps
from models.schemas import ComplianceLevel, ComplianceCheck, ComplianceReport
from .ai_compliance_service import AIComplianceService

def retry_on_dns_error(max_retries=3, delay=1):
    """Decorator to retry operations on DNS timeout errors"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if "DNS" in str(e) or "resolution lifetime expired" in str(e):
                        if attempt < max_retries - 1:
                            print(f"🔄 DNS error on attempt {attempt + 1}/{max_retries}, retrying in {delay}s...")
                            await asyncio.sleep(delay * (attempt + 1))  # Exponential backoff
                            continue
                    # If not DNS error or max retries reached, re-raise
                    raise e
            raise last_exception
        return wrapper
    return decorator

# ComplianceCheck and ComplianceReport are now imported from schemas.py

class ComplianceService:
    """
    Service for checking policy compliance against various regulations and standards
    """
    
    def __init__(self):
        # Initialize AI compliance service
        self.ai_compliance_service = AIComplianceService()
        
        # Initialize database connection for caching
        from services.database import DatabaseService
        self.db_service = DatabaseService()
        
        # Common insurance regulations and standards
        self.regulations = {
            "gdpr": {
                "name": "General Data Protection Regulation (GDPR)",
                "checks": self._get_gdpr_checks()
            },
            "ccpa": {
                "name": "California Consumer Privacy Act (CCPA)",
                "checks": self._get_ccpa_checks()
            },
            "hipaa": {
                "name": "Health Insurance Portability and Accountability Act (HIPAA)",
                "checks": self._get_hipaa_checks()
            },
            "sox": {
                "name": "Sarbanes-Oxley Act (SOX)",
                "checks": self._get_sox_checks()
            },
            "pci_dss": {
                "name": "Payment Card Industry Data Security Standard (PCI DSS)",
                "checks": self._get_pci_dss_checks()
            },
            "insurance_standards": {
                "name": "General Insurance Standards",
                "checks": self._get_insurance_standards_checks()
            }
        }
    
    @retry_on_dns_error(max_retries=3, delay=1)
    async def check_compliance(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        regulation_framework: str = None,
        force_refresh: bool = False
    ) -> ComplianceReport:
        """
        Perform AI-powered compliance checking on a policy document with caching
        
        Args:
            policy_text: The full text content of the policy
            policy_id: Unique identifier for the policy
            user_id: User who owns the policy
            regulation_framework: Which regulation framework to check against
            force_refresh: If True, bypass cache and re-analyze with AI
            
        Returns:
            ComplianceReport with detailed compliance analysis
        """
        
        # Auto-detect framework if not specified
        if regulation_framework is None:
            regulation_framework = self._detect_regulation_framework(policy_text)
            print(f"🎯 Auto-detected framework: {regulation_framework}")
        
        if regulation_framework not in self.regulations:
            regulation_framework = "insurance_standards"
        
        # Check if we have a cached compliance report (unless force refresh)
        if not force_refresh:
            cached_report = await self._get_cached_compliance_report(policy_id, user_id, regulation_framework)
            if cached_report:
                print(f"📋 Using cached compliance report for policy {policy_id}")
                return cached_report
        
        print(f"🤖 AI Compliance Service: Analyzing policy {policy_id} against {self.regulations[regulation_framework]['name']}")
        
        # Use AI-powered compliance analysis
        try:
            report = await self.ai_compliance_service.check_compliance(
                policy_text=policy_text,
                policy_id=policy_id,
                user_id=user_id,
                regulation_framework=regulation_framework
            )
            
            # Cache the report for future use
            await self._cache_compliance_report(report)
            print(f"💾 Cached compliance report for policy {policy_id}")
            
            return report
            
        except Exception as e:
            print(f"❌ AI Compliance analysis failed, falling back to pattern matching: {e}")
            # Fallback to the old pattern-based approach
            return await self._fallback_compliance_check(policy_text, policy_id, user_id, regulation_framework)
    
    async def _fallback_compliance_check(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        regulation_framework: str
    ) -> ComplianceReport:
        """Fallback compliance check using pattern matching"""
        print(f"🔍 Fallback Compliance: Using pattern matching for policy {policy_id}")
        
        # Get the specific checks for this regulation
        check_functions = self.regulations[regulation_framework]["checks"]
        
        # Run all compliance checks
        checks = []
        for check_func in check_functions:
            try:
                check_result = await check_func(policy_text)
                checks.append(check_result)
                print(f"✅ Completed check: {check_result.check_name} - {check_result.level.value}")
            except Exception as e:
                print(f"❌ Error in check {check_func.__name__}: {e}")
                # Add a failed check
                checks.append(ComplianceCheck(
                    check_name=check_func.__name__,
                    level=ComplianceLevel.UNKNOWN,
                    score=0.0,
                    message=f"Check failed due to error: {str(e)}",
                    evidence=[]
                ))
        
        # Calculate overall compliance score
        overall_score = self._calculate_overall_score(checks)
        overall_level = self._determine_overall_level(overall_score)
        
        return ComplianceReport(
            policy_id=policy_id,
            user_id=user_id,
            overall_score=overall_score,
            overall_level=overall_level,
            checks=checks,
            generated_at=datetime.now(),
            regulation_framework=regulation_framework
        )
    
    async def _get_cached_compliance_report(
        self, 
        policy_id: str, 
        user_id: str, 
        regulation_framework: str
    ) -> Optional[ComplianceReport]:
        """Get cached compliance report from database"""
        try:
            # Look for existing compliance report
            query = {
                "policy_id": policy_id,
                "user_id": user_id,
                "regulation_framework": regulation_framework
            }
            
            result = await self.db_service.find_one("compliance_reports", query)
            
            if result:
                # Convert database document back to ComplianceReport
                checks = []
                for check_data in result.get("checks", []):
                    check = ComplianceCheck(
                        check_name=check_data.get("check_name", ""),
                        level=ComplianceLevel(check_data.get("level", "unknown")),
                        score=check_data.get("score", 0.0),
                        message=check_data.get("message", ""),
                        evidence=check_data.get("evidence", []),
                        recommendation=check_data.get("recommendation", "")
                    )
                    checks.append(check)
                
                return ComplianceReport(
                    policy_id=result.get("policy_id", ""),
                    user_id=result.get("user_id", ""),
                    overall_score=result.get("overall_score", 0.0),
                    overall_level=ComplianceLevel(result.get("overall_level", "unknown")),
                    checks=checks,
                    generated_at=result.get("generated_at", datetime.now()),
                    regulation_framework=result.get("regulation_framework", "")
                )
            
            return None
            
        except Exception as e:
            print(f"❌ Error retrieving cached compliance report: {e}")
            return None
    
    @retry_on_dns_error(max_retries=3, delay=1)
    async def _cache_compliance_report(self, report: ComplianceReport) -> bool:
        """Cache compliance report in database"""
        try:
            # Convert ComplianceReport to database document
            checks_data = []
            for check in report.checks:
                check_data = {
                    "check_name": check.check_name,
                    "level": check.level.value,
                    "score": check.score,
                    "message": check.message,
                    "evidence": check.evidence,
                    "recommendation": check.recommendation
                }
                checks_data.append(check_data)
            
            document = {
                "policy_id": report.policy_id,
                "user_id": report.user_id,
                "overall_score": report.overall_score,
                "overall_level": report.overall_level.value,
                "checks": checks_data,
                "generated_at": report.generated_at,
                "regulation_framework": report.regulation_framework,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            
            # Insert or update the compliance report
            query = {
                "policy_id": report.policy_id,
                "user_id": report.user_id,
                "regulation_framework": report.regulation_framework
            }
            
            await self.db_service.upsert("compliance_reports", query, document)
            return True
            
        except Exception as e:
            print(f"❌ Error caching compliance report: {e}")
            return False
    
    @retry_on_dns_error(max_retries=3, delay=1)
    async def refresh_compliance_report(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        regulation_framework: str = "insurance_standards"
    ) -> ComplianceReport:
        """Force refresh compliance report using AI analysis"""
        print(f"🔄 Refreshing compliance report for policy {policy_id}")
        return await self.check_compliance(
            policy_text=policy_text,
            policy_id=policy_id,
            user_id=user_id,
            regulation_framework=regulation_framework,
            force_refresh=True
        )
    
    @retry_on_dns_error(max_retries=3, delay=1)
    async def get_compliance_history(
        self, 
        policy_id: str, 
        user_id: str
    ) -> List[ComplianceReport]:
        """Get compliance report history for a policy"""
        try:
            query = {
                "policy_id": policy_id,
                "user_id": user_id
            }
            
            results = await self.db_service.find("compliance_reports", query)
            
            reports = []
            for result in results:
                checks = []
                for check_data in result.get("checks", []):
                    check = ComplianceCheck(
                        check_name=check_data.get("check_name", ""),
                        level=ComplianceLevel(check_data.get("level", "unknown")),
                        score=check_data.get("score", 0.0),
                        message=check_data.get("message", ""),
                        evidence=check_data.get("evidence", []),
                        recommendation=check_data.get("recommendation", "")
                    )
                    checks.append(check)
                
                report = ComplianceReport(
                    policy_id=result.get("policy_id", ""),
                    user_id=result.get("user_id", ""),
                    overall_score=result.get("overall_score", 0.0),
                    overall_level=ComplianceLevel(result.get("overall_level", "unknown")),
                    checks=checks,
                    generated_at=result.get("generated_at", datetime.now()),
                    regulation_framework=result.get("regulation_framework", "")
                )
                reports.append(report)
            
            return reports
            
        except Exception as e:
            print(f"❌ Error retrieving compliance history: {e}")
            return []
    
    def _calculate_overall_score(self, checks: List[ComplianceCheck]) -> float:
        """Calculate overall compliance score from individual checks"""
        if not checks:
            return 0.0
        
        # Weight different types of checks
        weighted_scores = []
        for check in checks:
            if check.level == ComplianceLevel.COMPLIANT:
                weight = 1.0
            elif check.level == ComplianceLevel.PARTIAL:
                weight = 0.6
            elif check.level == ComplianceLevel.NON_COMPLIANT:
                weight = 0.2
            else:  # UNKNOWN
                weight = 0.0
            
            weighted_scores.append(check.score * weight)
        
        return sum(weighted_scores) / len(weighted_scores) if weighted_scores else 0.0
    
    def _determine_overall_level(self, score: float) -> ComplianceLevel:
        """Determine overall compliance level based on score"""
        if score >= 0.8:
            return ComplianceLevel.COMPLIANT
        elif score >= 0.5:
            return ComplianceLevel.PARTIAL
        elif score >= 0.1:  # Changed from 0.2 to 0.1
            return ComplianceLevel.NON_COMPLIANT
        else:
            return ComplianceLevel.UNKNOWN
    
    # GDPR Compliance Checks
    def _get_gdpr_checks(self):
        return [
            self._check_data_protection_officer,
            self._check_privacy_notice,
            self._check_data_retention,
            self._check_consent_mechanisms,
            self._check_data_subject_rights,
            self._check_data_breach_procedures
        ]
    
    async def _check_data_protection_officer(self, text: str) -> ComplianceCheck:
        """Check if policy mentions Data Protection Officer (DPO)"""
        patterns = [
            r"data protection officer",
            r"DPO",
            r"privacy officer",
            r"data protection lead"
        ]
        
        evidence = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Data Protection Officer",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Data Protection Officer role is mentioned in the policy",
                evidence=evidence,
                recommendation="Ensure DPO contact information is clearly provided"
            )
        else:
            return ComplianceCheck(
                check_name="Data Protection Officer",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.1,
                message="No mention of Data Protection Officer found",
                evidence=[],
                recommendation="Consider appointing a DPO and documenting their role"
            )
    
    async def _check_privacy_notice(self, text: str) -> ComplianceCheck:
        """Check if policy includes comprehensive privacy notice"""
        privacy_keywords = [
            "personal data", "privacy", "data collection", "data processing",
            "lawful basis", "legitimate interest", "consent", "data subject"
        ]
        
        found_keywords = []
        for keyword in privacy_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(privacy_keywords)
        
        if score >= 0.7:
            level = ComplianceLevel.COMPLIANT
            message = f"Privacy notice covers {len(found_keywords)}/{len(privacy_keywords)} key areas"
        elif score >= 0.4:
            level = ComplianceLevel.PARTIAL
            message = f"Privacy notice partially covers {len(found_keywords)}/{len(privacy_keywords)} key areas"
        else:
            level = ComplianceLevel.NON_COMPLIANT
            message = f"Privacy notice covers only {len(found_keywords)}/{len(privacy_keywords)} key areas"
        
        return ComplianceCheck(
            check_name="Privacy Notice",
            level=level,
            score=score,
            message=message,
            evidence=found_keywords,
            recommendation="Ensure all privacy aspects are clearly documented"
        )
    
    async def _check_data_retention(self, text: str) -> ComplianceCheck:
        """Check if policy specifies data retention periods"""
        retention_patterns = [
            r"retention.*period",
            r"data.*retention",
            r"retain.*data",
            r"delete.*after",
            r"destroy.*after"
        ]
        
        evidence = []
        for pattern in retention_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Data Retention",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Data retention policies are specified",
                evidence=evidence,
                recommendation="Ensure retention periods are specific and justified"
            )
        else:
            return ComplianceCheck(
                check_name="Data Retention",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No clear data retention policies found",
                evidence=[],
                recommendation="Define specific data retention periods for different data types"
            )
    
    async def _check_consent_mechanisms(self, text: str) -> ComplianceCheck:
        """Check if policy describes consent mechanisms"""
        consent_patterns = [
            r"consent.*withdraw",
            r"opt.*out",
            r"unsubscribe",
            r"withdraw.*consent",
            r"consent.*mechanism"
        ]
        
        evidence = []
        for pattern in consent_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Consent Mechanisms",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Consent withdrawal mechanisms are described",
                evidence=evidence,
                recommendation="Ensure consent mechanisms are easily accessible"
            )
        else:
            return ComplianceCheck(
                check_name="Consent Mechanisms",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.1,
                message="No consent withdrawal mechanisms found",
                evidence=[],
                recommendation="Implement clear consent withdrawal procedures"
            )
    
    async def _check_data_subject_rights(self, text: str) -> ComplianceCheck:
        """Check if policy mentions data subject rights"""
        rights_keywords = [
            "right to access", "right to rectification", "right to erasure",
            "right to portability", "right to object", "data subject rights"
        ]
        
        found_rights = []
        for right in rights_keywords:
            if re.search(rf"\b{re.escape(right)}\b", text, re.IGNORECASE):
                found_rights.append(right)
        
        score = len(found_rights) / len(rights_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Data Subject Rights",
            level=level,
            score=score,
            message=f"Found {len(found_rights)}/{len(rights_keywords)} data subject rights mentioned",
            evidence=found_rights,
            recommendation="Ensure all data subject rights are clearly explained"
        )
    
    async def _check_data_breach_procedures(self, text: str) -> ComplianceCheck:
        """Check if policy includes data breach procedures"""
        breach_patterns = [
            r"data breach",
            r"security incident",
            r"breach.*notification",
            r"incident.*response",
            r"breach.*procedure"
        ]
        
        evidence = []
        for pattern in breach_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Data Breach Procedures",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Data breach procedures are documented",
                evidence=evidence,
                recommendation="Ensure breach notification timelines are specified"
            )
        else:
            return ComplianceCheck(
                check_name="Data Breach Procedures",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No data breach procedures found",
                evidence=[],
                recommendation="Implement comprehensive data breach response procedures"
            )
    
    # CCPA Compliance Checks
    def _get_ccpa_checks(self):
        return [
            self._check_consumer_rights,
            self._check_opt_out_mechanisms,
            self._check_data_disclosure,
            self._check_third_party_sharing
        ]
    
    async def _check_consumer_rights(self, text: str) -> ComplianceCheck:
        """Check for CCPA consumer rights"""
        ccpa_rights = [
            "right to know", "right to delete", "right to opt-out",
            "right to non-discrimination", "right to equal service"
        ]
        
        found_rights = []
        for right in ccpa_rights:
            if re.search(rf"\b{re.escape(right)}\b", text, re.IGNORECASE):
                found_rights.append(right)
        
        score = len(found_rights) / len(ccpa_rights)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="CCPA Consumer Rights",
            level=level,
            score=score,
            message=f"Found {len(found_rights)}/{len(ccpa_rights)} CCPA rights mentioned",
            evidence=found_rights,
            recommendation="Ensure all CCPA consumer rights are clearly documented"
        )
    
    async def _check_opt_out_mechanisms(self, text: str) -> ComplianceCheck:
        """Check for opt-out mechanisms"""
        opt_out_patterns = [
            r"opt.*out",
            r"do not sell",
            r"do not share",
            r"unsubscribe",
            r"opt.*out.*personal.*information"
        ]
        
        evidence = []
        for pattern in opt_out_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Opt-Out Mechanisms",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Opt-out mechanisms are clearly described",
                evidence=evidence,
                recommendation="Ensure opt-out mechanisms are easily accessible"
            )
        else:
            return ComplianceCheck(
                check_name="Opt-Out Mechanisms",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.1,
                message="No opt-out mechanisms found",
                evidence=[],
                recommendation="Implement clear opt-out procedures for personal information"
            )
    
    async def _check_data_disclosure(self, text: str) -> ComplianceCheck:
        """Check for data disclosure practices"""
        disclosure_keywords = [
            "personal information", "data collection", "data categories",
            "business purpose", "commercial purpose", "third party"
        ]
        
        found_keywords = []
        for keyword in disclosure_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(disclosure_keywords)
        
        if score >= 0.7:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.4:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Data Disclosure",
            level=level,
            score=score,
            message=f"Data disclosure practices cover {len(found_keywords)}/{len(disclosure_keywords)} key areas",
            evidence=found_keywords,
            recommendation="Ensure comprehensive disclosure of data practices"
        )
    
    async def _check_third_party_sharing(self, text: str) -> ComplianceCheck:
        """Check for third-party sharing disclosures"""
        sharing_patterns = [
            r"third party",
            r"share.*information",
            r"disclose.*information",
            r"service provider",
            r"business partner"
        ]
        
        evidence = []
        for pattern in sharing_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Third-Party Sharing",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Third-party sharing practices are disclosed",
                evidence=evidence,
                recommendation="Ensure specific third parties and purposes are listed"
            )
        else:
            return ComplianceCheck(
                check_name="Third-Party Sharing",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No third-party sharing disclosures found",
                evidence=[],
                recommendation="Clearly document all third-party data sharing practices"
            )
    
    # HIPAA Compliance Checks
    def _get_hipaa_checks(self):
        return [
            self._check_phi_protection,
            self._check_administrative_safeguards,
            self._check_physical_safeguards,
            self._check_technical_safeguards,
            self._check_breach_notification
        ]
    
    async def _check_phi_protection(self, text: str) -> ComplianceCheck:
        """Check for Protected Health Information (PHI) protection"""
        phi_keywords = [
            "protected health information", "PHI", "health information",
            "medical record", "patient data", "health data"
        ]
        
        found_keywords = []
        for keyword in phi_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(phi_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="PHI Protection",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(phi_keywords)} PHI protection elements",
            evidence=found_keywords,
            recommendation="Ensure comprehensive PHI protection measures are documented"
        )
    
    async def _check_administrative_safeguards(self, text: str) -> ComplianceCheck:
        """Check for administrative safeguards"""
        admin_keywords = [
            "administrative safeguards", "workforce training", "security officer",
            "access management", "incident response", "risk assessment"
        ]
        
        found_keywords = []
        for keyword in admin_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(admin_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Administrative Safeguards",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(admin_keywords)} administrative safeguards",
            evidence=found_keywords,
            recommendation="Implement comprehensive administrative safeguards"
        )
    
    async def _check_physical_safeguards(self, text: str) -> ComplianceCheck:
        """Check for physical safeguards"""
        physical_keywords = [
            "physical safeguards", "facility access", "workstation security",
            "device controls", "media controls", "physical security"
        ]
        
        found_keywords = []
        for keyword in physical_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(physical_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Physical Safeguards",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(physical_keywords)} physical safeguards",
            evidence=found_keywords,
            recommendation="Implement comprehensive physical safeguards"
        )
    
    async def _check_technical_safeguards(self, text: str) -> ComplianceCheck:
        """Check for technical safeguards"""
        technical_keywords = [
            "technical safeguards", "access control", "audit controls",
            "encryption", "authentication", "transmission security"
        ]
        
        found_keywords = []
        for keyword in technical_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(technical_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Technical Safeguards",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(technical_keywords)} technical safeguards",
            evidence=found_keywords,
            recommendation="Implement comprehensive technical safeguards"
        )
    
    async def _check_breach_notification(self, text: str) -> ComplianceCheck:
        """Check for breach notification procedures"""
        breach_patterns = [
            r"breach notification",
            r"security breach",
            r"data breach",
            r"incident notification",
            r"breach response"
        ]
        
        evidence = []
        for pattern in breach_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Breach Notification",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Breach notification procedures are documented",
                evidence=evidence,
                recommendation="Ensure notification timelines are clearly specified"
            )
        else:
            return ComplianceCheck(
                check_name="Breach Notification",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No breach notification procedures found",
                evidence=[],
                recommendation="Implement comprehensive breach notification procedures"
            )
    
    # SOX Compliance Checks
    def _get_sox_checks(self):
        return [
            self._check_internal_controls,
            self._check_financial_reporting,
            self._check_audit_committee,
            self._check_whistleblower_protection
        ]
    
    async def _check_internal_controls(self, text: str) -> ComplianceCheck:
        """Check for internal controls documentation"""
        controls_keywords = [
            "internal controls", "control environment", "risk assessment",
            "control activities", "monitoring", "information and communication"
        ]
        
        found_keywords = []
        for keyword in controls_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(controls_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Internal Controls",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(controls_keywords)} internal control elements",
            evidence=found_keywords,
            recommendation="Ensure comprehensive internal controls framework"
        )
    
    async def _check_financial_reporting(self, text: str) -> ComplianceCheck:
        """Check for financial reporting controls"""
        reporting_keywords = [
            "financial reporting", "financial statements", "disclosure controls",
            "management assessment", "auditor attestation", "material weakness"
        ]
        
        found_keywords = []
        for keyword in reporting_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(reporting_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Financial Reporting",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(reporting_keywords)} financial reporting elements",
            evidence=found_keywords,
            recommendation="Ensure robust financial reporting controls"
        )
    
    async def _check_audit_committee(self, text: str) -> ComplianceCheck:
        """Check for audit committee documentation"""
        audit_patterns = [
            r"audit committee",
            r"independent director",
            r"financial expert",
            r"audit oversight"
        ]
        
        evidence = []
        for pattern in audit_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Audit Committee",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Audit committee oversight is documented",
                evidence=evidence,
                recommendation="Ensure audit committee independence and expertise"
            )
        else:
            return ComplianceCheck(
                check_name="Audit Committee",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No audit committee oversight found",
                evidence=[],
                recommendation="Establish independent audit committee oversight"
            )
    
    async def _check_whistleblower_protection(self, text: str) -> ComplianceCheck:
        """Check for whistleblower protection mechanisms"""
        whistleblower_patterns = [
            r"whistleblower",
            r"hotline",
            r"anonymous reporting",
            r"retaliation protection",
            r"ethics hotline"
        ]
        
        evidence = []
        for pattern in whistleblower_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Whistleblower Protection",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Whistleblower protection mechanisms are in place",
                evidence=evidence,
                recommendation="Ensure whistleblower protection is comprehensive"
            )
        else:
            return ComplianceCheck(
                check_name="Whistleblower Protection",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.1,
                message="No whistleblower protection mechanisms found",
                evidence=[],
                recommendation="Implement whistleblower protection and reporting mechanisms"
            )
    
    # PCI DSS Compliance Checks
    def _get_pci_dss_checks(self):
        return [
            self._check_network_security,
            self._check_data_protection,
            self._check_access_control,
            self._check_monitoring,
            self._check_incident_response
        ]
    
    async def _check_network_security(self, text: str) -> ComplianceCheck:
        """Check for network security measures"""
        network_keywords = [
            "firewall", "network security", "intrusion detection",
            "network segmentation", "secure network", "network monitoring"
        ]
        
        found_keywords = []
        for keyword in network_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(network_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Network Security",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(network_keywords)} network security measures",
            evidence=found_keywords,
            recommendation="Implement comprehensive network security controls"
        )
    
    async def _check_data_protection(self, text: str) -> ComplianceCheck:
        """Check for data protection measures"""
        protection_keywords = [
            "encryption", "data protection", "cardholder data",
            "sensitive data", "data security", "data classification"
        ]
        
        found_keywords = []
        for keyword in protection_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(protection_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Data Protection",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(protection_keywords)} data protection measures",
            evidence=found_keywords,
            recommendation="Implement comprehensive data protection controls"
        )
    
    async def _check_access_control(self, text: str) -> ComplianceCheck:
        """Check for access control measures"""
        access_keywords = [
            "access control", "user authentication", "role-based access",
            "privileged access", "access management", "user provisioning"
        ]
        
        found_keywords = []
        for keyword in access_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(access_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Access Control",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(access_keywords)} access control measures",
            evidence=found_keywords,
            recommendation="Implement comprehensive access control framework"
        )
    
    async def _check_monitoring(self, text: str) -> ComplianceCheck:
        """Check for monitoring and logging"""
        monitoring_keywords = [
            "monitoring", "logging", "audit trail", "security monitoring",
            "log management", "event logging", "security events"
        ]
        
        found_keywords = []
        for keyword in monitoring_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(monitoring_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Monitoring and Logging",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(monitoring_keywords)} monitoring measures",
            evidence=found_keywords,
            recommendation="Implement comprehensive monitoring and logging"
        )
    
    async def _check_incident_response(self, text: str) -> ComplianceCheck:
        """Check for incident response procedures"""
        incident_patterns = [
            r"incident response",
            r"security incident",
            r"incident management",
            r"response plan",
            r"incident procedure"
        ]
        
        evidence = []
        for pattern in incident_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            evidence.extend(matches)
        
        if evidence:
            return ComplianceCheck(
                check_name="Incident Response",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Incident response procedures are documented",
                evidence=evidence,
                recommendation="Ensure incident response procedures are tested regularly"
            )
        else:
            return ComplianceCheck(
                check_name="Incident Response",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No incident response procedures found",
                evidence=[],
                recommendation="Implement comprehensive incident response procedures"
            )
    
    # General Insurance Standards
    def _get_insurance_standards_checks(self):
        return [
            self._check_policy_clarity,
            self._check_coverage_details,
            self._check_exclusions,
            self._check_claims_procedures,
            self._check_contact_information,
            self._check_terms_conditions
        ]
    
    async def _check_policy_clarity(self, text: str) -> ComplianceCheck:
        """Check if policy language is clear and understandable"""
        # Look for complex legal language that might be unclear
        complex_patterns = [
            r"notwithstanding",
            r"hereinbefore",
            r"aforementioned",
            r"pursuant to",
            r"subject to the provisions"
        ]
        
        complex_count = 0
        for pattern in complex_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            complex_count += len(matches)
        
        # Look for clear language indicators
        clear_patterns = [
            r"you will",
            r"we will",
            r"this means",
            r"in other words",
            r"for example"
        ]
        
        clear_count = 0
        for pattern in clear_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            clear_count += len(matches)
        
        # Calculate clarity score
        total_indicators = complex_count + clear_count
        if total_indicators == 0:
            score = 0.5  # Neutral if no indicators found
        else:
            score = clear_count / total_indicators
        
        if score >= 0.7:
            level = ComplianceLevel.COMPLIANT
            message = "Policy language is generally clear and understandable"
        elif score >= 0.4:
            level = ComplianceLevel.PARTIAL
            message = "Policy language has some complex terms but includes clarifications"
        else:
            level = ComplianceLevel.NON_COMPLIANT
            message = "Policy language contains many complex legal terms without clear explanations"
        
        return ComplianceCheck(
            check_name="Policy Clarity",
            level=level,
            score=score,
            message=message,
            evidence=[f"Clear indicators: {clear_count}", f"Complex terms: {complex_count}"],
            recommendation="Use plain language and provide clear explanations for complex terms"
        )
    
    async def _check_coverage_details(self, text: str) -> ComplianceCheck:
        """Check if coverage details are comprehensive"""
        # More flexible coverage patterns
        coverage_patterns = [
            r"coverage.*\d+",  # Coverage with amounts
            r"expenses.*up to",  # Expense limits
            r"benefits",  # Benefits mentioned
            r"limits",  # Any limits mentioned
            r"maximum",  # Maximum amounts
            r"covered.*services",  # Covered services
            r"policy.*limits",  # Policy limits
            r"hospitalization",  # Hospitalization coverage
            r"pre.*post.*hospitalization",  # Pre/post hospitalization
            r"daycare.*procedures"  # Daycare procedures
        ]
        
        found_patterns = []
        for pattern in coverage_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                found_patterns.append(pattern)
        
        # Also check for specific amounts/numbers in coverage context
        amount_patterns = [
            r"\d+,\d+",  # Numbers with commas (like 5,00,000)
            r"\d+\.\d+",  # Decimal numbers
            r"\d+",  # Any numbers
        ]
        
        has_amounts = any(re.search(pattern, text, re.IGNORECASE) for pattern in amount_patterns)
        
        # Calculate score based on patterns found and presence of amounts
        base_score = len(found_patterns) / len(coverage_patterns)
        amount_bonus = 0.3 if has_amounts else 0
        score = min(1.0, base_score + amount_bonus)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        evidence = found_patterns[:5]  # Limit evidence
        if has_amounts:
            evidence.append("Contains specific amounts/limits")
        
        return ComplianceCheck(
            check_name="Coverage Details",
            level=level,
            score=score,
            message=f"Found {len(found_patterns)} coverage patterns" + (" with specific amounts" if has_amounts else ""),
            evidence=evidence,
            recommendation="Ensure all coverage details are clearly specified with amounts and conditions"
        )
    
    async def _check_exclusions(self, text: str) -> ComplianceCheck:
        """Check if exclusions are clearly stated"""
        exclusion_patterns = [
            r"not covered",
            r"exclusions",
            r"not included",
            r"excluded from coverage",
            r"limitations"
        ]
        
        evidence = []
        for pattern in exclusion_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            # Only add unique matches and limit to 5 per pattern
            unique_matches = list(set(matches))[:5]
            evidence.extend(unique_matches)
        
        # Limit total evidence to 10 items
        evidence = evidence[:10]
        
        if evidence:
            return ComplianceCheck(
                check_name="Exclusions",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Exclusions are clearly stated in the policy",
                evidence=evidence,
                recommendation="Ensure exclusions are prominently displayed and clearly explained"
            )
        else:
            return ComplianceCheck(
                check_name="Exclusions",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="No clear exclusions section found",
                evidence=[],
                recommendation="Add a clear exclusions section to the policy"
            )
    
    async def _check_claims_procedures(self, text: str) -> ComplianceCheck:
        """Check if claims procedures are documented"""
        # More flexible claims patterns
        claims_patterns = [
            r"claim",  # Basic claim mention
            r"cashless.*treatment",  # Cashless treatment
            r"reimbursement",  # Reimbursement process
            r"network.*hospitals",  # Network hospitals
            r"non.*network",  # Non-network hospitals
            r"claims.*procedure",  # Claims procedure
            r"how.*to.*file",  # How to file
            r"claim.*form",  # Claim form
            r"claim.*process",  # Claim process
            r"claim.*submission"  # Claim submission
        ]
        
        found_patterns = []
        for pattern in claims_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                found_patterns.append(pattern)
        
        # Calculate score based on patterns found
        score = len(found_patterns) / len(claims_patterns)
        
        if score >= 0.4:  # Lowered threshold
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.2:  # Lowered threshold
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Claims Procedures",
            level=level,
            score=score,
            message=f"Found {len(found_patterns)} claims patterns",
            evidence=found_patterns[:5],
            recommendation="Ensure comprehensive claims procedures with clear steps and contact information"
        )
    
    async def _check_contact_information(self, text: str) -> ComplianceCheck:
        """Check if contact information is provided"""
        contact_patterns = [
            r"phone.*number",
            r"email.*address",
            r"contact.*information",
            r"customer service",
            r"claims.*department",
            r"policy.*service"
        ]
        
        evidence = []
        for pattern in contact_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            # Only add unique matches and limit to 3 per pattern
            unique_matches = list(set(matches))[:3]
            evidence.extend(unique_matches)
        
        # Limit total evidence to 8 items
        evidence = evidence[:8]
        
        if evidence:
            return ComplianceCheck(
                check_name="Contact Information",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Contact information is provided in the policy",
                evidence=evidence,
                recommendation="Ensure contact information is current and easily accessible"
            )
        else:
            return ComplianceCheck(
                check_name="Contact Information",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.1,
                message="No clear contact information found",
                evidence=[],
                recommendation="Add clear contact information for customer service and claims"
            )
    
    async def _check_terms_conditions(self, text: str) -> ComplianceCheck:
        """Check if terms and conditions are comprehensive"""
        terms_keywords = [
            "terms and conditions", "policy terms", "conditions", "agreement",
            "policyholder", "insured", "premium", "renewal", "cancellation"
        ]
        
        found_keywords = []
        for keyword in terms_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE):
                found_keywords.append(keyword)
        
        score = len(found_keywords) / len(terms_keywords)
        
        if score >= 0.6:
            level = ComplianceLevel.COMPLIANT
        elif score >= 0.3:
            level = ComplianceLevel.PARTIAL
        else:
            level = ComplianceLevel.NON_COMPLIANT
        
        return ComplianceCheck(
            check_name="Terms and Conditions",
            level=level,
            score=score,
            message=f"Found {len(found_keywords)}/{len(terms_keywords)} terms and conditions elements",
            evidence=found_keywords,
            recommendation="Ensure comprehensive terms and conditions are clearly documented"
        )
    
    def get_available_regulations(self) -> Dict[str, str]:
        """Get list of available regulation frameworks"""
        return {key: value["name"] for key, value in self.regulations.items()}
    
    def _detect_regulation_framework(self, policy_text: str) -> str:
        """
        Auto-detect the most appropriate regulatory framework based on policy content
        """
        text_lower = policy_text.lower()
        
        # Define keywords for each framework
        framework_keywords = {
            "gdpr": [
                "personal data", "data protection", "consent", "privacy", 
                "data subject", "right to be forgotten", "data processing",
                "european union", "eu", "gdpr", "data controller"
            ],
            "hipaa": [
                "health information", "protected health information", "phi",
                "medical records", "healthcare", "patient", "health insurance",
                "hipaa", "healthcare provider", "medical data"
            ],
            "ccpa": [
                "california", "consumer privacy", "personal information",
                "opt-out", "data rights", "ccpa", "california consumer",
                "privacy rights", "data sale"
            ],
            "sox": [
                "financial", "accounting", "internal controls", "audit",
                "sarbanes-oxley", "sox", "financial reporting", "corporate governance"
            ],
            "pci_dss": [
                "payment", "credit card", "cardholder", "payment data",
                "pci", "payment processing", "financial data", "transaction"
            ]
        }
        
        # Count keyword matches for each framework
        framework_scores = {}
        for framework, keywords in framework_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            framework_scores[framework] = matches
        
        # Return the framework with the most matches, or default to insurance_standards
        if framework_scores and max(framework_scores.values()) > 0:
            best_framework = max(framework_scores, key=framework_scores.get)
            print(f"🔍 Framework detection: {best_framework} ({framework_scores[best_framework]} matches)")
            return best_framework
        
        # Default to insurance standards if no specific framework detected
        return "insurance_standards"
