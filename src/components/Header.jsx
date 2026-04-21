import React from 'react'

const TIME_OPTIONS = ['This Week', 'Last Week', 'This Month', 'This Year']
const AGENTS = ['All', 'Valentina', 'Bassel', 'Jessey']

export default function Header({ data, timeFilter, setTimeFilter, agentFilter, setAgentFilter }) {
  const updatedAt = data?.meta?.updated_at
    ? new Date(data.meta.updated_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <header style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            ISM Communication Dashboard
          </h1>
          {updatedAt && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Updated {updatedAt}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FilterGroup
            label="Period"
            options={TIME_OPTIONS}
            value={timeFilter}
            onChange={setTimeFilter}
          />
          <FilterGroup
            label="Agent"
            options={AGENTS}
            value={agentFilter}
            onChange={setAgentFilter}
          />
        </div>
      </div>
    </header>
  )
}

function FilterGroup({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{
        display: 'flex',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: value === opt ? 700 : 500,
              fontFamily: 'inherit',
              background: value === opt ? 'var(--accent)' : 'transparent',
              color: value === opt ? '#fff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
