import { describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import el from '~~/i18n/locales/el-GR.json'
import en from '~~/i18n/locales/en-US.json'
import { zOrderDetail, zPayWayKeyEnum } from '~~/shared/openapi/zod.gen'

/**
 * Contract tripwire for the order's payment-method label.
 *
 * `payWayKey` is a snapshot of what the shopper chose, and Django sends
 * it as an EMPTY STRING for any order with no pay way. The first
 * generated version of this field was a bare required enum with no
 * blank member — `parseDataAs` would have thrown on those orders and
 * 422'd the whole order page, exactly the failure mode that killed
 * add-to-cart when a zero weight serialised as null.
 *
 * The blank arm only exists because the DRF field declares
 * `allow_blank=True`; a read-only ChoiceField does not get it for free.
 * If someone drops that, this fails here instead of in production.
 */
describe('order payWayKey contract', () => {
  /**
   * Every pay way Django can send has a label in every locale file.
   * `usePaymentMethod` falls back to the raw key for a missing one, so a
   * new pay way on the API renders `APPLE_PAY` at a customer — silently.
   */
  it.each(Object.entries({ 'el-GR': el, 'en-US': en }))('is translated for every key in %s', (_file, messages) => {
    const labels = (messages as { payment_methods: Record<string, string> }).payment_methods
    const missing = zPayWayKeyEnum.options.filter(key => !labels[key]?.trim())

    expect(missing).toEqual([])
  })

  it('checks a locale file for every supported locale', () => {
    // A third locale added without its file here would skip the check.
    expect(SUPPORTED_LOCALES).toEqual(['el', 'en'])
  })

  it('accepts an order with no pay way at all', () => {
    // Guest orders, orders whose PayWay row was deleted (the FK is
    // SET_NULL), and every row until the backfill migration lands.
    const result = zOrderDetail.shape.payWayKey.safeParse('')

    expect(result.success).toBe(true)
  })

  it('still rejects a value that is neither a key nor blank', () => {
    // `acs_cod` is the GATEWAY code that used to be rendered here. If
    // it ever parses, someone has pointed the field back at
    // `payment_method` and customers are reading internals again.
    const result = zOrderDetail.shape.payWayKey.safeParse('acs_cod')

    expect(result.success).toBe(false)
  })

  it('exposes the BoxNow product as its own key', () => {
    // The whole point of pay_way migration 0022 — before it, the
    // locker product shared PAY_ON_DELIVERY and rendered as a second
    // button reading "Αντικαταβολή".
    expect(zPayWayKeyEnum.options).toContain('BOX_NOW_PAY_ON_THE_GO')
    expect(zPayWayKeyEnum.options).toContain('PAY_ON_DELIVERY')
  })

  it('is present on the payload, not optional', () => {
    // A missing key must be a contract violation: the components read
    // it directly and an `undefined` would silently blank the row.
    expect(zOrderDetail.shape.payWayKey.safeParse(undefined).success).toBe(
      false,
    )
  })
})
