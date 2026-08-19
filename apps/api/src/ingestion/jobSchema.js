const { z } = require('zod');

/**
 * Zod schema for a normalized job listing.
 *
 * Per PRD §5.1: schema validation on parsed output.
 * Required fields: title, company, location, url.
 * Optional fields: salaryMin, salaryMax, currency, skills, description, etc.
 */
const JobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  url: z.string().url(),
  isRemote: z.boolean().optional(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  currency: z.string().optional(),
  description: z.string().optional(),
  skills: z.array(z.string()).optional(),
  postedAt: z.string().optional().nullable(),
  scrapedAt: z.string().optional(),
  source: z.string().optional(),
  tier: z.number().optional(),
  id: z.string().optional(),
  raw: z.any().optional(),
});

/**
 * Validate a job object against the schema.
 *
 * @param {object} job - The job object to validate
 * @returns {{ success: boolean, data?: object, errors?: Array }} Validation result
 */
function validateJob(job) {
  const result = JobSchema.safeParse(job);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

module.exports = { JobSchema, validateJob };
