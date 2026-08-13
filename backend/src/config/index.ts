import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

interface Config {
  nodeEnv: string;
  port: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  jwtSecret: string;
  jwtExpiry: string;
  apiBaseUrl: string;
  frontendUrl: string;
  corsOrigin: string;
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  logLevel: string;
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  supabaseUrl: process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "placeholder-anon-key",
  // Accept multiple possible env var names so rotated/renamed keys are supported without code changes
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "placeholder-service-role-key",
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  jwtExpiry: process.env.JWT_EXPIRY || "7d",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:5000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "15", 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  logLevel: process.env.LOG_LEVEL || "info",
};

export default config;
