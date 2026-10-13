"""Security utilities: password hashing and JWT token management."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# PBKDF2 parameters (NIST SP 800-63B compliant)
PBKDF2_ALGORITHM = "sha256"
PBKDF2_ITERATIONS = 600_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    """
    Hash a password using salted PBKDF2-HMAC-SHA256.
    Format: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    salt = secrets.token_bytes(SALT_BYTES)
    derived = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    salt_b64 = base64.b64encode(salt).decode("ascii")
    hash_b64 = base64.b64encode(derived).decode("ascii")
    return f"pbkdf2_{PBKDF2_ALGORITHM}${PBKDF2_ITERATIONS}${salt_b64}${hash_b64}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against the stored PBKDF2 hash.
    Constant-time comparison protects against timing attacks.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != f"pbkdf2_{PBKDF2_ALGORITHM}":
            return False
        iterations = int(parts[1])
        salt = base64.b64decode(parts[2].encode("ascii"))
        expected_hash = base64.b64decode(parts[3].encode("ascii"))

        derived = hashlib.pbkdf2_hmac(
            PBKDF2_ALGORITHM,
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(derived, expected_hash)
    except Exception as exc:
        logger.warning("Password verification failed with error: %s", exc)
        return False


# ─── JWT Implementation (HS256) ─────────────────────────────────────────────

def _b64_url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64_url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("ascii"))


def create_access_token(
    payload: Dict[str, Any],
    secret_key: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token with HS256.
    """
    header = {"alg": "HS256", "typ": "JWT"}
    to_encode = payload.copy()

    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=7)

    to_encode["iat"] = int(now.timestamp())
    to_encode["exp"] = int(expire.timestamp())

    header_segment = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_segment = _b64_url_encode(json.dumps(to_encode, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")

    signature = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_segment = _b64_url_encode(signature)

    return f"{header_segment}.{payload_segment}.{sig_segment}"


def decode_access_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify signature and expiration of a JWT access token.
    Returns the payload dictionary or None if invalid / expired.
    """
    if not token:
        return None
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        header_segment, payload_segment, sig_segment = parts
        signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
        expected_sig = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = _b64_url_decode(sig_segment)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = _b64_url_decode(payload_segment)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            if now_ts > exp:
                return None  # Expired

        return payload
    except Exception as exc:
        logger.debug("Failed to decode token: %s", exc)
        return None
