# Bluepick Consulting Firm | Project Management System

Design and Development of a Project Management System for Bluepick Consulting Firm.
Diploma in Business Information Technology project. Built with React, Vite, React Router, Lucide icons and LocalStorage.

## Run it
```bash
npm install
npm run dev
```
Open the address Vite prints (usually http://localhost:5173).

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Administrator | admin@bluepick.test | Admin@123 |
| Project Manager | manager@bluepick.test | Manager@123 |
| Employee | employee@bluepick.test | Employee@123 |
| Client | client@bluepick.test | Client@123 |

## Structure
- `src/config/company.js`: company name and branding (change it here only)
- `src/services/storage.js`: LocalStorage + sample data (swap for API calls later)
- `src/context/AppContext.jsx`: login, role-based data scope, `update()` with activity log
- `src/pages/`: Login, Dashboard, Projects, Tasks, Reports, Users
- `src/utils/helpers.js`: constants, date and CSV helpers

## Limitations
- Passwords are stored in plain text in the browser, and role checks only hide screens. Production needs a backend with hashed passwords and server-side authorization.
- To reset the demo data, clear this site's LocalStorage in the browser.
