import json
from typing import Optional, Any
import redis.asyncio as redis
from app.core.config import settings
from app.core.logging import logger

class CacheRepository:
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._in_memory_cache: dict = {}
        self.use_redis = False
        
        if settings.REDIS_URL:
            try:
                # Initialize Redis connection pool
                self.redis_client = redis.from_url(
                    settings.REDIS_URL, 
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0
                )
                self.use_redis = True
                logger.info(f"Redis cache initialized with URL: {settings.REDIS_URL}")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {str(e)}. Falling back to in-memory caching.")
                self.use_redis = False

    async def ping_redis(self) -> bool:
        """Pings Redis to check if it's alive, handles reconnects."""
        if not self.redis_client:
            return False
        try:
            await self.redis_client.ping()
            return True
        except Exception:
            return False

    async def get(self, key: str) -> Optional[Any]:
        if self.use_redis and self.redis_client:
            try:
                val = await self.redis_client.get(key)
                if val:
                    logger.info(f"Cache HIT for key: {key} (Redis)")
                    return json.loads(val)
                logger.info(f"Cache MISS for key: {key} (Redis)")
                return None
            except Exception as e:
                logger.warning(f"Redis get failed: {str(e)}. Falling back to in-memory cache lookup.")
                self.use_redis = False # Temporarily fall back
                
        # In-Memory Cache Lookup
        val = self._in_memory_cache.get(key)
        if val:
            logger.info(f"Cache HIT for key: {key} (In-Memory)")
            return json.loads(val)
        logger.info(f"Cache MISS for key: {key} (In-Memory)")
        return None

    async def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> None:
        expire = expire_seconds if expire_seconds is not None else settings.CACHE_EXPIRY_SECONDS
        json_val = json.dumps(value)
        
        if self.use_redis and self.redis_client:
            try:
                await self.redis_client.set(key, json_val, ex=expire)
                logger.info(f"Cache SET for key: {key} (Redis), expiry: {expire}s")
                return
            except Exception as e:
                logger.warning(f"Redis set failed: {str(e)}. Saving to in-memory cache instead.")
                self.use_redis = False
                
        # Save to In-Memory Cache
        self._in_memory_cache[key] = json_val
        logger.info(f"Cache SET for key: {key} (In-Memory)")

    async def delete(self, key: str) -> None:
        if self.use_redis and self.redis_client:
            try:
                await self.redis_client.delete(key)
                logger.info(f"Cache DELETE for key: {key} (Redis)")
                return
            except Exception as e:
                logger.warning(f"Redis delete failed: {str(e)}. Deleting from in-memory cache.")
                self.use_redis = False
                
        if key in self._in_memory_cache:
            del self._in_memory_cache[key]
            logger.info(f"Cache DELETE for key: {key} (In-Memory)")

    async def clear(self) -> None:
        if self.use_redis and self.redis_client:
            try:
                await self.redis_client.flushdb()
                logger.info("Cache CLEAR (Redis)")
                return
            except Exception as e:
                logger.warning(f"Redis flushdb failed: {str(e)}. Clearing in-memory cache.")
                self.use_redis = False
                
        self._in_memory_cache.clear()
        logger.info("Cache CLEAR (In-Memory)")
