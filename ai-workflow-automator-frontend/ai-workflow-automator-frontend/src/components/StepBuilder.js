import { useState } from 'react';

export const STEP_TYPES = [
  {
    type: 'fetch_url', label: 'Fetch URL', icon: '🌐',
    desc: 'Fetch content from any URL', color: 'badge-blue',
    defaultConfig: { url: '' },
    fields: [{ key: 'url', label: 'URL', placeholder: 'https://api.example.com/data', type: 'text' }]
  },
  {
    type: 'gemini_process', label: 'AI Process', icon: '🤖',
    desc: 'Analyze with Groq / Gemini AI', color: 'badge-purple',
    defaultConfig: { prompt: '' },
    fields: [{ key: 'prompt', label: 'AI Prompt', placeholder: 'Describe what the AI should do with the data...', type: 'textarea' }]
  },
  {
    type: 'store_result', label: 'Store Result', icon: '💾',
    desc: 'Save the execution result', color: 'badge-yellow',
    defaultConfig: { key: '' },
    fields: [{ key: 'key', label: 'Storage Key (optional)', placeholder: 'my-result-key', type: 'text' }]
  },
  {
    type: 'webhook', label: 'Webhook', icon: '🔗',
    desc: 'Send data to a webhook', color: 'badge-gray',
    defaultConfig: { url: '', method: 'POST' },
    fields: [
      { key: 'url',    label: 'Webhook URL', placeholder: 'https://hooks.example.com/...', type: 'text' },
      { key: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
    ]
  },
];

export function StepBuilder({ steps, onChange }) {
  const [expanded, setExpanded] = useState({});
  const [picking, setPicking] = useState(false);

  function addStep(type) {
    const def = STEP_TYPES.find(t => t.type === type);
    const newStep = { type, name: def.label, config: { ...def.defaultConfig } };
    const newSteps = [...steps, newStep];
    onChange(newSteps);
    setExpanded(e => ({ ...e, [newSteps.length - 1]: true }));
    setPicking(false);
  }

  function removeStep(i) {
    onChange(steps.filter((_, idx) => idx !== i));
  }

  function updateStep(i, field, val) {
    onChange(steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function updateConfig(i, key, val) {
    onChange(steps.map((s, idx) => idx === i ? { ...s, config: { ...s.config, [key]: val } } : s));
  }

  function moveStep(i, dir) {
    const arr = [...steps];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  }

  return (
    <div>
      <div className="steps-list">
        {steps.map((step, i) => {
          const def = STEP_TYPES.find(t => t.type === step.type) || {};
          const open = expanded[i];
          return (
            <div key={i} className="step-card">
              <div className="step-header" onClick={() => setExpanded(e => ({ ...e, [i]: !open }))}>
                <span className="step-num">{i + 1}</span>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{def.icon || '⚙'}</span>
                <div className="step-info">
                  <div className="step-name">{step.name || step.type}</div>
                  <div className="step-type-label">{step.type}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button className="btn btn-icon btn-secondary" style={{ fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); moveStep(i, -1); }}
                    disabled={i === 0} title="Move up">▲</button>
                  <button className="btn btn-icon btn-secondary" style={{ fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); moveStep(i, 1); }}
                    disabled={i === steps.length - 1} title="Move down">▼</button>
                  <button className="btn btn-icon btn-danger" style={{ fontSize: 11 }}
                    onClick={e => { e.stopPropagation(); removeStep(i); }} title="Remove">✕</button>
                </div>
              </div>

              {open && (
                <div className="step-body">
                  <div className="form-group">
                    <label className="form-label">Step Name</label>
                    <input className="form-input" value={step.name}
                      onChange={e => updateStep(i, 'name', e.target.value)}
                      placeholder={def.label} />
                  </div>
                  {(def.fields || []).map(f => (
                    <div key={f.key} className="form-group">
                      <label className="form-label">{f.label}</label>
                      {f.type === 'textarea' ? (
                        <textarea className="form-textarea"
                          value={step.config[f.key] || ''}
                          onChange={e => updateConfig(i, f.key, e.target.value)}
                          placeholder={f.placeholder} />
                      ) : f.type === 'select' ? (
                        <select className="form-select"
                          value={step.config[f.key] || f.options[0]}
                          onChange={e => updateConfig(i, f.key, e.target.value)}>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="form-input" type="text"
                          value={step.config[f.key] || ''}
                          onChange={e => updateConfig(i, f.key, e.target.value)}
                          placeholder={f.placeholder} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {picking ? (
        <div>
          <div className="step-type-grid">
            {STEP_TYPES.map(t => (
              <div key={t.type} className="step-type-option" onClick={() => addStep(t.type)}>
                <div className="s-icon">{t.icon}</div>
                <div className="s-label">{t.label}</div>
                <div className="s-desc">{t.desc}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
            onClick={() => setPicking(false)}>Cancel</button>
        </div>
      ) : (
        <button className="step-add-btn" onClick={() => setPicking(true)}>
          ＋ Add Step
        </button>
      )}
    </div>
  );
}
