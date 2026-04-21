import React from 'react'

export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="entry">
          <span style={{ color: entry.color, fontSize: 10 }}>●</span>
          <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600 }}>{entry.value}{unit}</span>
        </div>
      ))}
    </div>
  )
}
