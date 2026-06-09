import type { Response } from "express";

// Single response shape across every endpoint so the frontend never guesses.
export function sendSuccess<T>(res: Response, data: T, message = "OK", status = 200): void {
  res.status(status).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  opts: { message: string; statusCode?: number; code?: string },
): void {
  const { message, statusCode = 500, code } = opts;
  res.status(statusCode).json({ success: false, message, code });
}
