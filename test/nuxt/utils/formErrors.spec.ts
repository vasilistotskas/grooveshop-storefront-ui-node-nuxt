/**
 * A failed submit has to take the shopper to the field that failed.
 *
 * Nuxt UI renders the message beside the field and leaves the page
 * where it is, so on a long form (checkout, signup, an address) the
 * submit looks like it did nothing at all.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { scrollToFirstFormError } from '~/utils/formErrors'

function makeField(id: string) {
  const element = document.createElement('input')
  element.id = id
  document.body.appendChild(element)
  element.scrollIntoView = vi.fn()
  element.focus = vi.fn()
  return element
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduce })))
}

beforeEach(() => {
  document.body.innerHTML = ''
  setReducedMotion(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scrollToFirstFormError', () => {
  it('scrolls the first failing field into view and focuses it', async () => {
    const email = makeField('checkout-email')
    makeField('checkout-phone')

    scrollToFirstFormError({
      errors: [
        { id: 'checkout-email', name: 'email', message: 'Required' },
        { id: 'checkout-phone', name: 'phone', message: 'Required' },
      ],
    } as never)

    expect(email.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    })
    expect(email.focus).toHaveBeenCalledWith({ preventScroll: true })
    // And again once the task drains: a failed submit re-renders the
    // form, and a focus set mid-patch is lost with its node.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(email.focus).toHaveBeenCalledTimes(2)
  })

  it('leaves the later fields alone', () => {
    makeField('checkout-email')
    const phone = makeField('checkout-phone')

    scrollToFirstFormError({
      errors: [
        { id: 'checkout-email', name: 'email', message: 'Required' },
        { id: 'checkout-phone', name: 'phone', message: 'Required' },
      ],
    } as never)

    expect(phone.scrollIntoView).not.toHaveBeenCalled()
  })

  it('jumps without animation when the reader asked for reduced motion', () => {
    setReducedMotion(true)
    const email = makeField('checkout-email')

    scrollToFirstFormError({
      errors: [{ id: 'checkout-email', name: 'email', message: 'Required' }],
    } as never)

    expect(email.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'center',
    })
  })

  it('does nothing when the failing field is not on screen', () => {
    // A step that is no longer rendered: nothing to scroll to, and the
    // message still shows wherever the form puts it.
    expect(() => scrollToFirstFormError({
      errors: [{ id: 'absent', name: 'email', message: 'Required' }],
    } as never)).not.toThrow()
  })

  it('does nothing when the form reports no errors', () => {
    const email = makeField('checkout-email')

    scrollToFirstFormError({ errors: [] } as never)
    scrollToFirstFormError({} as never)

    expect(email.scrollIntoView).not.toHaveBeenCalled()
  })
})
