import * as z from 'zod'

export const ZodDynamicFormSchemaChildren = z
  .array(
    z.object({
      tag: z.string(),
      text: z.string(),
      as: z.string(),
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
    rules: z.any(),
    condition: z
      .function(z.tuple([z.any()]), z.boolean())
      .optional()
      .nullish(),
    disabledCondition: z
      .function(z.tuple([z.any()]), z.boolean())
      .optional()
      .nullish(),
  }),
)

export const ZodDynamicFormSchema = z.object({
  fields: ZodDynamicFormSchemaField.optional(),
  extraValidation: z.any().optional(),
  steps: z
    .array(
      z.object({
        title: z.string().optional(),
        fields: ZodDynamicFormSchemaField,
      }),
    )
    .optional(),
})
