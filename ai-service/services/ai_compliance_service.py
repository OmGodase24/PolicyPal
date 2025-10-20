# AI-Powered Compliance Service
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from openai import OpenAI
from models.schemas import ComplianceLevel, ComplianceCheck, ComplianceReport

class AIComplianceService:
    """
    AI-powered compliance service that uses OpenAI to understand policy content
    and generate intelligent compliance assessments
    """
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = None
            raise ValueError("OpenAI API key not found")
    
    async def check_compliance(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        regulation_framework: str = "insurance_standards"
    ) -> ComplianceReport:
        """
        Use AI to perform intelligent compliance analysis
        """
        print(f"🤖 AI Compliance Service: Analyzing policy {policy_id} with AI")
        
        # Create the AI prompt for compliance analysis
        prompt = self._create_compliance_prompt(policy_text, regulation_framework)
        
        try:
            # Call OpenAI API for intelligent analysis
            response = await self._call_openai_compliance(prompt)
            
            # Parse the AI response
            compliance_data = self._parse_ai_response(response)
            
            # Create compliance report
            report = ComplianceReport(
                policy_id=policy_id,
                user_id=user_id,
                overall_score=compliance_data['overall_score'],
                overall_level=compliance_data['overall_level'],
                checks=compliance_data['checks'],
                generated_at=datetime.now(),
                regulation_framework=regulation_framework
            )
            
            print(f"✅ AI Compliance analysis completed: {compliance_data['overall_level']} ({compliance_data['overall_score']:.2f})")
            return report
            
        except Exception as e:
            print(f"❌ AI Compliance analysis failed: {e}")
            # Return a fallback report
            return self._create_fallback_report(policy_id, user_id, regulation_framework)
    
    def _create_compliance_prompt(self, policy_text: str, regulation_framework: str) -> str:
        """Create a comprehensive prompt for AI compliance analysis"""
        
        framework_guidelines = {
            "insurance_standards": """
            Analyze this insurance policy against general insurance industry standards:
            1. Policy Clarity: Is the language clear and understandable for consumers?
            2. Coverage Details: Are benefits, limits, and coverage clearly specified?
            3. Exclusions: Are exclusions clearly stated and understandable?
            4. Claims Procedures: Are claims processes clearly explained?
            5. Contact Information: Is customer service contact information provided?
            6. Terms & Conditions: Are important terms and conditions documented?
            """,
            "gdpr": """
            Analyze this policy against GDPR requirements:
            1. Data Protection: How does the policy handle personal data?
            2. Consent Mechanisms: Are data processing activities clearly explained?
            3. Data Subject Rights: Are user rights clearly stated?
            4. Data Retention: Are data retention periods specified?
            5. Data Breach Procedures: Are breach notification procedures defined?
            6. Privacy Notice: Is privacy information comprehensive?
            """,
            "hipaa": """
            Analyze this policy against HIPAA requirements:
            1. PHI Protection: How is protected health information handled?
            2. Administrative Safeguards: Are administrative procedures documented?
            3. Physical Safeguards: Are physical security measures mentioned?
            4. Technical Safeguards: Are technical security measures described?
            5. Breach Notification: Are breach notification procedures clear?
            6. Patient Rights: Are patient rights clearly stated?
            """
        }
        
        guidelines = framework_guidelines.get(regulation_framework, framework_guidelines["insurance_standards"])
        
        prompt = f"""
        You are an expert compliance analyst. Analyze the following insurance policy document and provide a comprehensive compliance assessment.

        {guidelines}

        Policy Document:
        {policy_text}

        IMPORTANT: You MUST respond with ONLY valid JSON in the exact format below. Do not include any explanatory text before or after the JSON.

        {{
            "overall_score": 0.85,
            "overall_level": "compliant",
            "checks": [
                {{
                    "check_name": "Policy Clarity",
                    "level": "compliant",
                    "score": 0.9,
                    "message": "The policy uses clear, understandable language with good explanations",
                    "evidence": ["Clear section headings", "Plain language explanations", "Examples provided"],
                    "recommendation": "Continue using clear language throughout"
                }},
                {{
                    "check_name": "Coverage Details",
                    "level": "compliant", 
                    "score": 0.8,
                    "message": "Coverage is well-defined with specific amounts and conditions",
                    "evidence": ["Specific coverage amounts", "Clear benefit descriptions", "Coverage limits specified"],
                    "recommendation": "Consider adding more detail on coverage limits"
                }},
                {{
                    "check_name": "Exclusions",
                    "level": "partial",
                    "score": 0.6,
                    "message": "Exclusions are mentioned but could be more detailed",
                    "evidence": ["Exclusions section present", "Some limitations mentioned"],
                    "recommendation": "Provide more specific exclusion details"
                }},
                {{
                    "check_name": "Claims Procedures",
                    "level": "non_compliant",
                    "score": 0.3,
                    "message": "Claims procedures are not clearly outlined",
                    "evidence": ["No clear claims process found"],
                    "recommendation": "Add detailed claims procedures section"
                }},
                {{
                    "check_name": "Contact Information",
                    "level": "compliant",
                    "score": 0.9,
                    "message": "Contact information is clearly provided",
                    "evidence": ["Phone numbers provided", "Email addresses listed", "Addresses included"],
                    "recommendation": "Maintain current contact information"
                }},
                {{
                    "check_name": "Terms and Conditions",
                    "level": "partial",
                    "score": 0.7,
                    "message": "Basic terms are covered but could be more comprehensive",
                    "evidence": ["Some terms mentioned", "Basic conditions listed"],
                    "recommendation": "Expand terms and conditions section"
                }}
            ]
        }}

        Guidelines for scoring:
        - Score 0.8-1.0: Compliant (excellent)
        - Score 0.5-0.79: Partial (good but needs improvement)
        - Score 0.2-0.49: Non-compliant (needs significant work)
        - Score 0.0-0.19: Unknown (insufficient information)

        Be thorough and specific in your analysis. Look for actual content and meaning, not just keywords.
        Provide evidence from the actual policy text to support your assessments.
        
        REMEMBER: Respond with ONLY the JSON object above, no additional text.
        """
        
        return prompt
    
    async def _call_openai_compliance(self, prompt: str) -> str:
        """Call OpenAI API for compliance analysis"""
        try:
            # First try with GPT-4
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4",  # Use GPT-4 for better analysis
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert compliance analyst with deep knowledge of insurance regulations and industry standards. Provide accurate, detailed compliance assessments based on policy content analysis."
                        },
                        {
                            "role": "user", 
                            "content": prompt
                        }
                    ],
                    max_tokens=2000,
                    temperature=0.3  # Lower temperature for more consistent analysis
                )
                
                return response.choices[0].message.content
                
            except Exception as gpt4_error:
                # If GPT-4 fails due to token limits, try with GPT-3.5-turbo
                error_str = str(gpt4_error).lower()
                if "token" in error_str or "rate_limit" in error_str or "too large" in error_str:
                    print(f"⚠️ GPT-4 failed due to token limits, falling back to GPT-3.5-turbo")
                    print(f"🔍 Error details: {gpt4_error}")
                    
                    # Truncate the prompt to fit within GPT-3.5-turbo limits
                    truncated_prompt = self._truncate_prompt_for_gpt35(prompt)
                    print(f"📏 Truncated prompt length: {len(truncated_prompt)} characters")
                    
                    try:
                        response = self.client.chat.completions.create(
                            model="gpt-3.5-turbo",
                            messages=[
                                {
                                    "role": "system",
                                    "content": "You are an expert compliance analyst with deep knowledge of insurance regulations and industry standards. Provide accurate, detailed compliance assessments based on policy content analysis."
                                },
                                {
                                    "role": "user", 
                                    "content": truncated_prompt
                                }
                            ],
                            max_tokens=1500,
                            temperature=0.3
                        )
                        
                        print(f"✅ GPT-3.5-turbo analysis completed successfully")
                        return response.choices[0].message.content
                        
                    except Exception as gpt35_error:
                        print(f"❌ GPT-3.5-turbo also failed: {gpt35_error}")
                        # If both models fail, return a basic compliance report
                        return self._generate_fallback_compliance_report()
                else:
                    print(f"❌ GPT-4 failed with non-token error: {gpt4_error}")
                    raise gpt4_error
            
        except Exception as e:
            print(f"❌ OpenAI API call failed: {e}")
            raise e
    
    def _truncate_prompt_for_gpt35(self, prompt: str) -> str:
        """Truncate prompt to fit within GPT-3.5-turbo token limits"""
        # Split the prompt into sections
        sections = prompt.split("Policy Document:")
        if len(sections) < 2:
            return prompt
        
        system_part = sections[0]
        policy_part = sections[1]
        
        # Truncate the policy text to approximately 8000 characters (roughly 2000 tokens)
        max_policy_length = 8000
        if len(policy_part) > max_policy_length:
            policy_part = policy_part[:max_policy_length] + "\n\n[Policy text truncated due to length]"
        
        return system_part + "Policy Document:" + policy_part
    
    def _generate_fallback_compliance_report(self) -> str:
        """Generate a basic compliance report when AI analysis fails"""
        return """{
            "overall_score": 0.5,
            "overall_level": "partial",
            "checks": [
                {
                    "check_name": "Policy Analysis",
                    "level": "partial",
                    "score": 0.5,
                    "message": "Policy analysis could not be completed due to size limitations. Please review the policy manually for compliance.",
                    "evidence": ["Policy document is too large for automated analysis"],
                    "recommendation": "Consider breaking down large policies into smaller sections for better analysis"
                }
            ]
        }"""
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI response and convert to compliance data"""
        try:
            # First try to extract JSON from response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            
            if start_idx != -1 and end_idx > 0:
                json_str = response[start_idx:end_idx]
                try:
                    data = json.loads(json_str)
                    print(f"✅ Successfully parsed JSON from AI response")
                    return self._convert_to_compliance_data(data)
                except json.JSONDecodeError as e:
                    print(f"⚠️ JSON parsing failed, converting text to structured format: {e}")
            
            # If no JSON found or parsing failed, convert text response to structured format
            print(f"🔄 Converting text response to structured compliance data")
            return self._convert_text_to_compliance_data(response)
            
        except Exception as e:
            print(f"❌ Error parsing AI response: {e}")
            # Return fallback data
            return self._get_fallback_compliance_data()
    
    def _convert_to_compliance_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert parsed JSON data to compliance format"""
        # Convert string levels to ComplianceLevel enum
        level_mapping = {
            "compliant": ComplianceLevel.COMPLIANT,
            "partial": ComplianceLevel.PARTIAL,
            "non_compliant": ComplianceLevel.NON_COMPLIANT,
            "unknown": ComplianceLevel.UNKNOWN
        }
        
        # Convert overall level
        overall_level = level_mapping.get(data.get('overall_level', 'unknown'), ComplianceLevel.UNKNOWN)
        
        # Convert checks
        checks = []
        for check_data in data.get('checks', []):
            check = ComplianceCheck(
                check_name=check_data.get('check_name', 'Unknown Check'),
                level=level_mapping.get(check_data.get('level', 'unknown'), ComplianceLevel.UNKNOWN),
                score=float(check_data.get('score', 0.0)),
                message=check_data.get('message', 'No message provided'),
                evidence=check_data.get('evidence', []),
                recommendation=check_data.get('recommendation', 'No recommendation provided')
            )
            checks.append(check)
        
        return {
            'overall_score': float(data.get('overall_score', 0.0)),
            'overall_level': overall_level,
            'checks': checks
        }
    
    def _convert_text_to_compliance_data(self, response: str) -> Dict[str, Any]:
        """Convert text response to structured compliance data"""
        print(f"🔄 Converting text response to compliance data")
        
        # Analyze the text response to extract compliance information
        overall_score = 0.7  # Default to partial compliance
        overall_level = ComplianceLevel.PARTIAL
        
        # Look for compliance indicators in the text
        if "compliant" in response.lower() and "non-compliant" not in response.lower():
            overall_score = 0.8
            overall_level = ComplianceLevel.COMPLIANT
        elif "non-compliant" in response.lower() or "not compliant" in response.lower():
            overall_score = 0.3
            overall_level = ComplianceLevel.NON_COMPLIANT
        elif "partial" in response.lower():
            overall_score = 0.6
            overall_level = ComplianceLevel.PARTIAL
        
        # Create comprehensive compliance checks based on text analysis
        checks = []
        
        # 1. Policy Clarity check
        if "clear" in response.lower() or "understandable" in response.lower():
            checks.append(ComplianceCheck(
                check_name="Policy Clarity",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Policy language is clear and understandable",
                evidence=["Clear language mentioned in analysis"],
                recommendation="Continue using clear language"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Policy Clarity",
                level=ComplianceLevel.PARTIAL,
                score=0.5,
                message="Policy clarity needs improvement",
                evidence=["Clarity assessment from AI analysis"],
                recommendation="Improve language clarity"
            ))
        
        # 2. Coverage Details check
        if "coverage" in response.lower() and "details" in response.lower():
            checks.append(ComplianceCheck(
                check_name="Coverage Details",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Coverage details are well specified",
                evidence=["Coverage details mentioned in analysis"],
                recommendation="Maintain detailed coverage information"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Coverage Details",
                level=ComplianceLevel.PARTIAL,
                score=0.5,
                message="Coverage details could be more specific",
                evidence=["Coverage assessment from AI analysis"],
                recommendation="Add more specific coverage details"
            ))
        
        # 3. Exclusions check
        if "exclusion" in response.lower() or "not covered" in response.lower():
            checks.append(ComplianceCheck(
                check_name="Exclusions",
                level=ComplianceLevel.COMPLIANT,
                score=0.7,
                message="Exclusions are clearly stated",
                evidence=["Exclusions mentioned in analysis"],
                recommendation="Maintain clear exclusion statements"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Exclusions",
                level=ComplianceLevel.PARTIAL,
                score=0.4,
                message="Exclusions need to be more clearly defined",
                evidence=["Limited exclusion information found"],
                recommendation="Add detailed exclusions section"
            ))
        
        # 4. Claims Procedures check
        if "claim" in response.lower() and ("procedure" in response.lower() or "process" in response.lower()):
            checks.append(ComplianceCheck(
                check_name="Claims Procedures",
                level=ComplianceLevel.COMPLIANT,
                score=0.8,
                message="Claims procedures are well documented",
                evidence=["Claims process mentioned in analysis"],
                recommendation="Keep claims procedures up to date"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Claims Procedures",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.3,
                message="Claims procedures are not clearly outlined",
                evidence=["No clear claims process found"],
                recommendation="Add detailed claims procedures section"
            ))
        
        # 5. Contact Information check
        if "contact" in response.lower() or "phone" in response.lower() or "email" in response.lower():
            checks.append(ComplianceCheck(
                check_name="Contact Information",
                level=ComplianceLevel.COMPLIANT,
                score=0.9,
                message="Contact information is clearly provided",
                evidence=["Contact details mentioned in analysis"],
                recommendation="Keep contact information current"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Contact Information",
                level=ComplianceLevel.NON_COMPLIANT,
                score=0.2,
                message="Contact information is missing or unclear",
                evidence=["No clear contact information found"],
                recommendation="Add comprehensive contact information"
            ))
        
        # 6. Terms and Conditions check
        if "term" in response.lower() and "condition" in response.lower():
            checks.append(ComplianceCheck(
                check_name="Terms and Conditions",
                level=ComplianceLevel.COMPLIANT,
                score=0.7,
                message="Terms and conditions are well covered",
                evidence=["Terms mentioned in analysis"],
                recommendation="Review and update terms regularly"
            ))
        else:
            checks.append(ComplianceCheck(
                check_name="Terms and Conditions",
                level=ComplianceLevel.PARTIAL,
                score=0.5,
                message="Terms and conditions could be more comprehensive",
                evidence=["Basic terms found in analysis"],
                recommendation="Expand terms and conditions section"
            ))
        
        return {
            'overall_score': overall_score,
            'overall_level': overall_level,
            'checks': checks
        }
    
    def _get_fallback_compliance_data(self) -> Dict[str, Any]:
        """Get fallback compliance data when all parsing fails"""
        return {
            'overall_score': 0.5,
            'overall_level': ComplianceLevel.PARTIAL,
            'checks': [
                ComplianceCheck(
                    check_name="Policy Clarity",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Policy clarity could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                ),
                ComplianceCheck(
                    check_name="Coverage Details",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Coverage details could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                ),
                ComplianceCheck(
                    check_name="Exclusions",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Exclusions could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                ),
                ComplianceCheck(
                    check_name="Claims Procedures",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Claims procedures could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                ),
                ComplianceCheck(
                    check_name="Contact Information",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Contact information could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                ),
                ComplianceCheck(
                    check_name="Terms and Conditions",
                    level=ComplianceLevel.PARTIAL,
                    score=0.5,
                    message="Terms and conditions could not be assessed due to technical limitations",
                    evidence=["Analysis failed due to parsing issues"],
                    recommendation="Please try again or contact support"
                )
            ]
        }
    
    def _create_fallback_report(self, policy_id: str, user_id: str, regulation_framework: str) -> ComplianceReport:
        """Create a fallback report when AI analysis fails"""
        return ComplianceReport(
            policy_id=policy_id,
            user_id=user_id,
            overall_score=0.0,
            overall_level=ComplianceLevel.UNKNOWN,
            checks=[
                ComplianceCheck(
                    check_name="AI Analysis",
                    level=ComplianceLevel.UNKNOWN,
                    score=0.0,
                    message="AI analysis failed - unable to assess compliance",
                    evidence=[],
                    recommendation="Please try again or contact support"
                )
            ],
            generated_at=datetime.now(),
            regulation_framework=regulation_framework
        )
