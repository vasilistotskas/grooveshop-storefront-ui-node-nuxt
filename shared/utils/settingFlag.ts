/**
 * The ONE truthiness rule for a boolean merchant setting.
 *
 * Django serialises a bool row as ``"True"`` / ``"False"``, but a
 * merchant can also store ``1`` or ``yes`` in a string-typed row, and
 * every reader — component flags, route gates, the sitemap gate, the
 * feeds — must agree on what counts as "on". It used to be copied into
 * four places, and one of them tested ``=== 'true'`` alone, which 404'd
 * the page it was meant to enable for a store that had typed ``1``.
 *
 * ``undefined`` (no row, or a fetch that never landed) resolves to the
 * caller's ``fallback``: shopper-facing chrome fails OPEN, commercial
 * features fail CLOSED — the caller owns that decision, this does not.
 */
export function parseSettingFlag(
  raw: string | undefined,
  fallback: boolean,
): boolean {
  if (raw === undefined) return fallback
  const value = raw.trim().toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}
