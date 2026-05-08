import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { findSkillByName } from '../_skills'

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const skill = findSkillByName(name)
  if (!skill)
    throw createError({ statusCode: 404, statusMessage: 'Skill not found' })

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return skill.body
})
