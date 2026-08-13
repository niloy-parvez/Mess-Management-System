import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { csrfProtection, csrfTokenEndpoint } from "./middlewares/csrf";
import {
  sanitizeInput,
  validateRequest,
  securityHeaders,
  authRateLimiter,
  createRateLimiter,
} from "./middlewares/security";

// Routes
import authRoutes from "./routes/authRoutes";
import memberRoutes from "./routes/memberRoutes";
import mealRoutes from "./routes/mealRoutes";
import marketRoutes from "./routes/marketRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import reportRoutes from "./routes/reportRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import marketLockRoutes from "./routes/marketLockRoutes";
import backupRoutes from "./routes/backupRoutes";

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      config.corsOrigin,
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Session-ID", "Cache-Control", "cache-control"],
    exposedHeaders: ["X-CSRF-Token", "X-Session-ID"],
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Security middleware
app.use(sanitizeInput);
app.use(validateRequest);
app.use(securityHeaders);

// Rate limiting
const limiter = createRateLimiter(config.rateLimitWindow * 60 * 1000, config.rateLimitMaxRequests);
app.use(limiter);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// CSRF token endpoint
app.get("/api/csrf-token", csrfTokenEndpoint);

// Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/members", csrfProtection, memberRoutes);
app.use("/api/meals", csrfProtection, mealRoutes);
app.use("/api/market", csrfProtection, marketRoutes);
app.use("/api/market-lock", csrfProtection, marketLockRoutes);
app.use("/api/expenses", csrfProtection, expenseRoutes);
app.use("/api/payments", csrfProtection, paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", csrfProtection, notificationRoutes);
app.use("/api/backup", csrfProtection, backupRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

async function startServer() {
  try {
    const server = app.listen(config.port, () => {
      const baseUrl = `http://localhost:${config.port}`;
      console.log(`✅ Server running on ${baseUrl}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔌 Port: ${config.port}`);
    });

    // Handle server errors
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Backend port ${config.port} is already in use. Stop the existing backend process.`);
        process.exit(1);
      } else {
        console.error("Server error:", error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
