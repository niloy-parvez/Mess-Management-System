import { Response } from "express";
import { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string = "Error",
  error?: string,
  statusCode: number = 400
): void => {
  const response: ApiResponse<null> = {
    success: false,
    message,
    error,
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = "Success",
  statusCode: number = 200
): void => {
  const pages = Math.ceil(total / limit);
  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
  res.status(statusCode).json(response);
};
