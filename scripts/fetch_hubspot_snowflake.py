"""
Fetch HubSpot communication data from Snowflake.

Required env vars:
  SNOWFLAKE_ACCOUNT   — e.g. xy12345.us-east-1
  SNOWFLAKE_USER      — service account username
  SNOWFLAKE_PASSWORD  — service account password  (or use key-pair auth)
  SNOWFLAKE_DATABASE  — database containing HubSpot data
  SNOWFLAKE_SCHEMA    — schema name (e.g. HUBSPOT or FIVETRAN_HUBSPOT)
  SNOWFLAKE_WAREHOUSE — compute warehouse to use
  SNOWFLAKE_ROLE      — (optional) role override

Assumes Fivetran HubSpot connector table names. Adjust table/column names
to match your actual Snowflake schema.

Install: pip install snowflake-connector-python
"""

import os
import json
from datetime import datetime, timedelta, timezone

import snowflake.connector

AGENTS = ["Valentina", "Bassel", "Jessey"]

# Map agent name to HubSpot owner ID — populate after first run or hardcode
OWNER_IDS: dict[str, int] = {
    "Valentina": 0,
    "Bassel": 0,
    "Jessey": 0,
}


def get_connection():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        database=os.environ["SNOWFLAKE_DATABASE"],
        schema=os.environ["SNOWFLAKE_SCHEMA"],
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
        role=os.environ.get("SNOWFLAKE_ROLE", ""),
    )


def get_week_bounds() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def resolve_owner_ids(cur) -> dict[str, int]:
    """
    Fetch owner IDs from the owners table.
    Adjust the table name and columns to match your schema.
    """
    cur.execute("""
        SELECT id, first_name, last_name
        FROM engagements_owners
        WHERE archived = FALSE
    """)
    mapping = {}
    for row in cur.fetchall():
        oid, first, last = row
        full = f"{first} {last}".strip()
        for agent in AGENTS:
            if agent.lower() in full.lower():
                mapping[agent] = oid
    return mapping


def fetch_email_metrics(cur, owner_id: int, date_from: str, date_to: str) -> dict:
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE direction = 'OUTBOUND') AS emails_sent,
            COUNT(*) FILTER (WHERE direction = 'INBOUND')  AS emails_received,
            AVG(
                DATEDIFF('minute', created_at, updated_at) / 60.0
            ) FILTER (WHERE direction = 'INBOUND' AND status = 'REPLIED') AS avg_response_hrs
        FROM engagements_emails
        WHERE owner_id = %(owner_id)s
          AND created_at >= %(from)s
          AND created_at <  %(to)s
    """, {"owner_id": owner_id, "from": date_from, "to": date_to})
    row = cur.fetchone()
    return {
        "emails_sent": int(row[0] or 0),
        "emails_received": int(row[1] or 0),
        "avg_response_time_hrs": round(float(row[2] or 0), 1),
    }


def fetch_deal_activity(cur, owner_id: int, date_from: str, date_to: str) -> dict:
    cur.execute("""
        SELECT COUNT(DISTINCT deal_id)
        FROM engagements
        WHERE owner_id = %(owner_id)s
          AND activity_date >= %(from)s
          AND activity_date <  %(to)s
    """, {"owner_id": owner_id, "from": date_from, "to": date_to})
    deals_touched = int((cur.fetchone() or [0])[0])

    cur.execute("""
        SELECT COUNT(*) FROM engagements_calls
        WHERE owner_id = %(owner_id)s
          AND created_at >= %(from)s
          AND created_at <  %(to)s
    """, {"owner_id": owner_id, "from": date_from, "to": date_to})
    calls_logged = int((cur.fetchone() or [0])[0])

    cur.execute("""
        SELECT COUNT(*) FROM engagements_tasks
        WHERE owner_id = %(owner_id)s
          AND completed_at >= %(from)s
          AND completed_at <  %(to)s
          AND status = 'COMPLETED'
    """, {"owner_id": owner_id, "from": date_from, "to": date_to})
    tasks_completed = int((cur.fetchone() or [0])[0])

    return {
        "deals_touched": deals_touched,
        "calls_logged": calls_logged,
        "tasks_completed": tasks_completed,
    }


def fetch_stale_deals(cur, owner_ids: dict[str, int]) -> list:
    owner_list = ", ".join(str(v) for v in owner_ids.values() if v)
    if not owner_list:
        return []

    cur.execute(f"""
        SELECT
            d.name,
            e.owner_id,
            DATEDIFF('day', MAX(e.activity_date), CURRENT_DATE()) AS days_since_contact
        FROM deals d
        JOIN engagements e ON d.id = e.deal_id
        WHERE d.pipeline_stage NOT IN ('closedwon', 'closedlost')
          AND e.owner_id IN ({owner_list})
        GROUP BY d.name, e.owner_id
        HAVING days_since_contact >= 7
        ORDER BY days_since_contact DESC
        LIMIT 10
    """)

    id_to_name = {v: k for k, v in owner_ids.items()}
    return [
        {
            "deal": row[0],
            "owner": id_to_name.get(row[1], str(row[1])),
            "last_contact_days": int(row[2]),
        }
        for row in cur.fetchall()
    ]


def main():
    date_from, date_to = get_week_bounds()
    conn = get_connection()
    cur = conn.cursor()

    print("Resolving HubSpot owner IDs from Snowflake...")
    owner_ids = resolve_owner_ids(cur)
    print(f"  Found: {owner_ids}")

    by_agent = []
    for agent in AGENTS:
        oid = owner_ids.get(agent, OWNER_IDS.get(agent))
        if not oid:
            print(f"  Skipping {agent}: owner ID not found")
            continue

        email_m = fetch_email_metrics(cur, oid, date_from, date_to)
        deal_m = fetch_deal_activity(cur, oid, date_from, date_to)
        by_agent.append({"name": agent, **email_m, **deal_m})

    stale = fetch_stale_deals(cur, {a["name"]: owner_ids.get(a["name"]) for a in by_agent if owner_ids.get(a["name"])})

    result = {
        "overview": {
            "emails_sent": sum(a["emails_sent"] for a in by_agent),
            "avg_response_time_hrs": round(
                sum(a["avg_response_time_hrs"] for a in by_agent) / len(by_agent), 1
            ) if by_agent else 0,
            "active_deals_with_activity": sum(a["deals_touched"] for a in by_agent),
            "stale_deals": len(stale),
        },
        "by_agent": by_agent,
        "email_volume_trend": [],  # populated by combining multiple week runs
        "deal_activity_breakdown": [
            {"name": a["name"], "calls": a["calls_logged"], "emails": a["emails_sent"], "tasks": a["tasks_completed"]}
            for a in by_agent
        ],
        "stale_deals": stale,
    }

    cur.close()
    conn.close()

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
