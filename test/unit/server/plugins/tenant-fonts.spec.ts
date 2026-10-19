import { describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/tenant-fonts'
import { keepHeadFontFaces, tenantFontFamilies } from '~~/server/utils/tenantFontFaces'
import { createTestEvent, runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * `@nuxt/fonts` inlines a face for every selectable family into every
 * page (`global: true`), minified as below. A page keeps only its store's.
 */
const face = (family: string, src = 'url(/_nuxt/fonts/x.woff2)') =>
  `@font-face{font-family:${family};src:${src};font-display:swap;font-weight:400}`
const fallback = (family: string, local: string) =>
  `@font-face{font-family:${family} Fallback\\: ${local};src:local(${local});size-adjust:103%}`

const FONTS_STYLE = `<style>${[
  face('Manrope'),
  fallback('Manrope', 'Arial'),
  face('Geologica'),
  face('JetBrains Mono'),
  face('Vollkorn'),
  fallback('Vollkorn', 'Times New Roman'),
  face('Commissioner'),
  face('Roboto'),
  face('"Source Serif 4"'),
].join('')}</style>`

async function render(context: Record<string, unknown>) {
  const nitroApp = await runNitroPlugin(plugin)
  const html = { head: ['<meta charset="utf-8">', FONTS_STYLE] }
  await nitroApp.hooks.callHook('render:html', html, { event: createTestEvent({ context }) })
  return html.head.join('')
}

const families = (head: string) =>
  [...head.matchAll(/font-family:([^;]+);/g)].map(match => match[1])

describe('server/plugins/tenant-fonts', () => {
  it('keeps the Volt faces, with their fallbacks, on a Volt store', async () => {
    expect(families(await render({ tenant: { schemaName: 'demo' } }))).toEqual([
      'Manrope',
      'Manrope Fallback\\: Arial',
      'Geologica',
      'JetBrains Mono',
    ])
  })

  it('keeps the store\'s own faces where it chose them', async () => {
    const head = await render({
      tenant: {
        schemaName: 'ekfyseosfyteias',
        themeMetadata: { fontSans: 'commissioner', fontDisplay: 'vollkorn' },
      },
    })

    expect(families(head)).toEqual([
      'JetBrains Mono',
      'Vollkorn',
      'Vollkorn Fallback\\: Times New Roman',
      'Commissioner',
    ])
  })

  it('drops every selectable face, and the emptied style, where the store sets none', async () => {
    expect(await render({ tenant: { schemaName: 'webside' } })).toBe('<meta charset="utf-8">')
    expect(await render({})).toBe('<meta charset="utf-8">')
  })
})

describe('keepHeadFontFaces', () => {
  it('reads a quoted or escaped family name', () => {
    const style = `<style>${face('"Source Serif 4"')}${face('Source Serif\\ \\34 ')}</style>`

    expect(keepHeadFontFaces([style], tenantFontFamilies({ display: 'source-serif-4' }))).toEqual([style])
    expect(keepHeadFontFaces([style], new Set())).toEqual([])
  })

  it('leaves a family nobody can select, and a chunk without faces, alone', () => {
    const icons = `<style>${face('Material Icons')}</style>`
    const meta = '<meta name="font-family:Roboto">'

    expect(keepHeadFontFaces([icons, meta], new Set())).toEqual([icons, meta])
  })

  it('keeps the other rules of a style it filters', () => {
    const style = `<style>${face('Roboto')}:root{--x:1}</style>`

    expect(keepHeadFontFaces([style], new Set())).toEqual(['<style>:root{--x:1}</style>'])
  })

  it('drops only the bare style the fonts module leaves behind', () => {
    expect(keepHeadFontFaces(['<style></style>'], new Set())).toEqual([])
    expect(keepHeadFontFaces(['<style id="x"></style>'], new Set())).toEqual(['<style id="x"></style>'])
  })
})
