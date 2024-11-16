import type * as z from 'zod'

export type Country = z.infer<typeof ZodCountry>
