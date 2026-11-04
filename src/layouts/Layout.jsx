import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../utils/helpers';
import { COMPANY } from '../config/company';
import Logo from '../components/Logo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee', 'client'] },
  { to: '/projects', label: 'Projects', icon: FolderKanban, roles: ['admin', 'manager', 'employee', 'client'] },
  { to: '/tasks', label: 'Tasks', icon: ListChecks, roles: ['admin', 'manager', 'employee'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager', 'client'] },
  { to: '/users', label: 'Users & Clients', icon: Users, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <Logo light />
        <nav>
          {NAV.filter((n) => n.roles.includes(user.role)).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label}>
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="nav-btn" onClick={logout} title="Log out"><LogOut size={18} /> <span>Log out</span></button>
      </aside>
      <div className="main">
        <header className="topbar no-print">
          <button className="icon-btn" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar"><Menu size={20} /></button>
          <strong className="company">{COMPANY.name}</strong>
          <span className="who">{user.name} · {ROLES[user.role]}</span>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
