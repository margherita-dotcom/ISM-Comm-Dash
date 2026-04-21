import React from 'react'

export default function MetricCard({ label, value, sub, delta, deltaDir, accent }) {
  const deltaClass = deltaDir === 'up' ? 'delta-up' : deltaDir === 'down' ? 'delta-down' : 'delta-neutral'
  const deltaPrefix = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : ''

  return (
    <div className="card" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div className="metric-label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-label" style={{ marginTop: 4 }}>{sub}</div>}
      {delta && (
        <div className={`metric-delta ${deltaClass}`} style={{ marginTop: 8 }}>
          {deltaPrefix} {delta}
        </div>
      )}
    </div>
  )
}
