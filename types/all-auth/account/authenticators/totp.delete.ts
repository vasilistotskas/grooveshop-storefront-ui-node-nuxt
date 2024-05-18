import { z } from 'zod'

export const ZodTotpDeleteResponse = z.object({
  status: z.number(),
})

export type TotpDeleteResponse = z.infer<typeof ZodTotpDeleteResponse>
