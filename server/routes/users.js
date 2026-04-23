import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import db from "../database/db.js";
import { authenticationToken, reqireRole } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { ADDRGETNETWORKPARAMS } from "dns/promises";

const router = express.Router();

// Validation rules
const userValidation = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("full_name").notEmpty().withMessage("Full name is reqired"),
  body("role").optional().isIn(["admin", "manager", "accountant", "user"]),
];

// Get all users (admin only)
router.get(
  "/",
  authenticationToken,
  reqireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const sql = `SELECT id, username, email, full_name, role, is_active, last_login, created_at
  FROM users ORDER BY created_at DESC`;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }
      res.json(rows);
    });
  }),
);

// Get user by id
router.get(
  "/:id",
  authenticationToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    //  Check permission
    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      throw new AppError("You can only view your own profile", 403);
    }

    const sql = `SELECT id, username, email, full_name, role, is_active, last_login, created_at 
    FROM users WHERE id =?`;

    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (!row) {
        throw new AppError("User not found", 404);
      }

      res.json(row);
    });
  }),
);

// Create user (admin only)
router.post(
  "/",
  authenticationToken,
  reqireRole("admin"),
  userValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password, full_name, role, is_active } = req.body;

    // Check if user exists
    const checkSql = `SELECT id FROM users WHERE username = ? OR email = ?`;
    db.get(checkSql, [username, email], async (err, row) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Username or email already exists" });
      }

      // Hash password
      const hashedPassword = password
        ? await bcrypt.hash(password, 10)
        : await bcrypt.hash("changeme123", 10);

      const insertSql = `INSERT INTO users (username, email, password, full_name, role, is_active ) VALUES (?, ?, ?, ?, ?, ?)`;

      db.run(
        insertSql,
        [
          username,
          email,
          hashedPassword,
          full_name,
          role || "user",
          is_active !== false ? 1 : 0,
        ],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            throw new AppError("Internal server error", 500);
          }
          const userId = this.lastID;

          // Log  creation
          const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
          VALUES (?, 'CREATE', 'users', ?)`;
          db.run(auditSql, [req.user, userId]);

          res
            .status(201)
            .json({ id: userId, message: "User created successfully" });
        },
      );
    });
  }),
);

// Update user (admin can update any user, others can update only their profile)
router.put(
  "/:id",
  authenticationToken,
  userValidation,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, email, full_name, role, is_active } = req.body;

    // Check permission
    if (req.user.role !== "admin" && req.user.id !== parseInt(id)) {
      throw new AppError("You can only update your own profile", 403);
    }

    // Build update query dynamically
    let updates = [];
    let values = [];
    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (role && req.user.role === "admin") {
      updates.push("role = ?");
      values.push(role);
    }
    if (is_active !== undefined && req.user.role === "admin") {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, values, function (err) {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (this.changes === 0) {
        throw new AppError("User not found", 404);
      }

      // Log update
      const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
      VALUES (?, 'UPDATE', 'users', ?)`;
      db.run(auditSql, [req.user.id, id]);
    });
  }),
);

// Delete user (admin only)
router.delete(
  "/:id",
  authenticationToken,
  reqireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === parseInt(id)) {
      throw new AppError("You cannot delete your own account", 400);
    }
    const sql = `DELETE FROM users WHERE id = ?`;

    db.run(sql, [id], function (err) {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (this.changes === 0) {
        throw new AppError("User not found", 404);
      }

      // Log deletion
      const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
      VALUES (?, 'DELETE', 'users', ?)`;
      db.run(auditSql, [req.user.id, id]);
      res.json({ message: "User deleted successfully" });
    });
  }),
);

export default router;
