import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      trace_id: string;
    }
  }
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.trace_id = randomUUID();
  res.setHeader("x-trace-id", req.trace_id);
  console.log(`➡️  [${req.trace_id}] ${req.method} ${req.originalUrl}`);
  next();
}
