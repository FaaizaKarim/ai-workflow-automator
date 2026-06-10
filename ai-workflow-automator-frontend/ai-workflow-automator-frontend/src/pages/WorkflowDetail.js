import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, LoadingPage, ConfirmModal, Spinner } from '../components';
import { STEP_TYPES } from '../components/StepBuilder';
import { fmt, dur } from '../utils';

function parseStepOutput(output) {
  if (output == null) return null;
  if (typeof output === 'object') return output;

  let text = String(output).trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  text = text.replace(/^json\s*(?=\{)/i, '');

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getField(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return null;
  const normalized = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ' '), v])
  );
  for (const key of keys) {
    const lookup = key.toLowerCase().replace(/\s+/g, ' ');
    const val = obj[key] ?? normalized[lookup];
    if (val != null && val !== '') return val;
  }
  return null;
}

function flattenObject(obj, depth = 0) {
  if (obj == null) return null;
  if (typeof obj === 'string') return obj.trim();
  if (typeof obj !== 'object' || depth > 2) return null;

  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      parts.push(`${k}: ${v}`);
    } else if (typeof v === 'object') {
      const inner = flattenObject(v, depth + 1);
      if (inner) parts.push(`${k}: ${inner}`);
    }
  }
  return parts.length ? parts.join('\n') : null;
}

function toCleanText(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return flattenObject(value);
  return String(value);
}

function classifyVerdict(verdict) {
  const text = toCleanText(verdict);
  if (!text) return 'neutral';
  const v = text.toLowerCase();
  if (v.includes('buy')) return 'positive';
  if (v.includes('sell')) return 'negative';
  return 'neutral';
}

function sentimentIcon(sentiment) {
  const text = toCleanText(sentiment);
  if (!text) return '📊';
  const s = text.toLowerCase();
  if (s.includes('bull')) return '📈';
  if (s.includes('bear')) return '📉';
  return '➡️';
}

function extractAiDisplay(data) {
  if (typeof data === 'string') {
    const parsed = parseStepOutput(data);
    if (parsed !== data) return extractAiDisplay(parsed);
    return { verdict: null, sentiment: null, reasoning: data.trim() };
  }
  if (!data || typeof data !== 'object') return null;

  const decision = data.decision;

  if (decision && typeof decision === 'object') {
    return {
      verdict: getField(decision, 'Verdict', 'verdict', 'action', 'decision'),
      sentiment: getField(decision, 'Market Sentiment', 'sentiment', 'Sentiment'),
      reasoning: getField(decision, 'Reasoning', 'reasoning', 'reason', 'explanation')
        || toCleanText(data.reasoning),
    };
  }

  if (typeof decision === 'string') {
    return {
      verdict: decision,
      sentiment: getField(data, 'Market Sentiment', 'sentiment'),
      reasoning: toCleanText(data.reasoning),
    };
  }

  const verdict = getField(data, 'Verdict', 'verdict', 'decision');
  const sentiment = getField(data, 'Market Sentiment', 'sentiment');
  const reasoning = getField(data, 'Reasoning', 'reasoning', 'reason')
    || toCleanText(data.reasoning);

  if (verdict || sentiment || reasoning) {
    return { verdict, sentiment, reasoning };
  }

  if (typeof data.raw === 'string') {
    const inner = parseStepOutput(data.raw);
    if (inner !== data.raw) return extractAiDisplay(inner);
    return { verdict: null, sentiment: null, reasoning: data.raw.trim() };
  }

  return null;
}

function AiResultCard({ verdict, sentiment, reasoning }) {
  const verdictText = toCleanText(verdict);
  const sentimentText = toCleanText(sentiment);
  const reasoningText = toCleanText(reasoning);
  const tone = classifyVerdict(verdictText);
  const badgeClass = tone === 'positive' ? 'badge-green' : tone === 'negative' ? 'badge-red' : 'badge-yellow';

  if (!verdictText && !sentimentText && reasoningText) {
    return <div className="result-text">{reasoningText}</div>;
  }

  return (
    <div className={`decision-card ai-result-card ${tone}`}>
      {verdictText && (
        <div className="ai-verdict-row">
          <span className={`ai-verdict-badge ${badgeClass}`}>{verdictText.toUpperCase()}</span>
        </div>
      )}
      {sentimentText && (
        <div className="ai-sentiment-row">
          <span className="ai-sentiment-icon">{sentimentIcon(sentimentText)}</span>
          <span className="ai-sentiment-label">Market Sentiment</span>
          <span className="ai-sentiment-value">{sentimentText}</span>
        </div>
      )}
      {reasoningText && (
        <div className="ai-reasoning">{reasoningText}</div>
      )}
    </div>
  );
}

function CleanTextResult({ value }) {
  const text = toCleanText(value);
  return <div className="result-text">{text || '—'}</div>;
}

function isAiStep(type) {
  return type === 'gemini_process' || type === 'ai_process';
}

function isInternalStep(name, type) {
  return String(name || '').startsWith('_') || String(type || '').startsWith('_');
}

function StepResult({ output, type }) {
  const data = parseStepOutput(output);

  if (isAiStep(type)) {
    const ai = extractAiDisplay(data);
    if (ai && (ai.verdict || ai.sentiment || ai.reasoning)) {
      return <AiResultCard {...ai} />;
    }
    return <CleanTextResult value={data} />;
  }

  if (type === 'fetch_url') {
    const status = data?.status;
    if (status != null) {
      const ok = status === 200;
      return (
        <span className={`badge ${ok ? 'badge-green' : 'badge-red'}`}>
          HTTP {status} {ok ? '✅' : '❌'}
        </span>
      );
    }
  }

  if (type === 'store_result') {
    return <span className="store-success">✓ Saved successfully</span>;
  }

  return <CleanTextResult value={data} />;
}

