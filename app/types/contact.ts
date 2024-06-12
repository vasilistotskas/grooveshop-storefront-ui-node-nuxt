import { z } from 'zod'

export const ZodContact = z.object({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  uuid: z.string(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
})

export const ZodContactBody = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
})

export type Contact = z.infer<typeof ZodContact>
export type ContactBody = z.infer<typeof ZodContactBody>
