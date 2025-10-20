# OCR Setup Guide for PolicyPal AI Service

This guide explains how to set up OCR (Optical Character Recognition) support for processing scanned PDF documents.

## What is OCR?

OCR allows the system to extract text from scanned documents (images) that don't contain selectable text. This is essential for processing legacy policy documents that were scanned into PDF format.

## Installation

### Windows

#### Option 1: Automatic Installation (Recommended)
1. Run the provided installer as administrator:
   ```bash
   install_tesseract_windows.bat
   ```

#### Option 2: Manual Installation
1. Download Tesseract OCR from: https://github.com/UB-Mannheim/tesseract/releases
2. Install the latest version (5.3.0 or newer)
3. During installation, make sure to check "Add to PATH" option
4. Restart your application

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install tesseract-ocr
```

### macOS
```bash
brew install tesseract
```

## Python Dependencies

Install the required Python packages:

```bash
pip install pytesseract==0.3.10
pip install Pillow==10.0.1
pip install pdf2image==1.16.3
```

## Verification

After installation, restart the AI service and check the health endpoint:

```bash
curl http://localhost:8000/health
```

You should see:
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

## How It Works

The system now uses a three-tier approach for PDF text extraction:

1. **pdfplumber** - Best for complex layouts and text-based PDFs
2. **PyPDF2** - Fallback for simple text-based PDFs
3. **OCR (Tesseract)** - Final fallback for scanned documents

### Processing Flow

```
PDF Upload → pdfplumber → PyPDF2 → OCR → AI Processing
```

If any step successfully extracts text, the process stops there. OCR is only used when both text extraction methods fail.

## Performance Notes

- OCR processing is slower than text extraction (2-5x longer)
- Higher DPI (300) is used for better accuracy
- Images are preprocessed to improve OCR quality
- Processing time scales with document size and page count

## Troubleshooting

### OCR Not Available
- Ensure Tesseract is installed and in PATH
- Check the health endpoint for OCR status
- Review application logs for configuration errors

### Poor OCR Quality
- Ensure PDF has good image quality
- Check if document is actually scanned (not text-based)
- Consider image preprocessing improvements

### Memory Issues
- OCR uses more memory due to image processing
- Consider processing large documents in smaller batches
- Monitor system resources during processing

## Supported Languages

Currently configured for English (`eng`). To add other languages:

1. Install additional Tesseract language packs
2. Update the `lang` parameter in `_extract_with_ocr` methods
3. Example: `lang='eng+spa'` for English and Spanish

## Testing

Test OCR functionality with a scanned PDF:

```python
from services.pdf_processor import PDFProcessor

processor = PDFProcessor()
print(f"OCR Available: {processor.is_ocr_available()}")

# Test with a scanned PDF
text = processor.extract_text_from_bytes(pdf_bytes)
print(f"Extracted text length: {len(text)}")
```
