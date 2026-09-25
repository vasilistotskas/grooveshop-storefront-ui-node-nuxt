/**
 * Zod ``superRefine`` step for the delivery-address rules in
 * ``shared/utils/postalCode.ts``, shared by checkout and the address
 * book so both report the same message on the same field.
 */
import type * as z from 'zod'

interface AddressCountry {
  postalCodePattern?: string
  postalCodeExample?: string
}

export function addressIssueMessage(
  issue: AddressIssue,
  country: AddressCountry | undefined,
  t: (key: string, named?: Record<string, unknown>) => string,
): string {
  if (issue === 'street') return t('validation.street.no_letter')
  if (issue === 'streetNumber') return t('validation.street_number.looks_like_postcode')
  return country?.postalCodeExample
    ? t('validation.zipcode.invalid_example', { example: country.postalCodeExample })
    : t('validation.zipcode.invalid')
}

export function refineAddress(
  ctx: z.RefinementCtx,
  country: AddressCountry | undefined,
  address: { street?: string | null, streetNumber?: string | null, zipcode?: string | null },
  t: (key: string, named?: Record<string, unknown>) => string,
): void {
  const issues = addressIssues(country, {
    street: address.street ?? '',
    streetNumber: address.streetNumber ?? '',
    zipcode: address.zipcode ?? '',
  })
  for (const issue of issues) {
    ctx.addIssue({
      path: [issue],
      code: 'custom',
      message: addressIssueMessage(issue, country, t),
    })
  }
}
