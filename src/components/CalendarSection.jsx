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

const PIE_COLORS = ['#6c7fff', '#4ade80', '#fb923c', '#f472b6']

export default function CalendarSection({ data, agentFilter }) {
  const cal = data?.calendar
  if (!cal) return null

  const agents = agentFilter === 'All' ? data.agents : [agentFilter]

  const filteredAgents = agentFilter === 'All'
    ? cal.by_agent
    : cal.by_agent.filter(a => a.name === agentFilter)

  const totalHours = filteredAgents.reduce((s, a) => s + a.meeting_hours, 0).toFixed(1)
  const totalMeetings = filteredAgents.reduce((s, a) => s + a.meetings, 0)
  const avgBackToBack = Math.round(filteredAgents.reduce((s, a) => s + a.back_to_back_pct, 0) / filteredAgents.length)
  const asyncRatio = cal.overview.async_ratio_pct

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(74, 222, 128, 0.15)' }}>📅</div>
        <span className="section-title">Meeting Load (Google Calendar)</span>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <MetricCard label="Total Meetings" value={totalMeetings} accent="var(--accent-2)" />
        <MetricCard label="Meeting Hours" value={`${totalHours}h`} accent="var(--accent-2)" />
        <MetricCard
          label="Async Ratio"
          value={`${asyncRatio}%`}
          sub="time spent async"
          deltaDir={asyncRatio >= 60 ? 'up' : 'down'}
          delta={asyncRatio >= 60 ? 'healthy balance' : 'too meeting-heavy'}
          accent="var(--accent-2)"
        />
        <MetricCard
          label="Back-to-Back Rate"
          value={`${avgBackToBack}%`}
          sub="avg across team"
          deltaDir={avgBackToBack > 25 ? 'down' : 'neutral'}
          delta={avgBackToBack > 25 ? 'high cognitive load' : 'manageable'}
          accent="var(--accent-2)"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Daily Meeting Hours</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cal.daily_meeting_hours} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="h" />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {agents.map(name => (
                <Bar key={name} dataKey={name} fill={AGENT_COLORS[name]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Meeting Load Trend (hours/week)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cal.load_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="h" />} />
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
          <div className="card-title">External vs Internal Meetings</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={cal.by_agent.filter(a => agents.includes(a.name))}
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="external_meetings" name="External" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="internal_meetings" name="Internal" fill="var(--surface-2)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Meeting Type Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={cal.meeting_type_distribution}
                dataKey="count"
                nameKey="type"
                cx="45%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
                paddingAngle={3}
              >
                {cal.meeting_type_distribution.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="custom-tooltip">
                      <div className="label">{payload[0].name}</div>
                      <div className="entry">
                        <span style={{ fontWeight: 600 }}>{payload[0].value} meetings</span>
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
