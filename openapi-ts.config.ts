import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/schema.json',
  output: {
    indexFile: false,
    format: 'prettier',
    lint: 'eslint',
    path: './shared/openapi',
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
