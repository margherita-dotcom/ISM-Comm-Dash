import React, { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import HubspotSection from './components/HubspotSection.jsx'
import SlackSection from './components/SlackSection.jsx'
import StandupSection from './components/StandupSection.jsx'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('This Week')
  const [agentFilter, setAgentFilter] = useState('All')

  useEffect(() => {
    fetch('./data/dashboard.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="dashboard"><div className="loading">Loading...</div></div>
  }

  if (!data) {
    return (
      <div className="dashboard">
        <div className="loading" style={{ color: 'var(--danger)' }}>
          Failed to load data — check public/data/dashboard.json
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Header
        data={data}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
      />

      <HubspotSection  data={data} agentFilter={agentFilter} />
      <div className="section-divider" />
      <SlackSection    data={data} agentFilter={agentFilter} />
      <div className="section-divider" />
      <StandupSection  data={data} agentFilter={agentFilter} />
    </div>
  )
}
