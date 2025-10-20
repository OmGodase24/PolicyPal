"""
Database service for AI operations
- policies: Main policies from backend with PDF text
- policy_chunks: AI-processed chunks for vector search
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any, Optional
import time
from functools import wraps
from bson import ObjectId
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def retry_on_dns_error(max_retries=3, delay=1):
    """Decorator to retry operations on DNS timeout errors"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if "DNS" in str(e) or "resolution lifetime expired" in str(e):
                        if attempt < max_retries - 1:
                            print(f"🔄 DNS error on attempt {attempt + 1}/{max_retries}, retrying in {delay}s...")
                            await asyncio.sleep(delay * (attempt + 1))  # Exponential backoff
                            continue
                    # If not DNS error or max retries reached, re-raise
                    raise e
            raise last_exception
        return wrapper
    return decorator

class DatabaseService:
    def __init__(self):
        # MongoDB connection - connect to main backend database
        # Connect to main backend database, not separate AI database
        mongodb_uri = os.getenv("MONGODB_URI")
        
        # Enhanced connection options for better performance and reliability
        self.client = AsyncIOMotorClient(
            mongodb_uri,
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=10000,  # Increased for DNS resolution
            connectTimeoutMS=15000,          # Increased for DNS resolution
            socketTimeoutMS=30000,           # Increased for stability
            maxPoolSize=10,                  # Reduced to avoid connection issues
            minPoolSize=1,                   # Minimum 1 connection
            maxIdleTimeMS=30000,             # Reduced idle time
            maxConnecting=3,                 # Reduced concurrent attempts
            retryWrites=True,
            retryReads=True,
            w='majority',
            readPreference='primaryPreferred',
            # DNS and network optimizations
            directConnection=False,          # Use connection pooling
            # Heartbeat settings
            heartbeatFrequencyMS=30000,      # Increased heartbeat interval
            # Timeout optimizations
            waitQueueTimeoutMS=10000,        # Increased wait time
        )
        self.db = self.client["policy-project"]  # Changed from policypal to policy-project
        
        # Collections - use main backend collections
        self.policies_collection = self.db.policies  # Main policies collection
        self.chunks_collection = self.db.policy_chunks  # AI chunks for vector search
        
        # Show which database we're connecting to
        print(f"🔍 Connecting to database: {self.db.name}")
        print(f"🔍 Using collections: {self.policies_collection.name}, {self.chunks_collection.name}")

    async def connect(self):
        """Connect to MongoDB"""
        try:
            # Test the connection
            await self.client.admin.command('ping')
            print("✅ Connected to MongoDB")
            
            # Show how many policies we have
            count = await self.policies_collection.count_documents({})
            print(f"🔍 Found {count} total policies in {self.policies_collection.name}")
            
            # Show how many chunks we have
            chunk_count = await self.chunks_collection.count_documents({})
            print(f"🔍 Found {chunk_count} total chunks in {self.chunks_collection.name}")
            
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            raise

    @retry_on_dns_error(max_retries=3, delay=1)
    async def get_policy(self, policy_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a policy by ID and user ID"""
        print(f"Database Service: Looking for policy {policy_id} for user {user_id}")
        print(f"Database Service: Using database: {self.db.name}")
        print(f"Database Service: Using collection: {self.policies_collection.name}")
        
        try:
            # Convert string ID to ObjectId
            object_id = ObjectId(policy_id)
            
            # Query for the policy
            query = {
                "_id": object_id,
                "hasPDF": True,
                "$or": [
                    {"createdBy": user_id},
                    {"createdBy._id": user_id}
                ]
            }
            
            print(f"Database Service: Executing query: {query}")
            
            policy = await self.policies_collection.find_one(query)
            
            if policy:
                print(f"Database Service: Found policy {policy_id} with title: {policy.get('title', 'No title')}")
                print(f"Database Service: Policy has PDF text: {len(policy.get('pdfText', ''))} characters")
                print(f"Database Service: Policy createdBy: {policy.get('createdBy', 'Unknown')}")
                print(f"Database Service: Returning document with {len(policy.get('pdfText', ''))} characters")
                return policy
            else:
                print(f"Database Service: Policy {policy_id} not found for user {user_id}")
                return None
                
        except Exception as e:
            print(f"Database Service: Error getting policy {policy_id}: {e}")
            return None

    @retry_on_dns_error(max_retries=3, delay=1)
    async def store_document_chunks(self, chunks: List[Dict[str, Any]], document_id: str, user_id: str) -> bool:
        """Store document chunks in the database"""
        print(f"🔍 Storing chunks in database...")
        
        if not user_id:
            print("❌ User ID is required for storing chunks")
            return False
            
        try:
            # Use the provided policy_id as document_id for consistency
            document_id_to_use = document_id
            
            # Prepare chunks for storage
            chunks_to_store = []
            for i, chunk in enumerate(chunks):
                chunk_doc = {
                    "document_id": document_id_to_use,  # Use policy_id as document_id
                    "user_id": user_id,
                    "chunk_index": i,
                    "text": chunk["text"],
                    "embedding": chunk["embedding"],
                    "created_at": chunk.get("created_at")
                }
                chunks_to_store.append(chunk_doc)
                print(f"🔍 Chunk {i}: document_id={document_id_to_use}, user_id={user_id}, text_length={len(chunk['text'])}")
            
            # Store chunks in database
            if chunks_to_store:
                result = await self.chunks_collection.insert_many(chunks_to_store)
                print(f"🔍 Stored {len(result.inserted_ids)} chunks with document_id: {document_id_to_use}, user_id: {user_id}")
                
                # Verify chunks were stored
                verify_query = {"document_id": document_id_to_use, "user_id": user_id}
                stored_chunks = await self.chunks_collection.find(verify_query).to_list(length=None)
                print(f"🔍 Verification: Found {len(stored_chunks)} chunks in database after storage")
                
                return True
            else:
                print("❌ No chunks to store")
                return False
                
        except Exception as e:
            print(f"❌ Error storing chunks: {e}")
            return False

    async def vector_search(self, query_embedding: List[float], user_id: str, document_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform vector search to find relevant chunks"""
        print(f"🔍 Vector Search: Looking for chunks with query: {{'user_id': '{user_id}', 'document_id': '{document_id}'}}")
        print(f"🔍 Vector Search: User ID: {user_id}, Policy ID: {document_id}")
        
        try:
            # Find chunks for this user and document
            query = {
                "user_id": user_id,
                "document_id": document_id
            }
            
            chunks = await self.chunks_collection.find(query).to_list(length=None)
            print(f"🔍 Vector Search: Found {len(chunks)} chunks")
            
            if not chunks:
                print(f"🔍 Vector Search: No chunks found for user {user_id}, policy {document_id}")
                return []
            
            # Show details of first chunk
            if chunks:
                first_chunk = chunks[0]
                print(f"🔍 Vector Search: First chunk keys: {list(first_chunk.keys())}")
                print(f"🔍 Vector Search: First chunk document_id: {first_chunk.get('document_id')}")
                print(f"🔍 Vector Search: First chunk user_id: {first_chunk.get('user_id')}")
            
            # Calculate similarities
            similarities = []
            query_embedding_array = np.array(query_embedding).reshape(1, -1)
            
            for chunk in chunks:
                if "embedding" in chunk and chunk["embedding"]:
                    chunk_embedding = np.array(chunk["embedding"]).reshape(1, -1)
                    similarity = cosine_similarity(query_embedding_array, chunk_embedding)[0][0]
                    similarities.append((similarity, chunk))
            
            # Sort by similarity and return top results
            similarities.sort(key=lambda x: x[0], reverse=True)
            top_chunks = [chunk for _, chunk in similarities[:limit]]
            
            print(f"🔍 Vector Search: Returning {len(top_chunks)} most relevant chunks")
            return top_chunks
            
        except Exception as e:
            print(f"❌ Error in vector search: {e}")
            return []

    @retry_on_dns_error(max_retries=3, delay=1)
    async def update_policy_ai_status(self, policy_id: str, ai_processed: bool = True) -> bool:
        """Update the AI processing status of a policy"""
        try:
            result = await self.policies_collection.update_one(
                {"_id": ObjectId(policy_id)},
                {"$set": {"aiProcessed": ai_processed}}
            )
            
            if result.modified_count > 0:
                print(f"Successfully updated policy {policy_id} AI status to {ai_processed}")
                return True
            else:
                print(f"No policy found with ID {policy_id} to update")
                return False
                
        except Exception as e:
            print(f"❌ Error updating policy AI status: {e}")
            return False

    @retry_on_dns_error(max_retries=3, delay=1)
    async def update_policy_pdf_text(self, policy_id: str, pdf_text: str) -> bool:
        """Update the main policy's PDF text content"""
        try:
            result = await self.policies_collection.update_one(
                {"_id": ObjectId(policy_id)},
                {"$set": {"pdfText": pdf_text}}
            )
            
            if result.modified_count > 0:
                print(f"Successfully updated policy {policy_id} PDF text with {len(pdf_text)} characters")
                return True
            else:
                print(f"No policy found with ID {policy_id} to update PDF text")
                return False
                
        except Exception as e:
            print(f"❌ Error updating policy PDF text: {e}")
            return False

    @retry_on_dns_error(max_retries=3, delay=1)
    async def get_document_chunks(self, document_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Get all chunks for a document"""
        try:
            query = {
                "document_id": document_id,
                "user_id": user_id
            }
            
            print(f"🔍 Vector Search: Query: {query}")
            chunks = await self.chunks_collection.find(query).to_list(length=None)
            print(f"🔍 Vector Search: Found {len(chunks)} chunks for document {document_id}")
            
            # Debug: Check if there are any chunks at all
            total_chunks = await self.chunks_collection.count_documents({})
            print(f"🔍 Vector Search: Total chunks in database: {total_chunks}")
            
            return chunks
            
        except Exception as e:
            print(f"❌ Error getting document chunks: {e}")
            return []

    async def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            policy_count = await self.policies_collection.count_documents({})
            chunk_count = await self.chunks_collection.count_documents({})
            
            return {
                "policies": policy_count,
                "chunks": chunk_count,
                "database": self.db.name
            }
        except Exception as e:
            print(f"❌ Error getting stats: {e}")
            return {"policies": 0, "chunks": 0, "database": "unknown"}
    
    async def debug_chunks(self, document_id: str = None, user_id: str = None) -> Dict[str, Any]:
        """Debug method to check what chunks exist in the database"""
        try:
            query = {}
            if document_id:
                query["document_id"] = document_id
            if user_id:
                query["user_id"] = user_id
            
            chunks = await self.chunks_collection.find(query).to_list(length=None)
            
            # Get unique document_ids and user_ids
            unique_docs = await self.chunks_collection.distinct("document_id")
            unique_users = await self.chunks_collection.distinct("user_id")
            
            return {
                "total_chunks": len(chunks),
                "query": query,
                "unique_document_ids": unique_docs,
                "unique_user_ids": unique_users,
                "sample_chunks": chunks[:3] if chunks else []
            }
        except Exception as e:
            print(f"❌ Error debugging chunks: {e}")
            return {"error": str(e)}

    async def find_one(self, collection_name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find one document in a collection"""
        try:
            collection = self.db[collection_name]
            result = await collection.find_one(query)
            return result
        except Exception as e:
            print(f"❌ Error finding document in {collection_name}: {e}")
            return None
    
    async def find(self, collection_name: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find multiple documents in a collection"""
        try:
            collection = self.db[collection_name]
            cursor = collection.find(query)
            results = await cursor.to_list(length=None)
            return results
        except Exception as e:
            print(f"❌ Error finding documents in {collection_name}: {e}")
            return []
    
    async def upsert(self, collection_name: str, query: Dict[str, Any], document: Dict[str, Any]) -> bool:
        """Insert or update a document in a collection"""
        try:
            collection = self.db[collection_name]
            result = await collection.replace_one(query, document, upsert=True)
            return result.acknowledged
        except Exception as e:
            print(f"❌ Error upserting document in {collection_name}: {e}")
            return False

    async def close(self):
        """Close the database connection"""
        if self.client:
            self.client.close()
            print("🔌 Database connection closed")