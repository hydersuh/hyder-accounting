import rateLimit from "express-rate-limit";
import helmet from "helmet";
import xss from "xss-clean";

// Rate limiting configuration
export const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoint
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, please try again late." },
});

//  Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// XSS protection
export const xssProtection = xss();

// SQL Injection prevention middleware
export const sqlInjectionPrevention = (req, res, next) => {
  const checkForSQLInjection = (obj) => {
    if (!obj) return false;
    const sqlKeywords = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DROP",
      "UNION",
      "OR",
      "AND",
      "WHERE",
      "FROM",
      "TABLE",
      "DATABASE",
      "ALTER",
      "CREATE",
      "EXEC",
      "--",
      ";",
      "/*",
      "*/",
      "xp_",
      "sp_",
    ];

    for (let key in obj) {
      if (typeof obj[key] === "string") {
        const upperValue = obj[key].toUpperCase();
        if (sqlKeywords.some((keyword) => upperValue.includes(keyword))) {
          return true;
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        if (checkForSQLInjection(obj[key])) return true;
      }
    }
    return false;
  };

  if (
    checkForSQLInjection(req.body) ||
    checkForSQLInjection(req.query) ||
    checkForSQLInjection(req.params)
  ) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  next();
};

// Input sanitization
export const sanitiziInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj) return;

    for (let key in obj) {
      if (typeof obj[key] === "string") {
        // Remove HTML tags and special characters
        obj[key] = obj[key].replace(/[<>]/g, "").trim();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  next();
};

// Request Logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duratin = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duratin}ms`,
    );
  });

  next();
};

export default {
  limiter,
  authLimiter,
  securityHeaders,
  xssProtection,
  sqlInjectionPrevention,
  sanitiziInput,
  requestLogger,
};
