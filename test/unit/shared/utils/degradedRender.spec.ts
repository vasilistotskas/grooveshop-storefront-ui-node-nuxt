import { describe, expect, it } from 'vitest'
import { DEGRADED_RENDER_STATUS } from '~~/shared/constants/degradedRender'
import { markDegradedRender } from '~~/shared/utils/degradedRender'

const render = (statusCode = 200) => ({ context: {} as { degradedRender?: { status: number } }, node: { res: { statusCode } } })

describe('markDegradedRender', () => {
  it('answers with the status Nitro\'s page cache refuses, and remembers the real one', () => {
    const event = render()

    markDegradedRender(event)

    expect(event.node.res.statusCode).toBe(DEGRADED_RENDER_STATUS)
    expect(DEGRADED_RENDER_STATUS).toBeGreaterThanOrEqual(400)
    expect(event.context.degradedRender).toEqual({ status: 200 })
  })

  it('remembers a status the render had already set', () => {
    const event = render(404)

    markDegradedRender(event)

    expect(event.context.degradedRender).toEqual({ status: 404 })
  })
})
