import { defineEventHandler, getRequestHost, useRuntimeConfig } from 'nuxt/server'
import { createHash } from 'node:crypto'
import { SKILLS } from './_skills'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const tenant = event.context.tenant
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const storeName = tenant?.storeName || (config.public.appTitle as string)
  const skillCtx = { storeName, siteUrl }

  event.res.headers.set('content-type', 'application/json')
  event.res.headers.set('cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://agentskills.io/schemas/v0.2.0.json',
    skills: SKILLS.map(s => ({
      name: s.name,
      type: s.type,
      description: s.description(skillCtx),
      url: `${siteUrl}${s.relativeUrl}`,
      sha256: createHash('sha256').update(s.body(skillCtx)).digest('hex'),
    })),
  }
})
