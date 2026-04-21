"""
Merge outputs from all data sources into public/data/dashboard.json.

Usage:
  python scripts/build_dashboard_json.py
"""

import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))

from fetch_slack import main as fetch_slack
from fetch_hubspot_snowflake import main as fetch_hubspot

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "dashboard.json")
AGENTS = ["Valentina", "Bassel", "Jessey", "Wies"]
TREND_WEEKS = 4


def load_existing() -> dict:
    try:
        with open(OUTPUT_PATH) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def append_trend(existing_trend: list, new_entry: dict, max_weeks: int) -> list:
    week_label = f"W{len(existing_trend) + 1}"
    updated = existing_trend + [{"week": week_label, **new_entry}]
    return updated[-max_weeks:]


def build_trend_entry(by_agent: list, metric_key: str) -> dict:
    return {a["name"]: a.get(metric_key, 0) for a in by_agent}


def main():
    print("=== Fetching Slack data ===")
    slack_data = fetch_slack()

    print("\n=== Fetching HubSpot data from Snowflake ===")
    hs_data = fetch_hubspot()

    existing = load_existing()

    slack_data["response_time_trend"] = append_trend(
        existing.get("slack", {}).get("response_time_trend", []),
        build_trend_entry(slack_data["by_agent"], "avg_response_time_min"),
        TREND_WEEKS,
    )
    hs_data["email_volume_trend"] = append_trend(
        existing.get("hubspot", {}).get("email_volume_trend", []),
        build_trend_entry(hs_data["by_agent"], "emails_sent"),
        TREND_WEEKS,
    )

    dashboard = {
        "meta":    {"updated_at": datetime.now(timezone.utc).isoformat()},
        "agents":  AGENTS,
        "slack":   slack_data,
        "hubspot": hs_data,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(dashboard, f, indent=2)

    print(f"\n✓ Dashboard data written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
