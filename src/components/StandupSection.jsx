import React, { useState } from 'react'
import MetricCard from './MetricCard.jsx'

const AGENT_HEX = {
  Valentina: '#ff6933',
  Bassel:    '#ccf822',
  Jessey:    '#97b9bf',
  Wies:      '#8ebf92',
}

const STATUS_CONFIG = {
  open:        { label: 'Open',        bg: 'rgba(199,34,35,0.12)',        color: '#c72223' },
  in_progress: { label: 'In progress', bg: 'rgba(255,105,51,0.12)',       color: '#ff6933' },
  done:        { label: 'Done',        bg: 'rgba(204,248,34,0.10)',       color: '#ccf822' },
}

function isOverdue(dueDate, status) {
  if (status === 'done') return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function StandupSection({ data, agentFilter }) {
  const standup = data?.standup
  if (!standup) return null

  const [statusFilter, setStatusFilter] = useState('open')

  const allItems = standup.action_items
  const filtered = allItems.filter(item => {
    const agentMatch = agentFilter === 'All' || item.owner === agentFilter
    const statusMatch = statusFilter === 'all' || item.status === statusFilter
    return agentMatch && statusMatch
  })

  const agentItems = agentFilter === 'All' ? allItems : allItems.filter(i => i.owner === agentFilter)
  const openCount       = agentItems.filter(i => i.status === 'open').length
  const inProgressCount = agentItems.filter(i => i.status === 'in_progress').length
  const doneCount       = agentItems.filter(i => i.status === 'done').length
  const overdueCount    = agentItems.filter(i => isOverdue(i.due, i.status)).length
  const completionRate  = agentItems.length
    ? Math.round(doneCount / agentItems.length * 100)
    : 0

  const lastMeeting = standup.last_meeting
    ? new Date(standup.last_meeting).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : null

  return (
    <section className="section">
      <div className="section-header">
        <div className="section-icon" style={{ background: 'rgba(204,248,34,0.10)' }}>✅</div>
        <div>
          <span className="section-title">Stand-up Action Items</span>
          {lastMeeting && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10, fontWeight: 500 }}>
              From Gemini Notes · Day start ISM
            </span>
          )}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <MetricCard
          label="Open"
          value={openCount}
          sub="not yet started"
          accent="var(--danger)"
          deltaType={openCount > 6 ? 'bad' : openCount > 3 ? 'warn' : 'good'}
          delta={openCount > 6 ? 'high backlog' : openCount > 3 ? 'review soon' : 'on track'}
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          sub="being worked on"
          accent="var(--pumpkin)"
        />
        <MetricCard
          label="Overdue"
          value={overdueCount}
          sub="past due date"
          accent="var(--danger)"
          deltaType={overdueCount > 0 ? 'bad' : 'good'}
          delta={overdueCount > 0 ? 'needs attention' : 'all on time'}
        />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          sub={`${doneCount} of ${agentItems.length} done`}
          accent="var(--neon)"
          deltaType={completionRate >= 60 ? 'good' : completionRate >= 40 ? 'warn' : 'bad'}
          delta={completionRate >= 60 ? 'good pace' : 'needs push'}
        />
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Action Items</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'open', 'in_progress', 'done'].map(s => {
              const label = s === 'all' ? 'All' : s === 'in_progress' ? 'In progress' : s.charAt(0).toUpperCase() + s.slice(1)
              const active = statusFilter === s
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '4px 11px',
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    fontFamily: 'inherit',
                    background: active
                      ? s === 'done' ? 'rgba(204,248,34,0.15)' : s === 'open' ? 'rgba(199,34,35,0.15)' : s === 'in_progress' ? 'rgba(255,105,51,0.15)' : 'var(--surface-2)'
                      : 'var(--surface-2)',
                    color: active
                      ? s === 'done' ? '#ccf822' : s === 'open' ? '#c72223' : s === 'in_progress' ? '#ff6933' : 'var(--text)'
                      : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No items match this filter.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Action Item</th>
                <th>Owner</th>
                <th>Week</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const overdue = isOverdue(item.due, item.status)
                const cfg = STATUS_CONFIG[item.status]
                const dueLabel = new Date(item.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500, maxWidth: 360 }}>
                      {overdue && (
                        <span style={{ color: 'var(--danger)', marginRight: 6, fontSize: 11 }}>⚠</span>
                      )}
                      {item.item}
                    </td>
                    <td>
                      <span className="agent-dot" style={{ background: AGENT_HEX[item.owner] }} />
                      {item.owner}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.week}</td>
                    <td style={{ color: overdue ? 'var(--danger)' : 'var(--text-dim)', fontSize: 12, fontWeight: overdue ? 600 : 400 }}>
                      {dueLabel}
                    </td>
                    <td>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
