export const htmlValidator = {
	usePrettier: true,
	failOnError: false,
	options: {
		extends: [
			'html-validate:document',
			'html-validate:recommended',
			'html-validate:standard'
		],
		rules: {
			'heading-level': ['warn', { allowMultipleH1: true }],
			'svg-focusable': 'off',
			'no-unknown-elements': 'error',
			// Conflicts or not needed as we use prettier formatting
			'void-style': 'off',
			'no-trailing-whitespace': 'off',
			// Conflict with Nuxt defaults
			'require-sri': 'off',
			'attribute-boolean-style': 'off',
			'doctype-style': 'off',
			// Unreasonable rule
			'no-inline-style': 'off',
			'prefer-button': 'off'
		}
	}
}
