# AI Service for Policy Q&A
import os
from typing import List, Dict, Any, Optional
import openai
from openai import OpenAI
import tiktoken
from datetime import datetime
import asyncio
import re

from services.database import DatabaseService
from services.pdf_processor import PDFProcessor
from services.compliance_service import ComplianceService
from models.schemas import AnswerResponse, ComplianceReport, ComplianceRequest

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
        self.compliance_service = ComplianceService()
    
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
        print(f"🔍 Chunks to store: {len(chunks)}")
        print(f"🔍 Policy ID: {policy_id}, User ID: {user_id}")
        
        if not policy_id:
            raise ValueError("policy_id is required for storing document chunks")
        
        success = await self.db_service.store_document_chunks(
            chunks=chunks,
            document_id=policy_id,
            user_id=user_id
        )
        print(f"🔍 Chunk storage success: {success}")
        print(f"🔍 Stored document with ID: {policy_id}")
        
        # Update the main policy status to mark as AI processed and store PDF text
        if policy_id:
            print(f"🔍 Updating policy AI status...")
            await self._update_policy_ai_status(policy_id, True)
            
            # Store the extracted text in the policy document
            print(f"🔍 Storing PDF text in policy document...")
            await self._update_policy_pdf_text(policy_id, text)
        
        return policy_id
    
    async def _update_policy_ai_status(self, policy_id: str, ai_processed: bool):
        """Update the main policy's AI processing status"""
        try:
            await self.db_service.update_policy_ai_status(policy_id, ai_processed)
            print(f"🔍 Updated policy {policy_id} AI status to {ai_processed}")
        except Exception as e:
            print(f"❌ Error updating policy AI status: {e}")
    
    async def _update_policy_pdf_text(self, policy_id: str, pdf_text: str):
        """Update the main policy's PDF text content"""
        try:
            await self.db_service.update_policy_pdf_text(policy_id, pdf_text)
            print(f"🔍 Updated policy {policy_id} PDF text with {len(pdf_text)} characters")
        except Exception as e:
            print(f"❌ Failed to update policy PDF text: {e}")
    
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
    
    async def analyze_images_with_vision(
        self,
        images: List[str],
        question: str,
        policy_context: List[Dict[str, Any]]
    ) -> str:
        """
        Analyze images using OpenAI Vision API
        """
        try:
            # Prepare context from policy documents
            context = self._build_context(policy_context) if policy_context else "No specific policy context available."
            
            # Create vision prompt
            vision_prompt = f"""You are PolicyPal AI, an expert insurance policy assistant. Analyze the uploaded image(s) and answer the user's question.

POLICY CONTEXT:
{context}

USER QUESTION: {question}

INSTRUCTIONS:
1. Analyze the image(s) carefully
2. Identify any text, numbers, or important information
3. Determine if the image is related to insurance policies
4. Answer the user's question based on what you see in the image(s)
5. If the image contains policy information, explain how it relates to their policy
6. If the image is not policy-related, explain what it is and why it might not be relevant

Be specific and helpful in your analysis."""

            # Prepare messages for vision API
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": vision_prompt}
                    ]
                }
            ]
            
            # Add images to the message
            for i, image_data in enumerate(images):
                print(f"🔍 Processing image {i+1}: {image_data[:50]}...")
                
                # Handle data URL format
                if image_data.startswith('data:image/'):
                    # Already in data URL format, use as-is
                    image_url = image_data
                else:
                    # Assume it's base64 data, add data URL prefix
                    image_url = f"data:image/jpeg;base64,{image_data}"
                
                print(f"🔍 Image URL: {image_url[:50]}...")
                
                messages[0]["content"].append({
                    "type": "image_url",
                    "image_url": {
                        "url": image_url
                    }
                })
            
            # Call OpenAI Vision API
            response = self._call_openai_vision(messages)
            return response
            
        except Exception as e:
            print(f"Vision analysis error: {e}")
            return f"I can see you've uploaded {len(images)} image(s), but I encountered an error while analyzing them. Please describe what you see in the images, and I'll help you understand how it relates to your policy."

    async def generate_answer(
        self, 
        question: str, 
        context_chunks: List[Dict[str, Any]],
        policy_id: str,
        user_id: str,
        history: Optional[List[Dict[str, Any]]] = None,
        images: Optional[List[str]] = None
    ) -> AnswerResponse:
        """
        Generate AI answer using optimized prompt engineering
        
        Returns:
            Structured answer with confidence and sources
        """
        
        # Build context from relevant chunks
        context = self._build_context(context_chunks)
        
        # Create optimized prompt
        prompt = self._create_policy_prompt(question, context, images)
        
        # Ensure we don't exceed token limits
        prompt = self._truncate_to_token_limit(prompt)
        
        try:
            # Generate response using OpenAI
            response = await self._call_openai_chat(prompt, question, history)
            
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
    
    def _call_openai_vision(self, messages: List[Dict[str, Any]]) -> str:
        """Call OpenAI Vision API for image analysis"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",  # Use GPT-4o for vision capabilities
                messages=messages,
                max_tokens=1000,
                temperature=0.1
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"OpenAI Vision API error: {e}")
            raise

    async def _call_openai_chat(self, prompt: str, question: str, history: Optional[List[Dict[str, Any]]] = None) -> str:
        """Call OpenAI Chat API with optimized parameters"""
        
        messages = [
            {
                "role": "system",
                "content": prompt
            }
        ]
        
        # Add history if provided
        if history:
            messages.extend(history)
        
        messages.append({
            "role": "user",
            "content": f"Question: {question}\n\nPlease provide a detailed answer based on the policy information provided."
        })
        
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
    
    def _create_policy_prompt(self, question: str, context: str, images: Optional[List[str]] = None) -> str:
        """
        Create optimized prompt for policy Q&A
        
        Key strategies:
        - Clear role definition
        - Specific output format
        - Examples of good responses
        - Handling edge cases
        """
        
        # Add image context if provided
        image_context = ""
        if images and len(images) > 0:
            image_context = f"""

