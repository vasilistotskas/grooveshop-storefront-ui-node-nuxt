import { describe, expect, it } from 'vitest'
import { applyUiTheme, type UiTheme } from '~/utils/designTheme'

/**
 * A design's component theme is laid over the app config the way a
 * second `app.config.ts` layer stacks on the first — never by replacing
 * what the base config already says.
 */
const apply = (base: Record<string, unknown>, overlay: Record<string, unknown>) => {
  const ui = structuredClone(base)
  applyUiTheme(ui, overlay as UiTheme)
  return ui
}

describe('applyUiTheme', () => {
  it('keeps both class lists in one string, the overlay\'s last so it wins a conflict', () => {
    const ui = apply(
      { button: { slots: { base: 'cursor-pointer tap-press' } } },
      { button: { slots: { base: 'rounded-full font-semibold' } } },
    )

    expect(ui.button).toEqual({
      slots: { base: 'cursor-pointer tap-press rounded-full font-semibold' },
    })
  })

  it('joins class lists inside variants into a string, never an array', () => {
    // tailwind-variants reads an array variant value in a slotted theme
    // as a per-slot map (`test/nuxt/plugins/design.spec.ts` renders it).
    const ui = apply(
      { chip: { variants: { size: { '3xl': 'h-[16px] min-w-[16px]' } } } },
      { chip: { variants: { size: { '3xl': ['h-4.5', 'min-w-4.5'] } } } },
    )

    expect(ui.chip).toEqual({
      variants: { size: { '3xl': 'h-[16px] min-w-[16px] h-4.5 min-w-4.5' } },
    })
  })

  it('appends compound variants after the base\'s', () => {
    const base = { color: 'secondary', variant: 'solid', class: 'hover:bg-(--ui-secondary)/75' }
    const overlay = { color: 'secondary', variant: 'solid', class: 'hover:bg-(--ui-secondary-hover)' }

    const ui = apply(
      { button: { compoundVariants: [base] } },
      { button: { compoundVariants: [overlay] } },
    )

    expect((ui.button as { compoundVariants: unknown[] }).compoundVariants).toEqual([base, overlay])
  })

  it('replaces default variants rather than joining their names', () => {
    const ui = apply(
      { input: { defaultVariants: { color: 'primary', size: 'md' } } },
      { input: { defaultVariants: { color: 'secondary' } } },
    )

    expect(ui.input).toEqual({ defaultVariants: { color: 'secondary', size: 'md' } })
  })

  it('replaces colour and icon settings', () => {
    const ui = apply(
      { colors: { primary: 'neutral', neutral: 'zinc' } },
      { colors: { primary: 'emerald' } },
    )

    expect(ui.colors).toEqual({ primary: 'emerald', neutral: 'zinc' })
  })

  it('adds a component the base config never themed', () => {
    const ui = apply({}, { kbd: { base: 'font-mono' } })

    expect(ui.kbd).toEqual({ base: 'font-mono' })
  })

  it('lets a slot written as a function replace the base classes', () => {
    const replace = () => 'text-base'
    const ui = apply(
      { button: { slots: { label: 'truncate' } } },
      { button: { slots: { label: replace } } },
    )

    expect((ui.button as { slots: { label: unknown } }).slots.label).toBe(replace)
  })

  it('leaves the components the overlay does not mention untouched', () => {
    const switchTheme = { slots: { base: 'cursor-pointer' } }
    const ui = apply({ switch: switchTheme }, { button: { slots: { base: 'rounded-full' } } })

    expect(ui.switch).toEqual(switchTheme)
  })
})
