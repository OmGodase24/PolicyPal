import logging
from typing import List, Optional, Dict, Any
import PyPDF2
import pdfplumber
from pathlib import Path
import io
import tempfile
import os

# OCR imports
try:
    import pytesseract
    from pdf2image import convert_from_bytes, convert_from_path
    from PIL import Image
    from PIL import ImageEnhance
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️ OCR libraries not available. Install pytesseract, pdf2image, and Pillow for OCR support.")

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Process PDF documents and extract text content."""
    
    def __init__(self):
        self.supported_formats = ['.pdf']
        self.ocr_available = OCR_AVAILABLE
        
        # Configure Tesseract path for Windows if needed
        if self.ocr_available:
            self._configure_tesseract()
    
    def _configure_tesseract(self):
        """Configure Tesseract path for different operating systems"""
        try:
            # Try to find Tesseract executable
            if os.name == 'nt':  # Windows
                # Common Windows installation paths
                possible_paths = [
                    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                    r'C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', '')),
                ]
                
                for path in possible_paths:
                    if os.path.exists(path):
                        pytesseract.pytesseract.tesseract_cmd = path
                        logger.info(f"Tesseract found at: {path}")
                        return
                
                # If not found, try system PATH
                logger.warning("Tesseract not found in common Windows paths. Make sure it's in your system PATH.")
            else:
                # Linux/Mac - assume tesseract is in PATH
                logger.info("Using system Tesseract installation")
                
        except Exception as e:
            logger.warning(f"Error configuring Tesseract: {e}")
            self.ocr_available = False
    
    def extract_text(self, file_path: str) -> str:
        """
        Extract text from PDF file using multiple methods for better coverage.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        try:
            # Try pdfplumber first (better for complex layouts)
            text = self._extract_with_pdfplumber(file_path)
            if text and len(text.strip()) > 100:  # Ensure we got meaningful content
                return text
            
            # Fallback to PyPDF2
            text = self._extract_with_pypdf2(file_path)
            if text and len(text.strip()) > 100:
                return text
            
            # Final fallback to OCR for scanned documents
            if self.ocr_available:
                logger.info(f"Text extraction failed, trying OCR for {file_path}")
                text = self._extract_with_ocr(file_path)
                if text and len(text.strip()) > 50:  # Lower threshold for OCR
                    return text
            
            # If all methods fail, return empty string
            logger.warning(f"Failed to extract meaningful text from {file_path}")
            return ""
            
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            return ""
    
    def _extract_with_pdfplumber(self, file_path: str) -> str:
        """Extract text using pdfplumber (better for complex layouts)."""
        try:
            text_parts = []
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                        continue
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {str(e)}")
            return ""
    
    def _extract_with_pypdf2(self, file_path: str) -> str:
        """Extract text using PyPDF2 (fallback method)."""
        try:
            text_parts = []
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                        continue
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {str(e)}")
            return ""
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks for better context preservation.
        
        Args:
            text: Input text to chunk
            chunk_size: Maximum size of each chunk
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                search_start = max(start, end - 100)
                for i in range(search_start, end):
                    if text[i] in '.!?':
                        end = i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position, accounting for overlap
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks

    def _extract_with_pdfplumber_bytes(self, file_content: bytes) -> str:
        """Extract text using pdfplumber from bytes content."""
        try:
            text_parts = []
            with pdfplumber.open(io.BytesIO(file_content)) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num + 1}: {str(e)}")
                        continue
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.warning(f"pdfplumber bytes extraction failed: {str(e)}")
            return ""

    def _extract_with_pypdf2_bytes(self, file_content: bytes) -> str:
        """Extract text using PyPDF2 from bytes content."""
        try:
            text_parts = []
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                except Exception as e:
                    logger.warning(f"PyPDF2 bytes extraction failed: {str(e)}")
                    continue
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.warning(f"PyPDF2 bytes extraction failed: {str(e)}")
            return ""

    def extract_text_from_bytes(self, file_content: bytes) -> str:
        """
        Extract text from PDF bytes content using multiple methods for better coverage.
        
        Args:
            file_content: PDF file content as bytes
            
        Returns:
            Extracted text content
        """
        try:
            # Try pdfplumber first (better for complex layouts)
            text = self._extract_with_pdfplumber_bytes(file_content)
            if text and len(text.strip()) > 100:  # Ensure we got meaningful content
                return text
            
            # Fallback to PyPDF2
            text = self._extract_with_pypdf2_bytes(file_content)
            if text and len(text.strip()) > 100:
                return text
            
            # Final fallback to OCR for scanned documents
            if self.ocr_available:
                logger.info("Text extraction failed, trying OCR for bytes content")
                text = self._extract_with_ocr_bytes(file_content)
                if text and len(text.strip()) > 50:  # Lower threshold for OCR
                    return text
            
            # If all methods fail, return empty string
            logger.warning(f"Failed to extract meaningful text from bytes content")
            return ""
            
        except Exception as e:
            logger.error(f"Error extracting text from bytes content: {str(e)}")
            return ""

    def split_into_chunks(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks with metadata for vector search.
        
        Args:
            text: Input text to chunk
            chunk_size: Maximum size of each chunk
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of chunk dictionaries with text and metadata
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                search_start = max(start, end - 100)
                for i in range(search_start, end):
                    if text[i] in '.!?':
                        end = i + 1
                        break
            
            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end,
                    "length": len(chunk_text)
                })
                chunk_index += 1
            
            # Move start position, accounting for overlap
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    def get_document_info(self, file_path: str) -> dict:
        """
        Get basic information about the PDF document.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Dictionary with document information
        """
        try:
            info = {
                'filename': Path(file_path).name,
                'file_size': Path(file_path).stat().st_size,
                'page_count': 0,
                'text_length': 0
            }
            
            # Try to get page count and text length
            try:
                with pdfplumber.open(file_path) as pdf:
                    info['page_count'] = len(pdf.pages)
                    text = self.extract_text(file_path)
                    info['text_length'] = len(text)
            except:
                try:
                    with open(file_path, 'rb') as file:
                        pdf_reader = PyPDF2.PdfReader(file)
                        info['page_count'] = len(pdf_reader.pages)
                        text = self.extract_text(file_path)
                        info['text_length'] = len(text)
                except:
                    pass
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting document info for {file_path}: {str(e)}")
            return {
                'filename': Path(file_path).name,
                'file_size': Path(file_path).stat().st_size,
                'page_count': 0,
                'text_length': 0,
                'error': str(e)
            }
    
    def _extract_with_ocr(self, file_path: str) -> str:
        """
        Extract text from PDF using OCR (for scanned documents).
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text content from OCR
        """
        if not self.ocr_available:
            logger.warning("OCR not available")
            return ""
        
        try:
            logger.info(f"Starting OCR extraction for {file_path}")
            
            # Convert PDF pages to images
            images = convert_from_path(file_path, dpi=300)  # Higher DPI for better OCR
            logger.info(f"Converted PDF to {len(images)} images")
            
            text_parts = []
            for page_num, image in enumerate(images):
                try:
                    logger.info(f"Processing page {page_num + 1} with OCR")
                    
                    # Preprocess image for better OCR
                    processed_image = self._preprocess_image_for_ocr(image)
                    
                    # Extract text using Tesseract
                    page_text = pytesseract.image_to_string(
                        processed_image,
                        lang='eng',  # English language
                        config='--psm 6'  # Assume uniform block of text
                    )
                    
                    if page_text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text.strip()}")
                        logger.info(f"Extracted {len(page_text)} characters from page {page_num + 1}")
                    else:
                        logger.warning(f"No text extracted from page {page_num + 1}")
                        
                except Exception as e:
                    logger.warning(f"Error processing page {page_num + 1} with OCR: {str(e)}")
                    continue
            
            result = "\n\n".join(text_parts)
            logger.info(f"OCR extraction completed. Total text length: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"OCR extraction failed for {file_path}: {str(e)}")
            return ""
    
    def _extract_with_ocr_bytes(self, file_content: bytes) -> str:
        """
        Extract text from PDF bytes using OCR (for scanned documents).
        
        Args:
            file_content: PDF file content as bytes
            
        Returns:
            Extracted text content from OCR
        """
        if not self.ocr_available:
            logger.warning("OCR not available")
            return ""
        
        try:
            logger.info("Starting OCR extraction for bytes content")
            
            # Convert PDF pages to images
            images = convert_from_bytes(file_content, dpi=300)  # Higher DPI for better OCR
            logger.info(f"Converted PDF to {len(images)} images")
            
            text_parts = []
            for page_num, image in enumerate(images):
                try:
                    logger.info(f"Processing page {page_num + 1} with OCR")
                    
                    # Preprocess image for better OCR
                    processed_image = self._preprocess_image_for_ocr(image)
                    
                    # Extract text using Tesseract
                    page_text = pytesseract.image_to_string(
                        processed_image,
                        lang='eng',  # English language
                        config='--psm 6'  # Assume uniform block of text
                    )
                    
                    if page_text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text.strip()}")
                        logger.info(f"Extracted {len(page_text)} characters from page {page_num + 1}")
                    else:
                        logger.warning(f"No text extracted from page {page_num + 1}")
                        
                except Exception as e:
                    logger.warning(f"Error processing page {page_num + 1} with OCR: {str(e)}")
                    continue
            
            result = "\n\n".join(text_parts)
            logger.info(f"OCR extraction completed. Total text length: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"OCR extraction failed for bytes content: {str(e)}")
            return ""
    
    def _preprocess_image_for_ocr(self, image):
        """
        Preprocess image to improve OCR accuracy.
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed PIL Image object
        """
        try:
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)  # Increase contrast
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(2.0)  # Increase sharpness
            
            return image
            
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {str(e)}")
            return image
    
    def is_ocr_available(self) -> bool:
        """
        Check if OCR functionality is available.
        
        Returns:
            True if OCR is available, False otherwise
        """
        return self.ocr_available