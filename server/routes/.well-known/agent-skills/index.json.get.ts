import { createHash } from 'node:crypto'
import { defineEventHandler, setHeader } from 'h3'
import { SKILLS } from './_skills'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://agentskills.io/schemas/v0.2.0.json',
    skills: SKILLS.map(s => ({
      name: s.name,
      type: s.type,
      description: s.description,
      url: `${siteUrl}${s.relativeUrl}`,
      sha256: createHash('sha256').update(s.body).digest('hex'),
    })),
  }
})
