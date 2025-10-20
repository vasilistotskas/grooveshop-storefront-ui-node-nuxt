import * as z from 'zod'

export const ZodDynamicFormSchemaChildren = z
  .array(
    z.object({
      tag: z.string(),
      text: z.string(),
      as: z.string(),
      label: z.string().optional(),
      value: z.any().optional(),
      disabled: z.boolean().optional(),
    }),
  )
  .optional()

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
    initialValue: z.any().optional().nullish(),
    children: ZodDynamicFormSchemaChildren.optional().nullish(),
    items: z.array(z.any()).optional().nullish(),
    rules: z.any(),
    condition: z.any().optional(),
    disabledCondition: z.any().optional(),
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
  }),
)

export const ZodDynamicFormSchema = z.object({
  fields: ZodDynamicFormSchemaField.optional(),
  extraValidation: z.any().optional(),
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
})
