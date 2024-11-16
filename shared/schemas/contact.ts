import * as z from 'zod'

export const ZodContact = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodContactBody = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
})
