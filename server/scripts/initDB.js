import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const dbPath = join(_dirname, "../database/accounting.db");
const schemaPath = join(_dirname, "../../database/complete_schema.sql");

// Enable verbose mode
sqlite3.verbose();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database: ", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database");
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Read and execute schema
const schema = fs.readFileSync(schemaPath, "utf-8");

db.exec(schema, async (err) => {
  if (err) {
    console.error("Error executing schema:", err);
    process.exit(1);
  }
  console.log("Dataase schema created successfully");

  // Create default admin user if not exists
  const adminPassword = await bcrypt.hash("admin123", 10);

  db.run(
    `INSERT OR IGNORE INTO users (username,email, password_hash, full_name, role, is_active)
    VALUES ('admin', 'admin@accounting.com,', ?,'System Adminstrator', 'admin',1)`,
    [adminPassword],
    (err) => {
      if (err) {
        console.error("Error creating admin user:", err);
      } else {
        console.log(
          "Default admin user created (username: admin, password: admin123 )",
        );
      }

      // Close database
      db.close((err) => {
        if (err) {
          console.error("Error closing database:", err);
        } else {
          console.log("Database initialization complete");
        }
      });
    },
  );
});
