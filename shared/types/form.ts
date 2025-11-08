import type * as z from 'zod'
import type { ZodDynamicFormSchema, ZodDynamicFormSchemaChildren, ZodDynamicFormSchemaField } from '#shared/schemas/form'

export type DynamicFormSchemaField = z.infer<typeof ZodDynamicFormSchemaField>[number]

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>

export type DynamicFormSchemaChildren = z.infer<
  typeof ZodDynamicFormSchemaChildren
>

type ExtractFieldNames<T> = T extends { readonly fields: infer F extends any[] }
  ? F[number] extends { readonly name: infer N extends string }
    ? N
    : never
  : T extends { fields: infer F extends any[] }
    ? F[number] extends { name: infer N extends string }
      ? N
      : never
    : never

type ExtractFieldType<T, Name extends string> = T extends { readonly fields: infer F extends any[] }
  ? F[number] extends { readonly name: Name, readonly rules: infer R extends z.ZodType }
    ? z.output<R>
    : never
  : T extends { fields: infer F extends any[] }
    ? F[number] extends { name: Name, rules: infer R extends z.ZodType }
      ? z.output<R>
      : never
    : never

type BuildInferredType<T extends DynamicFormSchema> = {
  [K in ExtractFieldNames<T>]: ExtractFieldType<T, K>
}

export type InferZodSchemaType<T extends DynamicFormSchema> = BuildInferredType<T>
