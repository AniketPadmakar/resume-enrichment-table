import { Router } from "express";
import * as job from "../controllers/job.js";
import * as candidate from "../controllers/candidate.js";

export const jobRouter = Router();

jobRouter.post("/extract-skills", job.extractSkills);
jobRouter.post("/", job.create);
jobRouter.get("/", job.list);
jobRouter.get("/:id", job.get);
jobRouter.patch("/:id", job.update);
jobRouter.delete("/:id", job.remove);

jobRouter.get("/:id/candidates", candidate.listForJob);
