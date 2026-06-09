import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { sendError } from "../lib/response.js";

// Throw an AppError subclass anywhere; the global handler maps it to a clean response.
export class AppError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const trace = req.trace_id ?? "-";

  if (err instanceof AppError) {
    console.error(` [${trace}] ${err.code}: ${err.message}`);
    return sendError(res, { message: err.message, statusCode: err.statusCode, code: err.code });
  }

  if (err instanceof ZodError) {
    const msg = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error(` [${trace}] VALIDATION: ${msg}`);
    return sendError(res, { message: msg, statusCode: 400, code: "VALIDATION_ERROR" });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return sendError(res, { message: "Record not found", statusCode: 404, code: "NOT_FOUND" });
    }
    if (err.code === "P2002") {
      return sendError(res, { message: "Duplicate value", statusCode: 409, code: "CONFLICT" });
    }
  }

  // body-parser / http-errors carry a 4xx status (malformed JSON, payload too large)
  const status = (err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const message = err instanceof Error ? err.message : "Bad request";
    return sendError(res, { message, statusCode: status, code: "BAD_REQUEST" });
  }

  console.error(` [${trace}] UNHANDLED`, err);
  return sendError(res, { message: "Internal server error", statusCode: 500 });
}
