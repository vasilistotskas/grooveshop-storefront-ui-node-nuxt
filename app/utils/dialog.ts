/**
 * The frame the Groove Volt boards draw a dialog in: a 22px radius, the
 * title in the display face over a rule, 24px of body, and the actions
 * right-aligned on the warm ground under a rule.
 *
 * A `UModal` `ui` object rather than a theme override: it is applied by
 * the dialogs the redesign has reached, while the ones it has not (the
 * locker pickers, the coupon picker, search) keep their own until their
 * pages are redesigned. A dialog adds its width — and anything else of
 * its own — by appending to `content`.
 */
export const DIALOG_UI = {
  content: 'rounded-[1.375rem]',
  header: 'border-b border-default px-6 py-5',
  title: 'font-display text-[1.375rem] font-bold',
  body: 'p-6 sm:p-6',
  footer: 'justify-end gap-2.5 border-t border-default bg-muted px-6 py-4',
} as const
