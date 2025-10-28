import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'

describe('Homepage E2E Tests', async () => {
  await setup({
    setupTimeout: 300000,
  })

  it('renders the homepage successfully', async () => {
    const html = await $fetch('/')
    expect(html).toBeTruthy()
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('includes proper meta tags', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<meta')
    expect(html).toContain('charset')
  })

  it('loads without errors', async () => {
    const response = await fetch('/')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })

  it('includes the app root element', async () => {
    const html = await $fetch('/')
    expect(html).toContain('id="__nuxt"')
  })
})
