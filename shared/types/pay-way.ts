import type * as z from 'zod'

export type PayWay = z.infer<typeof ZodPayWay>
