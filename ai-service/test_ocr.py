#!/usr/bin/env python3
"""
Test script for OCR functionality in PolicyPal AI Service
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.pdf_processor import PDFProcessor

def test_ocr_availability():
    """Test if OCR is properly configured"""
    print("🔍 Testing OCR Availability...")
    
    processor = PDFProcessor()
    ocr_available = processor.is_ocr_available()
    
    print(f"OCR Available: {ocr_available}")
    
    if not ocr_available:
        print("❌ OCR is not available. Please install Tesseract OCR.")
        print("   Windows: Run install_tesseract_windows.bat as administrator")
        print("   Linux: sudo apt install tesseract-ocr")
        print("   macOS: brew install tesseract")
        return False
    
    print("✅ OCR is properly configured!")
    return True

def test_text_extraction_methods():
    """Test different text extraction methods"""
    print("\n🔍 Testing Text Extraction Methods...")
    
    processor = PDFProcessor()
    
    # Test with a sample PDF (you can replace this with an actual PDF path)
    test_pdf_path = "test_document.pdf"
    
    if not os.path.exists(test_pdf_path):
        print(f"⚠️ Test PDF not found: {test_pdf_path}")
        print("   Please place a test PDF file in the ai-service directory")
        print("   You can use any PDF file to test the extraction pipeline")
        return False
    
    print(f"Testing with: {test_pdf_path}")
    
    # Test file-based extraction
    try:
        text = processor.extract_text(test_pdf_path)
        print(f"✅ File extraction successful: {len(text)} characters")
        
        if text:
            print(f"Preview: {text[:200]}...")
        else:
            print("⚠️ No text extracted - this might be a scanned document")
            
    except Exception as e:
        print(f"❌ File extraction failed: {e}")
        return False
    
    # Test bytes-based extraction
    try:
        with open(test_pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        text_bytes = processor.extract_text_from_bytes(pdf_bytes)
        print(f"✅ Bytes extraction successful: {len(text_bytes)} characters")
        
    except Exception as e:
        print(f"❌ Bytes extraction failed: {e}")
        return False
    
    return True

def test_document_info():
    """Test document information extraction"""
    print("\n🔍 Testing Document Information...")
    
    processor = PDFProcessor()
    test_pdf_path = "test_document.pdf"
    
    if not os.path.exists(test_pdf_path):
        print(f"⚠️ Test PDF not found: {test_pdf_path}")
        return False
    
    try:
        info = processor.get_document_info(test_pdf_path)
        print(f"✅ Document info extracted:")
        print(f"   Filename: {info.get('filename', 'N/A')}")
        print(f"   File size: {info.get('file_size', 0)} bytes")
        print(f"   Page count: {info.get('page_count', 0)}")
        print(f"   Text length: {info.get('text_length', 0)} characters")
        
        if 'error' in info:
            print(f"   Error: {info['error']}")
        
    except Exception as e:
        print(f"❌ Document info extraction failed: {e}")
        return False
    
    return True

def test_ocr_specific():
    """Test OCR functionality specifically"""
    print("\n🔍 Testing OCR Functionality...")
    
    processor = PDFProcessor()
    
    if not processor.is_ocr_available():
        print("❌ OCR not available - skipping OCR-specific tests")
        return False
    
    # Test with a sample PDF
    test_pdf_path = "test_document.pdf"
    
    if not os.path.exists(test_pdf_path):
        print(f"⚠️ Test PDF not found: {test_pdf_path}")
        return False
    
    try:
        # Test OCR extraction directly
        print("Testing OCR extraction...")
        ocr_text = processor._extract_with_ocr(test_pdf_path)
        
        if ocr_text:
            print(f"✅ OCR extraction successful: {len(ocr_text)} characters")
            print(f"Preview: {ocr_text[:200]}...")
        else:
            print("⚠️ OCR extraction returned empty text")
        
        # Test OCR with bytes
        print("Testing OCR with bytes...")
        with open(test_pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        ocr_text_bytes = processor._extract_with_ocr_bytes(pdf_bytes)
        
        if ocr_text_bytes:
            print(f"✅ OCR bytes extraction successful: {len(ocr_text_bytes)} characters")
        else:
            print("⚠️ OCR bytes extraction returned empty text")
        
    except Exception as e:
        print(f"❌ OCR testing failed: {e}")
        return False
    
    return True

def main():
    """Run all OCR tests"""
    print("🚀 PolicyPal AI Service - OCR Testing")
    print("=" * 50)
    
    tests = [
        ("OCR Availability", test_ocr_availability),
        ("Text Extraction Methods", test_text_extraction_methods),
        ("Document Information", test_document_info),
        ("OCR Specific", test_ocr_specific),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! OCR integration is working correctly.")
    else:
        print("⚠️ Some tests failed. Please check the setup and try again.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
