import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import { NAVIGATION_ROUTES } from '~~/shared/constants/builder'
import { BUILDER_TEXTAREA_MIN_LENGTH } from '~~/shared/constants/builderEditor'
import {
  builderProblemSettingPath,
  builderRouteLabelKey,
  builderSettingsFields,
  fieldForSettingPath,
  flattenSettingsFields,
} from '~/utils/builderSettingsFields'

const block = defineBlock({
  type: 'sample',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    heading: builderField.requiredText(200),
    body: builderField.text(BUILDER_TEXTAREA_MIN_LENGTH).optional(),
    surface: builderField.surface().optional(),
    route: z.enum(NAVIGATION_ROUTES).optional(),
    columns: builderField.integer(1, 6).optional(),
    shade: builderField.number(0, 1).optional(),
    autoplayMs: z.union([z.literal(0), builderField.integer(3000, 15000)]).optional(),
    marquee: builderField.boolean().optional(),
    backgroundColor: builderField.hexColor().optional(),
    icon: builderField.icon(64).optional(),
    embedUrl: builderField.httpsUrl().optional(),
    ctaLink: builderField.link().optional(),
    productId: builderField.id().optional(),
    images: z.array(builderField.text(1000)).max(10).optional(),
    content: builderField.richText(5000).optional(),
    prompt: z.object({ title: builderField.requiredText(100), text: builderField.text(100).optional() }).optional(),
  }),
  refs: { '/productId': 'product' },
})

const byPath = () => new Map(flattenSettingsFields(builderSettingsFields(block)).map(field => [field.path, field]))

describe('builderSettingsFields', () => {
  it('lists the settings in the order the schema declares them', () => {
    expect(builderSettingsFields(block).map(field => field.path)).toEqual([
      'heading', 'body', 'surface', 'route', 'columns', 'shade', 'autoplayMs', 'marquee', 'backgroundColor',
      'icon', 'embedUrl', 'ctaLink', 'productId', 'images', 'content', 'prompt',
    ])
  })

  it('gives each setting the control its schema needs', () => {
    const fields = byPath()

    expect(fields.get('heading')).toMatchObject({ kind: 'text', pointer: '/heading', required: true, minLength: 1, maxLength: 200 })
    expect(fields.get('body')).toMatchObject({ kind: 'textarea', required: false })
    expect(fields.get('surface')).toMatchObject({ kind: 'choice', options: ['default', 'muted'] })
    expect(fields.get('route')).toMatchObject({ kind: 'route', options: [...NAVIGATION_ROUTES] })
    expect(fields.get('columns')).toMatchObject({ kind: 'number', integer: true, min: 1, max: 6 })
    expect(fields.get('shade')).toMatchObject({ kind: 'number', integer: false, min: 0, max: 1 })
    expect(fields.get('autoplayMs')).toMatchObject({ kind: 'number', integer: true })
    expect(fields.get('marquee')).toMatchObject({ kind: 'boolean' })
    expect(fields.get('backgroundColor')).toMatchObject({ kind: 'color' })
    expect(fields.get('icon')).toMatchObject({ kind: 'icon' })
    expect(fields.get('embedUrl')).toMatchObject({ kind: 'url' })
    expect(fields.get('ctaLink')).toMatchObject({ kind: 'link' })
    expect(fields.get('productId')).toMatchObject({ kind: 'record', refKind: 'product' })
    expect(fields.get('images')).toMatchObject({ kind: 'list', maxItems: 10 })
    expect(fields.get('content')).toMatchObject({ kind: 'richText' })
  })

  it('gives an object setting its own fields, by path and pointer', () => {
    expect(byPath().get('prompt')).toMatchObject({
      kind: 'group',
      fields: [
        { kind: 'text', path: 'prompt.title', pointer: '/prompt/title', required: true },
        { kind: 'text', path: 'prompt.text', pointer: '/prompt/text', required: false },
      ],
    })
  })

  it('a text one character short of the textarea limit stays on one line', () => {
    const narrow = defineBlock({ type: 'narrow', version: 1, kinds: ['section'], schema: z.object({ line: builderField.text(BUILDER_TEXTAREA_MIN_LENGTH - 1) }) })

    expect(builderSettingsFields(narrow)[0]).toMatchObject({ kind: 'text' })
  })
})

