import React from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import MetricCard from './MetricCard.jsx'
import ChartTooltip from './ChartTooltip.jsx'

const AGENT_HEX = {
  Valentina: '#ff6933',
  Bassel:    '#ccf822',
  Jessey:    '#97b9bf',
  Wies:      '#8ebf92',
}

function dueBadge(days) {
  if (days < 0)  return <span className="badge badge-overdue">Overdue {Math.abs(days)}d</span>
  if (days === 0) return <span className="badge badge-today">Today</span>
  return <span className="badge badge-upcoming">In {days}d</span>
}

export default function HubspotSection({ data, agentFilter }) {
  const hs = data?.hubspot
  if (!hs) return null

  const agents = agentFilter === 'All' ? data.agents : [agentFilter]
  const filtered = hs.by_agent.filter(a => agents.includes(a.name))

  const totalEmails    = filtered.reduce((s, a) => s + a.emails_sent, 0)
  const avgAnswerRate  = Math.round(filtered.reduce((s, a) => s + a.answer_rate_pct, 0) / filtered.length)
  const avgLatency     = (filtered.reduce((s, a) => s + a.avg_latency_hrs, 0) / filtered.length).toFixed(1)
  const totalActivity  = filtered.reduce((s, a) => s + a.activity_count, 0)
  const openPoints     = filtered.reduce((s, a) => s + a.open_points, 0)
  const followUpCount  = (agentFilter === 'All'
    ? hs.customers_to_follow_up
    : hs.customers_to_follow_up.filter(c => c.owner === agentFilter)
  ).length

  const followUpList = agentFilter === 'All'
    ? hs.customers_to_follow_up
    : hs.customers_to_follow_up.filter(c => c.owner === agentFilter)

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(255,105,51,0.12)' }}>🤝</div>
        <span className="section-title">HubSpot Activity</span>
      </div>

      <div className="grid-5" style={{ marginBottom: 14 }}>
        <MetricCard
          label="Emails Sent"
          value={totalEmails}
          accent="var(--pumpkin)"
        />
        <MetricCard
          label="Answer Rate"
          value={`${avgAnswerRate}%`}
          sub="of inbound emails"
          accent="var(--pumpkin)"
          deltaType={avgAnswerRate >= 75 ? 'good' : avgAnswerRate >= 60 ? 'warn' : 'bad'}
          delta={avgAnswerRate >= 75 ? 'above target' : 'below target'}
        />
        <MetricCard
          label="Avg Latency"
          value={`${avgLatency}h`}
          sub="email response time"
          accent="var(--pumpkin)"
          deltaType={parseFloat(avgLatency) <= 4 ? 'good' : 'warn'}
          delta={parseFloat(avgLatency) <= 4 ? '≤ 4h target' : '> 4h target'}
        />
        <MetricCard
          label="Total Activity"
          value={totalActivity}
          sub="calls + emails + tasks"
          accent="var(--pumpkin)"
        />
        <MetricCard
          label="Open Points"
          value={openPoints}
          sub="unresolved items"
          accent="var(--pumpkin)"
          deltaType={openPoints > 15 ? 'warn' : 'good'}
          delta={openPoints > 15 ? 'high backlog' : 'manageable'}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Email Volume Trend</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={hs.email_volume_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              {agents.map(name => (
                <Line key={name} type="monotone" dataKey={name} stroke={AGENT_HEX[name]}
                  strokeWidth={2} dot={{ r: 3, fill: AGENT_HEX[name] }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Activity Breakdown by Agent</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={hs.deal_activity_breakdown.filter(a => agents.includes(a.name))} barSize={12} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              <Bar dataKey="emails" name="Emails" fill="#ff6933" radius={[3,3,0,0]} />
              <Bar dataKey="calls"  name="Calls"  fill="#97b9bf" radius={[3,3,0,0]} />
              <Bar dataKey="tasks"  name="Tasks"  fill="#ccf822" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Answer Rate & Latency by Agent</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filtered} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rate" orientation="left"  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} unit="%" />
              <YAxis yAxisId="hrs"  orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              <Bar yAxisId="rate" dataKey="answer_rate_pct"   name="Answer rate (%)"  fill="#ccf822" radius={[3,3,0,0]} />
              <Bar yAxisId="hrs"  dataKey="avg_latency_hrs"   name="Latency (h)"      fill="#ff6933" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            Customers to Follow Up
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--pumpkin)', fontWeight: 600 }}>
              {followUpCount}
            </span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Owner</th>
                  <th>Reason</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {followUpList.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{c.customer}</td>
                    <td>
                      <span className="agent-dot" style={{ background: AGENT_HEX[c.owner] }} />
                      {c.owner}
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{c.reason}</td>
                    <td>{dueBadge(c.due_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
