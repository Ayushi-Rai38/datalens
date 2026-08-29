"""Redis connection factory used for caching completed analysis reports."""
import redis

from app.core.config import settings

_redis_pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=_redis_pool)
