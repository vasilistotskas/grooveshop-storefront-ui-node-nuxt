import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/agent-skills/[name]/skill.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/agent-skills/:name/SKILL.md'

const get = (name: string, context: Record<string, unknown> = {}) => callRoute(handler, {
  route,
  url: `/.well-known/agent-skills/${name}/SKILL.md`,
  host: 'acme.test',
  headers: { 'x-forwarded-host': 'evil.example' },
  context,
})

describe('GET /.well-known/agent-skills/[name]/SKILL.md', () => {
  it('renders the skill body as markdown with the tenant store name and site URL', async () => {
    const response = await get('catalog-search', { tenant: validTenantConfig('acme.example', { storeName: 'Acme Store' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(response.body).toContain('# catalog-search')
    expect(response.body).toContain('Search the Acme Store catalog')
    expect(response.body).toContain('https://acme.example')
    expect(response.body.toLowerCase()).not.toContain('webside')
  })

  it('answers 404 for a skill that does not exist', async () => {
    const response = await get('delete-everything')

    expect(response.status).toBe(404)
    expect(response.body.statusMessage).toBe('Skill not found')
  })

  it('uses the request Host, never X-Forwarded-Host, when no tenant is in context', async () => {
    const response = await get('catalog-search')

    expect(response.body).toContain('https://acme.test')
    expect(response.body).not.toContain('evil.example')
  })
})
