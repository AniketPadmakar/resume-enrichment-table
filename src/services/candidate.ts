import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { storeFile } from "../lib/storage.js";
import { parsePdf } from "../lib/parser.js";
import { extractResumeFields, matchSkills } from "../lib/extract.js";
import { getPagination, buildPagination } from "../lib/pagination.js";
import { NotFoundError } from "../middleware/error.js";
import type { CandidateFilter, SubmitCandidateInput } from "../schemas/candidate.js";

export async function getPublicJob(slug: string) {
  const job = await prisma.job.findUnique({
    where: { public_slug: slug },
    select: { id: true, title: true, description: true, jd_url: true },
  });
  if (!job) throw new NotFoundError("This job link is invalid or expired");
  return job;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, base = 500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await sleep(base * 2 ** i);
    }
  }
  throw last;
}

async function failCandidate(id: string, reason: string, err: unknown, traceId: string) {
  console.error(`[${traceId}] ${reason} for ${id}: ${err instanceof Error ? err.message : err}`);
  await prisma.candidate.update({
    where: { id },
    data: { status: "FAILED", parsed: { error: reason } as Prisma.InputJsonValue },
  });
}

async function processCandidate(
  candidateId: string,
  file: Buffer,
  requiredSkills: string[],
  traceId: string,
) {
  let text: string;
  try {
    text = await parsePdf(file);
  } catch (err) {
    return failCandidate(candidateId, "Could not read the PDF", err, traceId);
  }

  let fields;
  try {
    fields = await withRetry(() => extractResumeFields(text, requiredSkills));
  } catch (err) {
    return failCandidate(candidateId, "Extraction failed after retries", err, traceId);
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      location: fields.location,
      phone: fields.phone,
      experience_years: fields.experience_years,
      grad_year: fields.grad_year,
      linkedin_url: fields.linkedin_url,
      github_url: fields.github_url,
      companies: fields.companies,
      skills: fields.skills,
      matched_skills: matchSkills(fields.skills, requiredSkills),
      parsed: { raw_text: text, extracted: fields } as unknown as Prisma.InputJsonValue,
      status: "DONE",
    },
  });
}

export async function submitCandidate(
  slug: string,
  input: SubmitCandidateInput,
  file: Buffer,
  traceId: string,
) {
  const job = await prisma.job.findUnique({
    where: { public_slug: slug },
    select: { id: true, required_skills: true },
  });
  if (!job) throw new NotFoundError("This job link is invalid or expired");

  const key = `${job.id}/${randomUUID()}.pdf`;
  await storeFile(key, file);

  const base = { name: input.name, source_file: key, status: "PENDING" as const };
  const candidate = await prisma.candidate.upsert({
    where: { job_id_email: { job_id: job.id, email: input.email } },
    create: { job_id: job.id, email: input.email, ...base },
    update: base,
  });

  processCandidate(candidate.id, file, job.required_skills, traceId).catch((e) =>
    console.error(`[${traceId}] background processing crashed for ${candidate.id}`, e),
  );

  return candidate;
}

export async function listCandidates(
  jobId: string,
  filter: CandidateFilter,
  query: { page?: unknown; limit?: unknown },
) {
  const { page, limit, skip, take } = getPagination(query);

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
