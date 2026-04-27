from contextlib import asynccontextmanager
from fastapi import FastAPI
from pymongo import MongoClient

from routes.auth import router as auth_router
from utils.env import get_int, require_env, ENV
from utils.redis import get_redis_client, reset_redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_uri = require_env("MONGODB_URI")
    mongo_db_name = ENV.get("MONGODB_DB_NAME", "hackathon_portal").strip()
    mongo_max_pool_size = get_int("MONGODB_MAX_POOL_SIZE", 30)
    mongo_min_pool_size = get_int("MONGODB_MIN_POOL_SIZE", 5)
    mongo_max_idle_ms = get_int("MONGODB_MAX_IDLE_MS", 300000)
    mongo_connect_timeout_ms = get_int("MONGODB_CONNECT_TIMEOUT_MS", 5000)
    mongo_socket_timeout_ms = get_int("MONGODB_SOCKET_TIMEOUT_MS", 30000)
    mongo_server_selection_timeout_ms = get_int("MONGODB_SERVER_SELECTION_TIMEOUT_MS", 5000)
    redis_client = get_redis_client()

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
    redis_client.ping()
    db.users.create_index("email", unique=True)

    app.state.mongo_client = mongo_client
    app.state.redis_client = redis_client
    app.state.db = db

    try:
        yield
    finally:
        mongo_client.close()
        redis_client.close()
        reset_redis_client()


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "GDG Cloud Mumbai Hackathon Portal API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8888, reload=True)