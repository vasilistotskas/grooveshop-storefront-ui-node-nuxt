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
	plugins: ["@typescript-eslint", "import"],
	rules: {
		'vue/multi-word-component-names': 'off',
		'vue/no-multiple-template-root': 'off',
		'@typescript-eslint/no-unused-vars': 'off',
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal"],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal"
          }
        ],
        "pathGroupsExcludedImportTypes": ["builtin"],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ]
	},
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest'
  }
}
