import sqlite3 from "sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { resolve } from "dns";
import { Result } from "express-validator";

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const dbPath = join(_dirname, "./accounting.db");

// Enable verbose mode for better error messages
sqlite3.verbose();

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database at", dbPath);
  }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON");

// Promise wrapper for db operations
export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (Err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const dbExec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Initialize database with schema
export const initDatabase = async (schemaPath) => {
  try {
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await dbExec(schema);
    console.log("Database schema initialized successfully");
  } catch (err) {
    console.error("Error initialzing database schema", err);
    throw err;
  }
};

export default db;
