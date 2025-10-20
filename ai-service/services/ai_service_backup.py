# AI Service for Policy Q&A
import os
from typing import List, Dict, Any, Optional
import openai
from openai import OpenAI
import tiktoken
from datetime import datetime
import asyncio

from services.database import DatabaseService
from services.pdf_processor import PDFProcessor
from models.schemas import AnswerResponse

class AIService:
    """
    AI-powered policy question answering service
    Features:
    - Document embedding and vector search
    - Optimized prompt engineering for policy Q&A
    - Context-aware response generation
    - Confidence scoring
    """
    
    def __init__(self):
        # Initialize OpenAI client
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Model configurations
        self.embedding_model = "text-embedding-ada-002"
        self.chat_model = os.getenv("CHAT_MODEL", "gpt-3.5-turbo")  # Use environment variable with fallback
        self.max_tokens = 800  # Response length limit
        self.max_context_tokens = 12000  # Context window limit
        
        # Initialize tokenizer for token counting - use the same model as chat_model
        self.tokenizer = tiktoken.encoding_for_model(self.chat_model)
        
        # Initialize services
        self.db_service = DatabaseService()
        self.pdf_processor = PDFProcessor()
    
    async def process_and_store_document(
        self, 
        text: str, 
        filename: str, 
        user_id: str, 
        policy_id: Optional[str] = None
    ) -> str:
        """
        Process document: split into chunks, generate embeddings, store in DB
        
        Returns:
            document_id: Unique identifier for the stored document
        """
        
        print(f"🔍 AI Service: Processing document {filename} for user {user_id}")
        print(f"🔍 Text length: {len(text)} characters")
        
        # Split text into chunks
        print(f"🔍 Splitting text into chunks...")
        chunks = self.pdf_processor.split_into_chunks(text)
        print(f"🔍 Created {len(chunks)} chunks")
        
        # Generate embeddings for each chunk and add them to the chunks
        print(f"🔍 Generating embeddings for chunks...")
        for i, chunk in enumerate(chunks):
            print(f"🔍 Generating embedding for chunk {i+1}/{len(chunks)}")
            embedding = await self._generate_embedding(chunk["text"])
            chunk["embedding"] = embedding
            chunk["created_at"] = datetime.now()
        print(f"🔍 Generated {len(chunks)} embeddings")
        
        # Store in database
        print(f"🔍 Storing chunks in database...")
        if not policy_id:
            raise ValueError("policy_id is required for storing document chunks")
        
        success = await self.db_service.store_document_chunks(
            chunks=chunks,
            document_id=policy_id,
            user_id=user_id
        )
        print(f"🔍 Stored document with ID: {policy_id}")
        
        # Update the main policy status to mark as AI processed
        if policy_id:
            print(f"🔍 Updating policy AI status...")
            await self._update_policy_ai_status(policy_id, True)
        
        return policy_id
    
    async def _update_policy_ai_status(self, policy_id: str, ai_processed: bool):
        """Update the main policy's AI processing status"""
        try:
            await self.db_service.update_policy_ai_status(policy_id, ai_processed)
            print(f"🔍 Updated policy {policy_id} AI status to {ai_processed}")
        except Exception as e:
            print(f"❌ Error updating policy AI status: {e}")
    
    async def find_relevant_context(
        self, 
        question: str, 
        user_id: str, 
        policy_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find relevant document chunks using vector similarity search
        
        Returns:
            List of relevant chunks with similarity scores
        """
        
        # Generate embedding for the question
        question_embedding = await self._generate_embedding(question)
        
        # Search for similar chunks in database
        relevant_chunks = await self.db_service.vector_search(
            query_embedding=question_embedding,
            user_id=user_id,
            document_id=policy_id,
            limit=limit
        )
        
        return relevant_chunks
    
    async def generate_answer(
        self, 
        question: str, 
        context_chunks: List[Dict[str, Any]],
        policy_id: str,
        user_id: str
    ) -> AnswerResponse:
        """
        Generate AI answer using optimized prompt engineering
        
        Returns:
            Structured answer with confidence and sources
        """
        
        # Build context from relevant chunks
        context = self._build_context(context_chunks)
        
        # Create optimized prompt
        prompt = self._create_policy_prompt(question, context)
        
        # Ensure we don't exceed token limits
        prompt = self._truncate_to_token_limit(prompt)
        
        try:
            # Generate response using OpenAI
            response = await self._call_openai_chat(prompt, question)
            
            # Parse and structure the response
            structured_response = self._parse_ai_response(
                response, 
                context_chunks,
                question,
                policy_id,
                user_id
            )
            
            return structured_response
            
        except Exception as e:
            print(f"AI generation error: {e}")
            return AnswerResponse(
                answer="I'm sorry, I encountered an error while processing your question. Please try again.",
                sources=[],
                policy_id=policy_id,
                user_id=user_id
            )
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        try:
            response = await asyncio.to_thread(
                self.client.embeddings.create,
                model=self.embedding_model,
                input=text.replace("\n", " ")
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding generation error: {e}")
            raise
    
    async def _call_openai_chat(self, prompt: str, question: str) -> str:
        """Call OpenAI Chat API with optimized parameters"""
        
        messages = [
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": f"Question: {question}\n\nPlease provide a detailed answer based on the policy information provided."
            }
        ]
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.chat_model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=0.2,  # Low temperature for factual responses
                top_p=0.9,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"OpenAI API error: {e}")
            raise
    
    def _create_policy_prompt(self, question: str, context: str) -> str:
        """
        Create optimized prompt for policy Q&A
        
        Key strategies:
        - Clear role definition
        - Specific output format
        - Examples of good responses
        - Handling edge cases
        """
        
        return f"""You are PolicyPal AI, an expert insurance policy assistant. Your job is to help users understand their insurance policies by providing accurate, helpful answers based on the policy documents they've uploaded.

CONTEXT FROM USER'S POLICY DOCUMENTS:
{context}

INSTRUCTIONS:
1. Answer questions about policy coverage, benefits, exclusions, claim procedures, and validity
2. Be specific and cite relevant policy sections when possible
3. If information is not in the provided context, clearly state this
4. For coverage questions, mention specific amounts, percentages, and conditions
5. For claim questions, outline the required steps and documentation
6. Use simple, clear language that non-insurance experts can understand

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide specific details from the policy
- Include any important conditions or limitations
- End with actionable next steps if applicable

EXAMPLE RESPONSES:

Question: "What hospitals are covered?"
Good Answer: "Based on your policy, you're covered at network hospitals listed in Section 5. This includes [specific hospitals if mentioned]. You'll pay 20% coinsurance at network hospitals, but 40% at out-of-network facilities. To find current network hospitals, check the provider directory or call the number on your card."

Question: "How much does a specialist visit cost?"
Good Answer: "According to your policy benefits summary, specialist visits require a $50 copay when you see in-network specialists. No copay is needed if you have a referral from your primary care doctor. Out-of-network specialists cost $100 copay plus you'll pay 30% of the remaining charges."

Remember:
- Only answer based on the provided policy information
- If you're unsure, say so clearly
- Focus on practical, actionable information
- Be empathetic - insurance can be confusing

Now please answer the user's question based on their policy information."""
    
    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Build context string from relevant chunks"""
        if not chunks:
            return "No relevant policy information found."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            context_parts.append(f"[Section {i}]\n{chunk['text']}\n")
        
        return "\n".join(context_parts)
    
    def _truncate_to_token_limit(self, prompt: str) -> str:
        """Ensure prompt doesn't exceed model's context window"""
        tokens = self.tokenizer.encode(prompt)
        
        if len(tokens) <= self.max_context_tokens:
            return prompt
        
        # Truncate from the middle (keep system prompt and recent context)
        truncated_tokens = tokens[:self.max_context_tokens]
        return self.tokenizer.decode(truncated_tokens)
    
    def _parse_ai_response(
        self, 
        response: str, 
        context_chunks: List[Dict[str, Any]],
        question: str,
        policy_id: str,
        user_id: str
    ) -> AnswerResponse:
        """Parse AI response and calculate confidence score"""
        
        # Calculate confidence based on response quality indicators
        confidence = self._calculate_confidence(response, context_chunks)
        
        # Extract source information
        sources = [
            {
                "chunk_id": str(chunk.get("_id", "")),  # Convert ObjectId to string
                "text": chunk.get("text", ""),
                "relevance_score": chunk.get("similarity_score", 0.0)
            }
            for chunk in context_chunks[:3]  # Top 3 sources
        ]
        
        return AnswerResponse(
            answer=response,
            sources=sources,
            policy_id=policy_id,
            user_id=user_id
        )
    
    def _calculate_confidence(self, response: str, context_chunks: List[Dict[str, Any]]) -> float:
        """
        Calculate confidence score based on multiple factors:
        - Response length and structure
        - Number of relevant sources
        - Similarity scores of sources
        - Presence of specific details
        """
        
        confidence = 0.0
        
        # Base confidence from response quality
        if len(response) > 50:
            confidence += 0.3
        if len(response) > 200:
            confidence += 0.2
        
        # Confidence from source quality
        if context_chunks:
            avg_similarity = sum(chunk.get("similarity_score", 0) for chunk in context_chunks) / len(context_chunks)
            confidence += min(avg_similarity, 0.4)
        
        # Confidence from specific indicators
        specific_indicators = ["$", "%", "section", "policy", "coverage", "deductible", "copay"]
        indicator_count = sum(1 for indicator in specific_indicators if indicator.lower() in response.lower())
        confidence += min(indicator_count * 0.05, 0.2)
        
        # Check for uncertainty phrases (reduce confidence)
        uncertainty_phrases = ["i'm not sure", "i don't have", "not clear", "cannot determine"]
        if any(phrase in response.lower() for phrase in uncertainty_phrases):
            confidence *= 0.5
        
        return min(confidence, 1.0)

    async def generate_policy_summary(self, policy_text: str) -> str:
        """
        Generate a concise summary of a policy document
        
        Args:
            policy_text: The full text content of the policy
            
        Returns:
            A concise summary of the policy
        """
        try:
            # Create a focused prompt for policy summarization
            summary_prompt = f"""
You are a document analysis expert. Please provide a clear, concise summary of the following document.

Focus on:
1. Document type and purpose
2. Key information and requirements
3. Important dates, names, or organizations mentioned
4. Any specific conditions or requirements
5. The main purpose or goal of the document

Document Text:
{policy_text[:4000]}  # Limit text length for token efficiency

Please provide a structured summary in 2-3 paragraphs that would help someone quickly understand what this document is about and what it contains.
"""

            # Generate summary using OpenAI
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": "You are a helpful document analysis assistant. Provide clear, accurate summaries of any type of document."},
                    {"role": "user", "content": summary_prompt}
                ],
                max_tokens=500,
                temperature=0.3  # Lower temperature for more consistent summaries
            )
            
            summary = response.choices[0].message.content.strip()
            return summary
            
        except Exception as e:
            print(f"Error generating policy summary: {e}")
            # Fallback to basic summary based on actual content
            if policy_text and len(policy_text.strip()) > 50:
                # Extract key information from the actual text
                lines = policy_text.strip().split('\n')
                title = lines[0] if lines else "Document"
                
                # Create a basic summary from the actual content
                basic_summary = f"Document Summary: {title}\n\n"
                basic_summary += "This document contains the following key information:\n"
                
                # Extract important lines (non-empty, meaningful content)
                important_lines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 10]
                if important_lines:
                    basic_summary += f"• {important_lines[0]}\n"
                    if len(important_lines) > 1:
                        basic_summary += f"• {important_lines[1]}\n"
                    if len(important_lines) > 2:
                        basic_summary += f"• {important_lines[2]}\n"
                
                basic_summary += f"\nTotal document length: {len(policy_text)} characters"
                return basic_summary
            else:
                return "Document Summary: Unable to generate summary. Please review the document manually."