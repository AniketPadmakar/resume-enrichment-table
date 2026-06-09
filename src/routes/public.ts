import { Router } from "express";
import multer from "multer";
import * as candidate from "../controllers/candidate.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const publicRouter = Router();

publicRouter.get("/:slug", candidate.publicJob);
publicRouter.post("/:slug/submit", upload.single("file"), candidate.submit);
