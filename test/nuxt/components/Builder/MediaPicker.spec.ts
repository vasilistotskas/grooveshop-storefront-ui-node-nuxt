import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import { UApp, UFileUpload } from '#components'
import BuilderMediaPicker from '~/components/Builder/MediaPicker.vue'
import { failWith } from '~~/test/helpers/api'
import { makeAsset } from '~~/test/fixtures/media'
import type { Asset } from '~~/shared/openapi/types.gen'

/**
 * The image library dialog: it lists the library, finds an image by name or
 * alt text, uploads a new one, and edits the alt text of the image chosen in
 * every language of the store. Deleting an image a published page uses is
 * refused by Django and the dialog names the pages.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const LIBRARY = '/api/builder/media'
const hero = makeAsset({ id: 4, path: 'https://assets.example.test/hero.jpg', alt: { el: 'Βιτρίνα', en: 'Shop window' }, usedBy: ['page:home'] })
const banner = makeAsset({ id: 8, path: 'https://assets.example.test/banner.png', alt: { el: '', en: '' } })

const LISTED = { count: 2, results: [hero, banner] }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  api.routes({ [LIBRARY]: LISTED })
})

afterEach(() => {
  vi.useRealTimers()
})

async function mount(selected: number | undefined = undefined, startOpen = true) {
  const chosen: Asset[] = []
  const removed: number[] = []
  const open = ref(startOpen)
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      return () => h(UApp, null, {
        default: () => h(BuilderMediaPicker, {
          'open': open.value,
          'onUpdate:open': (next: boolean) => { open.value = next },
          selected,
          'onSelect': (asset: Asset) => chosen.push(asset),
          'onRemove': (id: number) => removed.push(id),
        }),
      })
    },
  }), { attachTo: document.body })
  await flushPromises()
  return { wrapper, chosen, removed, open }
}

const all = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)]
const button = (name: string) => all<HTMLButtonElement>('button').find(node => node.getAttribute('aria-label') === name || node.textContent?.trim() === name)
const field = (label: string) => all<HTMLLabelElement>('label').find(node => node.textContent?.includes(label))!.control as HTMLInputElement

/** Chooses an image of the library, as a click on its tile does. */
async function look(name: string) {
  button(name)!.click()
  await flushPromises()
}

async function typeInto(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}

