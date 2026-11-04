import { useApp } from '../context/AppContext';
import { COMPANY } from '../config/company';
import { TASK_STATUSES, ROLES, isClosed, isOverdue, projectProgress, today } from '../utils/helpers';

export default function Dashboard() {
  const { db, user, projects, tasks } = useApp();
  const live = projects.filter((p) => !p.archived);
  const openTasks = tasks.filter((t) => t.status !== 'Completed');

  const stats = [
    ['Total projects', live.length],
    ['Active projects', live.filter((p) => p.status === 'In Progress').length],
    ['Completed projects', live.filter((p) => p.status === 'Completed').length],
    ['Overdue projects', live.filter((p) => isOverdue(p.due, p.status)).length],
    ['Total tasks', tasks.length],
    ['Pending tasks', openTasks.length],
    ['Completed tasks', tasks.length - openTasks.length],
    ['Overdue tasks', tasks.filter((t) => isOverdue(t.due, t.status)).length],
  ];

  const upcoming = [
    ...live.filter((p) => !isClosed(p.status)).map((p) => ({ id: p.id, kind: 'Project', label: p.name, due: p.due })),
    ...openTasks.map((t) => ({ id: t.id, kind: 'Task', label: t.title, due: t.due })),
  ].filter((d) => d.due >= today()).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);

  const maxCount = Math.max(1, ...TASK_STATUSES.map((s) => tasks.filter((t) => t.status === s).length));

  return (
    <>
      <h1>{COMPANY.dashboardHeading}</h1>
      <p className="muted">Signed in as {ROLES[user.role]}. Figures below are calculated from your stored records.</p>
      <div className="cards">
        {stats.map(([label, value]) => (
          <div className="card" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Project progress</h2>
          {live.length === 0 && <p className="muted">No projects yet.</p>}
          {live.map((p) => {
            const pct = projectProgress(p, db.tasks);
            return (
              <div className="bar-row" key={p.id}>
                <span>{p.name}</span>
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                <b>{pct}%</b>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <h2>Task status</h2>
          {TASK_STATUSES.map((s) => {
            const n = tasks.filter((t) => t.status === s).length;
            return (
              <div className="bar-row" key={s}>
                <span>{s}</span>
                <div className="bar"><i style={{ width: `${(n / maxCount) * 100}%` }} /></div>
                <b>{n}</b>
              </div>
            );
          })}
        </section>
        <section className="panel">
          <h2>Upcoming deadlines</h2>
          {upcoming.length === 0 && <p className="muted">Nothing due soon.</p>}
          <ul className="list">{upcoming.map((d) => <li key={d.id}><span>{d.kind}: {d.label}</span><b>{d.due}</b></li>)}</ul>
        </section>
        {['admin', 'manager'].includes(user.role) && (
          <section className="panel">
            <h2>Recent activity</h2>
            <ul className="list">
              {db.activity.slice(0, 6).map((a) => (
                <li key={a.id}><span>{a.text} <small className="muted">by {a.by}</small></span><b>{a.at.slice(0, 10)}</b></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
