import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { getPagination, buildPagination } from "../lib/pagination.js";
import { NotFoundError } from "../middleware/error.js";
import type { CandidateFilter } from "../schemas/candidate.js";

// Operator grid: filterable, paginated candidate list for a job.
export async function listCandidates(
  jobId: string,
  filter: CandidateFilter,
  query: { page?: unknown; limit?: unknown },
) {
  const { page, limit, skip, take } = getPagination(query);

  // Need the JD skills up front: for match_score, and to canonicalise a skill filter
  // (stored skills use JD casing; Postgres array `has` is case-sensitive).
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { required_skills: true },
  });
  const required = job?.required_skills.length ?? 0;

  const where: Prisma.CandidateWhereInput = { job_id: jobId };
  if (filter.location) where.location = { contains: filter.location, mode: "insensitive" };
  if (filter.min_exp !== undefined) where.experience_years = { gte: filter.min_exp };
  if (filter.grad_year !== undefined) where.grad_year = filter.grad_year;
  if (filter.status) where.status = filter.status;
  if (filter.skill) {
    const canon =
      job?.required_skills.find((s) => s.toLowerCase() === filter.skill!.toLowerCase()) ??
      filter.skill;
    where.matched_skills = { has: canon };
  }
  if (filter.q) {
    where.OR = [
      { name: { contains: filter.q, mode: "insensitive" } },
      { email: { contains: filter.q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.candidate.findMany({ where, skip, take, orderBy: { created_at: "desc" } }),
    prisma.candidate.count({ where }),
  ]);

  // match_score computed at read — not stored (N is tiny).
  const items = rows.map((c) => ({
    ...c,
    match_score: required ? Math.round((c.matched_skills.length / required) * 100) / 100 : null,
  }));

  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new NotFoundError("Candidate not found");
  return candidate;
}
