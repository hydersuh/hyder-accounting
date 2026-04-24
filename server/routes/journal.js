import express from "express";
import { body, validationResult } from "express-validator";
import db from "../database/db.js";
import { authenticationToken, requirePermission } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

const router = express.Router();

// Validation for journal entry
const journalEntryValidation = [
  body("entry_number").notEmpty().withMessage("Entry number is required"),
  body("entry_date").notEmpty().withMessage("Entry date is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one journal item is required"),
];

// Get all journal entries
router.get(
  "/",
  authenticationToken,
  requirePermission("journal.read"),
  asyncHandler(async (req, res) => {
    const sql = `SELECT je.*, u.username as created_by_name, b.name as branch_name 
               FROM journal_entries je 
               LEFT JOIN users u ON je.created_by = u.id 
               LEFT JOIN branches b ON je.branch_id = b.id 
               ORDER BY je.entry_date DESC, je.id DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }
      res.json(rows);
    });
  }),
);

// Get journal entry by id with items
router.get(
  "/:id",
  authenticationToken,
  requirePermission("journal.read"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get entry
    const entrySql = `SELECT je.*, u.username as created_by_name, b.name as branch_name 
                    FROM journal_entries je 
                    LEFT JOIN users u ON je.created_by = u.id 
                    LEFT JOIN branches b ON je.branch_id = b.id 
                    WHERE je.id = ?`;

    db.get(entrySql, [id], (err, entry) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (!entry) {
        throw new AppError("Journal entry not found", 404);
      }

      // Get items
      const itemsSql = `SELECT jei.*, l.code as ledger_code, l.name as ledger_name 
                      FROM journal_entry_items jei 
                      JOIN ledgers l ON jei.ledger_id = l.id 
                      WHERE jei.journal_entry_id = ?`;

      db.all(itemsSql, [id], (err, items) => {
        if (err) {
          console.error("Database error:", err);
          throw new AppError("Internal server error", 500);
        }

        res.json({ ...entry, items });
      });
    });
  }),
);

// Create journal entry
router.post(
  "/",
  authenticationToken,
  requirePermission("journal.create"),
  journalEntryValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
      entry_number,
      entry_date,
      reference_number,
      description,
      branch_id,
      items,
      created_by,
    } = req.body;
    const userId = created_by || req.userId;

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;

    items.forEach((item) => {
      totalDebit += parseFloat(item.debit_amount || 0);
      totalCredit += parseFloat(item.credit_amount || 0);
    });

    // Validate totals
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res
        .status(400)
        .json({ error: "Total debit must equal total credit" });
    }

    // Check if entry number exists
    const checkSql = "SELECT id FROM journal_entries WHERE entry_number = ?";
    db.get(checkSql, [entry_number], (err, existing) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (existing) {
        return res.status(409).json({ error: "Entry number already exists" });
      }

      // Insert entry
      const insertEntry = `INSERT INTO journal_entries  
                         (entry_number, entry_date, reference_number, description, total_debit, total_credit, branch_id, created_by)  
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      db.run(
        insertEntry,
        [
          entry_number,
          entry_date,
          reference_number || "",
          description,
          totalDebit,
          totalCredit,
          branch_id || null,
          userId,
        ],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            throw new AppError("Internal server error", 500);
          }

          const entryId = this.lastID;
          let processed = 0;

          // Insert items
          const insertItem = `INSERT INTO journal_entry_items  
                          (journal_entry_id, ledger_id, debit_amount, credit_amount, description, reference)  
                          VALUES (?, ?, ?, ?, ?, ?)`;

          items.forEach((item) => {
            db.run(
              insertItem,
              [
                entryId,
                item.ledger_id,
                item.debit_amount || 0,
                item.credit_amount || 0,
                item.description || "",
                item.reference || "",
              ],
              function (err) {
                if (err) {
                  console.error("Database error:", err);
                  throw new AppError("Internal server error", 500);
                }
                processed++;

                if (processed === items.length) {
                  // Log creation
                  const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id)  
                              VALUES (?, 'CREATE', 'journal_entries', ?)`;
                  db.run(auditSql, [userId, entryId]);

                  res.status(201).json({
                    id: entryId,
                    message: "Journal entry created successfully",
                  });
                }
              },
            );
          });
        },
      );
    });
  }),
);

// Post journal entry
router.post(
  "/:id/post",
  authenticationToken,
  requirePermission("journal.post"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get entry with items
    const getSql = `SELECT je.*, jei.* FROM journal_entries je 
                  JOIN journal_entry_items jei ON je.id = jei.journal_entry_id 
                  WHERE je.id = ? AND je.status = 'DRAFT'`;

    db.all(getSql, [id], (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        throw new AppError("Internal server error", 500);
      }

      if (rows.length === 0) {
        throw new AppError("Journal entry not found or already posted", 404);
      }
      const entry = rows[0];
      let processed = 0;

      // Update ledger balances
      rows.forEach((row) => {
        const updateLedger = `UPDATE ledgers  
                            SET current_balance = current_balance + ? - ?  
                            WHERE id = ?`;

        const debitChange = row.debit_amount || 0;
        const creditChange = row.credit_amount || 0;

        db.run(
          updateLedger,
          [debitChange, creditChange, row.ledger_id],
          function (err) {
            if (err) {
              console.error("Database error:", err);
              throw new AppError("Internal server error", 500);
            }

            processed++;

            if (processed === rows.length) {
              // Update entry status
              const updateEntry =
                'UPDATE journal_entries SET status = "POSTED" WHERE id = ?';

              db.run(updateEntry, [id], function (err) {
                if (err) {
                  console.error("Database error:", err);
                  throw new AppError("Internal server error", 500);
                }

                // Log posting
                const auditSql = `INSERT INTO audit_trail (user_id, action, table_name, record_id)  
                              VALUES (?, 'POST', 'journal_entries', ?)`;
                db.run(auditSql, [req.userId, id]);

                res.json({ message: "Journal entry posted successfully" });
              });
            }
          },
        );
      });
    });
  }),
);

export default router;
