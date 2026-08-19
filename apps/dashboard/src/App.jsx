import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 5000;

/**
 * HealthCard — displays a single source's health status.
 */
function HealthCard({ name, health, lastSuccess, errorRate }) {
  const statusClass = health || 'healthy';
  const formattedTime = lastSuccess
    ? new Date(lastSuccess).toLocaleTimeString()
    : 'Never';

  return (
    <div className="health-card">
      <div className="source-name">{name}</div>
      <div className="status-row">
        <span className={`status-badge ${statusClass}`}>
          <span className="status-indicator"></span>
          {statusClass}
        </span>
      </div>
      <div className="metric">
        Last success: <span>{formattedTime}</span>
      </div>
      <div className="metric">
        Error rate: <span>{(errorRate * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

/**
 * HealthPanel — grid of per-source health cards.
 * Per PRD §7: poll /status every 5s, show live state transitions.
 */
function HealthPanel({ sources }) {
  if (!sources || Object.keys(sources).length === 0) {
    return (
      <div className="health-panel">
        <div className="empty-state">
          <div className="icon">📡</div>
          <p>Waiting for source data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="health-panel">
      {Object.entries(sources).map(([name, data]) => (
        <HealthCard
          key={name}
          name={name}
          health={data.health}
          lastSuccess={data.lastSuccess}
          errorRate={data.errorRate}
        />
      ))}
    </div>
  );
}

/**
 * ListingsTable — table of normalized job listings.
 * Per PRD §7: single React page with table of normalized listings.
 */
function ListingsTable({ listings, total }) {
  if (!listings || listings.length === 0) {
    return (
      <div className="listings-section">
        <div className="listings-header">
          <h2>Job Listings</h2>
          <span className="listings-count">0 listings</span>
        </div>
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No listings ingested yet. Start the pipeline to see data here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="listings-section">
      <div className="listings-header">
        <h2>Job Listings</h2>
        <span className="listings-count">{total} listing{total !== 1 ? 's' : ''}</span>
      </div>
      <table className="listings-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Skills</th>
            <th>Source</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((job, idx) => (
            <tr key={job.id || idx}>
              <td className="job-title">{job.title}</td>
              <td className="job-company">{job.company}</td>
              <td>{job.location}</td>
              <td>
                {(job.skills || []).slice(0, 4).map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </td>
              <td>{job.source || '—'}</td>
              <td>
                {job.url ? (
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-link">
                    View →
                  </a>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * App — main dashboard component.
 * Per PRD §7: single React page with listings table + pipeline health panel.
 */
function App() {
  const [sources, setSources] = useState({});
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setSources(data.sources || {});
      setLastUpdated(data.timestamp);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/listings`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total || 0);
    } catch {
      // Silently fail — listings will remain stale
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchListings();

    const statusInterval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    const listingsInterval = setInterval(fetchListings, POLL_INTERVAL_MS * 2);

    return () => {
      clearInterval(statusInterval);
      clearInterval(listingsInterval);
    };
  }, [fetchStatus, fetchListings]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Job Ingestion Engine</h1>
          <span className="subtitle">Pipeline Health Dashboard</span>
        </div>
        <div className="last-updated">
          {isConnected ? (
            <>
              <span className="pulse-dot"></span>
              Live — {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '...'}
            </>
          ) : (
            <span style={{ color: 'var(--accent-red)' }}>⚠ Disconnected</span>
          )}
        </div>
      </header>

      <HealthPanel sources={sources} />
      <ListingsTable listings={listings} total={total} />
    </div>
  );
}

export default App;
