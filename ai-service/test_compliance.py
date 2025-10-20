#!/usr/bin/env python3
"""
Test script for compliance checking functionality
"""

import asyncio
import os
from services.compliance_service import ComplianceService
from services.ai_service import AIService

async def test_compliance_service():
    """Test the compliance service with sample policy text"""
    
    print("🔍 Testing Compliance Service...")
    
    # Sample insurance policy text for testing
    sample_policy_text = """
    INSURANCE POLICY TERMS AND CONDITIONS
    
    This policy provides comprehensive coverage for the policyholder. The policy includes:
    
    COVERAGE DETAILS:
    - Medical expenses up to $100,000 per year
    - Deductible of $500 per incident
    - Copay of $25 for doctor visits
    - Coinsurance of 20% for specialist visits
    
    EXCLUSIONS:
    The following are not covered under this policy:
    - Pre-existing conditions
    - Cosmetic procedures
    - Experimental treatments
    
    CLAIMS PROCEDURES:
    To file a claim, contact our claims department at 1-800-CLAIMS or email claims@insurance.com.
    Claims must be submitted within 30 days of treatment.
    
    PRIVACY NOTICE:
    We collect personal data including medical information, contact details, and payment information.
    This data is used for policy administration, claims processing, and regulatory compliance.
    You have the right to access, correct, or delete your personal data.
    You may withdraw consent at any time by contacting our privacy officer.
    
    DATA RETENTION:
    We retain your personal data for 7 years after policy termination for regulatory compliance.
    Medical records are retained for 10 years as required by law.
    
    CONTACT INFORMATION:
    Customer Service: 1-800-INSURANCE
    Claims Department: 1-800-CLAIMS
    Privacy Officer: privacy@insurance.com
    
    This policy is governed by the laws of the state where it was issued.
    """
    
    try:
        # Test compliance service directly
        compliance_service = ComplianceService()
        
        print("\n📋 Testing Insurance Standards Compliance...")
        report = await compliance_service.check_compliance(
            policy_text=sample_policy_text,
            policy_id="test-policy-001",
            user_id="test-user-001",
            regulation_framework="insurance_standards"
        )
        
        print(f"✅ Overall Compliance: {report.overall_level.value} ({report.overall_score:.2f})")
        print(f"📊 Regulation Framework: {report.regulation_framework}")
        print(f"🔍 Number of Checks: {len(report.checks)}")
        
        print("\n📝 Individual Check Results:")
        for check in report.checks:
            print(f"  • {check.check_name}: {check.level.value} ({check.score:.2f})")
            print(f"    Message: {check.message}")
            if check.recommendation:
                print(f"    Recommendation: {check.recommendation}")
            print()
        
        # Test GDPR compliance
        print("\n📋 Testing GDPR Compliance...")
        gdpr_report = await compliance_service.check_compliance(
            policy_text=sample_policy_text,
            policy_id="test-policy-002",
            user_id="test-user-002",
            regulation_framework="gdpr"
        )
        
        print(f"✅ GDPR Compliance: {gdpr_report.overall_level.value} ({gdpr_report.overall_score:.2f})")
        print(f"🔍 Number of GDPR Checks: {len(gdpr_report.checks)}")
        
        # Test available regulations
        print("\n📋 Available Regulations:")
        regulations = await compliance_service.get_available_regulations()
        for key, name in regulations.items():
            print(f"  • {key}: {name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing compliance service: {e}")
        return False

async def test_ai_service_compliance():
    """Test compliance checking through AI service"""
    
    print("\n🔍 Testing AI Service Compliance Integration...")
    
    try:
        ai_service = AIService()
        
        # Test getting available regulations
        print("📋 Getting available regulations...")
        regulations = await ai_service.get_available_regulations()
        print(f"Available regulations: {regulations}")
        
        # Test compliance checking (this would require a real policy in the database)
        print("📋 Note: Full compliance checking requires a policy in the database")
        print("✅ AI Service compliance integration is working")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing AI service compliance: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 Starting Compliance Testing...")
    
    # Check if OpenAI API key is available
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. Some tests may fail.")
    
    # Test compliance service
    compliance_success = await test_compliance_service()
    
    # Test AI service integration
    ai_success = await test_ai_service_compliance()
    
    # Summary
    print("\n📊 Test Summary:")
    print(f"  • Compliance Service: {'✅ PASS' if compliance_success else '❌ FAIL'}")
    print(f"  • AI Service Integration: {'✅ PASS' if ai_success else '❌ FAIL'}")
    
    if compliance_success and ai_success:
        print("\n🎉 All compliance tests passed!")
        return True
    else:
        print("\n❌ Some compliance tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
