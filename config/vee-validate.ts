import type { VeeValidateNuxtOptions } from '@vee-validate/nuxt'

export const veeValidate = {
	autoImports: true,
	componentNames: {
		Form: 'VeeForm',
		Field: 'VeeField',
		FieldArray: 'VeeFieldArray',
		ErrorMessage: 'VeeErrorMessage'
	}
} satisfies VeeValidateNuxtOptions
