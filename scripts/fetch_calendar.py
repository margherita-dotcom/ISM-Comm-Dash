"""
Fetch Google Calendar meeting data for ISM team members.

Required env vars:
  GOOGLE_SERVICE_ACCOUNT_JSON  — JSON string of service account credentials
                                  (must have domain-wide delegation enabled)
  GOOGLE_DOMAIN                 — e.g. quatt.io

Team members' Google accounts are resolved by first name match against the domain.
Each account must grant the service account delegated access.

Install: pip install google-auth google-api-python-client
"""

import os
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

AGENT_EMAILS = {
    "Valentina": os.environ.get("CAL_EMAIL_VALENTINA", ""),
    "Bassel": os.environ.get("CAL_EMAIL_BASSEL", ""),
    "Jessey": os.environ.get("CAL_EMAIL_JESSEY", ""),
}

INTERNAL_DOMAIN = os.environ.get("GOOGLE_DOMAIN", "quatt.io")


def get_credentials(subject_email: str):
    sa_info = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(
        sa_info,
        scopes=SCOPES,
        subject=subject_email,
    )
    return creds


def get_period(period="this_week") -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    if period == "this_week":
        start = now - timedelta(days=now.weekday())
    else:
        start = now - timedelta(days=7)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start.isoformat(), end.isoformat()


def is_external(event: dict, domain: str) -> bool:
    attendees = event.get("attendees", [])
    return any(
        not a.get("email", "").endswith(f"@{domain}")
        for a in attendees
        if not a.get("self")
    )


def is_back_to_back(events: list) -> int:
    """Count events that start within 5 minutes of the previous one ending."""
    count = 0
    sorted_events = sorted(events, key=lambda e: e.get("start", {}).get("dateTime", ""))
    for i in range(1, len(sorted_events)):
        prev_end = sorted_events[i - 1].get("end", {}).get("dateTime")
        curr_start = sorted_events[i].get("start", {}).get("dateTime")
        if prev_end and curr_start:
            gap = (datetime.fromisoformat(curr_start) - datetime.fromisoformat(prev_end)).total_seconds()
            if 0 <= gap <= 300:
                count += 1
    return count


def fetch_agent_events(email: str, time_min: str, time_max: str) -> list:
    creds = get_credentials(email)
    service = build("calendar", "v3", credentials=creds)
    events = []
    page_token = None
    while True:
        resp = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime",
            pageToken=page_token,
            maxResults=250,
        ).execute()
        events.extend(resp.get("items", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    # Filter to accepted meetings with at least 2 attendees
    return [
        e for e in events
        if e.get("status") != "cancelled"
        and len(e.get("attendees", [])) >= 2
        and any(a.get("self") and a.get("responseStatus") == "accepted" for a in e.get("attendees", []))
    ]


def event_duration_hours(event: dict) -> float:
    start = event.get("start", {}).get("dateTime")
    end = event.get("end", {}).get("dateTime")
    if not start or not end:
        return 0.0
    delta = datetime.fromisoformat(end) - datetime.fromisoformat(start)
    return round(delta.total_seconds() / 3600, 2)


def build_daily_hours(events: list) -> dict:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    counts = defaultdict(float)
    for e in events:
        dt_str = e.get("start", {}).get("dateTime")
        if not dt_str:
            continue
        dt = datetime.fromisoformat(dt_str)
        if dt.weekday() < 5:
            counts[dt.weekday()] += event_duration_hours(e)
    return {days[i]: round(counts[i], 1) for i in range(5)}


def classify_meeting(event: dict) -> str:
    summary = (event.get("summary") or "").lower()
    if any(k in summary for k in ["install", "installation"]):
        return "Installation review"
    if any(k in summary for k in ["check", "customer", "client"]):
        return "Customer check-in"
    if any(k in summary for k in ["train", "onboard"]):
        return "Training"
    return "Internal sync"


def main():
    time_min, time_max = get_period("this_week")
    by_agent = []
    all_daily = []
    type_counts = defaultdict(int)

    for agent, email in AGENT_EMAILS.items():
        if not email:
            print(f"  Skipping {agent}: no email configured")
            continue

        print(f"  Fetching calendar for {agent} ({email})...")
        events = fetch_agent_events(email, time_min, time_max)

        total_hours = sum(event_duration_hours(e) for e in events)
        external = sum(1 for e in events if is_external(e, INTERNAL_DOMAIN))
        internal = len(events) - external
        b2b = is_back_to_back(events)
        b2b_pct = round(b2b / len(events) * 100) if events else 0
        avg_dur = round(total_hours / len(events) * 60) if events else 0

        for e in events:
            type_counts[classify_meeting(e)] += 1

        daily = build_daily_hours(events)
        all_daily.append({"name": agent, "daily": daily})

        by_agent.append({
            "name": agent,
            "meetings": len(events),
            "meeting_hours": round(total_hours, 1),
            "external_meetings": external,
            "internal_meetings": internal,
            "avg_meeting_duration_min": avg_dur,
            "back_to_back_pct": b2b_pct,
        })

    day_keys = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    daily_meeting_hours = [
        {"day": d, **{a["name"]: a["daily"].get(d, 0) for a in all_daily}}
        for d in day_keys
    ]

    total_meetings = sum(a["meetings"] for a in by_agent)
    total_hours = sum(a["meeting_hours"] for a in by_agent)
    work_hours_per_person = 40
    total_work_hours = len(by_agent) * work_hours_per_person
    async_ratio = max(0, round((1 - total_hours / total_work_hours) * 100)) if total_work_hours else 0

    result = {
        "overview": {
            "total_meetings": total_meetings,
            "total_meeting_hours": round(total_hours, 1),
            "avg_meetings_per_person": round(total_meetings / len(by_agent), 1) if by_agent else 0,
            "async_ratio_pct": async_ratio,
        },
        "by_agent": by_agent,
        "meeting_type_distribution": [
            {"type": t, "count": c} for t, c in type_counts.items()
        ],
        "daily_meeting_hours": daily_meeting_hours,
        "load_trend": [],  # populated by combining multiple week runs
    }

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
