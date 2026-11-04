import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { COMPANY } from './config/company';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Reports from './pages/Reports';
import Users from './pages/Users';

// Interface-level role check only. Production needs the same rule enforced on a backend.
function Guard({ roles, children }) {
  const { user } = useApp();
  return roles.includes(user.role) ? children : <p className="panel">You don’t have access to this page.</p>;
}

function AppRoutes() {
  const { user } = useApp();
  useEffect(() => { document.title = COMPANY.pageTitle; }, []);
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="tasks" element={<Guard roles={['admin', 'manager', 'employee']}><Tasks /></Guard>} />
        <Route path="reports" element={<Guard roles={['admin', 'manager', 'client']}><Reports /></Guard>} />
        <Route path="users" element={<Guard roles={['admin']}><Users /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter><AppRoutes /></BrowserRouter>
    </AppProvider>
  );
}
