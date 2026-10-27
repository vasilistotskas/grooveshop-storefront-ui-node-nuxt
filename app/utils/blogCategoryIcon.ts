/**
 * The Font Awesome icons the blog's category rail draws as inlined icons.
 * A category whose picture is an SVG named after one of them gets the
 * icon, which is crisp and takes no request, instead of the picture.
 */
const INLINED_FA6_ICONS = new Set([
  'shield',
  'mobile',
  'desktop',
  'robot',
  'microchip',
  'globe',
  'network-wired',
  'shuffle',
])

/** The inlined icon for a category's picture path, or null when it has none. */
export function deriveIconName(mainImagePath: string | null | undefined): string | null {
  if (!mainImagePath) return null
  const match = mainImagePath.match(/\/([^/]+)\.svg(?:\/|$)/i)
  const captured = match?.[1]
  if (!captured) return null
  const base = captured
    .replace(/(-solid(?:-full)?)(_\d+)?$/i, '')
    .replace(/_\d+$/, '')
  if (!base || !INLINED_FA6_ICONS.has(base)) return null
  return `i-fa6-solid:${base}`
}
