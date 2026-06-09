import prisma from "../db.js";
import { newSlug } from "../lib/slug.js";
import { getPagination, buildPagination } from "../lib/pagination.js";
import { extractJdSkills } from "../lib/extract.js";
import { NotFoundError } from "../middleware/error.js";
import type { CreateJobInput, UpdateJobInput } from "../schemas/job.js";

export async function suggestSkills(description: string): Promise<string[]> {
  return extractJdSkills(description);
}

export async function createJob(input: CreateJobInput) {
  return prisma.job.create({
    data: {
      title: input.title,
      description: input.description,
      jd_url: input.jd_url ?? null,
      required_skills: input.required_skills,
      public_slug: newSlug(),
    },
  });
}

export async function listJobs(query: { page?: unknown; limit?: unknown }) {
  const { page, limit, skip, take } = getPagination(query);
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: { _count: { select: { candidates: true } } },
    }),
    prisma.job.count(),
  ]);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getJob(id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { _count: { select: { candidates: true } } },
  });
  if (!job) throw new NotFoundError("Job not found");
  return job;
}

export async function updateJob(id: string, input: UpdateJobInput) {
  await getJob(id);
  return prisma.job.update({ where: { id }, data: input });
}

export async function deleteJob(id: string) {
  await getJob(id);
  await prisma.job.delete({ where: { id } });
}
