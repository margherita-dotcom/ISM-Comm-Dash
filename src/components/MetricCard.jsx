import React from 'react'

export default function MetricCard({ label, value, sub, delta, deltaType, accent }) {
  const deltaClass = deltaType === 'good' ? 'delta-good'
    : deltaType === 'warn' ? 'delta-warn'
    : deltaType === 'bad' ? 'delta-bad'
    : 'delta-neutral'

  return (
    <div className="card" style={{ borderTop: `2px solid ${accent || 'var(--border)'}` }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {delta && (
        <div className={`metric-delta ${deltaClass}`}>{delta}</div>
      )}
    </div>
  )
}
