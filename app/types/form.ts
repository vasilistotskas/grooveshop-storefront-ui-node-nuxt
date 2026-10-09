import * as z from 'zod'
import type {
  InputProps,
  TextareaProps,
  SelectProps,
  SelectMenuProps,
  CheckboxProps,
  RadioGroupProps,
  FormFieldProps,
} from '#ui/types'

export interface DynamicFormChildElement {
  tag: string
  text: string
  as: string
  label?: string
  value?: string | number | boolean
  disabled?: boolean
}

export const ZodDynamicFormSchemaChildren = z
  .array(
    z.object({
      tag: z.string(),
      text: z.string(),
      as: z.string(),
      label: z.string().optional(),
      value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      disabled: z.boolean().optional(),
    }),
  )
  .optional()

type ComponentUIConfig
  = | InputProps['ui']
    | TextareaProps['ui']
    | SelectProps['ui']
    | SelectMenuProps['ui']
    | CheckboxProps['ui']
    | RadioGroupProps['ui']

export const ZodComponentUI = z.custom<ComponentUIConfig>((val) => {
  return val === undefined || (typeof val === 'object' && val !== null)
}, 'Invalid UI configuration').optional()

export const ZodDynamicFormSchemaField = z.array(
  z.object({
    as: z
      .enum(['input', 'textarea', 'select', 'radio', 'checkbox', 'rating'])
      .default('input'),
    id: z.string().optional(),
    name: z.string(),
    label: z.string().optional(),
    autocomplete: z.string().default('off'),
    hidden: z.boolean().default(false).optional(),
    readonly: z.boolean().default(false),
    required: z.boolean().default(false),
    placeholder: z.string().default(''),
    type: z
      .enum(['text', 'password', 'date', 'email', 'number', 'checkbox'])
      .default('text'),
    initialValue: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.any()), z.record(z.string(), z.any())]).optional().nullish(),
    children: ZodDynamicFormSchemaChildren.optional().nullish(),
    items: z.array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        disabled: z.boolean().optional(),
      }),
    ).optional().nullish(),
    rules: z.custom<z.ZodType>((val) => {
      return val && typeof val === 'object'
        && ('parse' in val || 'safeParse' in val || '_zod' in val)
    }, 'Must be a valid Zod schema'),
    condition: z.union([
      z.boolean(),
      z.null(),
      z.custom<(formState: Record<string, unknown>) => boolean>((val) => {
        return typeof val === 'function'
      }, 'Must be a function'),
    ]).optional(),
    disabledCondition: z.union([
      z.boolean(),
      z.null(),
      z.custom<(formState: Record<string, unknown>) => boolean>((val) => {
        return typeof val === 'function'
      }, 'Must be a function'),
    ]).optional(),
    color: z.enum(['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral']).optional(),
    colSpan: z.union([
      z.number(),
      z.object({
        'default': z.number().optional(),
        'sm': z.number().optional(),
        'md': z.number().optional(),
        'lg': z.number().optional(),
        'xl': z.number().optional(),
        '2xl': z.number().optional(),
      }),
    ]).optional(),
    ui: ZodComponentUI,
  }),
)

export type ExtraValidationFunction = (
  values: Record<string, unknown>,
) => Record<string, string> | Promise<Record<string, string>>

export const ZodDynamicFormSchema = z.object({
  fields: ZodDynamicFormSchemaField.optional(),
  extraValidation: z.custom<ExtraValidationFunction>((val) => {
    return typeof val === 'function'
  }, 'Must be a function').optional(),
  steps: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        fields: ZodDynamicFormSchemaField,
      }),
    )
    .optional(),
  ui: z.custom<FormFieldProps['ui']>((val) => {
    return val === undefined || (typeof val === 'object' && val !== null)
  }, 'Invalid UI configuration').optional(),
})

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
