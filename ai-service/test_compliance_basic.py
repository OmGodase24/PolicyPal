#!/usr/bin/env python3
"""
Basic test script for compliance checking functionality (without OpenAI API)
"""

import asyncio
import os
from services.compliance_service import ComplianceService

async def test_compliance_patterns():
    """Test compliance checking patterns without OpenAI API"""
    
    print("🔍 Testing Compliance Service Patterns...")
    
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
        
        # Test available regulations
        print("\n📋 Available Regulations:")
        regulations = await compliance_service.get_available_regulations()
        for key, name in regulations.items():
            print(f"  • {key}: {name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing compliance service: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("🚀 Starting Basic Compliance Testing...")
    
    # Test compliance service
    compliance_success = await test_compliance_patterns()
    
    # Summary
    print("\n📊 Test Summary:")
    print(f"  • Compliance Service: {'✅ PASS' if compliance_success else '❌ FAIL'}")
    
    if compliance_success:
        print("\n🎉 Basic compliance tests passed!")
        print("✅ Compliance checking functionality is working correctly")
        return True
    else:
        print("\n❌ Basic compliance tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