describe('builderProblemSettingPath', () => {
  it.each([
    ['/i18n/en/hero/~1heading', 'heading'],
    ['/i18n/en/hero/heading', 'heading'],
    ['/i18n/en/s1/~1prompt~1title', 'prompt.title'],
  ])('reads the translated setting of %j in the language being edited', (pointer, path) => {
    const nodeId = pointer.split('/')[3]!
    expect(builderProblemSettingPath(pointer, nodeId, 'en')).toBe(path)
  })

  it('reads no translated setting of another language, or of another node', () => {
    expect(builderProblemSettingPath('/i18n/en/hero/~1heading', 'hero', 'fr')).toBeUndefined()
    expect(builderProblemSettingPath('/i18n/en/hero/~1heading', 's1', 'en')).toBeUndefined()
    expect(builderProblemSettingPath('/i18n/en/hero', 'hero', 'en')).toBeUndefined()
  })

  it.each([
    ['/sections/hero/settings/heading', 'hero', 'heading'],
    ['/sections/hero/blocks/s1/settings/prompt/title', 's1', 'prompt.title'],
    ['/sections/hero/blocks/s1/settings/images/2', 's1', 'images.2'],
  ])('reads the setting of %j for node %j', (pointer, nodeId, path) => {
    expect(builderProblemSettingPath(pointer, nodeId)).toBe(path)
  })

  it.each([
    ['/sections/hero/blocks/s1/settings/heading', 'hero'],
    ['/sections/hero/type', 'hero'],
    ['/i18n/en/hero/~1heading', 'hero'],
    ['/order', 'hero'],
  ])('names nothing for %j and node %j', (pointer, nodeId) => {
    expect(builderProblemSettingPath(pointer, nodeId)).toBeUndefined()
  })
})

describe('fieldForSettingPath', () => {
  it('finds the deepest field a setting path falls under', () => {
    const fields = builderSettingsFields(block)

    expect(fieldForSettingPath(fields, 'prompt.title')?.path).toBe('prompt.title')
    expect(fieldForSettingPath(fields, 'images.2')?.path).toBe('images')
    expect(fieldForSettingPath(fields, 'ctaLink.href')?.path).toBe('ctaLink')
    expect(fieldForSettingPath(fields, 'nothing')).toBeUndefined()
  })
})

describe('builderRouteLabelKey', () => {
  it.each([['/', 'home'], ['/products', 'products'], ['/account/login', 'account-login']])('keys %j as %j', (route, key) => {
    expect(builderRouteLabelKey(route)).toBe(key)
  })
})

describe('builderSettingsFields, data settings', () => {
  const rail = defineBlock({
    type: 'data_rail',
    version: 1,
    kinds: ['section'],
    schema: z.object({
      heading: builderField.text(40).optional(),
      products: builderField.query('product', { onEmpty: 'hide', maxLimit: 12 }),
      posts: builderField.query('blogPost', { onEmpty: 'empty' }).optional(),
      spotlight: builderField.ref('product', { onMissing: 'empty' }).optional(),
      hero: builderField.ref('media', { onMissing: 'empty' }).optional(),
    }),
  })
  const fields = new Map(builderSettingsFields(rail).map(field => [field.path, field]))

  it('gives a list its source and the most it may list, the control of a descriptor', () => {
    expect(fields.get('products')).toEqual({ kind: 'query', path: 'products', pointer: '/products', required: true, source: 'product', maxLimit: 12 })
    expect(fields.get('posts')).toMatchObject({ kind: 'query', source: 'blogPost', maxLimit: 24, required: false })
  })

  it('gives a ref the record picker of its kind, like the refs map did', () => {
    expect(fields.get('spotlight')).toMatchObject({ kind: 'record', refKind: 'product' })
    expect(fields.get('hero')).toMatchObject({ kind: 'record', refKind: 'media' })
  })

  it('finds the field a problem under a descriptor falls under', () => {
    expect(fieldForSettingPath([...fields.values()], 'products.ids')?.path).toBe('products')
  })
})
