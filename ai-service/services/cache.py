"""
Simple in-memory cache for AI service to reduce database calls
"""

import time
from typing import Any, Optional, Dict
import hashlib

class SimpleCache:
    def __init__(self, default_ttl: int = 3600):  # 1 hour default TTL
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, prefix: str, *args) -> str:
        """Generate a cache key from arguments"""
        key_string = f"{prefix}:{':'.join(str(arg) for arg in args)}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, prefix: str, *args) -> Optional[Any]:
        """Get value from cache"""
        key = self._generate_key(prefix, *args)
        
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        
        # Check if expired
        if time.time() > entry['expires_at']:
            del self.cache[key]
            return None
        
        return entry['value']
    
    def set(self, prefix: str, value: Any, ttl: Optional[int] = None, *args) -> None:
        """Set value in cache"""
        key = self._generate_key(prefix, *args)
        ttl = ttl or self.default_ttl
        
        self.cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl
        }
    
    def delete(self, prefix: str, *args) -> None:
        """Delete value from cache"""
        key = self._generate_key(prefix, *args)
        if key in self.cache:
            del self.cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self.cache[key]

# Global cache instance
cache = SimpleCache()
