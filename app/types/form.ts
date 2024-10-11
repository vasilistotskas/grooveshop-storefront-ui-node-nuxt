import type { BaseFieldProps, GenericObject } from 'vee-validate'
import type { Ref } from 'vue'
import { object, string, boolean, array, any, enum as zEnum, function as zFunction, tuple, optional } from 'zod'

export const ZodDynamicFormSchemaChildren = optional(
  array(
    object({
      tag: string(),
      text: string(),
      as: string(),
    }),
  ),
)

export const ZodDynamicFormSchemaField = array(
  object({
    as: zEnum(['input', 'textarea', 'select', 'radio', 'checkbox']).default('input'),
    id: optional(string()),
    name: string(),
    label: optional(string()),
    autocomplete: string().default('off'),
    hidden: optional(boolean().default(false)),
    readonly: boolean().default(false),
    required: boolean().default(false),
    placeholder: string().default(''),
    type: zEnum(['text', 'password', 'date', 'email', 'number', 'checkbox']).default('text'),
    initialValue: any().nullish(),
    children: ZodDynamicFormSchemaChildren.nullish(),
    rules: any(),
    condition: zFunction(tuple([any()]), boolean()).nullish(),
    disabledCondition: zFunction(tuple([any()]), boolean()).nullish(),
  }),
)

export const ZodDynamicFormSchema = object({
  fields: optional(ZodDynamicFormSchemaField),
  extraValidation: optional(any()),
  steps: optional(
    array(
      object({
        title: optional(string()),
        fields: ZodDynamicFormSchemaField,
      }),
    ),
  ),
})

export type DynamicFormSchema = typeof ZodDynamicFormSchema._type
export type DynamicFormSchemaChildren = typeof ZodDynamicFormSchemaChildren._type

export type DynamicFormState = {
  errors: string[]
}

export type DynamicFormFields<
  TValue = any,
  TExtras extends GenericObject = GenericObject,
> = {
  [key: string]: [Ref<TValue>, Ref<BaseFieldProps & TExtras>]
}

export type FormValues = {
  [key: string]: unknown
}

export interface DisabledFields {
  [key: string]: boolean
}