ADDITIONAL IMAGE CONTEXT:
The user has uploaded {len(images)} image(s) with their question. These images may contain:
- Policy documents or insurance cards
- Coverage details or benefit summaries
- Additional policy information
- Visual representations of policy terms

IMPORTANT: Since I cannot directly view the images, I will analyze them based on the user's question and the context provided. If the user is asking about image content, I should:
1. Acknowledge that images were uploaded
2. Ask the user to describe what they see in the images
3. Provide guidance on what to look for in policy documents
4. Offer to help interpret the information once they describe it

If the user is asking "Is this image related to our policy?", I should:
1. Explain that I cannot see the image directly
2. Ask them to describe what the image contains
3. Help them determine if it's related to their policy based on their description
"""

        return f"""You are PolicyPal AI, an expert insurance policy assistant. Your job is to help users understand their insurance policies by providing accurate, helpful answers based on the policy documents they've uploaded.

CONTEXT FROM USER'S POLICY DOCUMENTS:
{context}{image_context}

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
            confidence=confidence,
            policy_id=policy_id,
            user_id=user_id
        )
    
    def _calculate_confidence(self, response: str, context_chunks: List[Dict[str, Any]]) -> float:
        """
        Calculate confidence score based on multiple factors with improved accuracy:
        - Response quality and completeness
        - Source relevance and number
        - Content specificity and detail level
        - Absence of uncertainty indicators
        """
        
        confidence = 0.0
        response_lower = response.lower()
        
        # 1. Base confidence from response completeness (max 0.35)
        if len(response) > 30:
            confidence += 0.15  # Has some content
        if len(response) > 100:
            confidence += 0.10  # Decent explanation
        if len(response) > 250:
            confidence += 0.10  # Comprehensive answer
        
        # 2. Confidence from source quality (max 0.45)
        if context_chunks and len(context_chunks) > 0:
            # Use the highest similarity score as it indicates best match
            similarity_scores = [chunk.get("similarity_score", 0) for chunk in context_chunks]
            if similarity_scores:
                max_similarity = max(similarity_scores)
                avg_similarity = sum(similarity_scores) / len(similarity_scores)
                
                # Weight both max and average similarity
                confidence += min(max_similarity * 0.3, 0.30)  # Best source quality
                confidence += min(avg_similarity * 0.15, 0.15)  # Overall source quality
            
            # Bonus for multiple quality sources
            if len(context_chunks) >= 3:
                confidence += 0.05
        
        # 3. Confidence from content specificity (max 0.25)
        # Policy-specific terms
        policy_terms = ["policy", "coverage", "deductible", "copay", "premium", "claim", "benefit", "section", "rider", "endorsement"]
        policy_term_count = sum(1 for term in policy_terms if term in response_lower)
        confidence += min(policy_term_count * 0.03, 0.15)
        
        # Specific data points (numbers, dates, amounts)
        specific_data = ["$", "%", "\\d+", "within", "up to", "maximum", "minimum"]
        import re
        has_numbers = bool(re.search(r'\d', response))
        has_amounts = "$" in response or "%" in response
        if has_numbers:
            confidence += 0.05
        if has_amounts:
            confidence += 0.05
        
        # 4. Reduce confidence for uncertainty (multiply by 0.3-0.7)
        uncertainty_phrases = ["i'm not sure", "i don't have", "not clear", "cannot determine", "unable to find", "no information"]
        if any(phrase in response_lower for phrase in uncertainty_phrases):
            confidence *= 0.4  # Significant reduction for uncertainty
        
        # 5. Boost for confident language (max +0.10)
        confident_phrases = ["according to your policy", "as stated in", "specifically", "clearly states", "section", "page"]
        confident_count = sum(1 for phrase in confident_phrases if phrase in response_lower)
        confidence += min(confident_count * 0.03, 0.10)
        
        # 6. Penalty for very short responses without sources (likely insufficient)
        if len(response) < 50 and not context_chunks:
            confidence *= 0.5
        
        # Ensure confidence is between 0 and 1
        return max(0.0, min(confidence, 1.0))

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
    
    async def check_policy_compliance(
        self, 
        policy_text: str, 
        policy_id: str, 
        user_id: str,
        regulation_framework: str = "insurance_standards"
    ) -> ComplianceReport:
        """
        Check policy compliance against specified regulation framework
        
        Args:
            policy_text: The full text content of the policy
            policy_id: Unique identifier for the policy
            user_id: User who owns the policy
            regulation_framework: Which regulation framework to check against
            
        Returns:
            ComplianceReport with detailed compliance analysis
        """
        print(f"🔍 AI Service: Checking compliance for policy {policy_id}")
        
        try:
            compliance_report = await self.compliance_service.check_compliance(
                policy_text=policy_text,
                policy_id=policy_id,
                user_id=user_id,
                regulation_framework=regulation_framework
            )
            
            print(f"✅ Compliance check completed: {compliance_report.overall_level.value} ({compliance_report.overall_score:.2f})")
            return compliance_report
            
        except Exception as e:
            print(f"❌ Compliance check error: {e}")
            # Return a basic non-compliant report
            from models.schemas import ComplianceCheck, ComplianceLevel
            return ComplianceReport(
                policy_id=policy_id,
                user_id=user_id,
                overall_score=0.0,
                overall_level=ComplianceLevel.UNKNOWN,
                checks=[
                    ComplianceCheck(
                        check_name="Compliance Check",
                        level=ComplianceLevel.UNKNOWN,
                        score=0.0,
                        message=f"Compliance check failed: {str(e)}",
                        evidence=[],
                        recommendation="Please try again or contact support"
                    )
                ],
                generated_at=datetime.now(),
                regulation_framework=regulation_framework
            )
    
    async def get_available_regulations(self) -> dict:
        """Get list of available regulation frameworks for compliance checking"""
        try:
            return self.compliance_service.get_available_regulations()
        except Exception as e:
            print(f"❌ Error getting regulations: {e}")
            return {"insurance_standards": "General Insurance Standards"}
    
    def detect_language(self, text: str) -> str:
        """
        Detect the language of the given text using simple heuristics
        Returns language code (en, es, fr, etc.)
        """
        if not text or len(text.strip()) < 10:
            return "en"  # Default to English
        
        # Convert to lowercase for analysis
        text_lower = text.lower()
        
        # Language detection patterns
        language_patterns = {
            "es": [
                r'\b(?:el|la|los|las|de|del|en|con|por|para|que|como|cuando|donde|porque|si|no|sí|muy|más|menos|todo|todos|todas|nuevo|nueva|bueno|buena|mejor|peor|grande|pequeño|pequeña)\b',
                r'\b(?:es|son|está|están|tiene|tienen|puede|pueden|debe|deben|hace|hacen|dice|dicen|viene|vienen|va|van|ir|ser|estar|tener|hacer|decir|ver|saber|conocer|querer|poder|deber|gustar|parecer|encontrar|buscar|dar|tomar|poner|salir|entrar|volver|seguir|continuar|empezar|terminar|acabar|comenzar|finalizar)\b',
                r'\b(?:y|o|pero|sin|embargo|aunque|mientras|después|antes|durante|hasta|desde|hacia|sobre|bajo|entre|dentro|fuera|alrededor|cerca|lejos|aquí|allí|ahora|entonces|siempre|nunca|a veces|a menudo|rara vez|poco|mucho|bastante|demasiado|suficiente|más|menos|igual|diferente|mismo|otro|otra|otros|otras|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas)\b'
            ],
            "fr": [
                r'\b(?:le|la|les|de|du|des|en|avec|pour|par|que|comme|quand|où|pourquoi|si|non|oui|très|plus|moins|tout|tous|toutes|nouveau|nouvelle|bon|bonne|meilleur|pire|grand|petit|petite)\b',
                r'\b(?:est|sont|est|sont|a|ont|peut|peuvent|doit|doivent|fait|font|dit|disent|vient|viennent|va|vont|aller|être|avoir|faire|dire|voir|savoir|connaître|vouloir|pouvoir|devoir|aimer|sembler|trouver|chercher|donner|prendre|mettre|sortir|entrer|revenir|suivre|continuer|commencer|terminer|finir)\b',
                r'\b(?:et|ou|mais|cependant|bien que|pendant|après|avant|durant|jusqu\'à|depuis|vers|sur|sous|entre|dans|hors|autour|près|loin|ici|là|maintenant|alors|toujours|jamais|parfois|souvent|rarement|peu|beaucoup|assez|trop|suffisant|plus|moins|égal|différent|même|autre|autres|cette|ces|ce|cette|ces|celui|celles|celui-ci|celles-ci)\b'
            ],
            "en": [
                r'\b(?:the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during|before|after|above|below|between|among|under|over|around|near|far|here|there|now|then|always|never|sometimes|often|rarely|little|much|enough|more|less|same|different|other|this|that|these|those|one|two|three|first|second|last|new|old|good|bad|better|worse|big|small|long|short|high|low|fast|slow|early|late|young|old|hot|cold|warm|cool|dry|wet|clean|dirty|full|empty|open|closed|free|busy|easy|hard|simple|complex|clear|confused|happy|sad|angry|calm|excited|bored|interested|surprised|worried|relaxed|stressed|tired|energetic|healthy|sick|strong|weak|rich|poor|expensive|cheap|beautiful|ugly|nice|mean|kind|cruel|honest|dishonest|fair|unfair|just|unjust|right|wrong|true|false|real|fake|natural|artificial|normal|strange|usual|unusual|common|rare|popular|unpopular|famous|unknown|important|unimportant|necessary|unnecessary|possible|impossible|probable|improbable|certain|uncertain|sure|unsure|confident|insecure|brave|cowardly|generous|selfish|polite|rude|patient|impatient|careful|careless|organized|disorganized|neat|messy|tidy|untidy|clean|dirty|fresh|stale|new|old|modern|ancient|current|outdated|recent|old-fashioned|fashionable|unfashionable|trendy|classic|traditional|contemporary|conventional|unconventional|standard|special|ordinary|extraordinary|regular|irregular|normal|abnormal|typical|atypical|usual|unusual|common|uncommon|frequent|infrequent|often|seldom|always|never|sometimes|usually|rarely|hardly|barely|scarcely|almost|nearly|quite|very|extremely|incredibly|amazingly|surprisingly|unexpectedly|fortunately|unfortunately|luckily|unluckily|hopefully|hopelessly|thankfully|regrettably|sadly|happily|gladly|willingly|reluctantly|eagerly|anxiously|nervously|calmly|peacefully|quietly|loudly|softly|gently|roughly|carefully|carelessly|quickly|slowly|fast|slow|rapidly|gradually|suddenly|immediately|instantly|eventually|finally|ultimately|initially|originally|previously|formerly|recently|lately|currently|presently|nowadays|today|yesterday|tomorrow|tonight|this morning|this afternoon|this evening|last night|next week|last month|next year|in the past|in the future|at present|at the moment|right now|just now|a moment ago|a while ago|long ago|recently|lately|soon|shortly|eventually|finally|at last|in the end|in conclusion|to sum up|in summary|in brief|in short|in other words|that is|namely|for example|for instance|such as|like|as|than|rather than|instead of|in place of|in addition to|besides|moreover|furthermore|however|nevertheless|nonetheless|on the other hand|on the contrary|in contrast|similarly|likewise|in the same way|in a similar way|in the same manner|in the same fashion|in the same style|in the same pattern|in the same format|in the same structure|in the same organization|in the same arrangement|in the same order|in the same sequence|in the same progression|in the same development|in the same evolution|in the same transformation|in the same change|in the same modification|in the same adjustment|in the same adaptation|in the same alteration|in the same variation|in the same difference|in the same distinction|in the same contrast|in the same comparison|in the same similarity|in the same resemblance|in the same likeness|in the same sameness|in the same identity|in the same equality|in the same equivalence|in the same correspondence|in the same relationship|in the same connection|in the same association|in the same link|in the same bond|in the same tie|in the same attachment|in the same connection|in the same relationship|in the same association|in the same link|in the same bond|in the same tie|in the same attachment|in the same connection|in the same relationship|in the same association|in the same link|in the same bond|in the same tie|in the same attachment)\b'
            ]
        }
        
        # Count matches for each language
        language_scores = {}
        for lang, patterns in language_patterns.items():
            score = 0
            for pattern in patterns:
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                score += len(matches)
            language_scores[lang] = score
        
        # Return the language with the highest score
        if language_scores:
            detected_lang = max(language_scores, key=language_scores.get)
            # Only return detected language if it has a reasonable score
            if language_scores[detected_lang] > 5:
                return detected_lang
        
        return "en"  # Default to English
    
    async def translate_text(self, text: str, target_language: str, source_language: str = "auto") -> str:
        """
        Translate text to target language using OpenAI
        """
        if not text or not target_language:
            return text
        
        if source_language == "auto":
            source_language = self.detect_language(text)
        
        if source_language == target_language:
            return text  # No translation needed
        
        try:
            # Use OpenAI for translation
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": f"You are a professional translator. Translate the following text from {source_language} to {target_language}. Maintain the original meaning, tone, and formatting. Return only the translated text."
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            translated_text = response.choices[0].message.content.strip()
            print(f"✅ Text translated from {source_language} to {target_language}")
            return translated_text
            
        except Exception as e:
            print(f"❌ Translation error: {e}")
            return text  # Return original text if translation fails
    
    async def get_supported_languages(self) -> Dict[str, str]:
        """
        Get list of supported languages for translation
        """
        return {
            "en": "English",
            "es": "Español",
            "fr": "Français",
            "de": "Deutsch",
            "it": "Italiano",
            "pt": "Português",
            "ru": "Русский",
            "zh": "中文",
            "ja": "日本語",
            "ko": "한국어",
            "ar": "العربية",
            "hi": "हिन्दी"
        }
    
    async def refresh_compliance_report(
        self,
        policy_text: str,
        policy_id: str,
        user_id: str,
        regulation_framework: str = "insurance_standards"
    ) -> ComplianceReport:
        """
        Force refresh compliance report using AI analysis (bypasses cache)
        """
        print(f"🔄 AI Service: Refreshing compliance report for policy {policy_id}")
        return await self.compliance_service.refresh_compliance_report(
            policy_text=policy_text,
            policy_id=policy_id,
            user_id=user_id,
            regulation_framework=regulation_framework
        )
    
    async def get_compliance_history(
        self,
        policy_id: str,
        user_id: str
    ) -> List[ComplianceReport]:
        """
        Get compliance report history for a policy
        """
        print(f"📊 AI Service: Getting compliance history for policy {policy_id}")
        return await self.compliance_service.get_compliance_history(
            policy_id=policy_id,
            user_id=user_id
        )
    
    async def ask_question_direct(
        self,
        question: str,
        user_id: str,
        policy_id: str = None
    ) -> str:
        """
        Ask a question directly to the AI model without vector search
        """
        try:
            print(f"🤖 AI Service: Direct question from user {user_id}")
            print(f"🤖 Question: {question[:100]}...")
            
            # Create messages for the AI model
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert insurance policy analyst. Provide detailed, accurate, and actionable analysis based on the information provided."
                },
                {
                    "role": "user",
                    "content": question
                }
            ]
            
            # Call OpenAI API
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
            
            answer = response.choices[0].message.content.strip()
            print(f"🤖 AI Service: Generated response ({len(answer)} characters)")
            
            return answer
            
        except Exception as e:
            print(f"❌ AI Service: Direct question failed: {e}")
            raise
    
    def parse_comparison_response(self, response: str) -> dict:
        """
        Parse AI comparison response into structured format
        """
        try:
            print(f"🔍 Parsing comparison response: {len(response)} characters")
            
            # Extract sections using patterns
            import re
            sections = re.split(r'\d+\.', response)
            
            # Extract summary (first section)
            summary = sections[1].strip() if len(sections) > 1 else response[:500]
            
            # Extract key differences
            key_differences = []
            if len(sections) > 2:
                differences_text = sections[2]
                # Extract bullet points or numbered items
                diff_items = re.split(r'[-•*]', differences_text)
                key_differences = [item.strip() for item in diff_items if item.strip() and len(item.strip()) > 15][:10]
            
            # Extract recommendations
            recommendations = []
            if len(sections) > 3:
                rec_text = sections[3]
                rec_items = re.split(r'[-•*]', rec_text)
                recommendations = [item.strip() for item in rec_items if item.strip() and len(item.strip()) > 15][:8]
            
            # Extract relevance score
            relevance_score = 75  # Default
            score_match = re.search(r'(\d+)%?(?:\s*(?:relevance|relevant|score|compatibility))', response, re.IGNORECASE)
            if score_match:
                relevance_score = min(100, max(0, int(score_match.group(1))))
            
            return {
                'summary': summary,
                'keyDifferences': key_differences,
                'recommendations': recommendations,
                'relevanceScore': relevance_score,
                'isRelevant': relevance_score > 40
            }
            
        except Exception as e:
            print(f"❌ Error parsing comparison response: {e}")
            return {
                'summary': response,
                'keyDifferences': [],
                'recommendations': [],
                'relevanceScore': 75,
                'isRelevant': True
            }
