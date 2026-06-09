import type { Request, Response } from "express";
import { createJobSchema, updateJobSchema } from "../schemas/job.js";
import * as jobService from "../services/job.js";
import { sendSuccess } from "../lib/response.js";

export async function create(req: Request, res: Response): Promise<void> {
  const input = createJobSchema.parse(req.body);
  const job = await jobService.createJob(input);
  sendSuccess(res, job, "Job created", 201);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await jobService.listJobs(req.query);
  sendSuccess(res, result);
}

export async function get(req: Request, res: Response): Promise<void> {
  const job = await jobService.getJob(req.params.id as string);
  sendSuccess(res, job);
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = updateJobSchema.parse(req.body);
  const job = await jobService.updateJob(req.params.id as string, input);
  sendSuccess(res, job, "Job updated");
}

export async function remove(req: Request, res: Response): Promise<void> {
  await jobService.deleteJob(req.params.id as string);
  res.status(204).send();
}
