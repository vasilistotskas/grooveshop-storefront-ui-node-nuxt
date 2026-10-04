import { describe, it, expect, beforeEach } from 'vitest'

/**
 * The cart drawer's shared state: one open flag and the line an add just
 * put in, the same for every caller (the header button, add to cart and
 * the drawer itself).
 */
describe('useCartDrawer', () => {
  beforeEach(() => {
    useCartDrawer().close()
  })

  it('opens with the added line, and opens plain from the header', () => {
    const fromAdd = useCartDrawer()
    fromAdd.show('Καλώδιο USB-C')

    const elsewhere = useCartDrawer()
    expect(elsewhere.open.value).toBe(true)
    expect(elsewhere.added.value).toBe('Καλώδιο USB-C')

    elsewhere.show()
    expect(fromAdd.added.value).toBeNull()
  })

  it('closes for every caller', () => {
    useCartDrawer().show()

    useCartDrawer().close()

    expect(useCartDrawer().open.value).toBe(false)
  })
})
