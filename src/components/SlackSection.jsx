import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import MetricCard from './MetricCard.jsx'
import ChartTooltip from './ChartTooltip.jsx'

const AGENT_COLORS = {
  Valentina: 'var(--valentina)',
  Bassel: 'var(--bassel)',
  Jessey: 'var(--jessey)',
}

const PIE_COLORS = ['#6c7fff', '#4ade80', '#fb923c', '#f472b6', '#94a3b8']

export default function SlackSection({ data, agentFilter }) {
  const slack = data?.slack
  if (!slack) return null

  const agents = agentFilter === 'All'
    ? data.agents
    : [agentFilter]

  const overviewAgents = agentFilter === 'All'
    ? slack.by_agent
    : slack.by_agent.filter(a => a.name === agentFilter)

  const totalMessages = overviewAgents.reduce((s, a) => s + a.messages_sent, 0)
  const avgResponse = Math.round(overviewAgents.reduce((s, a) => s + a.avg_response_time_min, 0) / overviewAgents.length)
  const totalThreads = overviewAgents.reduce((s, a) => s + a.threads_started, 0)
  const avgAfterHours = Math.round(overviewAgents.reduce((s, a) => s + a.after_hours_pct, 0) / overviewAgents.length)

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(108, 127, 255, 0.15)' }}>💬</div>
        <span className="section-title">Slack Communication</span>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <MetricCard label="Messages Sent" value={totalMessages.toLocaleString()} accent="var(--accent)" />
        <MetricCard label="Avg Response Time" value={`${avgResponse}m`} sub="within business hours" accent="var(--accent)" />
        <MetricCard label="Threads Started" value={totalThreads} accent="var(--accent)" />
        <MetricCard
          label="After-Hours Activity"
          value={`${avgAfterHours}%`}
          sub="of messages"
          deltaDir={avgAfterHours > 15 ? 'down' : 'neutral'}
          delta={avgAfterHours > 15 ? 'above healthy threshold' : 'within range'}
          accent="var(--accent)"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Daily Message Volume</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slack.daily_activity} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {agents.map(name => (
                <Bar key={name} dataKey={name} fill={AGENT_COLORS[name]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Response Time Trend (min)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={slack.response_time_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="m" />} />
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
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Per-Agent Breakdown</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={slack.by_agent.filter(a => agents.includes(a.name))}
              layout="vertical"
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="messages_sent" name="Messages" radius={[0, 3, 3, 0]}>
                {slack.by_agent.filter(a => agents.includes(a.name)).map(a => (
                  <Cell key={a.name} fill={AGENT_COLORS[a.name]} />
                ))}
              </Bar>
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
                cx="45%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
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
                      <div className="label">{payload[0].name}</div>
                      <div className="entry">
                        <span style={{ fontWeight: 600 }}>{payload[0].value} messages</span>
                      </div>
                    </div>
                  ) : null
                }
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
