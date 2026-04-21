import React from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import MetricCard from './MetricCard.jsx'
import ChartTooltip from './ChartTooltip.jsx'

const AGENT_COLORS = {
  Valentina: 'var(--valentina)',
  Bassel: 'var(--bassel)',
  Jessey: 'var(--jessey)',
}

export default function HubspotSection({ data, agentFilter }) {
  const hs = data?.hubspot
  if (!hs) return null

  const agents = agentFilter === 'All' ? data.agents : [agentFilter]

  const filteredAgents = agentFilter === 'All'
    ? hs.by_agent
    : hs.by_agent.filter(a => a.name === agentFilter)

  const totalEmails = filteredAgents.reduce((s, a) => s + a.emails_sent, 0)
  const avgResponseHrs = (filteredAgents.reduce((s, a) => s + a.avg_response_time_hrs, 0) / filteredAgents.length).toFixed(1)
  const dealsTouched = filteredAgents.reduce((s, a) => s + a.deals_touched, 0)
  const staleCount = hs.stale_deals.filter(d => agentFilter === 'All' || d.owner === agentFilter).length

  const staleDealList = agentFilter === 'All'
    ? hs.stale_deals
    : hs.stale_deals.filter(d => d.owner === agentFilter)

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(251, 146, 60, 0.15)' }}>🤝</div>
        <span className="section-title">HubSpot Activity (via Snowflake)</span>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <MetricCard label="Emails Sent" value={totalEmails} accent="var(--accent-3)" />
        <MetricCard label="Avg Email Response" value={`${avgResponseHrs}h`} accent="var(--accent-3)" />
        <MetricCard label="Deals Touched" value={dealsTouched} accent="var(--accent-3)" />
        <MetricCard
          label="Stale Deals"
          value={staleCount}
          sub="no contact > 7 days"
          deltaDir={staleCount > 3 ? 'down' : 'neutral'}
          delta={staleCount > 3 ? 'needs attention' : 'under control'}
          accent="var(--accent-3)"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Email Volume Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hs.email_volume_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {agents.map(name => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={AGENT_COLORS[name]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: AGENT_COLORS[name] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Activity Breakdown by Agent</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={hs.deal_activity_breakdown.filter(a => agents.includes(a.name))}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="emails" name="Emails" fill="var(--accent-3)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="calls" name="Calls" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="tasks" name="Tasks" fill="var(--accent-2)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {staleDealList.length > 0 && (
        <div className="card">
          <div className="card-title">Stale Deals — No Contact in 7+ Days</div>
          <table className="stale-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Owner</th>
                <th>Last Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staleDealList.map((deal, i) => (
                <tr key={i}>
                  <td>{deal.deal}</td>
                  <td>
                    <span className="agent-dot" style={{ background: AGENT_COLORS[deal.owner] }} />
                    {deal.owner}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{deal.last_contact_days}d ago</td>
                  <td>
                    <span className={`badge ${deal.last_contact_days >= 12 ? 'badge-danger' : deal.last_contact_days >= 9 ? 'badge-warning' : 'badge-warning'}`}>
                      {deal.last_contact_days >= 12 ? 'Urgent' : 'Follow up'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
