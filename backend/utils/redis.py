from functools import lru_cache
from typing import Any, cast

from redis import Redis

from utils.env import ENV


def _redis_url() -> str:
    redis_url = ENV.get("REDIS_URL", "redis://localhost:6379/0").strip()
    if not redis_url:
        raise RuntimeError("REDIS_URL is required")
    return redis_url


@lru_cache(maxsize=1)
def get_redis_client():
    return Redis.from_url(_redis_url(), decode_responses=True, health_check_interval=30)


def _otp_challenge_key(email: str) -> str:
    return f"otp:challenge:{email}"


def _otp_rate_limit_key(email: str, client_ip: str) -> str:
    return f"otp:rate:{email}:{client_ip}"


def store_otp_challenge(email: str, otp_hash: str, salt_hex: str, ttl_seconds: int, max_attempts: int) -> None:
    client = get_redis_client()
    key = _otp_challenge_key(email)
    client.hset(
        key,
        mapping={
            "otp_hash": otp_hash,
            "salt": salt_hex,
            "attempt_count": 0,
            "max_attempts": max_attempts,
        },
    )
    client.expire(key, ttl_seconds)


def fetch_otp_challenge(email: str) -> dict[str, str] | None:
    client = get_redis_client()
    challenge = client.hgetall(_otp_challenge_key(email))
    return challenge or None


def increment_otp_attempt_count(email: str) -> int | None:
    client = get_redis_client()
    key = _otp_challenge_key(email)
    if not client.exists(key):
        return None
    return int(client.hincrby(key, "attempt_count", 1))


def delete_otp_challenge(email: str) -> None:
    client = get_redis_client()
    client.delete(_otp_challenge_key(email))


def consume_otp_request_slot(email: str, client_ip: str, window_seconds: int) -> int:
    client = get_redis_client()
    key = _otp_rate_limit_key(email, client_ip)
    count = int(client.incr(key))
    if count == 1:
        client.expire(key, window_seconds)
    return count


def reset_redis_client() -> None:
    get_redis_client.cache_clear()
