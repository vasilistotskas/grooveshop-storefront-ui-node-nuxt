/**
 * Greek ΑΦΜ (tax identification number) checksum.
 *
 * Mirror of the Django-side `b2b/validators.py::is_valid_greek_vat` —
 * the two MUST stay in lockstep or the checkout form green-lights a
 * value the API then rejects. Expects input WITH or WITHOUT the EL/GR
 * prefix (it strips it, matching the serializer's normalisation).
 */
export function isValidGreekAfm(value: string): boolean {
  const digits = value.trim().toUpperCase().replace(/^(EL|GR)/, '').trim()
  if (!/^\d{9}$/.test(digits) || digits === '000000000') {
    return false
  }
  let total = 0
  for (let i = 0; i < 8; i++) {
    total += Number(digits[i]) * 2 ** (8 - i)
  }
  return total % 11 % 10 === Number(digits[8])
}
