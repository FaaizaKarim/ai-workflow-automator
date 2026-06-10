import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, Toggle, LoadingPage, ConfirmModal, Spinner } from '../components';
import { fmtDate } from '../utils';

export default function Workflows({ toast }) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState({});
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setWorkflows((await api.getWorkflows()) || []); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRun(id) {
    setRunning(r => ({ ...r, [id]: true }));
    try {
      await api.runWorkflow(id);
      toast('Workflow started successfully', 'success');
      setTimeout(load, 1500);
    } catch (e) {
      toast('Failed to run: ' + e.message, 'error');
    } finally {
      setRunning(r => ({ ...r, [id]: false }));
    }
  }

  async function handleToggle(wf) {
    try {
      await api.updateWorkflow(wf.id, { enabled: !wf.enabled });
      toast(`Workflow ${wf.enabled ? 'disabled' : 'enabled'}`, 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function handleDelete(id) {
    try {
      await api.deleteWorkflow(id);
      toast('Workflow deleted', 'success');
      setWorkflows(w => w.filter(x => x.id !== id));
    } catch (e) { toast(e.message, 'error'); }
    setConfirmDelete(null);
  }

  const filtered = workflows.filter(wf => {
    const matchFilter = filter === 'all' || (filter === 'enabled' ? wf.enabled : !wf.enabled);
    const matchSearch = !search || wf.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <LoadingPage text="Loading workflows..." />;

  return (
    <div className="page">
      {confirmDelete && (
        <ConfirmModal
          title="Delete Workflow"
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          dangerous
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Workflows</div>
          <div className="page-subtitle">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
          ＋ New Workflow
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">⌕</span>
          <input
            className="form-input search-input"
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'enabled', 'disabled'].map(f => (
            <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⚙️</div>
            <div className="empty-title">{search ? 'No results found' : 'No workflows yet'}</div>
            <div className="empty-desc" style={{ marginBottom: 16 }}>
              {search ? 'Try a different search term' : 'Create your first workflow to get started'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={() => navigate('/workflows/new')}>
                ＋ New Workflow
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Trigger</th><th>Schedule</th>
                  <th>Steps</th><th>Status</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(wf => (
                  <tr key={wf.id}>
                    <td>
                      <button
                        className="btn" style={{ padding: 0, color: 'var(--accent2)', background: 'none', border: 'none', fontWeight: 600, fontSize: 13 }}
                        onClick={() => navigate(`/workflows/${wf.id}`)}
                      >
                        {wf.name}
                      </button>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                        {wf.id}
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{wf.definition?.trigger || 'manual'}</span></td>
                    <td style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                      {wf.schedule || '—'}
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{wf.definition?.steps?.length || 0}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Toggle on={wf.enabled} onChange={() => handleToggle(wf)} />
                        <StatusBadge status={wf.enabled ? 'enabled' : 'disabled'} />
                      </div>
                    </td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{fmtDate(wf.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleRun(wf.id)}
                          disabled={!wf.enabled || running[wf.id]}
                        >
                          {running[wf.id] ? <Spinner size={10} borderWidth={1.5} /> : '▶ Run'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/workflows/${wf.id}/edit`)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(wf)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
