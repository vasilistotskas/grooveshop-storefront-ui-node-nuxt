import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'

/**
 * `useMountOnFirstOpen` is the `v-if` of an overlay whose code should load
 * the first time it opens and stay after: false until the first open,
 * then true for good, so closing never unmounts it (its close animation
 * and its state stay).
 */
describe('useMountOnFirstOpen', () => {
  it('stays false while the overlay has never been open', async () => {
    const open = ref(false)
    const mounted = useMountOnFirstOpen(open)

    await nextTick()

    expect(mounted.value).toBe(false)
  })

  it('turns true on the first open and stays true after it closes', async () => {
    const open = ref(false)
    const mounted = useMountOnFirstOpen(open)

    open.value = true
    await nextTick()
    expect(mounted.value).toBe(true)

    open.value = false
    await nextTick()
    expect(mounted.value).toBe(true)
  })

  it('is true at once for an overlay that starts open', () => {
    expect(useMountOnFirstOpen(ref(true)).value).toBe(true)
  })
})
