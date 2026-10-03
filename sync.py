#!/usr/bin/env python3
"""Pull BagBuddy boards out of Firebase Storage into a local data folder.

Only the allowlisted accounts below are ever touched.

Authentication, in order of preference:

1. A Google access token from application default credentials
   (``gcloud auth application-default print-access-token`` or
   ``GOOGLE_APPLICATION_CREDENTIALS``). Needs no user password and bypasses the
   Storage rules, so it is the right choice for a backup tool.
2. Firebase email + password from the environment
   (``BAGBUDDY_PASSWORD`` for the main account, or
   ``BAGBUDDY_PASSWORD_TEST`` for the test account), used through the Firebase
   Storage API so the same rules as the app apply.

Usage:
    python sync.py                      download every allowlisted account
    python sync.py --email a@b.c        download one account
    python sync.py --out D:/backups     write somewhere else
    python sync.py --push rakeshmalik91@gmail.com
                                         upload data/<email>/state.json back
    python sync.py --push rakeshmalik91@gmail.com --dry-run
                                         show the target without writing

Standard library only, so there is nothing to pip install.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BUCKET = "bag-buddy-f0896.firebasestorage.app"
PROJECT_ID = "bag-buddy-f0896"
FIREBASE_API_KEY = "AIzaSyDhcMTvkH4grRnUxXfWFXYJjWX3Bph64fE"

# The only accounts this script will ever read or write.
ALLOWED_EMAILS = (
    "rakeshmalik91@gmail.com",
    "test@gmail.com",
)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_MEDIA_URL = "https://storage.googleapis.com/storage/v1/b/{bucket}/o/{name}?alt=media"
GOOGLE_UPLOAD_URL = "https://storage.googleapis.com/upload/storage/v1/b/{bucket}/o?uploadType=media&name={name}"
FIREBASE_SIGNIN_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE_API_KEY
)
FIREBASE_MEDIA_URL = "https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{name}?alt=media"

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_OUT = PROJECT_ROOT / "data"


class SyncError(RuntimeError):
    """Anything that should be reported to the user without a traceback."""


def log(message: str) -> None:
    print(message, flush=True)


def object_name(email: str) -> str:
    """The layout the app uses in the bucket."""
    return f"{email.lower()}/state.json"


def folder_name(email: str) -> str:
    """A safe folder name, so an email never becomes a nested path."""
    return email.replace("@", "_at_").replace(".", "_")


# --------------------------------------------------------------------------- auth


def _read_json(path: Path) -> dict:
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as cause:
        raise SyncError(f"Could not read {path}: {cause}") from cause


def adc_credentials_path() -> Path | None:
    override = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if override:
        path = Path(override)
        return path if path.is_file() else None

    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    path = Path(appdata) / "gcloud" / "application_default_credentials.json"
    return path if path.is_file() else None


def google_access_token() -> str | None:
    """Exchange application default credentials for an access token."""
    path = adc_credentials_path()
    if path is None:
        return None

    credentials = _read_json(path)
    if credentials.get("type") != "authorized_user":
        log(f"  note: {path.name} is not an authorized_user credential, ignoring it")
        return None

    try:
        import urllib.parse as parse

        body = parse.urlencode(
            {
                "client_id": credentials["client_id"],
                "client_secret": credentials["client_secret"],
                "refresh_token": credentials["refresh_token"],
                "grant_type": "refresh_token",
            }
        ).encode()
        request = urllib.request.Request(GOOGLE_TOKEN_URL, data=body, method="POST")
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode())
    except (KeyError, urllib.error.URLError, json.JSONDecodeError, OSError) as cause:
        log(f"  note: could not refresh the Google token ({cause})")
        return None

    token = payload.get("access_token")
    return token if isinstance(token, str) else None


def firebase_id_token(email: str) -> str | None:
    password = os.environ.get(f"BAGBUDDY_PASSWORD_{folder_name(email).upper()}")
    if not password:
        password = os.environ.get("BAGBUDDY_PASSWORD")

    if not password:
        return None

    body = json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode()
    request = urllib.request.Request(
        FIREBASE_SIGNIN_URL, data=body, method="POST", headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.HTTPError as cause:
        raise SyncError(f"Firebase rejected the credentials for {email} ({cause.code})") from cause
    except (urllib.error.URLError, OSError) as cause:
        raise SyncError(f"Could not reach Firebase for {email}: {cause}") from cause

    token = payload.get("idToken")
    if not isinstance(token, str):
        raise SyncError(f"Firebase did not return an idToken for {email}")
    return token


# ------------------------------------------------------------------------ transfer


def download(email: str, token: str, google: bool) -> bytes:
    encoded = urllib.parse.quote(object_name(email), safe="")
    template = GOOGLE_MEDIA_URL if google else FIREBASE_MEDIA_URL
    url = template.format(bucket=BUCKET, name=encoded)
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as cause:
        if cause.code == 404:
            raise SyncError("no saved board in the bucket for this account") from cause
        raise SyncError(f"download failed with HTTP {cause.code}") from cause
    except (urllib.error.URLError, OSError) as cause:
        raise SyncError(f"download failed: {cause}") from cause


def upload(email: str, token: str, payload: bytes) -> None:
    """Create or replace the account's object.

    A POST with ``uploadType=media`` and an explicit ``name`` is the documented
    way to insert or overwrite object content through the JSON API.
    """
    encoded = urllib.parse.quote(object_name(email), safe="")
    url = GOOGLE_UPLOAD_URL.format(bucket=BUCKET, name=encoded)
    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            response.read()
    except urllib.error.HTTPError as cause:
        detail = cause.read().decode("utf-8", "replace")[:300]
        raise SyncError(f"upload failed with HTTP {cause.code}: {detail}") from cause
    except (urllib.error.URLError, OSError) as cause:
        raise SyncError(f"upload failed: {cause}") from cause


# ---------------------------------------------------------------------- reporting


def counts(board: dict) -> str:
    """A one line confirmation of what was captured."""
    state = board.get("state", {})
    bags = state.get("bags", [])
    items = state.get("items", [])
    unit = state.get("unit", "kg")

    total = 0.0
    for bag in bags:
        total += float(bag.get("tareWeightKg", 0)) + float(bag.get("accessoriesKg", 0))
    for item in items:
        if item.get("bagId"):
            total += float(item.get("weightKg", 0)) + float(item.get("accessoriesKg", 0))

    return (
        f"{len(bags)} bag(s), {len(items)} item(s), "
        f"{total:.2f} {unit} packed, saved {board.get('updatedAt')}"
    )


# --------------------------------------------------------------------------- main


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", help="only this account (must be allowlisted)")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="destination folder")
    parser.add_argument("--push", metavar="EMAIL", help="upload the saved copy back to the bucket")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="with --push, print what would be uploaded without writing anything",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Windows consoles default to a legacy code page, which cannot print the
    # non-ASCII product names people type into a packing list.
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")

    requested = args.email or args.push
    emails = list(ALLOWED_EMAILS)
    if requested:
        if requested.lower() not in ALLOWED_EMAILS:
            log(f"Refusing: {requested} is not allowlisted.")
            log(f"Allowed: {', '.join(ALLOWED_EMAILS)}")
            return 2
        emails = [requested.lower()]

    out_root = Path(args.out).expanduser()
    out_root.mkdir(parents=True, exist_ok=True)

    google_token = google_access_token()
    tokens: dict[str, str | None] = {}
    if google_token:
        log("Auth: Google application default credentials")
    else:
        log("Auth: no Google credentials, falling back to Firebase password from the environment")
    for email in emails:
        tokens[email] = google_token or firebase_id_token(email)

    missing = [email for email, token in tokens.items() if not token]
    if missing and not google_token:
        log("")
        log("Set BAGBUDDY_PASSWORD, or sign in with Google:")
        log("  gcloud auth application-default login")
        for email in missing:
            log(f"  missing credentials for {email}")

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    log(f"bagbuddy sync, {stamp}")
    failures = 0

    for email in emails:
        log("")
        log(f"=== {email}")
        token = tokens[email]
        if not token:
            log("  skipped: no credentials")
            failures += 1
            continue

        try:
            if args.push:
                source = out_root / folder_name(email) / "state.json"
                if not source.is_file():
                    raise SyncError(f"nothing to push, {source} does not exist")
                if args.dry_run:
                    log(f"  dry run: would upload {source} ({source.stat().st_size} bytes)")
                    log(f"        -> {BUCKET}/{object_name(email)}")
                    continue
                upload(email, token, source.read_bytes())
                log(f"  pushed {source} -> {BUCKET}/{object_name(email)}")
                continue

            raw = download(email, token, google_token is not None)
            board = json.loads(raw.decode("utf-8"))

            folder = out_root / folder_name(email)
            folder.mkdir(parents=True, exist_ok=True)
            target = folder / "state.json"
            target.write_text(
                json.dumps(board, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )

            log(f"  {counts(board)}")
            log(f"  saved to {target}")
        except (SyncError, json.JSONDecodeError, OSError) as cause:
            log(f"  failed: {cause}")
            failures += 1

    log("")
    log(f"done. {len(emails) - failures}/{len(emails)} account(s) synced into {out_root}")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SyncError as error:
        log(f"error: {error}")
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
