import React from 'react'

const TIME_OPTIONS = ['Today', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Year So Far']
const AGENTS = ['All', 'Valentina', 'Bassel', 'Jessey', 'Wies']

export default function Header({ data, timeFilter, setTimeFilter, agentFilter, setAgentFilter }) {
  const updatedAt = data?.meta?.updated_at
    ? new Date(data.meta.updated_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <header style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--pumpkin)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>
            📊
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              ISM Performance Dashboard
            </h1>
            {updatedAt && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                Updated {updatedAt} · Mock data
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup
            options={AGENTS}
            value={agentFilter}
            onChange={setAgentFilter}
            pill
          />
          <FilterGroup
            options={TIME_OPTIONS}
            value={timeFilter}
            onChange={setTimeFilter}
          />
        </div>
      </div>
    </header>
  )
}

function FilterGroup({ options, value, onChange, pill }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: pill ? 999 : 8,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {options.map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: pill ? '6px 14px' : '6px 13px',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              fontFamily: 'inherit',
              background: active ? 'var(--pumpkin)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              letterSpacing: active ? '-0.01em' : 0,
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