export default function WorkflowDetail({ toast }) {
  const navigate = useNavigate();
  const { id }   = useParams();

  const [wf,           setWf]           = useState(null);
  const [executions,   setExecutions]   = useState([]);
  const [selectedExec, setSelectedExec] = useState(null);
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/workflows', { replace: true });
    }
  }, [id, navigate]);

  const load = useCallback(async () => {
    try {
      const [w, exs] = await Promise.all([api.getWorkflow(id), api.getExecutions(id)]);
      setWf(w);
      setExecutions(exs || []);
      if ((exs || []).length > 0) setSelectedExec(exs[0]);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedExec) return;
    api.getResults(selectedExec.id).then(setResults).catch(() => setResults([]));
  }, [selectedExec]);

  async function handleRun() {
    setRunning(true);
    try {
      await api.runWorkflow(id);
      toast('Workflow started', 'success');
      setTimeout(() => { load(); setRunning(false); }, 2000);
    } catch (e) { toast('Failed: ' + e.message, 'error'); setRunning(false); }
  }

  async function handleToggle() {
    await api.updateWorkflow(id, { enabled: !wf.enabled });
    toast(`Workflow ${wf.enabled ? 'disabled' : 'enabled'}`, 'success');
    load();
  }

  async function handleDelete() {
    await api.deleteWorkflow(id);
    toast('Workflow deleted', 'success');
    navigate('/workflows');
  }

  if (loading) return <LoadingPage text="Loading workflow..." />;
  if (!wf)     return <div className="page"><div className="alert alert-error">Workflow not found.</div></div>;

  const steps = (wf.definition?.steps || []).filter(s => !isInternalStep(s.name, s.type));
  const visibleResults = results.filter(r => !isInternalStep(r.step_name, r.step_type));

  return (
    <div className="page">
      {confirmDel && (
        <ConfirmModal
          title="Delete Workflow"
          message={`Delete "${wf.name}"? This cannot be undone.`}
          dangerous
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)}
        />
      )}

      <button className="back-link" onClick={() => navigate('/workflows')}>← Back to Workflows</button>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="page-title">{wf.name}</div>
            <StatusBadge status={wf.enabled ? 'enabled' : 'disabled'} />
          </div>
          <div className="page-subtitle" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {wf.id}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-success" onClick={handleRun} disabled={!wf.enabled || running}>
            {running ? <><Spinner size={12} borderWidth={1.5} /> Running...</> : '▶ Run Now'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/workflows/${id}/edit`)}>Edit</button>
          <button className="btn btn-secondary" onClick={handleToggle}>{wf.enabled ? 'Disable' : 'Enable'}</button>
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>Delete</button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">Workflow Info</div>
          <div className="info-row"><span className="info-label">Trigger</span><span className="badge badge-blue">{wf.definition?.trigger || 'manual'}</span></div>
          <div className="info-row"><span className="info-label">Schedule</span><span className="info-val" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{wf.schedule || '—'}</span></div>
          <div className="info-row"><span className="info-label">Steps</span><span className="info-val">{steps.length}</span></div>
          <div className="info-row"><span className="info-label">Created</span><span className="info-val" style={{ fontSize: 12 }}>{fmt(wf.createdAt)}</span></div>
          <div className="info-row"><span className="info-label">Updated</span><span className="info-val" style={{ fontSize: 12 }}>{fmt(wf.updatedAt)}</span></div>
        </div>

        <div className="card">
          <div className="card-header">Steps ({steps.length})</div>
          {steps.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No steps defined</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, i) => {
                const def = STEP_TYPES.find(t => t.type === s.type) || {};
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="step-num">{i + 1}</span>
                    <span style={{ fontSize: 16 }}>{def.icon || '⚙'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name || s.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="exec-detail-grid">
        {/* ── Executions sidebar ── */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            Executions <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{executions.length}</span>
          </div>
          {executions.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-title">No executions yet</div>
              <div className="empty-desc">Run this workflow to see results</div>
            </div>
          ) : (
            <div className="exec-list">
              {executions.map(e => (
                <div
                  key={e.id}
                  className={`exec-item ${selectedExec?.id === e.id ? 'selected' : ''}`}
                  onClick={() => setSelectedExec(e)}
                >
                  <div className="exec-row">
                    <StatusBadge status={e.status} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{dur(e.started_at, e.finished_at)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(e.started_at)}</div>
                  <div className="exec-id">{e.id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Results panel ── */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedExec ? 'Execution Results' : 'Select an execution'}</span>
            {selectedExec && <StatusBadge status={selectedExec.status} />}
          </div>
          {!selectedExec ? (
            <div className="empty-state"><div className="empty-desc">Click an execution on the left to view its results</div></div>
          ) : visibleResults.length === 0 ? (
            <div className="empty-state"><div className="empty-desc">No results recorded for this execution</div></div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {visibleResults.map((r, i) => (
                <div key={i} className="result-item">
                  <div className="result-meta">
                    <span style={{ fontSize: 14 }}>{STEP_TYPES.find(t => t.type === r.step_type)?.icon || '⚙'}</span>
                    <span className="result-step-name">Step {r.step_index + 1}: {r.step_name || r.step_type}</span>
                    <StatusBadge status={r.status} />
                    <span className="result-time">{fmt(r.created_at)}</span>
                  </div>
                  {r.output && <StepResult output={r.output} type={r.step_type} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
