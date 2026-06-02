from fastapi import Request
from pymongo import MongoClient
from pymongo.database import Database
from typing import Any, Tuple
from functools import lru_cache
from utils.env import ENV, get_int, require_env


def init_db() -> Tuple[MongoClient, Database[Any]]:
    mongo_uri = require_env("MONGODB_URI")
    mongo_db_name = ENV.get("MONGODB_DB_NAME", "hackathon_portal").strip()
    mongo_max_pool_size = get_int("MONGODB_MAX_POOL_SIZE", 30)
    mongo_min_pool_size = get_int("MONGODB_MIN_POOL_SIZE", 5)
    mongo_max_idle_ms = get_int("MONGODB_MAX_IDLE_MS", 300000)
    mongo_connect_timeout_ms = get_int("MONGODB_CONNECT_TIMEOUT_MS", 5000)
    mongo_socket_timeout_ms = get_int("MONGODB_SOCKET_TIMEOUT_MS", 30000)
    mongo_server_selection_timeout_ms = get_int(
        "MONGODB_SERVER_SELECTION_TIMEOUT_MS", 5000
    )

    mongo_client = MongoClient(
        mongo_uri,
        maxPoolSize=mongo_max_pool_size,
        minPoolSize=mongo_min_pool_size,
        maxIdleTimeMS=mongo_max_idle_ms,
        connectTimeoutMS=mongo_connect_timeout_ms,
        socketTimeoutMS=mongo_socket_timeout_ms,
        serverSelectionTimeoutMS=mongo_server_selection_timeout_ms,
        retryWrites=True,
    )
    db = mongo_client[mongo_db_name]
    mongo_client.admin.command("ping")
    db.users.create_index("email", unique=True)

    return mongo_client, db

@lru_cache(maxsize=1)
def get_db(request: Request) -> Database[Any]:
    return request.app.state.db
