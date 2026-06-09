import { Router } from "express";
import * as candidate from "../controllers/candidate.js";

export const candidateRouter = Router();

candidateRouter.get("/:id", candidate.get);
