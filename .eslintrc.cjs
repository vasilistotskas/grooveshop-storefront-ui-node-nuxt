module.exports = {
	root: true,
	env: {
    browser: true,
    es6: true,
    node: true,
	},
	extends: [
    '@nuxt/eslint-config'
	],
	plugins: ["@typescript-eslint", "import"],
	rules: {
		'vue/multi-word-component-names': 0,
		'vue/no-multiple-template-root': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/no-v-html': 0,
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal"],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal"
          },
          {
            "pattern": "~/**",
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
