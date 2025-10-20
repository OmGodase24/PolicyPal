# Compliance Checking Guide

## Overview

The PolicyPal AI Service now includes comprehensive compliance checking capabilities that can analyze insurance policies against various regulatory frameworks and standards. This feature helps ensure policies meet legal requirements and industry best practices.

## Supported Regulation Frameworks

### 1. General Insurance Standards
- **Purpose**: Basic insurance policy compliance
- **Checks**: Policy clarity, coverage details, exclusions, claims procedures, contact information, terms and conditions

### 2. GDPR (General Data Protection Regulation)
- **Purpose**: European data protection compliance
- **Checks**: Data Protection Officer, privacy notices, data retention, consent mechanisms, data subject rights, breach procedures

### 3. CCPA (California Consumer Privacy Act)
- **Purpose**: California privacy law compliance
- **Checks**: Consumer rights, opt-out mechanisms, data disclosure, third-party sharing

### 4. HIPAA (Health Insurance Portability and Accountability Act)
- **Purpose**: Healthcare data protection compliance
- **Checks**: PHI protection, administrative safeguards, physical safeguards, technical safeguards, breach notification

### 5. SOX (Sarbanes-Oxley Act)
- **Purpose**: Financial reporting compliance
- **Checks**: Internal controls, financial reporting, audit committee, whistleblower protection

### 6. PCI DSS (Payment Card Industry Data Security Standard)
- **Purpose**: Payment card data security compliance
- **Checks**: Network security, data protection, access control, monitoring, incident response

## API Endpoints

### 1. Check Policy Compliance
```http
POST /compliance/check
Content-Type: application/json

{
    "policy_id": "policy-123",
    "user_id": "user-456",
    "regulation_framework": "insurance_standards"
}
```

**Response:**
```json
{
    "success": true,
    "report": {
        "policy_id": "policy-123",
        "user_id": "user-456",
        "overall_score": 0.75,
        "overall_level": "partial",
        "regulation_framework": "insurance_standards",
        "generated_at": "2024-01-15T10:30:00Z",
        "checks": [
            {
                "check_name": "Policy Clarity",
                "level": "compliant",
                "score": 0.85,
                "message": "Policy language is clear and understandable",
                "evidence": ["clear indicators: 5", "complex terms: 2"],
                "recommendation": "Continue using plain language"
            }
        ]
    },
    "message": "Compliance check completed successfully"
}
```

### 2. Check Compliance from File
```http
POST /compliance/check-file
Content-Type: multipart/form-data

file: [PDF file]
user_id: user-456
policy_id: policy-123
regulation_framework: gdpr
```

### 3. Get Available Regulations
```http
GET /compliance/regulations
```

**Response:**
```json
{
    "success": true,
    "regulations": {
        "insurance_standards": "General Insurance Standards",
        "gdpr": "General Data Protection Regulation (GDPR)",
        "ccpa": "California Consumer Privacy Act (CCPA)",
        "hipaa": "Health Insurance Portability and Accountability Act (HIPAA)",
        "sox": "Sarbanes-Oxley Act (SOX)",
        "pci_dss": "Payment Card Industry Data Security Standard (PCI DSS)"
    },
    "message": "Available regulations retrieved successfully"
}
```

## Compliance Levels

- **Compliant** (0.8-1.0): Policy meets most or all requirements
- **Partial** (0.5-0.79): Policy meets some requirements but needs improvement
- **Non-Compliant** (0.2-0.49): Policy meets few requirements and needs significant work
- **Unknown** (0.0-0.19): Unable to determine compliance or check failed

## How It Works

### 1. Pattern-Based Analysis
The system uses regex patterns and keyword matching to identify compliance elements in policy text. This provides fast, reliable analysis without requiring AI processing.

### 2. Scoring Algorithm
Each check is scored based on:
- Presence of required elements
- Quality of evidence found
- Completeness of coverage
- Specificity of language

### 3. Overall Scoring
The overall compliance score is calculated as a weighted average of individual check scores, with different weights applied based on compliance level.

## Usage Examples

### Python Integration
```python
from services.compliance_service import ComplianceService

# Initialize service
compliance_service = ComplianceService()

# Check compliance
report = await compliance_service.check_compliance(
    policy_text=policy_content,
    policy_id="policy-123",
    user_id="user-456",
    regulation_framework="gdpr"
)

print(f"Compliance: {report.overall_level.value} ({report.overall_score:.2f})")
```

### Frontend Integration
```javascript
// Check compliance
const response = await fetch('/compliance/check', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        policy_id: 'policy-123',
        user_id: 'user-456',
        regulation_framework: 'insurance_standards'
    })
});

const result = await response.json();
console.log('Compliance Report:', result.report);
```

## Testing

### Basic Test
```bash
python test_compliance_basic.py
```

### Full Test (requires OpenAI API key)
```bash
python test_compliance.py
```

## Customization

### Adding New Regulations
1. Add new regulation to `self.regulations` in `ComplianceService.__init__()`
2. Create check functions following the pattern `_check_[name]`
3. Add regulation to the regulations list

### Adding New Checks
1. Create a new check function that returns a `ComplianceCheck` object
2. Add the function to the appropriate regulation's checks list
3. Follow the existing pattern for scoring and evidence collection

## Best Practices

1. **Regular Updates**: Keep regulation patterns updated as laws change
2. **Comprehensive Testing**: Test with various policy types and formats
3. **Clear Recommendations**: Provide actionable recommendations for improvement
4. **Evidence Collection**: Always provide evidence for compliance decisions
5. **Error Handling**: Gracefully handle edge cases and errors

## Troubleshooting

### Common Issues

1. **No Policy Text**: Ensure policy has been processed and text extracted
2. **Low Compliance Scores**: Check if policy contains required elements
3. **API Errors**: Verify OpenAI API key is set for AI-powered checks
4. **Import Errors**: Ensure all dependencies are installed

### Debug Mode
Enable debug logging to see detailed compliance checking process:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

- AI-powered compliance checking using OpenAI
- Custom regulation frameworks
- Compliance trend analysis
- Automated remediation suggestions
- Integration with legal databases
- Multi-language support
- Real-time compliance monitoring
