import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadDb, saveDb, SESSION_KEY } from '../services/storage';
import { uid } from '../utils/helpers';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [db, setDb] = useState(loadDb);
  const [userId, setUserId] = useState(() => localStorage.getItem(SESSION_KEY));
  useEffect(() => saveDb(db), [db]);

  const user = db.users.find((u) => u.id === userId) || null;

  const login = (email, password) => {
    const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!found) return false;
    localStorage.setItem(SESSION_KEY, found.id);
    setUserId(found.id);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUserId(null);
  };

  // update(mutator, message): mutate a copy of the data, save it, and log the action.
  const update = (mutate, message) =>
    setDb((prev) => {
      const next = structuredClone(prev);
      mutate(next);
      if (message) {
        const entry = { id: uid('a'), at: new Date().toISOString(), by: user?.name || 'System', text: message };
        next.activity = [entry, ...next.activity].slice(0, 100);
      }
      return next;
    });

  // Role-based visibility. NOTE: UI-only; real security needs backend authorization.
  const scope = useMemo(() => {
    if (!user) return { projects: [], tasks: [] };
    const projects = db.projects.filter((p) => {
      if (user.role === 'employee') return p.team.includes(user.id);
      if (user.role === 'client') return p.clientId === user.clientId;
      return true;
    });
    const ids = new Set(projects.map((p) => p.id));
    const tasks = db.tasks.filter((t) => (user.role === 'employee' ? t.assigneeId === user.id : ids.has(t.projectId)));
    return { projects, tasks };
  }, [db, user]);

  return <AppContext.Provider value={{ db, user, login, logout, update, ...scope }}>{children}</AppContext.Provider>;
}
