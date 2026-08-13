import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { AuthRequest } from "./auth";
import config from "../config";

/**
 * Rate Limiting Middleware - Prevent brute force attacks
 */
export const createRateLimiter = (windowMs: number = 900000, maxRequests: number = 100) => {
  return rateLimit({
    windowMs, // 15 minutes by default
    max: maxRequests,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.nodeEnv !== "production",
  });
};

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  skip: () => config.nodeEnv !== "production",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Create a JSDOM instance for DOMPurify
    const window = new JSDOM("").window as any;
    const purify = DOMPurify(window);

    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      const sanitizedBody: Record<string, any> = {};

      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === "string") {
          // Remove any HTML/script tags
          sanitizedBody[key] = purify.sanitize(value);
        } else if (typeof value === "object" && value !== null) {
          // For nested objects, sanitize recursively
          sanitizedBody[key] = sanitizeObject(value, purify);
        } else {
          sanitizedBody[key] = value;
        }
      }

      req.body = sanitizedBody;
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      const sanitizedQuery: Record<string, any> = {};

      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") {
          sanitizedQuery[key] = purify.sanitize(value);
        } else {
          sanitizedQuery[key] = value;
        }
      }

      req.query = sanitizedQuery;
    }

    next();
  } catch (error) {
    console.error("Sanitization error:", error);
    res.status(400).json({
      success: false,
      message: "Invalid input format",
    });
  }
};

/**
 * Recursively sanitize nested objects
 */
function sanitizeObject(obj: any, purify: any): any {
  const window = new JSDOM("").window as any;
  const purifyInstance = purify || DOMPurify(window);

  if (Array.isArray(obj)) {
    return obj.map((value) => sanitizeValue(value, purifyInstance));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value, purifyInstance);
  }

  return sanitized;
}

function sanitizeValue(value: any, purify: any): any {
  if (typeof value === "string") {
    return purify.sanitize(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, purify));
  }

  if (typeof value === "object" && value !== null) {
    return sanitizeObject(value, purify);
  }

  return value;
}

/**
 * Request validation middleware - Check for suspicious patterns
 */
export const validateRequest = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Check for SQL injection patterns
  const sqlInjectionPattern = /('|"|;|--|\/\*|\*\/|xp_|sp_|exec|execute)/gi;

  const checkString = (str: string): boolean => {
    return sqlInjectionPattern.test(str);
  };

  // Validate request body
  if (req.body && typeof req.body === "object") {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === "string" && checkString(value)) {
        // Allow common special characters but flag known injection patterns
        if (
          value.includes("--") ||
          value.includes("/*") ||
          value.includes("xp_") ||
          value.includes("exec")
        ) {
          res.status(400).json({
            success: false,
            message: "Invalid input detected",
          });
          return;
        }
      }
    }
  }

  next();
};

/**
 * Security headers middleware (in addition to Helmet)
 */
export const securityHeaders = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Disable MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self';"
  );

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
};

/**
 * CORS validation middleware
 */
export const validateCORS = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Session-ID"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
};

/**
 * Logging middleware for security events
 */
export const securityLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Log authentication failures
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY] ${res.statusCode} - ${req.method} ${req.path} from ${req.ip}`);
    }

    // Log high-value operations
    if (
      (req.method === "POST" || req.method === "DELETE") &&
      ["/api/members", "/api/payments", "/api/market"].some((p) => req.path.includes(p))
    ) {
      console.info(
        `[AUDIT] ${req.method} ${req.path} by ${req.user?.id} from ${req.ip}`
      );
    }

    return originalSend.call(this, data);
  };

  next();
};
