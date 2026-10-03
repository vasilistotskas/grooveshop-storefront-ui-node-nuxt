/**
 * Whether a shopper's recovery codes are running low — three or fewer
 * unused — so the Security page's tile and the codes page both warn and
 * suggest generating a new set. One threshold, so the two never
 * disagree about the same account.
 */
export function recoveryCodesRunningLow(unused: number): boolean {
  return unused <= 3
}
