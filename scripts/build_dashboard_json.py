"""
Merge outputs from all data sources into public/data/dashboard.json.
Run this after fetch_slack, fetch_calendar, and fetch_hubspot_snowflake.

Usage:
  python scripts/build_dashboard_json.py

Or source the individual fetchers and call their main() directly.
"""

import json
import os
import sys
from datetime import datetime, timezone

# Add scripts dir to path so we can import siblings
sys.path.insert(0, os.path.dirname(__file__))

from fetch_slack import main as fetch_slack
from fetch_calendar import main as fetch_calendar
from fetch_hubspot_snowflake import main as fetch_hubspot

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "dashboard.json")
AGENTS = ["Valentina", "Bassel", "Jessey"]

# How many weeks of trend data to keep
TREND_WEEKS = 4


def load_existing() -> dict:
    try:
        with open(OUTPUT_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def append_trend(existing_trend: list, new_entry: dict, key: str, max_weeks: int) -> list:
    """Append a new weekly data point to a trend series, keeping last N weeks."""
    week_label = f"W{len(existing_trend) + 1}"
    new_entry_labeled = {"week": week_label, **new_entry}
    updated = existing_trend + [new_entry_labeled]
    return updated[-max_weeks:]


def build_trend_entry(by_agent: list, metric_key: str) -> dict:
    return {a["name"]: a.get(metric_key, 0) for a in by_agent}


def main():
    print("=== Fetching Slack data ===")
    slack_data = fetch_slack()

    print("\n=== Fetching Google Calendar data ===")
    cal_data = fetch_calendar()

    print("\n=== Fetching HubSpot data from Snowflake ===")
    hs_data = fetch_hubspot()

    existing = load_existing()

    # Build trend series by appending to what we already have
    slack_trend = append_trend(
        existing.get("slack", {}).get("response_time_trend", []),
        build_trend_entry(slack_data["by_agent"], "avg_response_time_min"),
        "avg_response_time_min",
        TREND_WEEKS,
    )
    cal_trend = append_trend(
        existing.get("calendar", {}).get("load_trend", []),
        build_trend_entry(cal_data["by_agent"], "meeting_hours"),
        "meeting_hours",
        TREND_WEEKS,
    )
    hs_trend = append_trend(
        existing.get("hubspot", {}).get("email_volume_trend", []),
        build_trend_entry(hs_data["by_agent"], "emails_sent"),
        "emails_sent",
        TREND_WEEKS,
    )

    slack_data["response_time_trend"] = slack_trend
    cal_data["load_trend"] = cal_trend
    hs_data["email_volume_trend"] = hs_trend

    dashboard = {
        "meta": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        "agents": AGENTS,
        "slack": slack_data,
        "calendar": cal_data,
        "hubspot": hs_data,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(dashboard, f, indent=2)

    print(f"\n✓ Dashboard data written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
