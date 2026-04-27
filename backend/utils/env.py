from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

ENV: dict[str, str] = dict()
for key, value in __import__("os").environ.items():
    ENV[key] = value


def get_env(name: str, default: Any = None) -> Any:
    return ENV.get(name, default)


def require_env(name: str) -> str:
    value = ENV.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def get_int(name: str, default: int) -> int:
    raw = ENV.get(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f"Invalid integer for {name}") from exc
