import { describe, expect, it } from 'vitest'
import { organizationSchemaType } from '~/utils/organizationType'

describe('organizationSchemaType', () => {
  it.each([
    [{ takesOrders: true, hasPhysicalStore: false }, 'OnlineStore'],
    [{ takesOrders: true, hasPhysicalStore: true }, ['OnlineStore', 'Store']],
    [{ takesOrders: false, hasPhysicalStore: true }, 'Store'],
    [{ takesOrders: false, hasPhysicalStore: false }, 'Organization'],
  ])('types %o as %o', (store, type) => {
    expect(organizationSchemaType(store)).toEqual(type)
  })
})
