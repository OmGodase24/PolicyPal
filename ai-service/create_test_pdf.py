#!/usr/bin/env python3
"""
Create a simple test PDF for OCR testing
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_test_pdf():
    """Create a simple test PDF with text"""
    filename = "test_document.pdf"
    
    # Create a simple PDF with text
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Add some text
    c.setFont("Helvetica", 16)
    c.drawString(100, height - 100, "PolicyPal AI Service - Test Document")
    
    c.setFont("Helvetica", 12)
    c.drawString(100, height - 150, "This is a test document for OCR functionality.")
    c.drawString(100, height - 180, "It contains sample text that can be extracted.")
    c.drawString(100, height - 210, "Policy Coverage: $100,000")
    c.drawString(100, height - 240, "Deductible: $500")
    c.drawString(100, height - 270, "Premium: $50/month")
    
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 320, "This document tests both text extraction and OCR capabilities.")
    c.drawString(100, height - 350, "If you can read this, the PDF processing is working correctly.")
    
    c.save()
    print(f"✅ Created test PDF: {filename}")
    return filename

if __name__ == "__main__":
    create_test_pdf()
