import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES, uid } from '../utils/helpers';

const BLANK = { name: '', email: '', password: '', role: 'employee', clientId: '' };

export default function Users() {
  const { db, user, update } = useApp();
  const [form, setForm] = useState(BLANK);
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const addUser = (ev) => {
    ev.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) return setError('Enter a name, an email, and a password of at least 6 characters.');
    if (db.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) return setError('That email is already in use.');
    if (form.role === 'client' && !form.clientId) return setError('Choose which client this account belongs to.');
    update((d) => d.users.push({ ...form, id: uid('u'), name: form.name.trim(), email: form.email.trim(), clientId: form.role === 'client' ? form.clientId : undefined }), `Added user ${form.name.trim()}`);
    setForm(BLANK);
    setError('');
  };

  const changeRole = (u, role) => update((d) => { d.users.find((x) => x.id === u.id).role = role; }, `Changed ${u.name} to ${ROLES[role]}`);
  const removeUser = (u) => window.confirm(`Remove ${u.name}?`) && update((d) => { d.users = d.users.filter((x) => x.id !== u.id); }, `Removed user ${u.name}`);
  const addClient = (ev) => {
    ev.preventDefault();
    if (!clientName.trim()) return;
    update((d) => d.clients.push({ id: uid('c'), name: clientName.trim() }), `Added client ${clientName.trim()}`);
    setClientName('');
  };

  return (
    <>
      <h1>Users & Clients</h1>
      <form className="panel form-grid" onSubmit={addUser}>
        <h2>Add user</h2>
        <label>Name<input value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} /></label>
        <label>Role<select value={form.role} onChange={set('role')}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {form.role === 'client' && <label>Client<select value={form.clientId} onChange={set('clientId')}><option value="">Select…</option>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {error && <p className="err wide" role="alert">{error}</p>}
        <div className="wide actions"><button className="btn" type="submit">Add user</button></div>
      </form>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td>
                <td><select value={u.role} disabled={u.id === user.id} onChange={(e) => changeRole(u, e.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td className="actions">{u.id !== user.id && <button className="icon-btn" title="Remove" onClick={() => removeUser(u)}><Trash2 size={16} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="panel">
        <h2>Clients</h2>
        <ul className="list">{db.clients.map((c) => <li key={c.id}><span>{c.name}</span></li>)}</ul>
        <form className="toolbar" onSubmit={addClient}><input placeholder="New client name" value={clientName} onChange={(e) => setClientName(e.target.value)} /><button className="btn" type="submit">Add client</button></form>
      </section>
    </>
  );
}
