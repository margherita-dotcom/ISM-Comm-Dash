import React from 'react'

export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="tt-row">
          <span className="tt-dot" style={{ color: entry.color }}>●</span>
          <span className="tt-name">{entry.name}</span>
          <span className="tt-val">{entry.value}{unit}</span>
        </div>
      ))}
    </div>
  )
}
