import { describe, it, expect } from 'vitest'
import { ORDER_FLOW, orderStatusColor, orderStepsReached } from '~/utils/orderStatus'

describe('orderStepsReached', () => {
  it.each(ORDER_FLOW.map((status, index) => [status, index + 1] as const))(
    'counts %s as step %i of the way',
    (status, steps) => {
      expect(orderStepsReached(status)).toBe(steps)
    },
  )

  it.each(['CANCELED', 'RETURNED', 'REFUNDED'] as const)('puts %s off the path', (status) => {
    expect(orderStepsReached(status)).toBe(0)
  })

  it('knows nothing of an order without a status', () => {
    expect(orderStepsReached(undefined)).toBe(0)
  })
})

describe('orderStatusColor', () => {
  it.each([
    ['PENDING', 'warning'],
    ['PROCESSING', 'warning'],
    ['SHIPPED', 'secondary'],
    ['DELIVERED', 'success'],
    ['COMPLETED', 'success'],
    ['CANCELED', 'error'],
    ['RETURNED', 'neutral'],
    ['REFUNDED', 'neutral'],
  ] as const)('tints %s %s', (status, color) => {
    expect(orderStatusColor(status)).toBe(color)
  })
})
