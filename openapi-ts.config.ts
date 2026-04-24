import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/schema.json',
  output: {
    indexFile: false,
    path: './shared/openapi',
    // Shorthand ``'eslint'`` runs without ``--fix``, so any auto-fixable
    // rule (``no-useless-escape`` on generated regexes, etc.) fails the
    // whole codegen. Switch to the object form to pass ``--fix`` so
    // ESLint repairs the output instead of rejecting it.
    postProcess: [
      {
        command: 'eslint',
        args: ['--fix', '{{path}}'],
      },
    ],
  },
  plugins: [
    '@hey-api/typescript',
    {
      name: 'zod',
      requests: true,
      responses: true,
      definitions: true,
      metadata: true,
      dates: {
        offset: true,
      },
    },
  ],
})
