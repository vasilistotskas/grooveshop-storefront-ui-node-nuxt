module.exports = {
	root: true,
	env: {
		browser: true,
		node: true
	},
	extends: [
		'@nuxtjs/eslint-config-typescript',
		'plugin:nuxt/recommended',
		'plugin:prettier/recommended'
	],
	plugins: [],
	rules: {
		'vue/multi-word-component-names': 'off',
		'vue/no-multiple-template-root': 'off',
		'@typescript-eslint/no-unused-vars': 'off'
	}
}
