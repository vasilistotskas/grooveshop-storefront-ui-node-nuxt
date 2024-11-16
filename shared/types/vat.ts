import type * as z from 'zod'

export type Vat = z.infer<typeof ZodVat>
