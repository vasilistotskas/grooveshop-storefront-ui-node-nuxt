import { z } from 'zod'
import type { Ref } from 'vue'
import type { BaseFieldProps, GenericObject, PathValue } from 'vee-validate'

export const ZodDynamicFormSchemaChildren = z.array(
	z.object({
		tag: z.string(),
		text: z.string(),
		as: z.string()
	})
)

export const ZodDynamicFormSchemaField = z.array(
	z.object({
		as: z.string(),
		name: z.string(),
		label: z.string(),
		autocomplete: z.string().default('off'),
		readonly: z.boolean().default(false),
		required: z.boolean().default(false),
		placeholder: z.string().default(''),
		type: z.enum(['text', 'password', 'date', 'email', 'number']).default('text'),
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
			.nullish()
	})
)

export const ZodDynamicFormSchema = z.object({
	fields: ZodDynamicFormSchemaField.optional(),
	extraValidation: z.any().optional(),
	steps: z
		.array(
			z.object({
				title: z.string().optional(),
				fields: ZodDynamicFormSchemaField
			})
		)
		.optional()
})

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>

export type DynamicFormSchemaChildren = z.infer<typeof ZodDynamicFormSchemaChildren>

export type DynamicFormSchemaField = z.infer<typeof ZodDynamicFormSchemaField>

export interface DynamicFormProps {
	id?: string
	schema: DynamicFormSchema
	submitButton?: boolean
	resetButton?: boolean
	buttonLabel?: string
	resetLabel?: string
	disableSubmitUntilValid?: boolean
}

export type DynamicFormState = {
	errors: string[]
}

export type DynamicFormFields<
	TValue = any,
	TExtras extends GenericObject = GenericObject
> = {
	[key: string]: [Ref<TValue>, Ref<BaseFieldProps & TExtras>]
}

export type FormValues = {
	[key: string]: unknown
}

export interface DisabledFields {
	[key: string]: boolean
}
