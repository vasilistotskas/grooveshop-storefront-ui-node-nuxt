import type * as z from 'zod'

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>
