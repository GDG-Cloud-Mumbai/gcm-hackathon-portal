import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from uuid6 import uuid7
from pymongo import MongoClient
from utils.env import ENV, require_env

MONGODB_URI = require_env("MONGODB_URI")
MONGODB_DB_NAME = ENV.get("MONGODB_DB_NAME", "hackathon_portal").strip()

def main():
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    
    admin_email = "admin@example.com"
    existing = db.users.find_one({"email": admin_email})
    
    if existing:
        db.users.update_one(
            {"email": admin_email},
            {"$set": {"global_role": {"name": "admin"}}}
        )
        print(f"Updated existing user {admin_email} to admin role.")
    else:
        db.users.insert_one({
            "uuid": str(uuid7()),
            "email": admin_email,
            "name": "Admin User",
            "username": "admin",
            "global_role": {"name": "admin"},
        })
        print(f"Created new admin user: {admin_email}")

    client.close()

if __name__ == "__main__":
    main()
