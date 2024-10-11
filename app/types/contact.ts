import { object, string, number } from 'zod'
import { ZodTimeStampModel, ZodUUIDModel } from '~/types/index'

export const ZodContact = object({
  id: number(),
  name: string(),
  email: string().email(),
  message: string(),
}).merge(ZodUUIDModel).merge(ZodTimeStampModel)

export const ZodContactBody = object({
  name: string(),
  email: string().email(),
  message: string(),
})

export type Contact = typeof ZodContact._type
export type ContactBody = typeof ZodContactBody._type
