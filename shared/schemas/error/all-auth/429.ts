import * as z from 'zod'

// allauth's `TooManyRequests`: a rate limit (signup, login code, email
// management) answered with the status alone.
export const ZodTooManyRequestsResponse = z.object({
  status: z.literal(429),
})
