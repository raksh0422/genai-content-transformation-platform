"""CLI command to securely provision or promote an Administrator account.

Usage:
    python -m scripts.create_admin --email admin@example.com --name "System Admin"
    python -m scripts.create_admin --email admin@example.com --password "SecureSecret123!" --name "System Admin"
"""
from __future__ import annotations

import argparse
import asyncio
import getpass
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Add backend root to sys.path so app modules import correctly
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.config import get_settings
from app.core.security import hash_password
from app.database import create_all_tables, get_db_session
from app.models.activity import ActivityLog
from app.models.user import User


async def create_or_promote_admin(email: str, password: str, full_name: str) -> None:
    settings = get_settings()
    # Ensure database tables exist
    await create_all_tables(settings)
    clean_email = email.strip().lower()

    async with get_db_session(settings) as db:
        res = await db.execute(select(User).where(User.email == clean_email))
        user = res.scalar_one_or_none()

        if user:
            print(f"[+] Found existing user '{clean_email}' (Role: {user.role}).")
            user.role = "admin"
            user.is_active = True
            if password:
                user.hashed_password = hash_password(password)
            if full_name:
                user.full_name = full_name
            user.last_active_at = datetime.now(timezone.utc)
            await db.flush()

            # Record audit event
            audit = ActivityLog(
                id=uuid.uuid4(),
                user_id=user.id,
                user_email=user.email,
                event_type="admin_promoted",
                resource_type="user",
                resource_id=user.id,
                description=f"User {user.email} promoted to admin via server CLI",
                status="success",
            )
            db.add(audit)
            print(f"[✓] User '{clean_email}' successfully upgraded to Administrator role.")
        else:
            if not password:
                print("[-] Error: Password is required when creating a new administrator account.", file=sys.stderr)
                sys.exit(1)

            user_id = f"usr_admin_{uuid.uuid4().hex[:12]}"
            new_admin = User(
                id=user_id,
                email=clean_email,
                hashed_password=hash_password(password),
                full_name=full_name or "System Administrator",
                role="admin",
                is_active=True,
                created_at=datetime.now(timezone.utc),
                last_active_at=datetime.now(timezone.utc),
            )
            db.add(new_admin)
            await db.flush()

            # Record audit event
            audit = ActivityLog(
                id=uuid.uuid4(),
                user_id=new_admin.id,
                user_email=new_admin.email,
                event_type="admin_provisioned",
                resource_type="user",
                resource_id=new_admin.id,
                description=f"New Administrator provisioned via server CLI: {new_admin.email}",
                status="success",
            )
            db.add(audit)
            print(f"[✓] Administrator '{clean_email}' created successfully (ID: {new_admin.id}).")


def main() -> None:
    parser = argparse.ArgumentParser(description="ContentAI Administrator Provisioning Utility")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--name", default="System Administrator", help="Administrator full name")
    parser.add_argument("--password", help="Administrator password (prompted securely if omitted)")

    args = parser.parse_args()

    password = args.password
    if not password:
        password = getpass.getpass("Enter administrator password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("[-] Passwords do not match. Aborting.", file=sys.stderr)
            sys.exit(1)

    if len(password) < 8:
        print("[-] Password must be at least 8 characters long.", file=sys.stderr)
        sys.exit(1)

    asyncio.run(create_or_promote_admin(args.email, password, args.name))


if __name__ == "__main__":
    main()
