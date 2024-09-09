import { z } from 'zod'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types/index'

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

export type Contact = z.infer<typeof ZodContact>
export type ContactBody = z.infer<typeof ZodContactBody>
