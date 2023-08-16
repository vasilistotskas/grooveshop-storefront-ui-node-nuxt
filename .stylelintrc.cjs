/** @type {import("stylelint")} */
const config = {
	extends: ['stylelint-config-standard'],
	ignoreFiles: [
		'**/node_modules/**',
		'**/dist/**',
		'**/public/**',
		'**/build/**',
		'**/runtime/**'
	],
	overrides: [
		{
			files: ['*.scss', '**/*.scss'],
			extends: ['stylelint-config-standard-scss']
		},
		{
			files: ['*.vue', '**/*.vue'],
			extends: ['stylelint-config-standard-scss', 'stylelint-config-recommended-vue/scss']
		}
	],
	rules: {
		'at-rule-no-unknown': null,
		'scss/at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: ['tailwind']
			}
		],
		'value-keyword-case': [
			'lower',
			{
				ignoreFunctions: ['/v-bind/']
			}
		],
		'media-query-no-invalid': null

		// @TODO: remove this rules
		// 'selector-class-pattern': null,
		// 'selector-id-pattern': null,
		// 'custom-property-pattern': null,
		// 'no-empty-source': null,
		// 'no-descending-specificity': null,
		// 'no-invalid-position-at-import-rule': null,
		// 'block-no-empty': null,
		// 'number-max-precision': null,
		// 'keyframes-name-pattern': null,
		// 'scss/double-slash-comment-whitespace-inside': null,
		// 'no-duplicate-selectors': null,
		// 'custom-property-empty-line-before': null
	}
}
module.exports = config
