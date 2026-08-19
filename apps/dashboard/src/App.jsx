import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 5000;

/**
 * HealthCard — displays a single source's health status + individual resync button.
 */
function HealthCard({ name, health, lastSuccess, errorRate, onSync, isSyncing }) {
  const statusClass = health || 'healthy';
  const formattedTime = lastSuccess
    ? new Date(lastSuccess).toLocaleTimeString()
    : 'Never';

  return (
    <div className="health-card">
      <div className="card-header-row">
        <div className="source-name">{name}</div>
        <button
          className="sync-btn-small"
          onClick={() => onSync(name)}
          disabled={isSyncing}
          title={`Trigger immediate scrape for ${name}`}
        >
          {isSyncing ? '⏳ Syncing...' : '🔄 Resync'}
        </button>
      </div>
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
 */
function HealthPanel({ sources, onSync, syncingSource }) {
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
          onSync={onSync}
          isSyncing={syncingSource === name || syncingSource === 'all'}
        />
      ))}
    </div>
  );
}

/**
 * FilterBar — input controls for filtering job listings.
 */
function FilterBar({
  search,
  setSearch,
  selectedSource,
  setSelectedSource,
  location,
  setLocation,
  availableSources,
  onReset
}) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="search-input">Search Keywords</label>
        <input
          id="search-input"
          type="text"
          placeholder="Filter by title, company, or skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="source-select">Source Platform</label>
        <select
          id="source-select"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="filter-select"
        >
          <option value="">All Sources</option>
          {availableSources.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="location-input">Location</label>
        <input
          id="location-input"
          type="text"
          placeholder="Filter by location (e.g. Remote)..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="filter-input"
        />
      </div>

      {(search || selectedSource || location) && (
        <button className="clear-filters-btn" onClick={onReset}>
          ✕ Clear Filters
        </button>
      )}
    </div>
  );
}

/**
 * ListingsTable — table of normalized job listings with filters.
 */
function ListingsTable({
  listings,
  total,
  search,
  setSearch,
  selectedSource,
  setSelectedSource,
  location,
  setLocation,
  availableSources,
  onResetFilters
}) {
  return (
    <div className="listings-section">
      <div className="listings-header">
        <div>
          <h2>Job Listings</h2>
          <span className="subtitle">Filtered results live updated</span>
        </div>
        <span className="listings-count">{total} listing{total !== 1 ? 's' : ''}</span>
      </div>

      <FilterBar
        search={search}
        setSearch={setSearch}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        location={location}
        setLocation={setLocation}
        availableSources={availableSources}
        onReset={onResetFilters}
      />

      {!listings || listings.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <p>No listings match your search criteria. Try adjusting your filters or triggering a resync.</p>
        </div>
      ) : (
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
                <td><span className="source-pill">{job.source || '—'}</span></td>
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
      )}
    </div>
  );
}

/**
 * App — main dashboard component with Resync and Filtering.
 */
function App() {
  const [sources, setSources] = useState({});
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [location, setLocation] = useState('');

  // Resync State
  const [syncingSource, setSyncingSource] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

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
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedSource) params.append('source', selectedSource);
      if (location) params.append('location', location);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/listings${queryString}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total || 0);
    } catch {
      // Silently fail
    }
  }, [search, selectedSource, location]);

  const handleSync = async (sourceName = 'all') => {
    setSyncingSource(sourceName);
    try {
      const res = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceName,
          query: search || 'developer',
          location: location || 'remote'
        })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const count = data.valid !== undefined ? data.valid : (data.fetched || 0);
        const queryLabel = data.query ? ` matching "${data.query}"` : '';
        setToastMessage({
          type: 'success',
          text: `✅ Resync succeeded for ${data.source || sourceName}! Ingested ${count} listings${queryLabel}.`
        });
      } else if (data.status === 'failed') {
        const firstErr = data.results && data.results.find(r => r.error);
        const errorMsg = firstErr ? firstErr.error : (data.error || 'Source rate limited or unavailable');
        setToastMessage({
          type: 'error',
          text: `❌ Resync failed for ${data.source || sourceName}: ${errorMsg}`
        });
      } else {
        setToastMessage({
          type: 'info',
          text: `⚡ Ingestion job queued for ${data.source || sourceName}...`
        });
      }

      setTimeout(() => setToastMessage(null), 6000);
      
      // Instantly refresh status & listings
      fetchStatus();
      fetchListings();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: `❌ Failed to trigger sync: ${err.message}`
      });
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setSyncingSource(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedSource('');
    setLocation('');
  };

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

  const availableSources = Object.keys(sources);

  return (
    <div className="app">
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type || 'info'}`}>
          {typeof toastMessage === 'string' ? toastMessage : toastMessage.text}
        </div>
      )}

      <header className="app-header">
        <div>
          <h1>Job Ingestion Engine</h1>
          <span className="subtitle">Resilient Pipeline Health & Ingestion Control</span>
        </div>
        <div className="header-actions">
          <button
            className="resync-all-btn"
            onClick={() => handleSync('all')}
            disabled={syncingSource === 'all'}
          >
            {syncingSource === 'all' ? '⏳ Queueing All...' : '⚡ Resync All Sources'}
          </button>
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
        </div>
      </header>

      <HealthPanel
        sources={sources}
        onSync={handleSync}
        syncingSource={syncingSource}
      />

      <ListingsTable
        listings={listings}
        total={total}
        search={search}
        setSearch={setSearch}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        location={location}
        setLocation={setLocation}
        availableSources={availableSources}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}

export default App;
