import { afterEach, describe, expect, it } from 'vitest'
import { markupWithoutScriptsAndStyles } from '../../helpers/html'

/**
 * The e2e specs read what a page DRAWS through this: the payload (a script)
 * carries the same text as the markup, so an unstripped check would pass on
 * a page whose HTML lacks it.
 */
describe('markupWithoutScriptsAndStyles', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'ranScript')
  })

  const page = `<!DOCTYPE html><html lang="el"><head>
    <style>.x::after { content: "Σχόλιο στο στυλ" }</style>
    <script type="application/json" id="__NUXT_DATA__">["Σχόλιο στο payload"]</script>
    <SCRIPT>globalThis.ranScript = true; var t = "Σχόλιο σε SCRIPT"</SCRIPT>
  </head><body><p>Σχόλιο στο σώμα</p><script>var u = "</scr" + "ipt>Σχόλιο σε δεύτερο script"</script></body></html>`

  it('keeps the body text once and none of the contents of its scripts or styles', () => {
    const markup = markupWithoutScriptsAndStyles(page)

    expect(markup.split('Σχόλιο στο σώμα')).toHaveLength(2)
    expect(markup).not.toContain('στο στυλ')
    expect(markup).not.toContain('στο payload')
    expect(markup).not.toContain('σε SCRIPT')
    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('<style')
  })

  it('runs nothing', () => {
    markupWithoutScriptsAndStyles(page)

    expect(Reflect.has(globalThis, 'ranScript')).toBe(false)
  })
})
