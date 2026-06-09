import type { Request, Response } from "express";
import { candidateFilterSchema } from "../schemas/candidate.js";
import * as candidateService from "../services/candidate.js";
import { sendSuccess } from "../lib/response.js";

// GET /jobs/:id/candidates — operator grid (filterable)
export async function listForJob(req: Request, res: Response): Promise<void> {
  const filter = candidateFilterSchema.parse(req.query);
  const result = await candidateService.listCandidates(req.params.id as string, filter, req.query);
  sendSuccess(res, result);
}

// GET /candidates/:id — detail drawer
export async function get(req: Request, res: Response): Promise<void> {
  const candidate = await candidateService.getCandidate(req.params.id as string);
  sendSuccess(res, candidate);
}
