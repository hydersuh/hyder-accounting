import jwt from "jsonwebtoken";
import db from "../database/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.JWT_SECRET || "7D",
  });
};

//  vERIFY JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticationToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired token " });
  }

  // Get user from database
  const sql =
    "SELECT id , username, email, full_name, role, is_active FROM users WHERE id= ? AND is_active = 1 ";

  db.get(sql, [decoded.userId], (err, user) => {
    if (err) {
      console.error("Database error", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!user) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = user;
    req.userId = user.id;
    next();
  });
};

// Role-based access control
export const reqireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Insufficient permissions. Required role: ${allowedRoles.join("or")} `,
      });
    }

    next();
  };
};

// Permission-based access control
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    //  Admin has all permissions
    if (req.user.role === "admin") {
      return next();
    }

    const sql = `SELECT 1 FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id 
    WHERE rp.role = ? AND p.name = ? `;

    db.get(sql, [req.user.role, permission], (err, hasPermission) => {
      if (err) {
        console.error("Database error", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (!hasPermission) {
        return res.status(403).json({
          error: `Insufficient permission. Required: ${permission} `,
        });
      }

      next();
    });
  };
};

export default {
  authenticationToken,
  reqireRole,
  requirePermission,
  generateToken,
  verifyToken,
};
