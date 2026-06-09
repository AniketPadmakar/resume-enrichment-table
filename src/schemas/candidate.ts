import { z } from "zod";

export const submitCandidateSchema = z
  .object({
    name: z.string().min(1, "name is required"),
    email: z.string().email("a valid email is required"),
  })
  .strict();

export const candidateFilterSchema = z.object({
  location: z.string().optional(),
  min_exp: z.coerce.number().nonnegative().optional(),
  skill: z.string().optional(),
  status: z.enum(["PENDING", "DONE", "FAILED"]).optional(),
  grad_year: z.coerce.number().int().min(1950).max(2100).optional(),
  q: z.string().optional(),
});

export type SubmitCandidateInput = z.infer<typeof submitCandidateSchema>;
export type CandidateFilter = z.infer<typeof candidateFilterSchema>;
