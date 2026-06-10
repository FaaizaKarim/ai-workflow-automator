import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Toggle, LoadingPage, Spinner } from '../components';
import { StepBuilder, STEP_TYPES } from '../components/StepBuilder';

export default function WorkflowForm({ toast }) {
  const navigate  = useNavigate();
  const { id }    = useParams();          // present when editing
  const isEdit    = !!id;

  const [loading,  setLoading]  = useState(isEdit);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const [name,     setName]     = useState('');
  const [trigger,  setTrigger]  = useState('manual');
  const [schedule, setSchedule] = useState('');
  const [enabled,  setEnabled]  = useState(true);
  const [steps,    setSteps]    = useState([]);

  useEffect(() => {
    if (!isEdit) return;
    api.getWorkflow(id).then(wf => {
      if (wf) {
        setName(wf.name);
        setTrigger(wf.definition?.trigger || 'manual');
        setSchedule(wf.schedule || '');
        setEnabled(wf.enabled);
        setSteps(wf.definition?.steps || []);
      }
      setLoading(false);
    });
  }, [id, isEdit]);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError('Workflow name is required');
    if (steps.length === 0) return setError('Add at least one step');

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        trigger,
        steps,
        schedule: schedule || null,
        enabled,
      };
      if (isEdit) {
        await api.updateWorkflow(id, payload);
        toast('Workflow updated', 'success');
        navigate(`/workflows/${id}`);
      } else {
        const wf = await api.createWorkflow(payload);
        toast('Workflow created', 'success');
        navigate(`/workflows/${wf.id}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingPage text="Loading workflow..." />;

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate(isEdit ? `/workflows/${id}` : '/workflows')}>
        ← {isEdit ? 'Back to Workflow' : 'Back to Workflows'}
      </button>

      <div className="page-header">
        <div>
          <div className="page-title">{isEdit ? 'Edit Workflow' : 'New Workflow'}</div>
          <div className="page-subtitle">
            {isEdit ? 'Update your automation workflow' : 'Define a new automation workflow'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving
            ? <><Spinner size={12} borderWidth={1.5} /> Saving...</>
            : isEdit ? 'Save Changes' : 'Create Workflow'}
        </button>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* ── Basic info ── */}
        <div className="card">
          <div className="card-header">Basic Info</div>

          <div className="form-group">
            <label className="form-label">Workflow Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Daily News Summarizer"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trigger Type</label>
            <select className="form-select" value={trigger} onChange={e => setTrigger(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          {trigger === 'scheduled' && (
            <div className="form-group">
              <label className="form-label">Cron Schedule</label>
              <input
                className="form-input"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="0 9 * * *"
                value={schedule}
                onChange={e => setSchedule(e.target.value)}
              />
              <div className="form-hint">
                e.g. <code>0 9 * * *</code> = every day at 9 am &nbsp;·&nbsp; <code>*/15 * * * *</code> = every 15 min
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle on={enabled} onChange={setEnabled} />
              <span style={{ fontSize: 13, color: enabled ? 'var(--green)' : 'var(--text3)' }}>
                {enabled ? 'Enabled — will run on schedule' : 'Disabled — manual trigger only'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Quick reference ── */}
        <div className="card" style={{ background: 'var(--surface2)' }}>
          <div className="card-header">Step Types</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {STEP_TYPES.map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <div>
                  <span className={`badge ${t.color}`} style={{ marginRight: 6 }}>{t.type}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step builder ── */}
      <div className="card">
        <div className="card-header">Steps ({steps.length})</div>
        <StepBuilder steps={steps} onChange={setSteps} />
      </div>
    </div>
  );
}
