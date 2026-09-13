const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "rfq_marketplace_secret";

app.use(cors());
app.use(express.json());

const db = new Database("rfq_marketplace.db");

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('buyer', 'supplier')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rfqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    deadline TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    quoted_price REAL NOT NULL,
    delivery_time TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rfq_id, supplier_id),
    FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

app.get("/", (req, res) => {
  res.json({ message: "RFQ Marketplace API is running 🚀" });
});

// ---------------- AUTH ----------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (!["buyer", "supplier"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(normalizedEmail);

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        name.trim(),
        normalizedEmail,
        hashedPassword,
        role
      );

    res.status(201).json({
      message: "Registration successful",
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());

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
      {
        userId: user.id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
});

// ---------------- AUTH MIDDLEWARE ----------------

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        message: `${role} access required`
      });
    }

    next();
  };
}

// ---------------- RFQs ----------------

// Supplier: browse available RFQs
app.get("/api/rfqs", authenticate, requireRole("supplier"), (req, res) => {
  const search = (req.query.search || "").trim();

  let rfqs;

  if (search) {
    rfqs = db.prepare(`
      SELECT rfqs.*, users.name AS buyer_name
      FROM rfqs
      JOIN users ON users.id = rfqs.buyer_id
      WHERE rfqs.deadline >= date('now')
        AND (
          rfqs.product_name LIKE ?
          OR rfqs.description LIKE ?
          OR rfqs.delivery_location LIKE ?
        )
      ORDER BY rfqs.created_at DESC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    rfqs = db.prepare(`
      SELECT rfqs.*, users.name AS buyer_name
      FROM rfqs
      JOIN users ON users.id = rfqs.buyer_id
      WHERE rfqs.deadline >= date('now')
      ORDER BY rfqs.created_at DESC
    `).all();
  }

  res.json(rfqs);
});

// Buyer: own RFQs
app.get(
  "/api/my-rfqs",
  authenticate,
  requireRole("buyer"),
  (req, res) => {
    const rfqs = db
      .prepare(`
        SELECT *
        FROM rfqs
        WHERE buyer_id = ?
        ORDER BY created_at DESC
      `)
      .all(req.user.userId);

    res.json(rfqs);
  }
);

// Buyer: create RFQ
app.post(
  "/api/rfqs",
  authenticate,
  requireRole("buyer"),
  (req, res) => {
    const {
      product_name,
      description,
      quantity,
      delivery_location,
      deadline
    } = req.body;

    if (
      !product_name ||
      !description ||
      !quantity ||
      !delivery_location ||
      !deadline
    ) {
      return res.status(400).json({
        message: "All RFQ fields are required"
      });
    }

    const result = db
      .prepare(`
        INSERT INTO rfqs
        (buyer_id, product_name, description, quantity,
         delivery_location, deadline)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        req.user.userId,
        product_name.trim(),
        description.trim(),
        quantity.trim(),
        delivery_location.trim(),
        deadline
      );

    res.status(201).json({
      message: "RFQ created successfully",
      id: result.lastInsertRowid
    });
  }
);

// Buyer: edit RFQ
app.put(
  "/api/rfqs/:id",
  authenticate,
  requireRole("buyer"),
  (req, res) => {
    const {
      product_name,
      description,
      quantity,
      delivery_location,
      deadline
    } = req.body;

    if (
      !product_name ||
      !description ||
      !quantity ||
      !delivery_location ||
      !deadline
    ) {
      return res.status(400).json({
        message: "All RFQ fields are required"
      });
    }

    const result = db
      .prepare(`
        UPDATE rfqs
        SET product_name = ?,
            description = ?,
            quantity = ?,
            delivery_location = ?,
            deadline = ?
        WHERE id = ? AND buyer_id = ?
      `)
      .run(
        product_name.trim(),
        description.trim(),
        quantity.trim(),
        delivery_location.trim(),
        deadline,
        req.params.id,
        req.user.userId
      );

    if (result.changes === 0) {
      return res.status(404).json({
        message: "RFQ not found"
      });
    }

    res.json({
      message: "RFQ updated successfully"
    });
  }
);

// Buyer: delete RFQ
app.delete(
  "/api/rfqs/:id",
  authenticate,
  requireRole("buyer"),
  (req, res) => {
    const result = db
      .prepare(`
        DELETE FROM rfqs
        WHERE id = ? AND buyer_id = ?
      `)
      .run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "RFQ not found"
      });
    }

    res.json({
      message: "RFQ deleted successfully"
    });
  }
);

