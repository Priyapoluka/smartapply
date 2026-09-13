const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = 5000;
const JWT_SECRET = "smartapply_secret_key";

app.use(cors());
app.use(express.json());

const db = new Database("smartapply.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_url TEXT,
    status TEXT DEFAULT 'Applied',
    applied_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

app.get("/", (req, res) => {
  res.json({ message: "SmartApply API is running 🚀" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
      )
      .run(name, email, hashedPassword);

    res.status(201).json({
      message: "Registration successful",
      userId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

app.get("/api/applications", authenticate, (req, res) => {
  const applications = db
    .prepare(`
      SELECT * FROM applications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    .all(req.user.userId);

  res.json(applications);
});

app.post("/api/applications", authenticate, (req, res) => {
  const {
    company,
    job_title,
    job_url,
    status,
    applied_date,
    notes
  } = req.body;

  if (!company || !job_title) {
    return res.status(400).json({
      message: "Company and job title are required"
    });
  }

  const result = db
    .prepare(`
      INSERT INTO applications
      (user_id, company, job_title, job_url, status, applied_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.user.userId,
      company,
      job_title,
      job_url || "",
      status || "Applied",
      applied_date || "",
      notes || ""
    );

  res.status(201).json({
    message: "Application added",
    id: result.lastInsertRowid
  });
});

app.put("/api/applications/:id", authenticate, (req, res) => {
  const {
    company,
    job_title,
    job_url,
    status,
    applied_date,
    notes
  } = req.body;

  const result = db
    .prepare(`
      UPDATE applications
      SET company = ?, job_title = ?, job_url = ?, status = ?,
          applied_date = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(
      company,
      job_title,
      job_url || "",
      status,
      applied_date || "",
      notes || "",
      req.params.id,
      req.user.userId
    );

  if (result.changes === 0) {
    return res.status(404).json({
      message: "Application not found"
    });
  }

  res.json({ message: "Application updated" });
});

app.delete("/api/applications/:id", authenticate, (req, res) => {
  const result = db
    .prepare(`
      DELETE FROM applications
      WHERE id = ? AND user_id = ?
    `)
    .run(req.params.id, req.user.userId);

  if (result.changes === 0) {
    return res.status(404).json({
      message: "Application not found"
    });
  }

  res.json({ message: "Application deleted" });
});

app.listen(PORT, () => {
  console.log(`SmartApply API running at http://localhost:${PORT}`);
});