import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { COMPANY } from '../config/company';
import { TASK_STATUSES, byId, downloadCSV, isClosed, isOverdue, money, projectProgress, today } from '../utils/helpers';

// Each report turns real stored records into plain rows, so the table, CSV and print view always match.
const REPORTS = {
  'Project status': ({ db, projects }) => projects.filter((p) => !p.archived).map((p) => ({ Project: p.name, Client: byId(db.clients, p.clientId)?.name, Status: p.status, Due: p.due })),
  'Project progress': ({ db, projects }) => projects.filter((p) => !p.archived).map((p) => {
    const ts = db.tasks.filter((t) => t.projectId === p.id);
    return { Project: p.name, 'Tasks done': ts.filter((t) => t.status === 'Completed').length, 'Total tasks': ts.length, Progress: `${projectProgress(p, db.tasks)}%` };
  }),
  'Task completion': ({ tasks }) => TASK_STATUSES.map((s) => ({ Status: s, Tasks: tasks.filter((t) => t.status === s).length })),
  'Overdue tasks': ({ db, tasks }) => tasks.filter((t) => isOverdue(t.due, t.status)).map((t) => ({ Task: t.title, Project: byId(db.projects, t.projectId)?.name, Assignee: byId(db.users, t.assigneeId)?.name, Due: t.due })),
  'Employee workloads': ({ db, tasks }) => db.users.filter((u) => u.role === 'employee').map((u) => {
    const mine = tasks.filter((t) => t.assigneeId === u.id);
    return { Employee: u.name, 'Open tasks': mine.filter((t) => t.status !== 'Completed').length, Completed: mine.filter((t) => t.status === 'Completed').length, Overdue: mine.filter((t) => isOverdue(t.due, t.status)).length };
  }),
  'Upcoming deadlines': ({ projects, tasks }) => [
    ...projects.filter((p) => !p.archived && !isClosed(p.status)).map((p) => ({ Type: 'Project', Name: p.name, Due: p.due })),
    ...tasks.filter((t) => t.status !== 'Completed').map((t) => ({ Type: 'Task', Name: t.title, Due: t.due })),
  ].filter((r) => r.Due >= today()).sort((a, b) => a.Due.localeCompare(b.Due)),
  'Project budgets': ({ projects }) => projects.filter((p) => !p.archived).map((p) => ({ Project: p.name, [`Budget (${COMPANY.currency})`]: money(p.budget), Status: p.status })),
};

export default function Reports() {
  const ctx = useApp();
  const available = ctx.user.role === 'client' ? ['Project status', 'Project progress'] : Object.keys(REPORTS);
  const [type, setType] = useState(available[0]);
  const rows = REPORTS[type](ctx);
  const heads = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <>
      <div className="page-head no-print">
        <h1>Reports</h1>
        <div className="actions">
          <button className="btn ghost" onClick={() => downloadCSV(type.toLowerCase().replace(/\s+/g, '-'), rows)} disabled={!rows.length}><Download size={16} /> Export CSV</button>
          <button className="btn" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>
      </div>
      <div className="toolbar no-print"><select value={type} onChange={(e) => setType(e.target.value)}>{available.map((r) => <option key={r}>{r}</option>)}</select></div>
      <section className="panel">
        <h2>{COMPANY.name}: {type}</h2>
        <p className="muted">Generated {today()} by {ctx.user.name}</p>
        {rows.length === 0 ? <p className="muted">No records for this report yet.</p> : (
          <div className="table-wrap"><table><thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{heads.map((h) => <td key={h}>{r[h]}</td>)}</tr>)}</tbody></table></div>
        )}
      </section>
    </>
  );
}
