export const ROLES = { admin: 'Administrator', manager: 'Project Manager', employee: 'Employee', client: 'Client' };
export const PROJECT_STATUSES = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
export const TASK_STATUSES = ['To Do', 'In Progress', 'Under Review', 'Completed', 'Blocked'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const byId = (list, id) => list.find((x) => x.id === id);
export const money = (n) => Number(n || 0).toLocaleString('en-KE');
export const isClosed = (status) => status === 'Completed' || status === 'Cancelled';
export const isOverdue = (due, status) => Boolean(due) && due < today() && !isClosed(status);

// Progress is derived from the project's tasks so it always matches the stored records.
export function projectProgress(project, allTasks) {
  const tasks = allTasks.filter((t) => t.projectId === project.id);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100);
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const heads = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [heads, ...rows.map((r) => heads.map((h) => r[h]))].map((r) => r.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
