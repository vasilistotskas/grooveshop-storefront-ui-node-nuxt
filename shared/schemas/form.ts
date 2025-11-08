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

export interface RadioItem {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

export type FieldCondition = boolean | ((formState: Record<string, unknown>) => boolean)

interface DynamicFormFieldBase {
  as: 'input' | 'textarea' | 'select' | 'radio' | 'checkbox'
  id?: string
  name: string
  label?: string
  autocomplete?: string
  hidden?: boolean
  readonly?: boolean
  required?: boolean
  placeholder?: string
  type?: 'text' | 'password' | 'date' | 'email' | 'number' | 'checkbox'
  initialValue?: string | number | boolean | null | unknown[] | Record<string, unknown>
  children?: DynamicFormChildElement[] | null
  items?: RadioItem[] | null
  rules: z.ZodType
  condition?: FieldCondition | null
  disabledCondition?: FieldCondition | null
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  colSpan?: number | {
    'default'?: number
    'sm'?: number
    'md'?: number
    'lg'?: number
    'xl'?: number
    '2xl'?: number
  }
  ui?: ComponentUIConfig
}

export const ZodDynamicFormSchemaField = z.array(
  z.object({
    as: z
      .enum(['input', 'textarea', 'select', 'radio', 'checkbox'])
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

export interface DynamicFormStep {
  title?: string
  description?: string
  icon?: string
  fields: DynamicFormFieldBase[]
}

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

export function createZodSchemaFromDynamicForm<T extends DynamicFormSchema>(
  schema: T,
): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {}

  if (schema.fields) {
    for (const field of schema.fields) {
      shape[field.name] = field.rules
    }
  }

  if (schema.steps) {
    for (const step of schema.steps) {
      for (const field of step.fields) {
        shape[field.name] = field.rules
      }
    }
  }

  return z.object(shape)
}
