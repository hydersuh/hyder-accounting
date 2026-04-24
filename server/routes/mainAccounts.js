import express from "express";
import { body, validationResult } from "express-validator";
import db from "../database/db.js";
import { authenticationToken, requirePermission } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation rules
const mainAccountValidation = [
  body("code").notEmpty().withMessage("Account code is required"),
  body("name").notEmpty().withMessage("Account name is required"),
  body("category")
    .isIn(["asset", "liability", "equity", "revenue", "expense"])
    .withMessage("Invalid account category"),
  body("normal_balance")
    .isIn(["DEBIT", "CREDIT"])
    .withMessage("Normal balance must be either debit or credit"),
];

// Get all main accounts
router.get(
  "/",
  authenticationToken,
  requirePermission("chart_of_accounts,read"),
  asyncHandler(async (req, res) => {
    const sql = `SELECT ma.*, u.username AS created_by_name FROM main_accounts ma LEFT JOIN users u ON ma.created_by = u.id ORDER BY ma.code`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Database error", 500);
      }
      res.json(rows);
    });
  }),
);

//  Get main account by ID
router.get(
  "/:id",
  authenticationToken,
  requirePermission("chart_of_accounts,read"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM main_accounts WHERE id = ? `;
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      res.json(row);
    });
  }),
);

// Create a new main account
router.post(
  "/",
  authenticationToken,
  requirePermission("chart_of_accounts.create"),
  mainAccountValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { code, name, category, normal_balance, decription, is_active } =
      req.body;
    const created_by = req.user.id;

    // Check if account code already exists
    const checkSql = `SELECT id FROM main_accounts WHERE code = ?`;
    db.get(checkSql, [code], (err, row) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }
      if (existing) {
        return res.status(400).json({ error: "Account code already exists" });
      }

      const insertSql = `INSERT INTO main_accounts (code, name, category, normal_balance, description, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(
        insertSql,
        [
          code,
          name,
          category,
          normal_balance,
          description,
          is_active ? 1 : 0,
          created_by,
        ],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            throw new AppError("Internal server error", 500);
          }

          // Log the creation action
          const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
        VALUES (?, 'CREATE', 'main_accounts', ?)`;
          db.run(auditSql, [created_by, this.lastID]);

          res.status(201).json({
            id: this.lastID,
            message: "Main account created successfully",
          });
        },
      );
    });
  }),
);

// Update main account
router.put(
  "/:id",
  authenticationToken,
  requirePermission("chart_of_accounts.update"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, name, category, normal_balance, description, is_active } =
      req.body;

    // Build the update query dynamically based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (code) {
      updateFields.push("code = ?");
      updateValues.push(code);
    }
    if (name) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }
    if (category) {
      updateFields.push("category = ?");
      updateValues.push(category);
    }
    if (normal_balance) {
      updateFields.push("normal_balance = ?");
      updateValues.push(normal_balance);
    }
    if (description) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(is_active ? 1 : 0);
    }

    values.push(id); // Add ID for WHERE clause

    const updateSql = `UPDATE main_accounts SET ${updates.join(", ")} WHERE id = ?`;
    db.run(updateSql, Values, function (err) {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (this.changes === 0) {
        throw new AppError("Main account not found", 404);
      }

      // Log the update action
      const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
        VALUES (?, 'UPDATE', 'main_accounts', ?)`;
      db.run(auditSql, [req.user.id, id]);

      res.json({ message: "Main account updated successfully" });
    });
  }),
);

// Delete main account
router.delete(
  "/:id",
  authenticationToken,
  requirePermission("chart_of_accounts.delete"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if the account is linked to any transactions
    const checkSql = `SELECT id FROM transactions WHERE main_account_id = ? LIMIT 1`;
    db.get(checkSql, [id], (err, hasSub) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }
      if (hasSub) {
        throw new AppError(
          "Cannot delete main account linked to sub accounts",
          400,
        );
      }

      const deleteSql = `DELETE FROM main_accounts WHERE id = ?`;
      db.run(deleteSql, [id], function (err) {
        if (err) {
          console.error("Database error:", err);
          throw new AppError("Internal server error", 500);
        }
        if (this.changes === 0) {
          throw new AppError("Main account not found", 404);
        }

        // Log the delete action
        const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id) 
        VALUES (?, 'DELETE', 'main_accounts', ?)`;
        db.run(auditSql, [req.user.id, id]);

        res.json({ message: "Main account deleted successfully" });
      });
    });
  }),
);

export default router;
