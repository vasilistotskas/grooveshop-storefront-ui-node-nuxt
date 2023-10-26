import { z } from 'zod'
import type { Ref } from 'vue'
import type { BaseComponentBinds } from 'vee-validate'

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
			name: z.string(),
			label: z.string(),
			as: z.string(),
			rules: z.any(),
			autocomplete: z.string(),
			readonly: z.boolean(),
			children: ZodDynamicFormSchemaChildren.optional().nullish()
		})
	)
})

export type DynamicFormSchema = z.infer<typeof ZodDynamicFormSchema>

export type DynamicFormSchemaChildren = z.infer<typeof ZodDynamicFormSchemaChildren>

export type DynamicFormState = {
	errors: string[]
}

export type DynamicFormFields<TValue, TModel extends string, TExtras> = {
	[key: string]: Ref<BaseComponentBinds<TValue, TModel> & TExtras>
}
