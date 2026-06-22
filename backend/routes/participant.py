from fastapi import APIRouter

router = APIRouter(
    prefix="/participants",
    tags=["participants"],
)


@router.get("/ping")
def ping():
    return {"message": "participants route working"}