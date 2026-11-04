const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bluepick_db",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Check database connection
(async () => {
  try {
    const [results] = await db.query("SELECT 1 AS test");
    console.log("Database connection successful:", results);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
})();

// BASIC ROUTES

app.get("/", (req, res) => {
  res.send("Bluepick backend is running!");
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Bluepick backend is connected!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS databaseName"
    );

    res.json({
      success: true,
      message: "MySQL connection successful!",
      database: rows[0].databaseName
    });
  } catch (error) {
    console.error("MySQL error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==========================================
// PROJECT ROUTES
// ==========================================

// Fetch projects
app.get("/api/projects", async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.start_date,
        p.deadline,
        p.status,
        p.client_id,
        p.manager_id,
        c.client_name
      FROM projects p
      LEFT JOIN clients c
        ON p.client_id = c.client_id
      ORDER BY p.project_id DESC
    `);

    res.json(projects);

  } catch (error) {
    console.error("Projects error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects."
    });
  }
});

// Create project
app.post("/api/projects", async (req, res) => {
  try {
    const {
      name,
      description,
      clientId,
      managerId,
      start,
      due,
      status
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required."
      });
    }

    if (
      !Number.isInteger(Number(clientId)) ||
      !Number.isInteger(Number(managerId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid database client and manager IDs are required."
      });
    }

    const allowedStatuses = [
      "Planning",
      "In Progress",
      "On Hold",
      "Completed",
      "Cancelled",
      "Pending"
    ];

    const dbStatus = allowedStatuses.includes(status)
      ? status
      : "Planning";

    const [result] = await db.query(
      `INSERT INTO projects
       (project_name, description, client_id, manager_id,
        start_date, deadline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || null,
        Number(clientId),
        Number(managerId),
        start || null,
        due || null,
        dbStatus
      ]
    );

    res.status(201).json({
      success: true,
      message: "Project created successfully.",
      projectId: result.insertId
    });

  } catch (error) {
    console.error("Create project error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create project."
    });
  }
});

// Get project members
app.get("/api/projects/:id/members", async (req, res) => {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "Invalid project ID."
      });
    }

    const [members] = await db.query(
      `SELECT u.id, u.username, u.role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY u.username`,
      [projectId]
    );

    res.json(members);

  } catch (error) {
    console.error("Fetch project members error:", error.message);

    res.status(500).json({
      message: "Failed to fetch project members."
    });
  }
});

// Save project members
app.put("/api/projects/:id/members", async (req, res) => {
  let connection;

  try {
    connection = await db.getConnection();

    const projectId = Number(req.params.id);
    const { memberIds } = req.body;

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "Invalid project ID."
      });
    }

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({
        message: "Member IDs must be an array."
      });
    }

    const ids = [...new Set(memberIds.map(Number))];

    if (ids.some(id => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({
        message: "Invalid member ID."
      });
    }

    await connection.beginTransaction();

    const [project] = await connection.query(
      "SELECT project_id FROM projects WHERE project_id = ?",
      [projectId]
    );

    if (project.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Project not found."
      });
    }

    if (ids.length > 0) {
      const [users] = await connection.query(
        `SELECT id FROM users
         WHERE role = 'employee' AND id IN (?)`,
        [ids]
      );

      if (users.length !== ids.length) {
        await connection.rollback();

        return res.status(400).json({
          message: "One or more selected members are not employees."
        });
      }
    }

    await connection.query(
      "DELETE FROM project_members WHERE project_id = ?",
      [projectId]
    );

    if (ids.length > 0) {
      const values = ids.map(id => [projectId, id]);

      await connection.query(
        "INSERT INTO project_members (project_id, user_id) VALUES ?",
        [values]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Project members saved successfully."
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError.message);
      }
    }

    console.error("Save project members error:", error.message);

    res.status(500).json({
      message: "Failed to save project members."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Archive or restore project
app.put("/api/projects/:id/archive", async (req, res) => {
  try {
    console.log("ARCHIVE ROUTE HIT");

    const projectId = Number(req.params.id);
    const { archived } = req.body;

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "Invalid project ID."
      });
    }

    if (typeof archived !== "boolean") {
      return res.status(400).json({
        message: "Archived must be true or false."
      });
    }

    const [result] = await db.query(
      "UPDATE projects SET archived = ? WHERE project_id = ?",
      [archived ? 1 : 0, projectId]
    );

    console.log("ARCHIVE UPDATE:", {
      projectId,
      archived,
      affectedRows: result.affectedRows
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Project not found."
      });
    }

    res.json({
      success: true,
      message: archived
        ? "Project archived successfully."
        : "Project restored successfully."
    });

  } catch (error) {
    console.error("Archive project error:", error.message);

    res.status(500).json({
      message: "Failed to update project archive status."
    });
  }
});

// ==========================================
// TASK ROUTES
// ==========================================

// Fetch tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT
        t.task_id,
        t.project_id,
        p.project_name,
        t.assigned_to,
        u.username AS assigned_employee,
        t.task_name,
        t.description,
        t.due_date,
        t.status,
        t.created_at
      FROM tasks t
      LEFT JOIN projects p
        ON t.project_id = p.project_id
      LEFT JOIN users u
        ON t.assigned_to = u.id
      ORDER BY t.task_id DESC
    `);

    res.json(tasks);

  } catch (error) {
    console.error("Tasks error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load tasks from MySQL."
    });
  }
});

// Create task
app.post("/api/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      assigneeId,
      due,
      status
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required."
      });
    }

    if (
      !Number.isInteger(Number(projectId)) ||
      !Number.isInteger(Number(assigneeId)) ||
      Number(projectId) <= 0 ||
      Number(assigneeId) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid database project and employee IDs are required."
      });
    }

    const allowedStatuses = [
      "Pending",
      "In Progress",
      "Completed"
    ];

    const dbStatus = allowedStatuses.includes(status)
      ? status
      : "Pending";

    const [result] = await db.query(
      `INSERT INTO tasks
       (project_id, assigned_to, task_name, description, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(projectId),
        Number(assigneeId),
        title.trim(),
        description || null,
        due || null,
        dbStatus
      ]
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      taskId: result.insertId
    });

  } catch (error) {
    console.error("Create task error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create task."
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`Bluepick backend running on port ${PORT}`);
});