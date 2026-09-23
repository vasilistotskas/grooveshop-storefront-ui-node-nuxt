/**
 * Unit tests for the tenant-aware `siteUrl` resolution shared by the
 * `.well-known/**` discovery routes (OAuth/OIDC metadata, api-catalog,
 * AI Catalog, agent-skills index). These routes are NOT bypassed in
 * 0.tenant.ts, so event.context.tenant is populated for real requests;
 * each route still falls back to getRequestHost() (prerender/edge cases)
 * and finally to the platform's runtime-config baseUrl — never to a
 * hardcoded brand literal.
 *
 * These modules import defineEventHandler/getRequestHost/setHeader/etc.
 * explicitly from 'h3' (not Nitro auto-imports), so they must be mocked
 * via vi.mock('h3') rather than vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hostMock = vi.fn().mockReturnValue('')
const routerParamMock = vi.fn()

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    setHeader: vi.fn(),
    getRequestHost: hostMock,
    getRouterParam: routerParamMock,
    createError: (opts: Record<string, unknown>) => new Error(String(opts.statusMessage)),
  }
})

vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    baseUrl: 'https://platform-default.example',
    djangoUrl: 'https://api.platform-default.example',
    version: '1.2.3',
    appTitle: 'Platform Default Store',
  },
}))

function makeEvent(tenant?: Record<string, unknown>) {
  return { context: tenant ? { tenant } : {} }
}

beforeEach(() => {
  hostMock.mockReturnValue('')
})

describe('.well-known/oauth-protected-resource.get.ts', () => {
  it('uses the tenant primaryDomain for resource and apiDomain for authorization_servers', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', apiDomain: 'api.acme.example' })) as Record<string, unknown>
    expect(result.resource).toBe('https://acme.example')
    // The AS is the tenant's OWN API origin (TenantConfig.apiDomain) — not
    // hand-derived as `api.${primaryDomain}`.
    expect(result.authorization_servers).toEqual(['https://api.acme.example'])
  })

  it('falls back to the platform djangoUrl when the tenant has no apiDomain', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', apiDomain: '' })) as Record<string, unknown>
    expect(result.authorization_servers).toEqual(['https://api.platform-default.example'])
  })

  it('falls back to the platform baseUrl (not a hardcoded literal) with no tenant and no host', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource.get')
    const result = handler(makeEvent(undefined)) as Record<string, unknown>
    expect(result.resource).toBe('https://platform-default.example')
  })
})

describe('.well-known/oauth-protected-resource/mcp.get.ts', () => {
  it('uses the tenant primaryDomain for resource and apiDomain for authorization_servers', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource/mcp.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', apiDomain: 'api.acme.example' })) as Record<string, unknown>
    expect(result.resource).toBe('https://acme.example/mcp')
    expect(result.authorization_servers).toEqual(['https://api.acme.example'])
  })

  it('falls back to the platform djangoUrl when the tenant has no apiDomain', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/oauth-protected-resource/mcp.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', apiDomain: '' })) as Record<string, unknown>
    expect(result.authorization_servers).toEqual(['https://api.platform-default.example'])
  })
})

describe('.well-known/api-catalog.get.ts', () => {
  it('uses the tenant primaryDomain for the linkset anchor', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/api-catalog.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example' })) as { linkset: Array<{ anchor: string }> }
    expect(result.linkset[0]!.anchor).toBe('https://acme.example/openapi/schema.yml')
  })
})

describe('.well-known/ai-catalog.json.get.ts', () => {
  it('lists the gateway Server Card at the reserved /mcp/server-card for an agent-commerce tenant', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/ai-catalog.json.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store', agentCommerceEnabled: true })) as {
      specVersion: string
      host: { displayName: string, identifier: string }
      entries: Array<{ identifier: string, type: string, url: string }>
    }
    expect(result.specVersion).toBe('1.0')
    expect(result.host).toEqual({ displayName: 'Acme Store', identifier: 'acme.example' })
    expect(result.entries).toEqual([{
      identifier: 'urn:air:acme.example:mcp:store',
      type: 'application/mcp-server-card+json',
      url: 'https://acme.example/mcp/server-card',
    }])
  })

  it('lists no entries when the tenant has agent commerce off', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/ai-catalog.json.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', agentCommerceEnabled: false })) as { entries: unknown[] }
    expect(result.entries).toEqual([])
  })

  it('falls back to the platform baseUrl and appTitle with no tenant and no host', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/ai-catalog.json.get')
    const result = handler(makeEvent(undefined)) as { host: { displayName: string, identifier: string }, entries: unknown[] }
    expect(result.host).toEqual({ displayName: 'Platform Default Store', identifier: 'platform-default.example' })
    expect(result.entries).toEqual([])
  })
})

describe('.well-known/agent-skills/index.json.get.ts + [name]/skill.get.ts', () => {
  it('index.json interpolates the tenant storeName into skill descriptions and URLs', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/agent-skills/index.json.get')
    const result = handler(makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store' })) as {
      skills: Array<{ name: string, description: string, url: string }>
    }

    expect(result.skills.map(s => s.name)).toEqual(['catalog-search', 'catalog-products'])
    for (const skill of result.skills) {
      expect(skill.description).toContain('Acme Store')
      expect(skill.description.toLowerCase()).not.toContain('webside')
      expect(skill.url.startsWith('https://acme.example/.well-known/agent-skills/')).toBe(true)
    }
  })

  it('[name]/skill.get.ts renders the skill body with the tenant storeName and siteUrl interpolated', async () => {
    const { default: handler } = await import('../../../../server/routes/.well-known/agent-skills/[name]/skill.get')
    routerParamMock.mockReturnValue('catalog-search')

    const event = makeEvent({ primaryDomain: 'acme.example', storeName: 'Acme Store' })
    const body = handler(event) as string

    expect(body).toContain('# catalog-search')
    expect(body).toContain('Search the Acme Store catalog')
    expect(body).toContain('https://acme.example')
    expect(body.toLowerCase()).not.toContain('webside')
  })
})