// Get one RFQ
app.get("/api/rfqs/:id", authenticate, (req, res) => {
  const rfq = db.prepare(`
    SELECT rfqs.*, users.name AS buyer_name
    FROM rfqs
    JOIN users ON users.id = rfqs.buyer_id
    WHERE rfqs.id = ?
  `).get(req.params.id);

  if (!rfq) {
    return res.status(404).json({
      message: "RFQ not found"
    });
  }

  // Buyer can only view their own RFQ and its quotations
  if (req.user.role === "buyer") {
    if (rfq.buyer_id !== req.user.userId) {
      return res.status(403).json({
        message: "You can only view your own RFQs"
      });
    }

    const quotations = db.prepare(`
      SELECT quotations.*, users.name AS supplier_name,
             users.email AS supplier_email
      FROM quotations
      JOIN users ON users.id = quotations.supplier_id
      WHERE quotations.rfq_id = ?
      ORDER BY quotations.created_at DESC
    `).all(req.params.id);

    return res.json({
      rfq,
      quotations
    });
  }

  // Supplier should not see competing supplier quotations
  const ownQuotation = db.prepare(`
    SELECT id, quoted_price, delivery_time, message, created_at
    FROM quotations
    WHERE rfq_id = ? AND supplier_id = ?
  `).get(req.params.id, req.user.userId);

  res.json({
    rfq,
    ownQuotation: ownQuotation || null
  });
});


// ---------------- QUOTATIONS ----------------

// Supplier: submit quotation
app.post(
  "/api/rfqs/:id/quotations",
  authenticate,
  requireRole("supplier"),
  (req, res) => {
    const {
      quoted_price,
      delivery_time,
      message
    } = req.body;

    if (
      quoted_price === undefined ||
      quoted_price === "" ||
      !delivery_time
    ) {
      return res.status(400).json({
        message: "Quoted price and delivery time are required"
      });
    }

    const price = Number(quoted_price);

    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({
        message: "Quoted price must be greater than 0"
      });
    }

    const rfq = db
      .prepare("SELECT * FROM rfqs WHERE id = ?")
      .get(req.params.id);

    if (!rfq) {
      return res.status(404).json({
        message: "RFQ not found"
      });
    }

    if (rfq.buyer_id === req.user.userId) {
      return res.status(403).json({
        message: "You cannot quote on your own RFQ"
      });
    }

    if (new Date(rfq.deadline) < new Date()) {
      return res.status(400).json({
        message: "This RFQ deadline has passed"
      });
    }

    try {
      const result = db
        .prepare(`
          INSERT INTO quotations
          (rfq_id, supplier_id, quoted_price, delivery_time, message)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          req.params.id,
          req.user.userId,
          price,
          delivery_time.trim(),
          message || ""
        );

      res.status(201).json({
        message: "Quotation submitted successfully",
        id: result.lastInsertRowid
      });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(400).json({
          message: "You have already submitted a quotation for this RFQ"
        });
      }

      console.error(error);
      res.status(500).json({
        message: "Server error"
      });
    }
  }
);

// Supplier: own quotations
app.get(
  "/api/my-quotations",
  authenticate,
  requireRole("supplier"),
  (req, res) => {
    const quotations = db
      .prepare(`
        SELECT
          quotations.*,
          rfqs.product_name,
          rfqs.description,
          rfqs.deadline,
          rfqs.delivery_location
        FROM quotations
        JOIN rfqs ON rfqs.id = quotations.rfq_id
        WHERE quotations.supplier_id = ?
        ORDER BY quotations.created_at DESC
      `)
      .all(req.user.userId);

    res.json(quotations);
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RFQ Marketplace API running on port ${PORT}`);
});