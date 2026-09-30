import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/agent-skills/index.json.get'
import skillHandler from '~~/server/routes/.well-known/agent-skills/[name]/skill.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/agent-skills/index.json'

const get = (context: Record<string, unknown> = {}) =>
  callRoute(handler, { route, host: 'acme.test', headers: { 'x-forwarded-host': 'evil.example' }, context })

describe('GET /.well-known/agent-skills/index.json', () => {
  it('interpolates the tenant store name into every skill and points each URL at the tenant', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { storeName: 'Acme Store' }) })

    const { skills } = response.body
    expect(skills.map((skill: { name: string }) => skill.name)).toEqual(['catalog-search', 'catalog-products'])
    for (const skill of skills) {
      expect(skill.description).toContain('Acme Store')
      expect(skill.description.toLowerCase()).not.toContain('webside')
      expect(skill.url.startsWith('https://acme.example/.well-known/agent-skills/')).toBe(true)
    }
  })

  it('publishes the sha256 of exactly the body the skill route serves for that tenant', async () => {
    const context = { tenant: validTenantConfig('acme.example', { storeName: 'Acme Store' }) }
    const [search] = (await get(context)).body.skills

    const skill = await callRoute(skillHandler, {
      route: '/.well-known/agent-skills/:name/SKILL.md',
      url: '/.well-known/agent-skills/catalog-search/SKILL.md',
      host: 'acme.test',
      context,
    })

    expect(search.sha256).toBe(createHash('sha256').update(skill.body).digest('hex'))
  })

  it('uses the request Host and the platform title when no tenant is in context', async () => {
    const response = await get()

    expect(response.body.skills[0].url.startsWith('https://acme.test/')).toBe(true)
    expect(response.body.skills[0].description).toContain('GrooveShop')
  })
})
