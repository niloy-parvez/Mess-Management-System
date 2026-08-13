import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  const response: ApiResponse<null> = {
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error: `${req.method} ${req.path} not found`,
  });
};
