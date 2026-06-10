import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, LoadingPage } from '../components';
import { fmt, fmtDate, dur } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [workflows, setWorkflows]   = useState([]);
  const [recentExecs, setRecentExecs] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const wfs = await api.getWorkflows();
        setWorkflows(wfs || []);
        setApiError(!api.isOnline());
        const all = [];
        for (const wf of (wfs || []).slice(0, 5)) {
          const exs = await api.getExecutions(wf.id);
          (exs || []).slice(0, 3).forEach(e => all.push({ ...e, workflowName: wf.name }));
        }
        all.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        setRecentExecs(all.slice(0, 10));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingPage text="Loading dashboard..." />;

  const enabled = workflows.filter(w => w.enabled).length;
  const success = recentExecs.filter(e => e.status === 'success').length;
  const failed  = recentExecs.filter(e => e.status === 'failed').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of your automation workflows</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
          ＋ New Workflow
        </button>
      </div>

      {apiError && (
        <div className="alert alert-warning">
          ⚠ API offline — showing demo data. Set <code>REACT_APP_API_URL</code> or start your backend on port 3001.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-label">Total Workflows</div>
          <div className="stat-value purple">{workflows.length}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Active</div>
          <div className="stat-value blue">{enabled}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Recent Success</div>
          <div className="stat-value green">{success}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Recent Failed</div>
          <div className="stat-value red">{failed}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent Executions</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/workflows')}>
            View all workflows →
          </button>
        </div>

        {recentExecs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No executions yet</div>
            <div className="empty-desc">Run a workflow to see results here</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Workflow</th><th>Status</th><th>Trigger</th><th>Started</th><th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentExecs.map(e => (
                  <tr key={e.id}>
                    <td>
                      <button
                        className="btn" style={{ padding: 0, color: 'var(--accent2)', background: 'none', border: 'none', fontWeight: 500 }}
                        onClick={() => navigate(`/workflows/${e.workflowId || e.workflow_id}`)}
                      >
                        {e.workflowName}
                      </button>
                    </td>
                    <td><StatusBadge status={e.status} /></td>
                    <td><span className="badge badge-gray">{e.trigger || 'manual'}</span></td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{fmt(e.started_at)}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{dur(e.started_at, e.finished_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
