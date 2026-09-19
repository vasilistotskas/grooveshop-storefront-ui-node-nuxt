import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * A decorative blur that hangs outside its box must be CLIPPED.
 *
 * These are absolutely-positioned circles placed deliberately past the
 * edge of their band (`-top-24 -left-20 … blur-3xl`) so the colour
 * bleeds in from off-screen. With nothing clipping them they do not
 * merely paint outside: they make the DOCUMENT wider, and the page
 * scrolls sideways. On fyteia that was a 390px phone scrolling to
 * 454px — exactly the width of one orb hanging off the right edge.
 *
 * The rule: a template that positions a blurred decoration absolutely
 * also contains `overflow-hidden`. Cheap to check, and it is the thing
 * that actually went wrong.
 */
const ROOTS = [
  resolve(__dirname, '../../../app/components/PageSection'),
  resolve(__dirname, '../../../app/components/PageSection/variants'),
]

function vueFilesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) out.push(...vueFilesUnder(path))
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

describe('decorative blurs', () => {
  it('are clipped by an ancestor in the same template', () => {
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(root)) {
        const source = readFileSync(file, 'utf8')
        // Comments are stripped first: a comment EXPLAINING the clip
        // contains the word, and the first version of this test passed
        // against a file whose only `overflow-hidden` was the note
        // saying why it mattered.
        const template = source
          .slice(source.indexOf('<template>'))
          .replace(/<!--[\s\S]*?-->/g, '')
        // A blurred decoration taken out of flow and pulled outside
        // its box by a negative inset.
        const hangs = /blur-(2xl|3xl)/.test(template)
          && /\babsolute\b/.test(template)
          && /-(top|bottom|left|right|start|end)-\d/.test(template)
        if (hangs && !/overflow-hidden/.test(template)) {
          offenders.push(file.split(/[\\/]/).slice(-2).join('/'))
        }
      }
    }

    expect(offenders, 'these place a blurred decoration with nothing clipping it').toEqual([])
  })
})
