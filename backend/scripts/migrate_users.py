"""
One-time migration script for backfilling user identity fields.

Safe to run multiple times.
"""

"""
User Identity Migration

Purpose:
--------
Backfill missing identity fields for existing users.

This migration is idempotent:
- Safe to run multiple times.
- Only adds missing fields.
- Never overwrites existing values.
"""
from pathlib import Path
import sys

# Add backend root directory to Python path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from uuid6 import uuid7

from pymongo import MongoClient

from utils.env import ENV, require_env


# Reuse the same configuration as the application.
MONGODB_URI = require_env("MONGODB_URI")
MONGODB_DB_NAME = ENV.get("MONGODB_DB_NAME", "hackathon_portal").strip()


def main() -> None:
    """
    Connect to MongoDB and backfill missing user fields.
    """

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]

    updated_count = 0

    for user in db.users.find():

        update_fields = {}

        # Add UUID if missing.
        if not user.get("uuid"):
            update_fields["uuid"] = str(uuid7())

        # Generate a default display name from email.
        if not user.get("name"):
            email = user.get("email", "")
            update_fields["name"] = email.split("@")[0]

        # Ensure username field exists.
        if "username" not in user:
            update_fields["username"] = None

        # Ensure global role exists.
        if not user.get("global_role"):
            update_fields["global_role"] = {
                "name": "user"
            }

        # Skip users that already have all fields.
        if not update_fields:
            continue

        db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": update_fields
            }
        )

        updated_count += 1

        print(
            f"Updated user: {user.get('email')} "
            f"with fields: {list(update_fields.keys())}"
        )

    print(f"\nMigration completed. Updated {updated_count} users.")

    client.close()


if __name__ == "__main__":
    main()