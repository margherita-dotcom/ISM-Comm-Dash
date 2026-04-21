import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
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

const PIE_COLORS = ['#ff6933', '#ccf822', '#97b9bf', '#8ebf92']

export default function CalendarSection({ data, agentFilter }) {
  const cal = data?.calendar
  if (!cal) return null

  const agents  = agentFilter === 'All' ? data.agents : [agentFilter]
  const filtered = cal.by_agent.filter(a => agents.includes(a.name))

  const totalHours    = filtered.reduce((s, a) => s + a.meeting_hours, 0).toFixed(1)
  const totalMeetings = filtered.reduce((s, a) => s + a.meetings, 0)
  const avgBackToBack = Math.round(filtered.reduce((s, a) => s + a.back_to_back_pct, 0) / filtered.length)
  const asyncRatio    = cal.overview.async_ratio_pct

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(151,185,191,0.12)' }}>📅</div>
        <span className="section-title">Meetings (Google Calendar)</span>
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <MetricCard label="Total Meetings"   value={totalMeetings}    accent="var(--ocean)" />
        <MetricCard label="Meeting Hours"    value={`${totalHours}h`} accent="var(--ocean)" />
        <MetricCard
          label="Async Ratio"
          value={`${asyncRatio}%`}
          sub="time spent async"
          accent="var(--ocean)"
          deltaType={asyncRatio >= 60 ? 'good' : 'warn'}
          delta={asyncRatio >= 60 ? 'healthy balance' : 'meeting-heavy'}
        />
        <MetricCard
          label="Back-to-Back Rate"
          value={`${avgBackToBack}%`}
          sub="avg across team"
          accent="var(--ocean)"
          deltaType={avgBackToBack > 25 ? 'warn' : 'good'}
          delta={avgBackToBack > 25 ? 'high cognitive load' : 'manageable'}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title">Daily Meeting Hours</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cal.daily_meeting_hours} barSize={12} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="h" />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              {agents.map(name => (
                <Bar key={name} dataKey={name} fill={AGENT_HEX[name]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Meeting Load Trend (h/week)</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={cal.load_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="h" />} />
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
          <div className="card-title">External vs Internal</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={filtered} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
              <Bar dataKey="external_meetings" name="External" fill="#97b9cf" radius={[3,3,0,0]} />
              <Bar dataKey="internal_meetings" name="Internal" fill="#3a4a5a" radius={[3,3,0,0]} />
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
                cx="42%"
                cy="50%"
                outerRadius={72}
                innerRadius={38}
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
                      <div className="tt-label">{payload[0].name}</div>
                      <div className="tt-row">
                        <span className="tt-val">{payload[0].value} meetings</span>
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
