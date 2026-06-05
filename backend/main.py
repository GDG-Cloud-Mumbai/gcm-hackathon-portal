from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from utils.db import init_db
from routes.auth import router as auth_router
from utils.redis import get_redis_client, reset_redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.mongo_client, app.state.db = init_db()
    app.state.redis_client = get_redis_client()

    try:
        yield
    finally:
        app.state.mongo_client.close()
        app.state.redis_client.close()
        reset_redis_client()


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "GDG Cloud Mumbai Hackathon Portal API"}


@app.exception_handler(RequestValidationError)
def custom_validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()

    custom_errors = [
        {"field": ".".join(map(str, err["loc"])), "message": err["msg"]}
        for err in errors
    ]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"status": "error", "errors": custom_errors},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8888, reload=True)
