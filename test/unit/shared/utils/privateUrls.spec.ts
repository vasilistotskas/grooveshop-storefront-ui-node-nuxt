import { describe, it, expect } from 'vitest'
import { isPrivateUrl } from '~~/shared/utils/privateUrls'

describe('isPrivateUrl', () => {
  it.each([
    '/account/password/reset/key/abc-123',
    '/account/verify-email/abc',
    '/account/provider/callback',
    '/alerts/confirm/abc',
    '/cart/recover/abc',
    '/checkout/success/00000000-0000-4000-8000-000000000000',
    '/email/unsubscribe/abc',
    '/newsletter/confirm/abc',
    '/en/account/password/reset/key/abc-123',
    '/en/checkout/success/00000000-0000-4000-8000-000000000000',
    '/checkout/success/abc/',
    '/account/login?next=%2Fcart%2Frecover%2Fabc',
    '/account/login?next=/cart/recover/abc',
    '/account/login?redirect=/checkout/success/abc',
  ])('holds %s private', (path) => {
    expect(isPrivateUrl(path)).toBe(true)
  })

  it.each([
    '/',
    '/en',
    '/products',
    '/products/2/a-product',
    '/cart',
    '/checkout',
    '/checkout/success',
    '/en/checkout/success',
    '/account/password/reset',
    '/account/orders/12',
    '/account/settings/privacy',
    // The data export is downloaded signed in; no address holds its key.
    '/account/settings/privacy?export=a-token',
    '/account/login?next=/products',
    '/products?page=2&ordering=price',
    '/gift-cards?purchase=abc',
  ])('leaves %s alone', (path) => {
    expect(isPrivateUrl(path)).toBe(false)
  })
})
