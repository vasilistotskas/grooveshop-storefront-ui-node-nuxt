import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Preview from '~/components/GiftCard/Preview.vue'

/**
 * The gift card as the recipient will see it: amount, who it is for and
 * from, and the message, each only when the buyer has given it.
 */
async function mount(props: Record<string, unknown>) {
  const wrapper = await mountSuspended(Preview, { route: false, props })
  return wrapper.text().replace(/\u00A0/g, ' ')
}

describe('GiftCard/Preview', () => {
  it('shows the amount in the store currency', async () => {
    expect(await mount({ amount: 50 })).toContain('50,00 €')
  })

  it.each([
    ['both names', { recipientName: 'Ελένη', senderName: 'Δήμος' }, 'Για Ελένη, από Δήμος'],
    ['only the recipient', { recipientName: 'Ελένη' }, 'Για Ελένη'],
    ['only the sender', { senderName: 'Δήμος' }, 'Από Δήμος'],
  ])('says who it is for and from with %s', async (_case, names, expected) => {
    expect(await mount({ amount: 50, ...names })).toContain(expected)
  })

  it('leaves the who-line out when no name is given', async () => {
    const shown = await mount({ amount: 50, recipientName: '  ', senderName: '' })

    expect(shown).not.toContain('Για')
    expect(shown).not.toContain('Από')
  })

  it('quotes the message, trimmed, and shows none when it is blank', async () => {
    expect(await mount({ amount: 50, message: '  Χρόνια πολλά!  ' })).toContain('“Χρόνια πολλά!”')
    expect(await mount({ amount: 50, message: '   ' })).not.toContain('“')
  })
})
