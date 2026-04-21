"""
Fetch open action items from Gemini meeting notes in Google Drive.

Gemini saves stand-up summaries as Google Docs in Drive. This script:
  1. Finds the most recent doc whose title matches the standup pattern
  2. Reads the document content via the Docs API
  3. Extracts action items (lines starting with "[ ]", "- [ ]", or "Action:")
  4. Returns structured JSON

Required env vars:
  GOOGLE_SERVICE_ACCOUNT_JSON  — service account with Drive + Docs read access
  STANDUP_DOC_FOLDER_ID        — (optional) Drive folder ID to search in
  STANDUP_DOC_TITLE_PATTERN    — (optional) title keyword, default "stand-up" or "standup"

Install: pip install google-auth google-api-python-client
"""

import os
import json
import re
from datetime import datetime, timezone

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]

TITLE_PATTERN = os.environ.get("STANDUP_DOC_TITLE_PATTERN", "Day start ISM")
FOLDER_ID     = os.environ.get("STANDUP_DOC_FOLDER_ID", "")
AGENTS        = ["Valentina", "Bassel", "Jessey", "Wies"]


def get_services():
    sa_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(sa_info, scopes=SCOPES)
    drive = build("drive", "v3", credentials=creds)
    docs  = build("docs",  "v1", credentials=creds)
    return drive, docs


def find_latest_standup_doc(drive) -> dict | None:
    query = f"mimeType='application/vnd.google-apps.document' and name contains '{TITLE_PATTERN}' and trashed=false"
    if FOLDER_ID:
        query += f" and '{FOLDER_ID}' in parents"

    resp = drive.files().list(
        q=query,
        orderBy="createdTime desc",
        pageSize=1,
        fields="files(id, name, createdTime)",
    ).execute()

    files = resp.get("files", [])
    return files[0] if files else None


def extract_text(doc_content: dict) -> list[str]:
    lines = []
    for elem in doc_content.get("body", {}).get("content", []):
        para = elem.get("paragraph")
        if not para:
            continue
        text = "".join(
            e.get("textRun", {}).get("content", "")
            for e in para.get("elements", [])
        ).strip()
        if text:
            lines.append(text)
    return lines


def parse_action_items(lines: list[str], doc_name: str, doc_date: str) -> list[dict]:
    """
    Recognises lines like:
      - [ ] Action item text — Owner
      - [x] Done item — Owner
      Action: Do the thing (Owner)
      @Owner: do the thing
    """
    items = []
    item_id = 1

    checkbox_re    = re.compile(r'^\s*-?\s*\[( |x|X)\]\s*(.+)')
    action_re      = re.compile(r'(?i)^action[:\s]+(.+)')
    at_owner_re    = re.compile(r'@(\w+):\s*(.+)')

    week_label = _week_label(doc_date)

    for line in lines:
        owner, text, done = None, None, False

        m = checkbox_re.match(line)
        if m:
            done = m.group(1).lower() == 'x'
            raw  = m.group(2).strip()
            owner, text = _extract_owner(raw)

        elif action_re.match(line):
            raw = action_re.match(line).group(1).strip()
            owner, text = _extract_owner(raw)

        elif at_owner_re.match(line):
            m2 = at_owner_re.match(line)
            raw_owner = m2.group(1).strip()
            owner = _match_agent(raw_owner)
            text  = m2.group(2).strip()

        if text:
            items.append({
                "id":      item_id,
                "item":    text,
                "owner":   owner or "Unassigned",
                "status":  "done" if done else "open",
                "created": doc_date,
                "due":     _infer_due(doc_date),
                "week":    week_label,
            })
            item_id += 1

    return items


def _extract_owner(text: str) -> tuple[str | None, str]:
    """Try to find an agent name at the end of a line after '—', '-', or '('."""
    for sep in [" — ", " - ", " (", "@"]:
        if sep in text:
            parts = text.rsplit(sep, 1)
            candidate = parts[1].rstrip(")").strip()
            agent = _match_agent(candidate)
            if agent:
                return agent, parts[0].strip()
    return None, text.strip()


def _match_agent(name: str) -> str | None:
    for agent in AGENTS:
        if agent.lower() in name.lower():
            return agent
    return None


def _infer_due(created: str) -> str:
    """Default due = 2 days after creation, skipping weekends."""
    from datetime import timedelta
    d = datetime.fromisoformat(created)
    added = 0
    while added < 2:
        d += timedelta(days=1)
        if d.weekday() < 5:
            added += 1
    return d.strftime("%Y-%m-%d")


def _week_label(date_str: str) -> str:
    d = datetime.fromisoformat(date_str)
    return f"W{d.isocalendar().week}"


def main():
    drive, docs = get_services()

    print("Searching for latest stand-up doc...")
    doc_file = find_latest_standup_doc(drive)

    if not doc_file:
        print("  No stand-up doc found. Check STANDUP_DOC_TITLE_PATTERN and STANDUP_DOC_FOLDER_ID.")
        return {"last_meeting": None, "meeting_title": "Not found", "action_items": []}

    print(f"  Found: {doc_file['name']} ({doc_file['id']})")

    doc_content = docs.documents().get(documentId=doc_file["id"]).execute()
    lines       = extract_text(doc_content)
    doc_date    = doc_file["createdTime"][:10]
    action_items = parse_action_items(lines, doc_file["name"], doc_date)

    print(f"  Extracted {len(action_items)} action items")

    result = {
        "last_meeting":  doc_file["createdTime"],
        "meeting_title": doc_file["name"],
        "action_items":  action_items,
    }

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
