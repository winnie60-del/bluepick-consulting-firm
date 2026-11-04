
import API_BASE_URL from '../config/api';
import { useEffect, useState } from 'react';
import { Archive, Pencil, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COMPANY } from '../config/company';
import Badge from '../components/Badge';
import { PROJECT_STATUSES, byId, isOverdue, money, projectProgress, uid } from '../utils/helpers';

const EMPTY = {
  name: '',
  description: '',
  clientId: '',
  managerId: '',
  team: [],
  start: '',
  due: '',
  budget: '',
  status: 'Planning',
  milestones: ''
};

export default function Projects() {
  const { db, user, projects, update } = useApp();

  const [apiProjects, setApiProjects] = useState([]);
  const [apiError, setApiError] = useState('');

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);

      if (!response.ok) {
        throw new Error('Could not load projects');
      }

      const data = await response.json();
      setApiProjects(data);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const canManage = ['admin', 'manager'].includes(user.role);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [archived, setArchived] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [openId, setOpenId] = useState(null);

  const rows = apiProjects
    .map((p) => ({
      id: String(p.project_id),
      name: p.project_name,
      description: p.description || '',
      clientId: String(p.client_id || ''),
      clientName: p.client_name || '',
      managerId: String(p.manager_id || ''),
      status: p.status,
      due: p.deadline ? String(p.deadline).slice(0, 10) : '',
      start: p.start_date ? String(p.start_date).slice(0, 10) : '',
      archived: Boolean(p.archived),
      team: [],
      budget: 0,
      milestones: []
    }))
    .filter(
      (p) =>
        (!archived || p.archived) &&
        (!status || p.status === status) &&
        p.name.toLowerCase().includes(q.toLowerCase())
    );

  const opened = byId(projects, openId);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.value });

  const toggleMember = (id) => {
    setForm((current) => ({
      ...current,
      team: current.team.includes(String(id))
        ? current.team.filter((m) => m !== String(id))
        : [...current.team, String(id)]
    }));
  };

  const startEdit = async (p) => {
    setErrors({});

    if (!p) {
      setForm({
        ...EMPTY,
        managerId: user.role === 'manager' ? user.id : ''
      });
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${p.id}/members`
      );

      if (!response.ok) {
        throw new Error('Could not load project team members.');
      }

      const members = await response.json();

      setForm({
        ...p,
        team: members.map((member) => {
          const databaseIds = { 3: 'u3', 4: 'u4' };
          return databaseIds[member.id] || String(member.id);
        }),
        milestones: (p.milestones || [])
          .map((m) => m.title)
          .join('\n')
      });
    } catch (error) {
      setErrors({ team: error.message });

      setForm({
        ...p,
        team: [],
        milestones: (p.milestones || [])
          .map((m) => m.title)
          .join('\n')
      });
    }
  };

  const validate = () => {
    const e = {};

    if (!form.name.trim()) {
      e.name = 'Enter a project name.';
    }

    if (!form.clientId) {
      e.clientId = 'Choose a client.';
    }

    if (!form.managerId) {
      e.managerId = 'Choose a project manager.';
    }

    if (!form.start || !form.due) {
      e.due = 'Enter start and due dates.';
    } else if (form.due < form.start) {
      e.due = 'Due date must be on or after the start date.';
    }

    if (form.budget === '' || Number(form.budget) < 0) {
      e.budget = 'Enter a budget of 0 or more.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (ev) => {
    ev.preventDefault();

    if (!validate()) return;

    const old = byId(db.projects, form.id);

    // The database currently has one client and one manager.
    const clientIds = { c1: 1 };
    const managerIds = { u2: 2 };

    if (!old && !clientIds[form.clientId]) {
      setErrors({
        clientId: 'This client has not been added to the database yet.'
      });
      return;
    }

    if (!old && !managerIds[form.managerId]) {
      setErrors({
        managerId: 'This manager has not been added to the database yet.'
      });
      return;
    }

    const milestones = form.milestones
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((title) => ({
        title,
        done: Boolean(
          old?.milestones.find((m) => m.title === title)?.done
        )
      }));

    const record = {
      ...form,
      name: form.name.trim(),
      budget: Number(form.budget),
      milestones
    };

    try {
      let projectId = old
        ? Number(String(old.id).replace('p', ''))
        : null;

      if (!old) {
        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: record.name,
            description: record.description,
            clientId: clientIds[record.clientId],
            managerId: managerIds[record.managerId],
            start: record.start,
            due: record.due,
            status: record.status
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Could not save project.');
        }

        projectId = Number(result.projectId);
        record.id = `p${projectId}`;
      }

      const memberIds = record.team
        .map((id) => {
          const user = db.users.find(
            (u) => String(u.id) === String(id)
          );

          if (!user) return null;

          // Map local employee IDs to their MySQL IDs.
          const databaseIds = {
            u3: 3,
            u4: 4
          };

          return databaseIds[String(user.id)] ?? null;
        })
        .filter((id) => id !== null);

      const memberResponse = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/members`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ memberIds })
        }
      );

      const memberResult = await memberResponse.json();

      if (!memberResponse.ok) {
        throw new Error(
          memberResult.message || 'Could not save team members.'
        );
      }

      update((d) => {
        if (old) {
          d.projects = d.projects.map((p) =>
            p.id === old.id ? record : p
          );
        } else {
          d.projects.push({
            ...record,
            archived: false
          });
        }
      }, `${old ? 'Updated' : 'Created'} project "${record.name}"`);

      const response = await fetch(`${API_BASE_URL}/api/projects`);

      if (response.ok) {
        setApiProjects(await response.json());
      }

      setApiError('');
      setForm(null);

    } catch (error) {
      setApiError(error.message);
    }
  };

  const toggleArchive = async (p) => {
    try {
      const archived = !p.archived;

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${p.id}/archive`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ archived })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not update project.');
      }

      await loadProjects();

    } catch (error) {
      setApiError(error.message);
    }
  };

  const toggleMilestone = (p, i) =>
    update(
      (d) => {
        const project = byId(d.projects, p.id);

        if (project && project.milestones[i]) {
          project.milestones[i].done = !project.milestones[i].done;
        }
      },
      `Updated milestone on "${p.name}"`
    );

  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>

        {canManage && (
          <button className="btn" onClick={() => startEdit(null)}>
            <Plus size={16} /> New project
          </button>
        )}
      </div>

      {apiError && (
        <p className="err">Backend error: {apiError}</p>
      )}

      <p className="muted">
        Database connection: {apiError
          ? 'Failed'
          : apiProjects.length > 0
            ? 'Connected'
            : 'Loading...'}
        {!apiError && ` (${apiProjects.length} projects loaded)`}
      </p>

      {form && (
        <form className="panel form-grid" onSubmit={save}>
          <h2>{form.id ? 'Edit project' : 'New project'}</h2>

          <label>
            Project name
            <input value={form.name} onChange={set('name')} />
            {errors.name && <small className="err">{errors.name}</small>}
          </label>

          <label>
            Client
            <select value={form.clientId} onChange={set('clientId')}>
              <option value="">Select…</option>
              {db.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.clientId && <small className="err">{errors.clientId}</small>}
          </label>

          <label>
            Project manager
            <select value={form.managerId} onChange={set('managerId')}>
              <option value="">Select…</option>
              {db.users.filter((u) => u.role === 'manager').map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {errors.managerId && <small className="err">{errors.managerId}</small>}
          </label>

          <label>
            Status
            <select value={form.status} onChange={set('status')}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <label>
            Start date
            <input type="date" value={form.start} onChange={set('start')} />
          </label>

          <label>
            Due date
            <input type="date" value={form.due} onChange={set('due')} />
            {errors.due && <small className="err">{errors.due}</small>}
          </label>

          <label>
            Budget ({COMPANY.currency})
            <input
              type="number"
              min="0"
              value={form.budget}
              onChange={set('budget')}
            />
            {errors.budget && <small className="err">{errors.budget}</small>}
          </label>

          <fieldset>
            <legend>Team members</legend>

            {db.users.filter((u) => u.role === 'employee').map((u) => (
              <label key={u.id} className="check">
                <input
                  type="checkbox"
                  checked={form.team.includes(u.id)}
                  onChange={() => toggleMember(u.id)}
                />
                {' '}{u.name}
              </label>
            ))}
          </fieldset>

          <label className="wide">
            Description
            <textarea
              rows="2"
              value={form.description}
              onChange={set('description')}
            />
          </label>

          <label className="wide">
            Milestones (one per line)
            <textarea
              rows="3"
              value={form.milestones}
              onChange={set('milestones')}
            />
          </label>

          <div className="wide actions">
            <button className="btn" type="submit">Save project</button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setForm(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <input
          placeholder="Search projects"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {canManage && (
          <label className="check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            {' '}Show archived
          </label>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Due</th>
              {canManage && <th></th>}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="muted">
                  No projects match. {canManage && 'Create one with “New project”.'}
                </td>
              </tr>
            )}

            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <button className="link" onClick={() => setOpenId(p.id)}>
                    {p.name}
                  </button>
                </td>

                <td>{p.clientName || '—'}</td>
                <td><Badge text={p.status} /></td>
                <td>{projectProgress(p, db.tasks)}%</td>

                <td className={isOverdue(p.due, p.status) ? 'err' : ''}>
                  {p.due}
                </td>

                {canManage && (
                  <td className="actions">
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      className="icon-btn"
                      title={p.archived ? 'Restore' : 'Archive'}
                      onClick={() => toggleArchive(p)}
                    >
                      <Archive size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {opened && (
        <section className="panel">
          <h2>{opened.name}</h2>
          <p>{opened.description || 'No description.'}</p>

          <p className="muted">
            Manager: {byId(db.users, opened.managerId)?.name}
            {' · '}
            Team: {opened.team.map((id) => byId(db.users, id)?.name).join(', ') || 'none'}
            {' · '}
            Budget: {COMPANY.currency} {money(opened.budget)}
          </p>

          <h3>Milestones</h3>

          {opened.milestones.length === 0 && (
            <p className="muted">No milestones yet.</p>
          )}

          {opened.milestones.map((m, i) => (
            <label key={m.title} className="check">
              <input
                type="checkbox"
                checked={m.done}
                disabled={!canManage}
                onChange={() => toggleMilestone(opened, i)}
              />
              {' '}{m.title}
            </label>
          ))}
        </section>
      )}
    </>
  );
}
