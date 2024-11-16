import * as z from 'zod'

export const ZodEmailDeleteBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export const ZodEmailPatchBody = z.object({
  email: z.string().email().describe('An email address.'),
  primary: z.boolean().describe('Primary flag.'),
})

export const ZodEmailPostBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export const ZodEmailPutBody = z.object({
  email: z.string().email().describe('An email address.'),
})
