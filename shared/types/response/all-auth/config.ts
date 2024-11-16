import type * as z from 'zod'

export type ConfigResponse = z.infer<typeof ZodConfigResponse>
