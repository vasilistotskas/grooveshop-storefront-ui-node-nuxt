import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead } from '#imports'
import { storeTitle } from '~~/shared/utils/storeTitle'

type TitleTemplate = string | ((title?: string) => string)

/**
 * `storeTitle` leaves the store's name and separator to unhead's template
 * params, so a title it appends to must paint exactly as the static
 * template `'%s %separator %siteName'` always did: whatever separator and
 * name the head resolves (nuxt-seo-utils supplies both from the site
 * config, in production the store's own). Read through the real head,
 * painted as a browser sees it (the pattern of usePageConfig.spec.ts).
 */
async function paintedTitle(title: string, titleTemplate: TitleTemplate): Promise<string> {
  let head!: ReturnType<typeof injectHead>
  let before!: Set<number>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      head = injectHead()
      before = new Set(head.entries.keys())
      useHead({ title, titleTemplate })
      return () => null
    },
  }))
  const paint = () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      head.render()
      vi.runOnlyPendingTimers()
    }
    finally {
      vi.useRealTimers()
    }
  }
  paint()
  const painted = document.title
  wrapper.unmount()
  for (const key of head.entries.keys()) {
    if (!before.has(key)) head.entries.delete(key)
  }
  paint()
  return painted
}

const STATIC_TEMPLATE = '%s %separator %siteName'
const withStoreName = (pageTitle?: string) => storeTitle(pageTitle, 'Webside')

describe('storeTitle in the head', () => {
  it('paints a title it appends to exactly as the static template did', async () => {
    const before = await paintedTitle('Καλάθι Αγορών', STATIC_TEMPLATE)
    const after = await paintedTitle('Καλάθι Αγορών', withStoreName)

    expect(after).toBe(before)
    expect(after).not.toContain('%separator')
  })

  it('paints a title that already ends with the store\'s name as written', async () => {
    expect(await paintedTitle('Mini Powerbank – Μαύρο | Webside', withStoreName)).toBe('Mini Powerbank – Μαύρο | Webside')
  })
})
