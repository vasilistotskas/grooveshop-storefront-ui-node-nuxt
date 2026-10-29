import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/texts/validate.post'
import { backend, callRoute } from '~~/test/helpers/nitro'

const GREETING = 'components/Demo/Greeting'

const validate = (body: unknown) => callRoute(handler, {
  route: '/api/texts/validate',
  method: 'POST',
  body,
  headers: { 'x-forwarded-host': 'evil.example' },
})

const text = (key: string, value: string, locale = 'el', namespace = GREETING) => validate({ namespace, key, locale, value })

describe('POST /api/texts/validate', () => {
  describe('accepts', () => {
    it.each([
      ['a new wording with the same named parameter', 'welcome', 'el', 'Καλώς ήρθες, {name}!'],
      ['the default itself', 'welcome', 'en', 'Hello {name}'],
      ['a plural message with the same cases', 'items', 'en', '{count} piece | {count} pieces'],
      ['a message that keeps its list parameter', 'total', 'el', '{0} σύνολο'],
      ['a message that keeps its linked reference', 'signature', 'en', 'Cheers, @:brand.name'],
      ['a message that keeps its linked modifier', 'shout', 'en', 'LOUD @.upper:brand.name'],
      ['a text without parameters', 'plain', 'en', 'Nothing to fill in'],
      ['HTML, as the app\'s compiler options allow', 'plain', 'el', '<b>Χωρίς</b> παραμέτρους'],
    ])('%s', async (_label, key, locale, value) => {
      const response = await text(key, value, locale)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ ok: true })
    })

    it('holds a locale without a default to the default of the other', async () => {
      // `only_en` has no Greek text: the English default is the reference.
      expect((await text('only_en', 'Μόνο αγγλικά {name}')).body).toEqual({ ok: true })
      expect((await text('only_en', 'Μόνο αγγλικά {other}')).body).toMatchObject({ code: 'placeholder_mismatch' })
    })

    it('holds each locale to its own default when the locales differ', async () => {
      // Greek has two plural cases, English one.
      expect((await text('reading_time', '{minutes} λεπτό | {minutes} λεπτά', 'el')).status).toBe(200)
      expect((await text('reading_time', '{minutes} min', 'en')).status).toBe(200)
      expect((await text('reading_time', '{minutes} min | {minutes} mins', 'en')).body).toMatchObject({ code: 'placeholder_mismatch' })
    })

    it('has no side effect: it asks no backend and changes nothing', async () => {
      await text('welcome', 'Γεια {name}')

      expect(backend.requests).toHaveLength(0)
    })
  })

  describe('refuses with 422 and a stable code', () => {
    it('unknown_key for a key the build does not have', async () => {
      const response = await text('no.such.key', 'x')

      expect(response.status).toBe(422)
      expect(response.body).toEqual({
        ok: false,
        code: 'unknown_key',
        detail: `The build has no text "no.such.key" in "${GREETING}".`,
      })
    })

    it('unknown_key for a key of another namespace', async () => {
      const response = await text('welcome', 'Hi {name}', 'el', 'components/Demo/Other')

      expect(response.status).toBe(422)
      expect(response.body).toMatchObject({ ok: false, code: 'unknown_key' })
    })

    it('unknown_key for a flag that is not a message', async () => {
      expect((await text('rows.0.live', 'x')).body).toMatchObject({ code: 'unknown_key' })
    })

    it.each([
      ['the Omnibus label', 'components/Product/PriorPrice', 'label'],
      ['the Omnibus label of a tenant tree', 'components/variants/webside/Product/PriorPrice', 'label'],
      ['a cookie dialog text', 'components/Cookie/Modal', 'title'],
      ['a validation message', 'global', 'validation.required'],
      ['an error code text', 'global', 'errors.codes.must_have_purchased'],
      ['a legal page title', 'global', 'breadcrumb.items.terms-of-use.label'],
    ])('locked_key for %s', async (_label, namespace, key) => {
      const response = await text(key, 'Anything {field}', 'el', namespace)

      expect(response.status).toBe(422)
      expect(response.body).toEqual({
        ok: false,
        code: 'locked_key',
        detail: `"${key}" in "${namespace}" is locked: only the platform changes it.`,
      })
    })

    it('locked_key before the text is even read', async () => {
      // An uncompilable text for a locked key still answers locked_key.
      expect((await text('label', '{', 'el', 'components/Product/PriorPrice')).body).toMatchObject({ code: 'locked_key' })
    })

    it.each([
      ['an empty placeholder', '{}'],
      ['an unterminated placeholder', 'Γεια {name'],
      ['an unbalanced closing brace', 'Γεια } {name}'],
      ['an empty linked key', '{name} @:'],
    ])('syntax_error for %s', async (_label, value) => {
      const response = await text('welcome', value)

      expect(response.status).toBe(422)
      expect(response.body).toMatchObject({ ok: false, code: 'syntax_error' })
      expect(response.body.detail).not.toBe('')
    })

    it('syntax_error names what the compiler found', async () => {
      expect((await text('welcome', '{}')).body.detail).toBe('Empty placeholder')
    })

    describe('placeholder_mismatch', () => {
      it.each([
        ['a named parameter dropped', 'welcome', 'el', 'Γεια σου', 'missing named:name'],
        ['a named parameter renamed', 'welcome', 'el', 'Γεια σου {user}', 'missing named:name; unexpected named:user'],
        ['a named parameter added', 'plain', 'en', 'Hello {name}', 'unexpected named:name'],
        ['a list parameter dropped', 'total', 'en', 'Total', 'missing list:0'],
        ['a linked reference dropped', 'signature', 'en', 'The team', 'missing linked:brand.name'],
        ['a linked reference pointed elsewhere', 'signature', 'en', 'The @:cart.empty team', 'missing linked:brand.name; unexpected linked:cart.empty'],
        ['a linked modifier changed', 'shout', 'en', '@.lower:brand.name', 'missing linked:brand.name|upper; unexpected linked:brand.name|lower'],
        ['a plural message flattened to one case', 'items', 'en', '{count} items', '1 plural case(s), expected 2'],
        ['a plural message given a third case', 'items', 'en', 'none | {count} item | {count} items', '3 plural case(s), expected 2'],
        ['a plural case losing its parameter', 'items', 'en', 'one item | many', 'missing named:count'],
      ])('for %s', async (_label, key, locale, value, detail) => {
        const response = await text(key, value, locale)

        expect(response.status).toBe(422)
        expect(response.body).toEqual({ ok: false, code: 'placeholder_mismatch', detail })
      })
    })
  })

  describe('for a store (schema)', () => {
    const FOOTER = 'components/Chrome/Footer'
    const WEBSIDE_FOOTER = 'components/variants/webside/Chrome/Footer'
    const forStore = (schema: string, namespace: string, key = 'title', value = 'Νέος τίτλος') =>
      validate({ namespace, key, locale: 'el', value, schema })

    it('accepts a text of a component that store renders', async () => {
      expect((await forStore('webside', WEBSIDE_FOOTER)).body).toEqual({ ok: true })
      expect((await forStore('acme', FOOTER)).body).toEqual({ ok: true })
    })

    it('answers unknown_key for a namespace only another store renders', async () => {
      const webside = await forStore('acme', WEBSIDE_FOOTER)

      expect(webside.status).toBe(422)
      expect(webside.body).toEqual({
        ok: false,
        code: 'unknown_key',
        detail: `The build has no text "title" in "${WEBSIDE_FOOTER}" that the store "acme" renders.`,
      })
      expect((await forStore('webside', FOOTER)).body).toMatchObject({ code: 'unknown_key' })
      expect((await forStore('ekfyseosfyteias', 'components/PageSection/Hero')).body).toMatchObject({ code: 'unknown_key' })
      expect((await forStore('ekfyseosfyteias', 'components/PageSection/variants/ekfyseosfyteias/Hero')).body).toEqual({ ok: true })
    })

    it('treats a schema the build does not know as the default store', async () => {
      expect((await forStore('never_heard_of', FOOTER)).body).toEqual({ ok: true })
      expect((await forStore('never_heard_of', 'components/PageSection/variants/ekfyseosfyteias/Hero')).body).toMatchObject({ code: 'unknown_key' })
    })

    it('keeps the global texts and the locks for every store', async () => {
      expect((await forStore('webside', 'global', 'cart.empty', 'Άδειο')).body).toEqual({ ok: true })
      expect((await forStore('webside', 'global', 'validation.required', '{field}')).body).toMatchObject({ code: 'locked_key' })
    })

    it('rejects a schema that is not an identifier', async () => {
      expect((await forStore('web side', FOOTER)).status).toBe(400)
      expect((await forStore('../webside', FOOTER)).status).toBe(400)
    })
  })

  it('rejects a malformed request as a validation error, not as one of the four codes', async () => {
    const response = await validate({ namespace: GREETING, key: 'welcome', locale: 'de', value: 'x' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBeUndefined()
  })

  it('rejects a text longer than the bound before it compiles anything', async () => {
    const response = await text('plain', 'x'.repeat(2001), 'en')

    expect(response.status).toBe(400)
  })
})
