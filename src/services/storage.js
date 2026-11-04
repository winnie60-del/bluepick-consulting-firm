// All persistence lives here. Replace these two functions with API calls when a backend is added.
const DB_KEY = 'bluepick-pms-v1';
export const SESSION_KEY = 'bluepick-pms-session';

export function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw); // never overwrite saved records
  } catch {
    /* fall through to seed data */
  }
  const db = seed();
  saveDb(db);
  return db;
}

export function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function seed() {
  const task = (id, title, projectId, assigneeId, priority, status, start, due, notes = []) => ({
    id, title, description: '', projectId, assigneeId, priority, status, start, due, notes,
  });
  return {
    users: [
      { id: 'u1', name: 'Amina Otieno', email: 'admin@bluepick.test', password: 'Admin@123', role: 'admin' },
      { id: 'u2', name: 'Brian Mwangi', email: 'manager@bluepick.test', password: 'Manager@123', role: 'manager' },
      { id: 'u3', name: 'Esther Wanjiru', email: 'employee@bluepick.test', password: 'Employee@123', role: 'employee' },
      { id: 'u4', name: 'Kevin Njoroge', email: 'employee2@bluepick.test', password: 'Employee@123', role: 'employee' },
      { id: 'u5', name: 'Grace Achieng', email: 'client@bluepick.test', password: 'Client@123', role: 'client', clientId: 'c1' },
    ],
    clients: [
      { id: 'c1', name: 'Savanna Logistics Ltd' },
      { id: 'c2', name: 'Lakeview Hospitality' },
    ],
    projects: [
      { id: 'p1', name: 'ERP Process Review', description: 'Review and document current ERP workflows.', clientId: 'c1', managerId: 'u2', team: ['u3', 'u4'], start: '2026-08-01', due: '2026-11-30', budget: 450000, status: 'In Progress', archived: false, milestones: [{ title: 'Kick-off workshop', done: true }, { title: 'Findings report', done: false }] },
      { id: 'p2', name: 'Brand Strategy Refresh', description: 'Positioning and messaging update.', clientId: 'c2', managerId: 'u2', team: ['u4'], start: '2026-06-15', due: '2026-09-30', budget: 280000, status: 'In Progress', archived: false, milestones: [{ title: 'Market survey', done: true }] },
      { id: 'p3', name: 'Staff Training Plan', description: 'Design a training programme.', clientId: 'c1', managerId: 'u2', team: ['u3'], start: '2026-11-01', due: '2027-02-28', budget: 150000, status: 'Planning', archived: false, milestones: [] },
    ],
    tasks: [
      task('t1', 'Interview finance team', 'p1', 'u3', 'High', 'Completed', '2026-08-05', '2026-08-20', [{ by: 'Esther Wanjiru', at: '2026-08-19', text: 'All five interviews done.' }]),
      task('t2', 'Map procurement workflow', 'p1', 'u3', 'Medium', 'In Progress', '2026-09-01', '2026-10-30'),
      task('t3', 'Draft findings report', 'p1', 'u4', 'Urgent', 'To Do', '2026-10-01', '2026-10-05'),
      task('t4', 'Customer survey analysis', 'p2', 'u4', 'High', 'Under Review', '2026-07-01', '2026-09-15'),
      task('t5', 'Training needs assessment', 'p3', 'u3', 'Low', 'To Do', '2026-11-01', '2026-11-30'),
    ],
    activity: [{ id: 'a0', at: new Date().toISOString(), by: 'System', text: 'Sample data loaded' }],
  };
}
