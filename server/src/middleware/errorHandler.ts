import type { NextFunction, Request, Response } from "express";

import type { ApiErrorResponse } from "../contracts/api.js";
import { AppError } from "../errors/AppError.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response<ApiErrorResponse>,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  console.error("Unexpected error:", error);

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
