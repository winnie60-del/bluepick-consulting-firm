
import API_BASE_URL from '../config/api';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Badge from '../components/Badge';
import { PRIORITIES, TASK_STATUSES, byId, isOverdue, today, uid } from '../utils/helpers';

const EMPTY = {
  title: '',
  description: '',
  projectId: '',
  assigneeId: '',
  priority: 'Medium',
  status: 'To Do',
  start: '',
  due: ''
};

export default function Tasks() {
  const { db, user, projects, tasks, update } = useApp();

  const [apiTasks, setApiTasks] = useState([]);
  const [apiError, setApiError] = useState('');

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`);

      if (!response.ok) {
        throw new Error('Could not load tasks from MySQL.');
      }

      const data = await response.json();

      setApiTasks(data.map((t) => ({
        id: String(t.task_id),
        title: t.task_name,
        description: t.description || '',
        projectId: String(t.project_id),
        projectName: t.project_name || '',
        assigneeId: t.assigned_to == null ? '' : String(t.assigned_to),
        assigneeName: t.assignee_name || '',
        priority: 'Medium',
        status: t.status === 'Pending' ? 'To Do' : t.status,
        start: '',
        due: t.due_date ? String(t.due_date).slice(0, 10) : '',
        notes: []
      })));

      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const canManage = ['admin', 'manager'].includes(user.role);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState('');

  const rows = apiTasks.filter((t) =>
    (!status || t.status === status) &&
    (!projectId || t.projectId === projectId) &&
    t.title.toLowerCase().includes(q.toLowerCase())
  );

  const opened = byId(apiTasks, openId);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.value });

  const save = async (ev) => {
    ev.preventDefault();

    const e = {};

    if (!form.title.trim()) e.title = 'Enter a task title.';
    if (!form.projectId) e.projectId = 'Choose a project.';
    if (!form.assigneeId) e.assigneeId = 'Assign an employee.';
    if (!form.due) e.due = 'Enter a due date.';
    else if (form.start && form.due < form.start) {
      e.due = 'Due date must be on or after the start date.';
    }

    setErrors(e);

    if (Object.keys(e).length) return;

    const old = byId(db.tasks, form.id);

    // Map the current demo IDs to the real MySQL IDs.
    const projectIds = {
      p1: 1,
      p2: 2
    };

    const employeeIds = {
      u3: 3
    };

    if (!old && !projectIds[form.projectId]) {
      setErrors({
        projectId: 'This project has not been connected to MySQL yet.'
      });
      return;
    }

    if (!old && !employeeIds[form.assigneeId]) {
      setErrors({
        assigneeId: 'This employee has not been connected to MySQL yet.'
      });
      return;
    }

    try {
      if (!old) {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description,
            projectId: projectIds[form.projectId],
            assigneeId: employeeIds[form.assigneeId],
            due: form.due,
            status: form.status === 'To Do' ? 'Pending' : form.status
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Could not save task.');
        }

        await loadTasks();
      } else {
        setApiError('Editing existing tasks in MySQL is not connected yet.');
        return;
      }

      setForm(null);
      setApiError('');
    } catch (error) {
      setApiError(error.message);
    }
  };

  const setTaskStatus = (t, s) =>
    update(
      (d) => {
        byId(d.tasks, t.id).status = s;
      },
      `Marked "${t.title}" as ${s}`
    );

  const remove = (t) =>
    window.confirm(`Delete "${t.title}"?`) &&
    update(
      (d) => {
        d.tasks = d.tasks.filter((x) => x.id !== t.id);
      },
      `Deleted task "${t.title}"`
    );

  const addNote = (t) => {
    if (!note.trim()) return;

    update(
      (d) => {
        byId(d.tasks, t.id).notes.push({
          by: user.name,
          at: today(),
          text: note.trim()
        });
      },
      `Added a note on "${t.title}"`
    );

    setNote('');
  };

  return (
    <>
      <div className="page-head">
        <h1>Tasks</h1>

        {canManage && (
          <button
            className="btn"
            onClick={() => {
              setErrors({});
              setForm({ ...EMPTY });
            }}
          >
            <Plus size={16} /> New task
          </button>
        )}
      </div>

      {apiError && (
        <p className="err">Backend error: {apiError}</p>
      )}

      <p className="muted">
        Tasks database: {apiError ? 'Connection failed' : `${apiTasks.length} tasks loaded`}
      </p>

      {form && (
        <form className="panel form-grid" onSubmit={save}>
          <h2>{form.id ? 'Edit task' : 'New task'}</h2>

          <label>
            Title
            <input value={form.title} onChange={set('title')} />
            {errors.title && <small className="err">{errors.title}</small>}
          </label>

          <label>
            Project
            <select value={form.projectId} onChange={set('projectId')}>
              <option value="">Select…</option>
              {projects.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.projectId && <small className="err">{errors.projectId}</small>}
          </label>

          <label>
            Assign to
            <select value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Select…</option>
              {db.users.filter((u) => u.role === 'employee').map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {errors.assigneeId && <small className="err">{errors.assigneeId}</small>}
          </label>

          <label>
            Priority
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>

          <label>
            Status
            <select value={form.status} onChange={set('status')}>
              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
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

          <label className="wide">
            Description
            <textarea rows="2" value={form.description} onChange={set('description')} />
          </label>

          <div className="wide actions">
            <button className="btn" type="submit">Save task</button>
            <button className="btn ghost" type="button" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <input
          placeholder="Search tasks"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
              {canManage && <th></th>}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" className="muted">
                  No tasks match your filters.
                </td>
              </tr>
            )}

            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <button className="link" onClick={() => setOpenId(t.id)}>
                    {t.title}
                  </button>
                </td>

                <td>{t.projectName || '—'}</td>
                <td>{t.assigneeName || '—'}</td>
                <td><Badge text={t.priority} /></td>

                <td>
                  <select
                    value={t.status}
                    onChange={(e) => setTaskStatus(t, e.target.value)}
                  >
                    {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>

                <td className={isOverdue(t.due, t.status) ? 'err' : ''}>
                  {t.due}
                </td>

                {canManage && (
                  <td className="actions">
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => {
                        setErrors({});
                        setForm(t);
                      }}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => remove(t)}
                    >
                      <Trash2 size={16} />
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
          <h2>{opened.title}</h2>
          <p>{opened.description || 'No description.'}</p>

          <h3>Progress notes</h3>

          {opened.notes.length === 0 && (
            <p className="muted">No notes yet.</p>
          )}

          <ul className="list">
            {opened.notes.map((n, i) => (
              <li key={i}>
                <span>
                  {n.text} <small className="muted">— {n.by}</small>
                </span>
                <b>{n.at}</b>
              </li>
            ))}
          </ul>

          <div className="toolbar">
            <input
              placeholder="Add a progress note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn" onClick={() => addNote(opened)}>
              Add note
            </button>
          </div>
        </section>
      )}
    </>
  );
}
