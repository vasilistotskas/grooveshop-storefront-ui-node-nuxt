import { describe, expect, it } from 'vitest'
import { logSkippedNode } from '~~/server/utils/builderDocument'
import { log } from '~~/test/helpers/nitro'

describe('logSkippedNode', () => {
  it('warns once per node left out, with the node, the reason and the detail', () => {
    logSkippedNode({ path: 'hero/slide_2', reason: 'invalid_settings', detail: 'title: too long' })

    expect(log.warn).toHaveBeenCalledWith({
      tag: 'builder',
      message: 'node skipped',
      node: 'hero/slide_2',
      reason: 'invalid_settings',
      detail: 'title: too long',
    })
  })

  it('leaves the detail out when there is none', () => {
    logSkippedNode({ path: 'hero', reason: 'unknown_type' })

    expect(log.warn).toHaveBeenCalledWith({ tag: 'builder', message: 'node skipped', node: 'hero', reason: 'unknown_type' })
  })
})
