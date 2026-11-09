import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { Ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { makeBlogAuthor } from '~~/test/fixtures/blog'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A blog author is ONE schema.org Person on the author's page and on every
 * post they wrote. Live on webside (2026-11-09) every post named the same
 * `#author` entity whoever wrote it, with a relative photo path and the
 * LinkedIn profile as the url, and the author page named a second entity.
 */
const { personInputs } = vi.hoisted(() => ({ personInputs: [] as unknown[] }))
mockNuxtImport('definePerson', () => (input: unknown) => {
  personInputs.push(input)
  return input
})
mockNuxtImport('useSchemaOrg', () => () => {})

type PersonNode = Record<string, unknown>

async function personOf(author: ReturnType<typeof makeBlogAuthor>, description?: string) {
  let id: string | undefined
  await mountSuspended(
    defineComponent({
      setup() {
        id = useBlogAuthorPerson(() => author, { description: () => description }).value
        return () => null
      },
    }),
    { route: false },
  )
  const input = personInputs.at(-1) as Ref<PersonNode>
  return { id, person: input.value }
}

describe('useBlogAuthorPerson', () => {
  beforeEach(async () => {
    personInputs.length = 0
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('gives each author one absolute @id on the store, the Article\'s author', async () => {
    const siteUrl = useSiteConfig().url
    const first = await personOf(makeBlogAuthor({ id: 3 }))
    const second = await personOf(makeBlogAuthor({ id: 4 }))

    expect(first.person['@id']).toBe(`${siteUrl}/blog/author/3#person`)
    expect(first.id).toBe(first.person['@id'])
    expect(second.person['@id']).toBe(`${siteUrl}/blog/author/4#person`)
  })

  it('keeps the @id without a language prefix, and the url on the page\'s language', async () => {
    const siteUrl = useSiteConfig().url
    await useNuxtApp().$i18n.setLocale('en')

    const { person } = await personOf(makeBlogAuthor({ id: 3 }))

    expect(person['@id']).toBe(`${siteUrl}/blog/author/3#person`)
    expect(person.url).toBe(`${siteUrl}/en/blog/author/3`)
  })

  it('names the author and links their public profiles and website as sameAs', async () => {
    const { person } = await personOf(makeBlogAuthor({
      user: { id: 3, username: null, firstName: 'Νάρεκ', lastName: 'Αμπραχαμιάν', mainImagePath: '' },
      sameAs: ['https://www.linkedin.com/in/narek', 'https://x.com/narek'],
      website: 'https://narek.example',
    }), 'Γράφει για κινητά.')

    expect(person).toMatchObject({
      name: 'Νάρεκ Αμπραχαμιάν',
      description: 'Γράφει για κινητά.',
      sameAs: ['https://www.linkedin.com/in/narek', 'https://x.com/narek', 'https://narek.example'],
    })
  })

  it('lists a profile once when the website repeats it', async () => {
    const { person } = await personOf(makeBlogAuthor({
      sameAs: ['https://www.linkedin.com/in/narek'],
      website: 'https://www.linkedin.com/in/narek',
    }))

    expect(person.sameAs).toEqual(['https://www.linkedin.com/in/narek'])
  })

  it('leaves out sameAs, image and description that the author does not have', async () => {
    const { person } = await personOf(makeBlogAuthor())

    expect(person.sameAs).toBeUndefined()
    expect(person.image).toBeUndefined()
    expect(person.description).toBeUndefined()
  })

  it('serves the photo as an absolute URL on the store\'s media host', async () => {
    setTenant({ assetsDomain: 'assets.shop.test' })
    const { person } = await personOf(makeBlogAuthor({
      user: { id: 3, username: null, firstName: 'Νάρεκ', lastName: 'Α', mainImagePath: 'media/webside/uploads/users/narek.png' },
    }))

    expect(person.image).toMatch(/^https:\/\/assets\.shop\.test\/.*narek\.png/)
  })
})
