"""
Fetch Slack communication metrics for ISM team members.

Required env vars:
  SLACK_BOT_TOKEN  — Bot token with scopes: channels:history, channels:read,
                     users:read, search:messages, reactions:read
  SLACK_TEAM_ID    — (optional) workspace ID for filtering

Install: pip install slack-sdk python-dateutil
"""

import os
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

AGENTS = {
    "Valentina": None,  # will be resolved to Slack user ID
    "Bassel": None,
    "Jessey": None,
}

# Channels to track (display names without #)
TRACKED_CHANNELS = [
    "ism-team",
    "customer-success",
    "installations",
    "general",
]


def get_period_timestamps(period: str) -> tuple[float, float]:
    now = datetime.now(timezone.utc)
    if period == "this_week":
        start = now - timedelta(days=now.weekday())
    elif period == "last_week":
        start = now - timedelta(days=now.weekday() + 7)
        now = start + timedelta(days=7)
    elif period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0)
    else:
        start = now - timedelta(days=7)

    return start.replace(hour=0, minute=0, second=0).timestamp(), now.timestamp()


def resolve_user_ids(client: WebClient) -> dict:
    """Map display names to Slack user IDs."""
    ids = {}
    cursor = None
    while True:
        resp = client.users_list(cursor=cursor, limit=200)
        for member in resp["members"]:
            if member.get("deleted") or member.get("is_bot"):
                continue
            name = member.get("real_name", "") or member.get("display_name", "")
            for agent in AGENTS:
                if agent.lower() in name.lower():
                    ids[agent] = member["id"]
        cursor = resp.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return ids


def get_channel_id(client: WebClient, name: str) -> str | None:
    cursor = None
    while True:
        resp = client.conversations_list(cursor=cursor, limit=200, types="public_channel,private_channel")
        for ch in resp["channels"]:
            if ch["name"] == name:
                return ch["id"]
        cursor = resp.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return None


def fetch_channel_messages(client: WebClient, channel_id: str, oldest: float, latest: float) -> list:
    messages = []
    cursor = None
    while True:
        resp = client.conversations_history(
            channel=channel_id, oldest=str(oldest), latest=str(latest),
            limit=200, cursor=cursor
        )
        messages.extend(resp["messages"])
        cursor = resp.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break
    return messages


def calc_response_time(messages: list, user_id: str) -> float | None:
    """Estimate avg response time in minutes for a user in a list of messages."""
    times = []
    prev_ts = None
    for msg in sorted(messages, key=lambda m: float(m["ts"])):
        ts = float(msg["ts"])
        if msg.get("user") == user_id and prev_ts is not None:
            delta_min = (ts - prev_ts) / 60
            if 1 <= delta_min <= 480:  # only count responses within 8 hrs
                times.append(delta_min)
        if msg.get("user") != user_id:
            prev_ts = ts
    return round(sum(times) / len(times), 1) if times else None


def is_after_hours(ts: float) -> bool:
    dt = datetime.fromtimestamp(ts)
    return dt.hour < 8 or dt.hour >= 18 or dt.weekday() >= 5


def build_daily_activity(messages: list, user_ids: dict, oldest: float) -> list:
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    counts = {agent: defaultdict(int) for agent in user_ids}
    week_start = datetime.fromtimestamp(oldest)

    for msg in messages:
        ts = float(msg["ts"])
        dt = datetime.fromtimestamp(ts)
        day_idx = dt.weekday()
        if day_idx >= 5:
            continue
        for agent, uid in user_ids.items():
            if msg.get("user") == uid:
                counts[agent][day_idx] += 1

    return [
        {"day": days[i], **{agent: counts[agent][i] for agent in user_ids}}
        for i in range(5)
    ]


def main():
    token = os.environ["SLACK_BOT_TOKEN"]
    client = WebClient(token=token)

    oldest, latest = get_period_timestamps("this_week")

    print("Resolving user IDs...")
    user_ids = resolve_user_ids(client)
    print(f"  Found: {user_ids}")

    all_messages_by_channel = {}
    channel_breakdown = []
    all_messages = []

    for ch_name in TRACKED_CHANNELS:
        ch_id = get_channel_id(client, ch_name)
        if not ch_id:
            print(f"  Channel #{ch_name} not found, skipping")
            continue
        msgs = fetch_channel_messages(client, ch_id, oldest, latest)
        all_messages_by_channel[ch_name] = msgs
        all_messages.extend(msgs)
        channel_breakdown.append({"channel": f"#{ch_name}", "messages": len(msgs)})
        print(f"  #{ch_name}: {len(msgs)} messages")

    by_agent = []
    for agent, uid in user_ids.items():
        agent_msgs = [m for m in all_messages if m.get("user") == uid]
        threads = sum(1 for m in agent_msgs if m.get("reply_count", 0) > 0)
        after_hrs = sum(1 for m in agent_msgs if is_after_hours(float(m["ts"])))
        after_hrs_pct = round(after_hrs / len(agent_msgs) * 100) if agent_msgs else 0
        resp_time = calc_response_time(all_messages, uid) or 0

        by_agent.append({
            "name": agent,
            "messages_sent": len(agent_msgs),
            "avg_response_time_min": resp_time,
            "threads_started": threads,
            "after_hours_pct": after_hrs_pct,
            "reactions_given": 0,  # requires reactions:read scope per message
        })

    daily_activity = build_daily_activity(all_messages, user_ids, oldest)

    result = {
        "overview": {
            "total_messages": sum(a["messages_sent"] for a in by_agent),
            "avg_response_time_min": round(sum(a["avg_response_time_min"] for a in by_agent) / len(by_agent), 1),
            "active_channels": len(channel_breakdown),
            "threads_started": sum(a["threads_started"] for a in by_agent),
        },
        "by_agent": by_agent,
        "channel_breakdown": sorted(channel_breakdown, key=lambda x: -x["messages"]),
        "daily_activity": daily_activity,
        "response_time_trend": [],  # populated by combining multiple week runs
    }

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
