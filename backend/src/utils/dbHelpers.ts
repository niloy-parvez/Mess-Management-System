import { Response } from "express";
import { sendError } from "./response";

export const SCHEMA_MISSING_MESSAGE =
  "Database schema incomplete. Ensure required tables and Row Level Security policies exist in your Supabase schema.";

export const SCHEMA_COLUMN_MISSING_MESSAGE =
  "Database schema is missing an expected column. Verify the Supabase schema matches the application's expected columns.";

// PostgREST error codes:
// PGRST205 = table/relation not found in schema cache (genuine "table missing").
// PGRST204 = a specific column was not found in schema cache (table exists, column mismatch).
// These must be distinguished: a missing column must NEVER be reported as "table missing".
export const isMissingTableError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  if (error?.code === "PGRST204") {
    return false;
  }
  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table")
  );
};

export const isMissingColumnError = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.code === "PGRST204" ||
    message.includes("could not find the") && message.includes("column")
  );
};

export const isServiceRoleKeyProblem = (error: any): boolean => {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes('unregistered api key') ||
    message.includes('service role') ||
    (error && (((error as any).status === 401 || (error as any).statusCode === 401) && message.includes('api key')))
  );
};

export const handleMissingTableError = (
  res: Response,
  error: any,
  message: string = SCHEMA_MISSING_MESSAGE,
  statusCode = 500
): boolean => {
  // If the root cause is an invalid/unregistered service role key, surface a clear message
  if (isServiceRoleKeyProblem(error)) {
    sendError(
      res,
      "Supabase service role key is unregistered or invalid. Backend is running in limited mode.",
      error?.message,
      502
    );
    return true;
  }

  if (isMissingTableError(error)) {
    sendError(res, message, error?.message, statusCode);
    return true;
  }
  if (isMissingColumnError(error)) {
    sendError(res, SCHEMA_COLUMN_MISSING_MESSAGE, error?.message, statusCode);
    return true;
  }
  return false;
};

export const normalizePagination = (
  page: unknown,
  limit: unknown,
  defaultLimit = 20
) => {
  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? defaultLimit);
  const normalizedPage = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
  const normalizedLimit = Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : defaultLimit;
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: (normalizedPage - 1) * normalizedLimit,
  };
};
