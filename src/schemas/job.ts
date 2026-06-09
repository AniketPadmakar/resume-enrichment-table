import { z } from "zod";

export const createJobSchema = z
  .object({
    title: z.string().min(1, "title is required"),
    description: z.string().min(1, "description (JD) is required"),
    jd_url: z.string().url("jd_url must be a valid URL").optional(),
    required_skills: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const updateJobSchema = createJobSchema.partial();

export const extractSkillsSchema = z
  .object({
    description: z.string().min(1, "description (JD) is required"),
  })
  .strict();

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ExtractSkillsInput = z.infer<typeof extractSkillsSchema>;
