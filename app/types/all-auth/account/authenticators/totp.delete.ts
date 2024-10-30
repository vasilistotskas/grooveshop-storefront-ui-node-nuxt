import * as z from 'zod'

export const ZodTotpDeleteResponse = z.object({
  status: z.literal(200),
})

export type TotpDeleteResponse = z.infer<typeof ZodTotpDeleteResponse>
