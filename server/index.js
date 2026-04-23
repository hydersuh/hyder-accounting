import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import db, { initDatabase } from "./database/db.js";
import {
  limiter,
  requestLogger,
  sanitiziInput,
  securityHeaders,
  sqlInjectionPrevention,
  xssProtection,
} from "./middleware/security.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authenticationToken } from "./middleware/auth.js";

// Load environmwnt variables

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ================MIDDLEWARE===================

// Security headers
app.use(securityHeaders);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

// Rate Limiting
app.use("/api", limiter);

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Security middleware
app.use(xssProtection);
app.use(sqlInjectionPrevention);
app.use(sanitiziInput);

// Make db available to routes
app.set("db", db);

// =======================ROUTES=======================

// Public routes
import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);

// Protected routes (require authentication)
import userRoutes from "./routes/users.js";

// Apply authentication middleware to all user routes
app.use("/api/users", authenticationToken, userRoutes);

// ===========s============ERROR HANDLING================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ======================START SERVER==================

const startServer = async () => {
  try {
    // Initialize database schema
    const schemaPath = path.join(__dirname, "./database/complete_schema.sql");
    await initDatabase(schemaPath);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();

export default app;
