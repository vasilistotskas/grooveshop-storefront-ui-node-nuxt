import { createError, defineEventHandler, getRequestHost, getRouterParam, setHeader } from 'h3'
import { findSkillByName } from '../_skills'

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const skill = findSkillByName(name)
  if (!skill)
    throw createError({ statusCode: 404, statusMessage: 'Skill not found' })

  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const storeName = tenant?.storeName || (config.public.appTitle as string)

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return skill.body({ storeName, siteUrl })
})
