import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const API_BASE = process.env.NUXT_DJANGO_URL || 'http://localhost:8000'
const TOKEN_FILE = '.auth-token'

async function fetchSchema() {
  try {
    // Try environment variable first, then file
    let token = process.env.DJANGO_API_TOKEN

    if (!token && existsSync(TOKEN_FILE)) {
      token = readFileSync(TOKEN_FILE, 'utf-8').trim()
    }

    if (!token) {
      throw new Error('No token found. Set DJANGO_API_TOKEN env var or create .auth-token file')
    }

    const response = await fetch(`${API_BASE}/api/v1/schema`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.oai.openapi+json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status}`)
    }

    const schema = await response.text()
    writeFileSync(join(process.cwd(), 'openapi/schema.json'), schema)
    console.log('✅ Schema fetched successfully')
  }
  catch (error) {
    console.error('❌ Error fetching schema:', error.message)
    process.exit(1)
  }
}

fetchSchema().then(() => {
  process.exit(0)
})
