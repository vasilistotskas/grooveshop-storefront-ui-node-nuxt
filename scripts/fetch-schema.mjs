import { writeFileSync } from 'fs'
import { join } from 'path'

const API_BASE = process.env.NUXT_DJANGO_URL || 'http://localhost:8000'

async function fetchSchema() {
  try {
    const headers = { Accept: 'application/vnd.oai.openapi+json' }

    // Optional auth token (required in production, not needed locally with DEBUG=True)
    const token = process.env.DJANGO_API_TOKEN
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}/api/v1/schema`, { headers })

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status}`)
    }

    const schema = await response.text()
    writeFileSync(join(process.cwd(), 'openapi/schema.json'), schema)
    console.log('✅ Schema fetched successfully') // eslint-disable-line no-console
  }
  catch (error) {
    console.error('❌ Error fetching schema:', error.message) // eslint-disable-line no-console
    process.exitCode = 1
  }
}

await fetchSchema()