describe('BuilderMediaPicker', () => {
  it('lists the library by the file name of each image', async () => {
    await mount()

    expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg', 'banner.png'])
    expect(api.callsTo(LIBRARY)[0]!.options.query).toEqual({ page: 1, pageSize: BUILDER_MEDIA_PAGE_SIZE })
  })

  it('searches the library once the typing stops, from the first page', async () => {
    await mount()

    await typeInto(all<HTMLInputElement>('input[type="search"]')[0]!, 'vitrina')
    await vi.advanceTimersByTimeAsync(BUILDER_LINK_SEARCH_DELAY_MS)
    await flushPromises()

    expect(api.callsTo(LIBRARY).at(-1)!.options.query).toEqual({ page: 1, pageSize: BUILDER_MEDIA_PAGE_SIZE, search: 'vitrina' })
  })

  it('says when the library has nothing', async () => {
    api.routes({ [LIBRARY]: { count: 0, results: [] } })

    await mount()

    expect(document.body.textContent).toContain('Δεν υπάρχουν εικόνες ακόμη.')
  })

  it('shows the alt text of the image in each language of the store, and where it is used', async () => {
    await mount()

    await look('hero.jpg')

    expect(field('Εναλλακτικό κείμενο (Ελληνικά)').value).toBe('Βιτρίνα')
    expect(field('Εναλλακτικό κείμενο (English)').value).toBe('Shop window')
    expect(document.body.textContent).toContain('Χρησιμοποιείται σε:')
  })

  it('saves the alt text written in one language, naming every language to Django', async () => {
    await mount()
    await look('banner.png')
    api.routes({ [LIBRARY]: LISTED, [`${LIBRARY}/8`]: makeAsset({ id: 8, path: banner.path, alt: { el: 'Πανό', en: '' } }) })

    await typeInto(field('Εναλλακτικό κείμενο (Ελληνικά)'), 'Πανό')
    button('Αποθήκευση κειμένου')!.click()
    await flushPromises()

    const [call] = api.callsTo(`${LIBRARY}/8`)
    expect(call!.options).toMatchObject({ method: 'PATCH', body: { alt: { el: 'Πανό', en: '' } } })
  })

  it('does not offer to save alt text that has not changed', async () => {
    await mount()

    await look('hero.jpg')

    expect(button('Αποθήκευση κειμένου')!.disabled).toBe(true)
  })

  it('hands the image chosen to the setting', async () => {
    const { chosen } = await mount()
    await look('hero.jpg')

    button('Χρήση αυτής της εικόνας')!.click()
    await flushPromises()

    expect(chosen).toEqual([hero])
  })

  it('uploads the file chosen as a multipart form and opens the image it made', async () => {
    const stored = { ...makeAsset({ id: 12, path: 'https://assets.example.test/new.webp', alt: { el: '', en: '' } }), duplicate: false }
    const wrapper = (await mount()).wrapper
    api.routes({ [LIBRARY]: (_url: string, options: { method?: string }) => options.method === 'POST' ? stored : LISTED })
    const file = new File(['x'], 'new.webp', { type: 'image/webp' })

    wrapper.findComponent(UFileUpload).vm.$emit('update:modelValue', file)
    await flushPromises()

    const post = api.callsTo(LIBRARY).find(call => call.options?.method === 'POST')!
    expect(post.options.body).toBeInstanceOf(FormData)
    expect((post.options.body as FormData).get('file')).toBe(file)
    expect(field('Εναλλακτικό κείμενο (Ελληνικά)')).toBeTruthy()
    expect(document.body.textContent).toContain('new.webp')
  })

  it('asks for the library only once it is opened, and again at its first page each time', async () => {
    const { open } = await mount(undefined, false)
    expect(api.callsTo(LIBRARY)).toHaveLength(0)

    open.value = true
    await flushPromises()
    expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg', 'banner.png'])
    expect(api.callsTo(LIBRARY)).toHaveLength(1)
  })

  it('opens at the first page even when it was closed on a later one', async () => {
    api.routes({ [LIBRARY]: (_url: string, options: { query?: { page?: number } }) => ({ count: 30, results: options.query?.page === 2 ? [banner] : [hero] }) })
    const { open } = await mount()
    const second = all<HTMLButtonElement>('nav button').find(node => node.textContent?.trim() === '2')!
    second.click()
    await flushPromises()
    expect(api.callsTo(LIBRARY).at(-1)!.options.query.page).toBe(2)

    open.value = false
    await flushPromises()
    open.value = true
    await flushPromises()

    expect(api.callsTo(LIBRARY).at(-1)!.options.query.page).toBe(1)
  })

  it('keeps one library per picker: opening the second asks for it even though the first never opened', async () => {
    const opens = [ref(false), ref(false)]
    await mountSuspended(defineComponent({
      setup: () => () => h(UApp, null, {
        default: () => opens.map((open, index) => h(BuilderMediaPicker, {
          'key': index,
          'open': open.value,
          'onUpdate:open': (next: boolean) => { open.value = next },
          'selected': undefined,
        })),
      }),
    }), { attachTo: document.body })
    await flushPromises()

    opens[1]!.value = true
    await flushPromises()

    expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg', 'banner.png'])
  })

  it('deletes an image nothing uses, tells the field, and shows the library without it', async () => {
    const { removed } = await mount()
    await look('banner.png')
    api.routes({ [LIBRARY]: { count: 1, results: [hero] }, [`${LIBRARY}/8`]: null })

    button('Διαγραφή')!.click()
    await flushPromises()
    button('Επιβεβαίωση διαγραφής')!.click()
    await flushPromises()

    expect(api.callsTo(`${LIBRARY}/8`)[0]!.options.method).toBe('DELETE')
    expect(removed).toEqual([8])
    expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg'])
    expect(button('Αποθήκευση κειμένου')).toBeUndefined()
  })

  describe('when the page it is on no longer exists', () => {
    const paged = (_url: string, options: { query?: { page?: number } }) =>
      options.query?.page === 2 ? { count: 25, results: [banner] } : { count: 25, results: [hero] }
    const pageTwoGone = (url: string, options: { query?: { page?: number } }) =>
      options.query?.page === 2 ? failWith(404, { detail: 'Invalid page.' })() : paged(url, options)

    async function onPageTwo() {
      api.routes({ [LIBRARY]: paged })
      await mount()
      all<HTMLButtonElement>('nav button').find(node => node.textContent?.trim() === '2')!.click()
      await flushPromises()
      await look('banner.png')
    }

    it('steps back a page when the last image of the last page is deleted', async () => {
      await onPageTwo()
      api.routes({ [LIBRARY]: pageTwoGone, [`${LIBRARY}/8`]: null })

      button('Διαγραφή')!.click()
      await flushPromises()
      button('Επιβεβαίωση διαγραφής')!.click()
      await flushPromises()

      expect(api.callsTo(LIBRARY).at(-1)!.options.query.page).toBe(1)
      expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg'])
    })

    it('steps back a page when saved alt text takes the last match off it', async () => {
      await onPageTwo()
      api.routes({ [LIBRARY]: pageTwoGone, [`${LIBRARY}/8`]: makeAsset({ id: 8, path: banner.path, alt: { el: 'Πανό', en: '' } }) })

      await typeInto(field('Εναλλακτικό κείμενο (Ελληνικά)'), 'Πανό')
      button('Αποθήκευση κειμένου')!.click()
      await flushPromises()

      expect(api.callsTo(LIBRARY).at(-1)!.options.query.page).toBe(1)
      expect(all('ul button').map(node => node.getAttribute('aria-label'))).toEqual(['hero.jpg'])
    })

    it('stays and offers to try again when the first page itself is not found', async () => {
      api.routes({ [LIBRARY]: failWith(404, { detail: 'Not found.' }) })

      await mount()

      expect(api.callsTo(LIBRARY).every(call => call.options.query.page === 1)).toBe(true)
      expect(api.callsTo(LIBRARY)).toHaveLength(1)
    })
  })

  it('locks the library while a change is being made, so its answer cannot replace another image', async () => {
    await mount()
    await look('hero.jpg')
    let answer!: (asset: Asset) => void
    const pending = new Promise<Asset>((resolve) => {
      answer = resolve
    })
    api.routes({ [LIBRARY]: LISTED, [`${LIBRARY}/4`]: () => pending })

    await typeInto(field('Εναλλακτικό κείμενο (Ελληνικά)'), 'Νέο')
    button('Αποθήκευση κειμένου')!.click()
    await flushPromises()

    expect(button('banner.png')!.disabled).toBe(true)

    answer(hero)
    await flushPromises()

    expect(button('banner.png')!.disabled).toBe(false)
  })

  it('asks twice before it deletes, and names the pages that use an image Django refuses to delete', async () => {
    await mount()
    await look('hero.jpg')
    api.routes({ [LIBRARY]: LISTED, [`${LIBRARY}/4`]: failWith(409, { detail: 'In use.', code: 'media_in_use', usedBy: ['page:about'] }) })

    button('Διαγραφή')!.click()
    await flushPromises()
    expect(api.callsTo(`${LIBRARY}/4`)).toHaveLength(0)
    button('Επιβεβαίωση διαγραφής')!.click()
    await flushPromises()

    expect(api.callsTo(`${LIBRARY}/4`)[0]!.options.method).toBe('DELETE')
    expect(document.body.textContent).toContain('Η εικόνα χρησιμοποιείται σε δημοσιευμένες σελίδες')
    expect(document.body.textContent).toContain('about')
    expect(button('Επιβεβαίωση διαγραφής')).toBeUndefined()
  })
})
