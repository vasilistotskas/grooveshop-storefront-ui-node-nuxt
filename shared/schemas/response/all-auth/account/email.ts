import * as z from 'zod'

export const ZodEmailDeleteResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodEmailAddress),
})

export const ZodEmailGetResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodEmailAddress),
})

export const ZodEmailPatchResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodEmailAddress),
})

export const ZodEmailPostResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodEmailAddress),
})

export const ZodEmailPutResponse = z.object({
  status: z.literal(200),
})
