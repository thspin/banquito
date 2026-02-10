"""Simple in-memory cache for frequently accessed data."""

import time
from typing import TypeVar, Generic, Optional, Dict, Any
from dataclasses import dataclass
from functools import wraps

T = TypeVar('T')


@dataclass
class CacheEntry(Generic[T]):
    """Cache entry with TTL."""
    value: T
    expires_at: float


class SimpleCache(Generic[T]):
    """
    Simple in-memory cache with TTL support.
    
    Usage:
        cache = SimpleCache[str](ttl=300)  # 5 minutes
        cache.set("key", "value")
        value = cache.get("key")
    """
    
    def __init__(self, ttl: int = 300, cleanup_interval: int = 60):
        """
        Initialize cache.
        
        Args:
            ttl: Time to live in seconds (default: 300 = 5 minutes)
            cleanup_interval: How often to cleanup expired entries (default: 60 seconds)
        """
        self._cache: Dict[str, CacheEntry[T]] = {}
        self._ttl = ttl
        self._cleanup_interval = cleanup_interval
        self._last_cleanup = time.time()
    
    def _cleanup_if_needed(self) -> None:
        """Remove expired entries if cleanup interval has passed."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        
        expired_keys = [
            key for key, entry in self._cache.items()
            if entry.expires_at < now
        ]
        for key in expired_keys:
            del self._cache[key]
        
        self._last_cleanup = now
    
    def get(self, key: str) -> Optional[T]:
        """Get value from cache if not expired."""
        self._cleanup_if_needed()
        
        entry = self._cache.get(key)
        if entry is None:
            return None
        
        if entry.expires_at < time.time():
            del self._cache[key]
            return None
        
        return entry.value
    
    def set(self, key: str, value: T, ttl: Optional[int] = None) -> None:
        """Store value in cache."""
        ttl = ttl or self._ttl
        expires_at = time.time() + ttl
        self._cache[key] = CacheEntry(value=value, expires_at=expires_at)
    
    def delete(self, key: str) -> bool:
        """Delete entry from cache. Returns True if key existed."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def get_many(self, keys: list[str]) -> Dict[str, T]:
        """Get multiple values from cache."""
        return {
            key: self.get(key) 
            for key in keys 
            if self.get(key) is not None
        }
    
    def set_many(self, items: Dict[str, T], ttl: Optional[int] = None) -> None:
        """Store multiple values in cache."""
        for key, value in items.items():
            self.set(key, value, ttl)
    
    def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all keys matching a pattern.
        Returns number of keys invalidated.
        """
        import re
        regex = re.compile(pattern)
        keys_to_delete = [
            key for key in self._cache.keys()
            if regex.search(key)
        ]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)


# Global cache instance (use carefully in multi-process environments)
_cache_instances: Dict[str, SimpleCache[Any]] = {}


def get_cache(name: str, ttl: int = 300) -> SimpleCache[Any]:
    """Get or create a named cache instance."""
    if name not in _cache_instances:
        _cache_instances[name] = SimpleCache[Any](ttl=ttl)
    return _cache_instances[name]


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.
    
    Usage:
        @cached(ttl=600, key_prefix="products")
        async def get_products(user_id: UUID):
            # expensive operation
            return products
    """
    cache = SimpleCache[Any](ttl=ttl)
    
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache.set(cache_key, result, ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix, func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache.set(cache_key, result, ttl)
            
            return result
        
        return async_wrapper if hasattr(func, '__code__') and func.__code__.co_flags & 0x80 else sync_wrapper
    
    return decorator
