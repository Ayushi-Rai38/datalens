"""Redis caching for completed analysis reports, with explicit invalidation."""
from __future__ import annotations

import json
import logging

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

REPORT_KEY_PREFIX = "report:latest:"


class CacheService:
    def __init__(self, client: redis.Redis):
        self.client = client

    @staticmethod
    def _key(dataset_id: int) -> str:
        return f"{REPORT_KEY_PREFIX}{dataset_id}"

    def get_latest_report(self, dataset_id: int) -> dict | None:
        try:
            raw = self.client.get(self._key(dataset_id))
        except redis.RedisError:
            logger.warning("Redis unavailable on read; falling back to DB", exc_info=True)
            return None
        return json.loads(raw) if raw else None

    def set_latest_report(self, dataset_id: int, report: dict) -> None:
        try:
            self.client.set(self._key(dataset_id), json.dumps(report, default=str), ex=settings.CACHE_TTL_SECONDS)
        except redis.RedisError:
            logger.warning("Redis unavailable on write; skipping cache", exc_info=True)

    def invalidate(self, dataset_id: int) -> None:
        try:
            self.client.delete(self._key(dataset_id))
        except redis.RedisError:
            logger.warning("Redis unavailable on invalidate", exc_info=True)
