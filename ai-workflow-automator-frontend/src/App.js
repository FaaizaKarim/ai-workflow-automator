import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import './App.css';
import { useToast } from './hooks/useToast';
import { Toasts } from './components';
import Dashboard      from './pages/Dashboard';
import Workflows      from './pages/Workflows';
import WorkflowForm   from './pages/WorkflowForm';
import WorkflowDetail from './pages/WorkflowDetail';

function Sidebar() {
  const location = useLocation();
  const onWorkflows = location.pathname.startsWith('/workflows');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">⚡</div>
        <span className="brand-name">AI Automator</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">▦</span> Dashboard
        </NavLink>
        <NavLink to="/workflows" className={`nav-item ${onWorkflows ? 'active' : ''}`}>
          <span className="nav-icon">◈</span> Workflows
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span>API Automator v2</span>
      </div>
    </aside>
  );
}

function AppShell() {
  const { toasts, toast } = useToast();

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/"                        element={<Dashboard />} />
          <Route path="/workflows"               element={<Workflows    toast={toast} />} />
          <Route path="/workflows/new"           element={<WorkflowForm toast={toast} />} />
          <Route path="/workflows/:id"           element={<WorkflowDetail toast={toast} />} />
          <Route path="/workflows/:id/edit"      element={<WorkflowForm   toast={toast} />} />
        </Routes>
      </main>
      <Toasts toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
