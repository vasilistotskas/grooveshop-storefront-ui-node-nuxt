import { describe, expect, it } from 'vitest'
import { isLockedText } from '~~/shared/constants/lockedTexts'

describe('isLockedText', () => {
  it.each([
    ['the Omnibus prior-price label', 'components/Product/PriorPrice', 'label'],
    ['the Omnibus label of a tenant tree', 'components/variants/webside/Product/PriorPrice', 'label'],
    ['a cookie dialog text', 'components/Cookie/Modal', 'banner.title'],
    ['the cookie banner text', 'components/Chrome/CookieConsent', 'accept_all'],
    ['a global cookie text', 'global', 'cookies.necessary.name'],
    ['a legal page title in the breadcrumb', 'global', 'breadcrumb.items.privacy-policy.label'],
    ['a legal page title in the footer', 'global', 'footer.term_of_use'],
    ['the legal pages\' own copy of a title', 'components/Storefront/Legal', 'breadcrumb.items.return-policy.label'],
    ['a validation message', 'global', 'validation.required'],
    ['an error code text', 'global', 'errors.codes.must_have_purchased'],
  ])('locks %s', (_label, namespace, key) => {
    expect(isLockedText(namespace, key)).toBe(true)
  })

  it.each([
    ['a text of another product component', 'components/Product/Card', 'label'],
    ['a text of a component that merely mentions cookies', 'components/Chrome/Footer', 'cookie_settings'],
    ['the legal page description', 'components/Storefront/Legal', 'legal.terms-of-use.description'],
    ['a breadcrumb title that is not a legal page', 'global', 'breadcrumb.items.about.label'],
    ['a global text', 'global', 'cart.empty'],
    ['a component key shaped like a locked global key', 'components/Demo/Greeting', 'validation.required'],
  ])('leaves %s editable', (_label, namespace, key) => {
    expect(isLockedText(namespace, key)).toBe(false)
  })
})
