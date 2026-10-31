import { describe, it, expect } from 'vitest'
import { APP, appLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * A `NuxtImg` that preloads names its priority: `:preload="{ fetchPriority: 'high' }"`.
 *
 * A bare `preload` emits `<link rel="preload" as="image">` with no
 * `fetchpriority`, so Chrome queues the hero's preload at Low priority even
 * though the `<img>` carries `fetchpriority="high"` (Lighthouse
 * `lcp-discovery-insight`; `/about` and `/why-microlearning`,
 * 2026-10-31). `ImgWithFallback` does this for its own `preload` flag.
 */
describe('NuxtImg preload', () => {
  it('is never the bare boolean attribute', () => {
    const offenders: string[] = []
    let images = 0
    for (const file of vueFiles(APP)) {
      walkElements(sfcTemplate(file), (node) => {
        if (node.tag !== 'NuxtImg') return
        images++
        if (node.props.some(prop => prop.type === 6 && prop.name === 'preload')) {
          offenders.push(`${appLabel(file)}:${node.loc.start.line}`)
        }
      })
    }

    expect(images, 'the walker must still find NuxtImg').toBeGreaterThan(5)
    expect(offenders, 'use :preload="{ fetchPriority: \'high\' }"').toEqual([])
  })
})
