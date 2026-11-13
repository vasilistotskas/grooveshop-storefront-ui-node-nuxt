/**
 * The `data-phone-hidden` attribute of a section's `index`-th item: present
 * (`''`) past the section's `phoneLimit`, which hides it below `sm`
 * (`main.css`); absent within it, or when the section sets no limit. CSS
 * rather than a shorter list, so the cached render is one for every device.
 */
export function phoneHidden(limit: number | undefined, index: number): '' | undefined {
  return limit !== undefined && index >= limit ? '' : undefined
}
