/**
 * setupConsentWithdrawal (app/composables/setups.ts): a consent taken back
 * reloads the page, the one thing that stops a tag already running.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { enabled, reload } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { enabled: ref<string[] | undefined>(undefined), reload: vi.fn() }
})
mockNuxtImport('useCookieControl', () => () => ({
  cookiesEnabledIds: enabled,
  moduleOptions: {
    cookies: {
      necessary: [{ id: 'n' }],
      optional: [{ id: 'ad_storage' }, { id: 'analytics_storage' }],
    },
  },
}))
mockNuxtImport('afterNextPaint', () => () => Promise.resolve())

const { setupConsentWithdrawal } = await import('~/composables/setups')

let scope: EffectScope

const decide = async (...categories: string[]) => {
  enabled.value = categories
  await flushPromises()
}

beforeEach(() => {
  enabled.value = undefined
  scope = effectScope()
  vi.stubGlobal('location', { reload })
})

afterEach(() => scope.stop())

describe('setupConsentWithdrawal', () => {
  it.each(['ad_storage', 'analytics_storage'])('reloads when %s is withdrawn', async (category) => {
    await decide('n', 'ad_storage', 'analytics_storage')
    scope.run(setupConsentWithdrawal)

    await decide('n', ...['ad_storage', 'analytics_storage'].filter(id => id !== category))

    expect(reload).toHaveBeenCalledOnce()
  })

  it('reloads when everything optional is refused at once', async () => {
    await decide('n', 'analytics_storage')
    scope.run(setupConsentWithdrawal)

    await decide('n')

    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload a visitor who answers the banner for the first time', async () => {
    scope.run(setupConsentWithdrawal)

    await decide('n')

    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload when consent is added', async () => {
    await decide('n', 'ad_storage')
    scope.run(setupConsentWithdrawal)

    await decide('n', 'ad_storage', 'analytics_storage')

    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload for a necessary category', async () => {
    await decide('n', 'analytics_storage')
    scope.run(setupConsentWithdrawal)

    await decide('analytics_storage')

    expect(reload).not.toHaveBeenCalled()
  })
})
