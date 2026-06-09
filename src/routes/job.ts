import { Router } from "express";
import * as job from "../controllers/job.js";
import * as candidate from "../controllers/candidate.js";

export const jobRouter = Router();

jobRouter.post("/", job.create);
jobRouter.get("/", job.list);
jobRouter.get("/:id", job.get);
jobRouter.patch("/:id", job.update);
jobRouter.delete("/:id", job.remove);

// operator grid for one job's candidates
jobRouter.get("/:id/candidates", candidate.listForJob);
