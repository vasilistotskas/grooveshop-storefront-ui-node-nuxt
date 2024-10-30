import * as z from 'zod'

const ZodError = z.object({
  code: z.string(),
  param: z.string().optional(),
  message: z.string(),
})

const ZodErrors = z.array(ZodError)

export const ZodBadResponse = z.object({
  status: z.literal(400),
  errors: ZodErrors,
})

export type BadResponse = z.infer<typeof ZodBadResponse>
