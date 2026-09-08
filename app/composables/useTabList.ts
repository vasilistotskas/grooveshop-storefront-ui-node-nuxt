/**
 * The state and the keyboard of a real tablist.
 *
 * Extracted because the Δelta Σigma boards offer one selector band in
 * three shapes — boxed cards over a panel, a numbered strip over a
 * panel, a vertical rail beside it — and every one of them owes a
 * keyboard user the same behaviour: one tab stop for the whole list,
 * arrows to move within it, Home/End to its ends, and a panel wired to
 * the chosen tab. Three copies of that is three chances to get it
 * wrong.
 *
 * `orientation` decides which arrows move the selection. Both axes
 * accept both pairs on purpose: WAI-ARIA specifies Left/Right for a
 * horizontal tablist and Up/Down for a vertical one, and accepting the
 * other pair as well costs nothing and surprises nobody.
 */
export function useTabList(
  count: () => number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
) {
  const active = ref(0)
  const tabs = useTemplateRef<HTMLButtonElement[]>('tabs')

  const id = useId()
  const tabId = (index: number) => `${id}-tab-${index}`
  const panelId = `${id}-panel`

  /** A shorter list must not leave the selection past its end. */
  watch(count, (total) => {
    if (active.value >= total) active.value = 0
  })

  function onKeydown(event: KeyboardEvent, index: number) {
    const total = count()
    if (total < 2) return
    const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
    const back = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
    const step = event.key === forward || event.key === 'ArrowRight'
      ? 1
      : event.key === back || event.key === 'ArrowLeft' ? -1 : 0
    const jump = event.key === 'Home'
      ? 0
      : event.key === 'End' ? total - 1 : null
    if (!step && jump === null) return
    event.preventDefault()
    const next = jump ?? (index + step + total) % total
    active.value = next
    tabs.value?.[next]?.focus()
  }

  return { active, tabs, tabId, panelId, onKeydown }
}
