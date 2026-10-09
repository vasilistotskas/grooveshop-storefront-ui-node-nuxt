import { createError, defineEventHandler, getRequestHost, getRouterParam, useRuntimeConfig } from 'nuxt/server'
import { findSkillByName } from '../_skills'

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name', { decode: true })
  if (!name)
    throw createError({ status: 404, statusText: 'Not Found' })

  const skill = findSkillByName(name)
  if (!skill)
    throw createError({ status: 404, statusText: 'Skill not found' })

  const config = useRuntimeConfig()
  const tenant = event.context.tenant
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const storeName = tenant?.storeName || (config.public.appTitle as string)

  event.res.headers.set('content-type', 'text/markdown; charset=utf-8')
  event.res.headers.set('cache-control', 'public, max-age=3600')
  return skill.body({ storeName, siteUrl })
})
