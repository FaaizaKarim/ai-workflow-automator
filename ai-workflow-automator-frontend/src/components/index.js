// ── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    success: 'badge-green', failed: 'badge-red', partial: 'badge-yellow',
    running: 'badge-blue', enabled: 'badge-green', disabled: 'badge-gray'
  };
  const dot = { success: '● ', failed: '● ', running: '◌ ', partial: '● ' };
  return (
    <span className={`badge ${map[status] || 'badge-gray'}`}>
      {dot[status] || ''}{status}
    </span>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange }) {
  return (
    <div className={`toggle-track ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <div className="toggle-thumb" />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, borderWidth = 2 }) {
  return (
    <div className="spinner" style={{ width: size, height: size, borderWidth }} />
  );
}

// ── Loading page ──────────────────────────────────────────────────────────────
export function LoadingPage({ text = 'Loading...' }) {
  return (
    <div className="loading">
      <Spinner /> {text}
    </div>
  );
}

// ── Toasts ────────────────────────────────────────────────────────────────────
export function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onCancel, dangerous }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${dangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {dangerous ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
