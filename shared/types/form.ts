import type * as z from 'zod'

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>

export type DynamicFormSchemaChildren = z.infer<
  typeof ZodDynamicFormSchemaChildren
>
