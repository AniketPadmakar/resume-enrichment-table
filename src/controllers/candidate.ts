import type { Request, Response } from "express";
import { submitCandidateSchema, candidateFilterSchema } from "../schemas/candidate.js";
import * as candidateService from "../services/candidate.js";
import { sendSuccess } from "../lib/response.js";
import { ValidationError } from "../middleware/error.js";

export async function publicJob(req: Request, res: Response): Promise<void> {
  const job = await candidateService.getPublicJob(req.params.slug as string);
  sendSuccess(res, job);
}

export async function submit(req: Request, res: Response): Promise<void> {
  const input = submitCandidateSchema.parse(req.body);
  if (!req.file) throw new ValidationError("résumé PDF is required (field: file)");
  if (req.file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ValidationError("file must be a PDF");
  }

  const candidate = await candidateService.submitCandidate(
    req.params.slug as string,
    input,
    req.file.buffer,
    req.trace_id,
  );
  sendSuccess(res, candidate, "Application received", 201);
}

export async function listForJob(req: Request, res: Response): Promise<void> {
  const filter = candidateFilterSchema.parse(req.query);
  const result = await candidateService.listCandidates(req.params.id as string, filter, req.query);
  sendSuccess(res, result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const candidate = await candidateService.getCandidate(req.params.id as string);
  sendSuccess(res, candidate);
}
