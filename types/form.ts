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

export const ZodDynamicFormSchema = z.object({
	fields: z.array(
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
			rules: z.any()
		})
	)
})

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>

export type DynamicFormSchemaChildren = z.infer<typeof ZodDynamicFormSchemaChildren>

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
