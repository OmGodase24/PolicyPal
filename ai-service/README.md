# PolicyPal AI Service

AI-powered policy document processing and Q&A service with OCR support for scanned documents.

## Features

- **Text Extraction**: Extract text from PDF documents using multiple methods
- **OCR Support**: Process scanned documents using Tesseract OCR
- **AI Processing**: Generate embeddings and provide intelligent Q&A
- **Vector Search**: Find relevant document sections using semantic similarity
- **Multi-format Support**: Handle both text-based and scanned PDFs
- **Compliance Checking**: Analyze policies against regulatory frameworks (GDPR, CCPA, HIPAA, SOX, PCI DSS, Insurance Standards)

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install OCR Support (Optional but Recommended)

**Windows:**
```bash
# Run as administrator
install_tesseract_windows.bat
```

**Linux:**
```bash
sudo apt install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

### 3. Configure Environment

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

Required environment variables:
- `MONGODB_URI`: MongoDB connection string
- `OPENAI_API_KEY`: OpenAI API key for AI processing

### 4. Run the Service

```bash
python main.py
```

The service will start on `http://localhost:8000`

## API Endpoints

### Health Check
```bash
GET /health
```

Returns service status and available features:
```json
{
  "status": "healthy",
  "service": "PolicyPal AI Service",
  "ocr_available": true,
  "features": {
    "text_extraction": true,
    "ocr_extraction": true,
    "ai_processing": true
  }
}
```

### Upload Policy Document
```bash
POST /upload-policy
Content-Type: multipart/form-data

file: PDF file
user_id: string
policy_id: string
```

### Ask Question
```bash
POST /ask-question
Content-Type: application/json

{
  "question": "What is covered under this policy?",
  "user_id": "user123",
  "policy_id": "policy456"
}
```

### Generate Summary
```bash
POST /summarize-policy
Content-Type: application/json

{
  "user_id": "user123",
  "policy_id": "policy456"
}
```

### Check Compliance
```bash
POST /compliance/check
Content-Type: application/json

{
  "policy_id": "policy456",
  "user_id": "user123",
  "regulation_framework": "gdpr"
}
```

### Get Available Regulations
```bash
GET /compliance/regulations
```

### Check Compliance from File
```bash
POST /compliance/check-file
Content-Type: multipart/form-data

file: PDF file
user_id: string
policy_id: string
regulation_framework: string
```

## Text Extraction Pipeline

The service uses a three-tier approach for maximum compatibility:

1. **pdfplumber** - Best for complex layouts and text-based PDFs
2. **PyPDF2** - Fallback for simple text-based PDFs  
3. **OCR (Tesseract)** - Final fallback for scanned documents

### Processing Flow

```
PDF Upload → pdfplumber → PyPDF2 → OCR → AI Processing
```

## OCR Configuration

### Windows Setup
1. Download Tesseract from: https://github.com/UB-Mannheim/tesseract/releases
2. Install with "Add to PATH" option checked
3. Restart the application

### Linux Setup
```bash
sudo apt update
sudo apt install tesseract-ocr
```

### macOS Setup
```bash
brew install tesseract
```

## Testing

Run the OCR test suite:

```bash
python test_ocr.py
```

This will test:
- OCR availability
- Text extraction methods
- Document information extraction
- OCR-specific functionality

## Architecture

```
ai-service/
├── main.py                 # FastAPI application
├── services/
│   ├── pdf_processor.py    # PDF and OCR processing
│   ├── ai_service.py       # AI and embedding services
│   └── database.py         # MongoDB operations
├── models/
│   └── schemas.py          # Pydantic models
├── requirements.txt        # Python dependencies
├── test_ocr.py            # OCR testing script
└── OCR_SETUP_GUIDE.md     # Detailed OCR setup guide
```

## Performance Notes

- **Text Extraction**: Fast (1-2 seconds)
- **OCR Processing**: Slower (5-15 seconds depending on document size)
- **AI Processing**: Moderate (2-5 seconds for embeddings)

## Troubleshooting

### OCR Not Working
1. Check if Tesseract is installed: `tesseract --version`
2. Verify Python packages: `pip list | grep -E "(pytesseract|pdf2image|Pillow)"`
3. Check service health: `curl http://localhost:8000/health`

### Memory Issues
- OCR uses more memory due to image processing
- Consider processing large documents in smaller batches
- Monitor system resources during processing

### Poor OCR Quality
- Ensure PDF has good image quality
- Check if document is actually scanned (not text-based)
- Consider image preprocessing improvements

## Development

### Adding New Languages
To support additional languages for OCR:

1. Install language packs for Tesseract
2. Update the `lang` parameter in `_extract_with_ocr` methods
3. Example: `lang='eng+spa'` for English and Spanish

### Customizing OCR Settings
Modify the `config` parameter in `pytesseract.image_to_string()`:

```python
# Current setting
config='--psm 6'  # Assume uniform block of text

# Other options:
# --psm 3: Fully automatic page segmentation
# --psm 4: Assume single column of text
# --psm 6: Assume uniform block of text
```

## License

MIT License - see main project README for details.
