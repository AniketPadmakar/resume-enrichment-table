import { Router } from "express";
import * as candidate from "../controllers/candidate.js";

export const candidateRouter = Router();

// GET /candidates/:id — single candidate detail (drawer)
candidateRouter.get("/:id", candidate.get);
