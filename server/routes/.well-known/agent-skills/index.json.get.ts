import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://agentskills.io/schemas/v0.2.0.json',
    skills: [],
  }
})
