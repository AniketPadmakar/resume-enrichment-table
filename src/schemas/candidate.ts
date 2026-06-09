import { z } from "zod";

// Operator grid filters. Coerce query strings to the right types.
// .nonnegative()/.int() also reject NaN, so garbage like ?min_exp=abc → 400, not a Prisma 500.
export const candidateFilterSchema = z.object({
  location: z.string().optional(),
  min_exp: z.coerce.number().nonnegative().optional(),
  skill: z.string().optional(),
  status: z.enum(["PENDING", "DONE", "FAILED"]).optional(),
  grad_year: z.coerce.number().int().min(1950).max(2100).optional(),
  q: z.string().optional(),
});

export type CandidateFilter = z.infer<typeof candidateFilterSchema>;
