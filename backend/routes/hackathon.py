from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from utils.db import get_db

router = APIRouter(prefix="/hackathons", tags=["hackathons"])

@router.get("")
def list_public_hackathons(db: Database[Any] = Depends(get_db)):
    hackathons = []
    # Return non-archived public hackathons
    for doc in db.hackathons.find({"is_public": True, "status": {"$ne": "archived"}}):
        hackathons.append({
            "uuid": doc.get("uuid"),
            "slug": doc.get("slug"),
            "name": doc.get("name"),
            "description": doc.get("description", ""),
            "status": doc.get("status"),
            "registration_start": doc.get("registration_start"),
            "registration_end": doc.get("registration_end"),
            "event_start": doc.get("event_start"),
            "event_end": doc.get("event_end"),
            "submission_start": doc.get("submission_start"),
            "submission_deadline": doc.get("submission_deadline"),
            "min_team_size": doc.get("min_team_size", 1),
            "max_team_size": doc.get("max_team_size", 4),
            "allow_individual_registration": doc.get("allow_individual_registration", False),
            "is_public": doc.get("is_public", True),
        })
    return {"hackathons": hackathons}

@router.get("/{hackathon_uuid}")
def get_public_hackathon(hackathon_uuid: str, db: Database[Any] = Depends(get_db)):
    doc = db.hackathons.find_one({"uuid": hackathon_uuid})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )
    return {
        "uuid": doc.get("uuid"),
        "slug": doc.get("slug"),
        "name": doc.get("name"),
        "description": doc.get("description", ""),
        "status": doc.get("status"),
        "registration_start": doc.get("registration_start"),
        "registration_end": doc.get("registration_end"),
        "event_start": doc.get("event_start"),
        "event_end": doc.get("event_end"),
        "submission_start": doc.get("submission_start"),
        "submission_deadline": doc.get("submission_deadline"),
        "min_team_size": doc.get("min_team_size", 1),
        "max_team_size": doc.get("max_team_size", 4),
        "allow_individual_registration": doc.get("allow_individual_registration", False),
        "is_public": doc.get("is_public", True),
    }
