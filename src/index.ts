import "dotenv/config";
import express from "express";
import { traceMiddleware } from "./middleware/trace.js";
import { errorHandler } from "./middleware/error.js";
import { jobRouter } from "./routes/job.js";
import { candidateRouter } from "./routes/candidate.js";

const app = express();

app.use(express.json());
app.use(traceMiddleware);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/jobs", jobRouter);
app.use("/candidates", candidateRouter);

// error handler must be last
app.use(errorHandler);

const port = Number(process.env.PORT) || 8000;
app.listen(port, () => {
  console.log(`✅ [resume-enrichment] API listening on http://localhost:${port}`);
});
