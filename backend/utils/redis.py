from functools import lru_cache
from redis import Redis
from utils.env import get_env


def _redis_url() -> str:
    redis_url = get_env("REDIS_URL", "redis://localhost:6379/0").strip()
    if not redis_url:
        raise RuntimeError("REDIS_URL is required")
    return redis_url


@lru_cache(maxsize=1)
def get_redis_client():
    return Redis.from_url(_redis_url(), decode_responses=True, health_check_interval=30)


def reset_redis_client() -> None:
    get_redis_client.cache_clear()
