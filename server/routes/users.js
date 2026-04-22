import express from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import db from "../database/db.js";
import { authenticationToken, reqireRole } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

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
  }),
);
