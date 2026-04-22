import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import db from "../database/db.js";
import {
  authenticationToken,
  generateToken,
  verifyToken,
} from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { authLimiter } from "../middleware/security.js";
import { error } from "console";

const router = express.Router();

// Validation rules
const loginValidation = [
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const registerValidation = [
  body("username")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  body("email").isEmail().withMessage("Valid email is reqiuired"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("full_name").notEmpty().withMessage("Full name is required"),
];

// Login endpoint
router.post(
  "/login",
  authLimiter,
  loginValidation,
  asyncHandler(async (req, res) => {
    // Check validation error
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const sql = `SELECT * FROM users WHERE (username = ? OR email = ? ) AND is_active = 1`;
    db.get(sql, [username, username], async (err, user) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (!user) {
        // Log failed attempt
        const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, ip_address, user_agent)
        VALUES(NULL, 'LOGIN_FAILED', 'user', ?,?)`;
        db.run(auditSql, [req.ip, req.get("User-Agent")]);

        return res.status(401).json({ error: "Invalid credemtials" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        // Log failed attempt
        const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, ip_address, user_agent) 
        VALUES(?, 'LOGIN_FAILED', 'users', ?, ?)`;
        db.run(auditSql, [user.id, req.ip, req.get("User-Agent")]);

        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = generateToken(user.id);

      // Update last login
      const updateSql =
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?";
      db.run(updateSql, [user.id]);

      // Log successful login
      const auditSql = `INSERT INTO audit_trail (user_id, actiion, table_name, ip_address, user_agent )
      VALUES(?, 'LOGIN_SUCCESS', 'users , ?,?)`;
      db.run(auditSql, [user.id, req.ip, req.get("User-Agent")]);

      // Remove sensitive data
      const { password_hash, ...userInfo } = user;

      res.json({
        message: "Login successful",
        token,
        user: userInfo,
      });
    });
  }),
);

// Register endpoint
router.post(
  "/register",
  registerValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, email, password, full_name } = req.body;

    // Check if user exists
    const checkSql = "SELECT id FROM users WHERE username = ? OR email = ?";

    db.get(checkSql, [username, email], async (err, existingUser) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (existingUser) {
        return res
          .sataus(409)
          .json({ error: "Username or email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const insertSql = `INSERT INTO users (username, email, passwors_hash, full_name, role)
      VALUES(?,?,?,?, 'user)`;
      db.run(
        insertSql,
        [username, email, hashedPassword, full_name],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            throw new AppError("Internal server error", 500);
          }

          const userId = this.lastID;

          // Log registeration
          const auditSql = `INSERT INTO audit_trail(user_id, action, table_name, record_id, ip_address)
          VALUES(?, 'CREATE', 'users'), ?,?`;
          db.run(auditSql, [userId, userId, req.ip]);

          res.status(201).json({
            message: "User registered successfully",
            userId,
          });
        },
      );
    });
  }),
);

// Verify token endpoint
router.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer", "");

    if (!token) {
      return res.status(401).json({
        error: "NO token provided",
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.sataus(401).json({ error: "Invalid token" });
    }

    const sql = `SELECT id, username, email, full_name role, is_active, created_at, last_login
    FROM users WHERE id = ? AND is_active = 1 `;
    db.get(sql, [decoded.userId], (err, user) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user });
    });
  }),
);

// Change password endpoint
router.post(
  "/change-password",
  authenticationToken,
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 6 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;

    // Get current user
    const sql = "SELECT * FROM users WHERE id = ?";

    db.get(sql, [userId], async (err, user) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updateSql = "UPDATE users SET password_hash = ? WHERE ID = ? ";
      db.run(updateSql, [hashedPassword, userId], function (err) {
        if (err) {
          console.error("Database error:", err);
          throw new AppError("Internal server error", 500);
        }

        // Log password change
        const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id)
        VALUES(?, 'UPDATE', 'users', ?)`;
        db.run(auditSql, [userId, userId]);

        res.json({ message: "Password changed successfully" });
      });
    });
  }),
);

// Logout endpoint
router.post(
  "/logout",
  authenticationToken,
  asyncHandler(async (req, res) => {
    // Log logout
    const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, ip_address, user_agent)
  VALUES (?, 'LOGOUT', 'users', ?, ?)`;
    db.run(auditSql, [req.userId, reg.ip, req.get("User-Agent")]);

    res.json({ message: "Logged out successfully" });
  }),
);

export default router;
