import "dotenv/config";
import path from "node:path";
import express from "express";
import { traceMiddleware } from "./middleware/trace.js";
import { errorHandler } from "./middleware/error.js";
import { jobRouter } from "./routes/job.js";
import { candidateRouter } from "./routes/candidate.js";
import { publicRouter } from "./routes/public.js";

const app = express();

app.use(express.json());
app.use(traceMiddleware);

app.use(express.static(path.resolve("public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/jobs", jobRouter);
app.use("/candidates", candidateRouter);
app.use("/public", publicRouter);

app.use(errorHandler);

const port = Number(process.env.PORT) || 8000;
app.listen(port, () => {
  console.log(` API listening on http://localhost:${port}`);
});
