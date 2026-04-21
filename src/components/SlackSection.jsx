import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import MetricCard from './MetricCard.jsx'
import ChartTooltip from './ChartTooltip.jsx'

const AGENT_COLORS = {
  Valentina: 'var(--valentina)',
  Bassel:    'var(--bassel)',
  Jessey:    'var(--jessey)',
  Wies:      'var(--wies)',
}

const AGENT_HEX = {
  Valentina: '#ff6933',
  Bassel:    '#ccf822',
  Jessey:    '#97b9bf',
  Wies:      '#8ebf92',
}

const PIE_COLORS = ['#ff6933', '#ccf822', '#97b9bf', '#8ebf92', '#7a7876']

export default function SlackSection({ data, agentFilter }) {
  const slack = data?.slack
  if (!slack) return null

  const agents = agentFilter === 'All' ? data.agents : [agentFilter]
  const filtered = slack.by_agent.filter(a => agents.includes(a.name))

  const totalMessages = filtered.reduce((s, a) => s + a.messages_sent, 0)
  const avgResponse   = Math.round(filtered.reduce((s, a) => s + a.avg_response_time_min, 0) / filtered.length)
  const openThreads   = filtered.reduce((s, a) => s + a.open_threads, 0)
  const followUps     = filtered.reduce((s, a) => s + a.follow_ups_needed, 0)
  const timeSpent     = filtered.reduce((s, a) => s + a.time_spent_hours, 0).toFixed(1)

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(204,248,34,0.1)' }}>💬</div>
        <span className="section-title">Slack Communication</span>
      </div>

      <div className="grid-5" style={{ marginBottom: 14 }}>
        <MetricCard
          label="Messages Sent"
          value={totalMessages.toLocaleString()}
          accent="var(--neon)"
        />
        <MetricCard
          label="Avg Response Time"
          value={`${avgResponse}m`}
          sub="within business hours"
          accent="var(--neon)"
          deltaType={avgResponse <= 20 ? 'good' : 'warn'}
          delta={avgResponse <= 20 ? '≤ 20m target' : '> 20m target'}
        />
        <MetricCard
          label="Time Spent"
          value={`${timeSpent}h`}
          sub="total this period"
          accent="var(--neon)"
        />
        <MetricCard
          label="Open Threads"
          value={openThreads}
          sub="unanswered > 4h"
          accent="var(--neon)"
          deltaType={openThreads > 10 ? 'warn' : 'good'}
          delta={openThreads > 10 ? 'needs attention' : 'on track'}
        />
        <MetricCard
          label="Follow-ups Needed"
          value={followUps}
          sub="flagged to action"
          accent="var(--neon)"
          deltaType={followUps > 5 ? 'warn' : 'good'}
          delta={followUps > 5 ? 'review queue' : 'manageable'}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Daily Message Volume</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={slack.daily_activity} barSize={12} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              {agents.map(name => (
                <Bar key={name} dataKey={name} fill={AGENT_HEX[name]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Response Time Trend (min)</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={slack.response_time_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="m" />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              {agents.map(name => (
                <Line key={name} type="monotone" dataKey={name} stroke={AGENT_HEX[name]}
                  strokeWidth={2} dot={{ r: 3, fill: AGENT_HEX[name] }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Open Threads & Follow-ups by Agent</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={filtered}
              barSize={14} barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              <Bar dataKey="open_threads"     name="Open threads"  fill="#ff6933" radius={[3,3,0,0]} />
              <Bar dataKey="follow_ups_needed" name="Follow-ups"   fill="#ccf822" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Channel Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={slack.channel_breakdown}
                dataKey="messages"
                nameKey="channel"
                cx="42%"
                cy="50%"
                outerRadius={72}
                innerRadius={38}
                paddingAngle={3}
              >
                {slack.channel_breakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="custom-tooltip">
                      <div className="tt-label">{payload[0].name}</div>
                      <div className="tt-row">
                        <span className="tt-val">{payload[0].value} messages</span>
                      </div>
                    </div>
                  ) : null
                }
              />
              <Legend layout="vertical" align="right" verticalAlign="middle"
                wrapperStyle={{ fontSize: 11, fontFamily: 'inherit' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
