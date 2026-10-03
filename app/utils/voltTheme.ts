/**
 * Groove Volt's component theme: the shapes and sizes of its design
 * system, in `app.config.ts`'s `ui` shape.
 *
 * `app/plugins/design.ts` lays this over the request's app config for
 * every Volt tenant (`applyUiTheme`), so it reads as a second config
 * layer: classes here join the base config's and win their conflicts,
 * compound variants run after the base's. The base config itself stays
 * untouched — it is what the frozen webside tree renders with.
 *
 * Colours are NOT here: they are the tokens under `[data-design="volt"]`
 * in `main.css`. A component that needs one names the semantic token
 * (`bg-elevated`, `ring-default`, `text-accent`), never a hex, so a
 * tenant's accent and the dark scheme reach it.
 *
 * Sizes come from the board (`design/groove-volt`): controls are 36 px
 * (`sm`), 44 px (`md`, the default) and 52 px (`lg`) tall, buttons and
 * badges are pills, inputs have a 12 px radius (`rounded-sm` on a
 * 0.75 rem `--ui-radius`) and cards 18 px (`rounded-md`).
 */
export const VOLT_UI = {
  container: {
    base: 'lg:px-12',
  },

  button: {
    slots: {
      base: 'rounded-full font-semibold',
    },
    variants: {
      size: {
        // A MINIMUM height, not a fixed one: a label button is exactly
        // the board's height either way, but a button that wraps content
        // — the product gallery's image buttons — was cropped to 44px.
        xs: { base: 'min-h-8 px-3 text-xs gap-1.5', leadingIcon: 'size-4', trailingIcon: 'size-4' },
        sm: { base: 'min-h-9 px-3.5 text-sm gap-2', leadingIcon: 'size-4', trailingIcon: 'size-4' },
        md: { base: 'min-h-11 px-5 text-[0.9375rem] gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
        lg: { base: 'min-h-13 px-6.5 text-base gap-2', leadingIcon: 'size-5', trailingIcon: 'size-5' },
        xl: { base: 'min-h-14 px-7 text-base gap-2.5', leadingIcon: 'size-6', trailingIcon: 'size-6' },
      },
    },
    compoundVariants: [
      // An icon-only button is a circle of the control's height.
      { size: 'xs', square: true, class: 'w-8 px-0 justify-center' },
      { size: 'sm', square: true, class: 'w-9 px-0 justify-center' },
      { size: 'md', square: true, class: 'w-11 px-0 justify-center' },
      { size: 'lg', square: true, class: 'w-13 px-0 justify-center' },
      { size: 'xl', square: true, class: 'w-14 px-0 justify-center' },
      // Ink lightens a step on hover; the accent darkens one.
      { color: 'primary', variant: 'solid', class: 'hover:bg-primary/90 active:bg-primary/90' },
      { color: 'secondary', variant: 'solid', class: 'hover:bg-(--ui-secondary-hover) active:bg-(--ui-secondary-hover)' },
      // The outline button keeps its white face and darkens its line.
      { color: 'neutral', variant: 'outline', class: 'ring-default hover:ring-accented hover:bg-default active:bg-default' },
    ],
  },

  badge: {
    slots: {
      base: 'rounded-full font-bold',
    },
    variants: {
      size: {
        sm: { base: 'h-5 px-2 text-[0.6875rem] gap-1' },
        md: { base: 'h-6 px-2.25 text-xs gap-1' },
        lg: { base: 'h-7.5 px-3 text-xs gap-1.5' },
      },
    },
    compoundVariants: [
      // Statuses are a tint with the status colour as text — dark
      // enough on Volt to read at 5.4:1 or better, unlike the base
      // stylesheet's lighter greens and ambers.
      { color: 'success', variant: 'soft', class: 'bg-(--ui-success-soft) text-success' },
      { color: 'warning', variant: 'soft', class: 'bg-(--ui-warning-soft) text-warning' },
      { color: 'error', variant: 'soft', class: 'bg-(--ui-error-soft) text-error' },
      { color: 'info', variant: 'soft', class: 'bg-(--ui-info-soft) text-info' },
      { color: 'secondary', variant: 'soft', class: 'bg-(--ui-secondary-soft) text-accent' },
      { color: 'neutral', variant: 'soft', class: 'bg-elevated text-toned' },
      { color: 'neutral', variant: 'outline', class: 'ring-default bg-default text-toned' },
    ],
  },

  breadcrumb: {
    slots: {
      link: 'text-[0.8125rem] font-semibold',
      separatorIcon: 'size-4',
    },
    variants: {
      active: {
        false: { link: 'font-semibold' },
      },
    },
    defaultVariants: {
      color: 'neutral',
    },
  },

  kbd: {
    base: 'rounded-xs font-mono font-semibold normal-case',
    variants: {
      size: {
        md: 'h-5.5 px-1.5 text-[0.6875rem]',
      },
    },
    compoundVariants: [
      { color: 'neutral', variant: 'outline', class: 'ring-default bg-muted text-muted' },
    ],
  },

  chip: {
    slots: {
      base: 'font-mono font-bold',
    },
    variants: {
      size: {
        '3xl': 'h-4.5 min-w-4.5 px-1 text-[0.6875rem]',
      },
    },
  },

  card: {
    slots: {
      root: 'rounded-md',
    },
  },

  formField: {
    slots: {
      label: 'text-[0.8125rem] font-semibold text-toned',
      description: 'text-xs text-muted',
      help: 'text-xs text-muted',
    },
  },

  input: {
    slots: {
      base: 'rounded-sm',
    },
    variants: {
      size: {
        md: { base: 'h-11 px-3.5 gap-2', leading: 'ps-3.5', trailing: 'pe-3.5' },
      },
      variant: {
        outline: 'ring-default',
      },
    },
    compoundVariants: [
      // Focus is the line turning accent, two pixels wide, rather than
      // an outline floating off a field.
      { color: 'secondary', variant: ['outline', 'subtle'], class: 'focus-visible:outline-0 focus-visible:ring-2' },
      // 15px from `md` up. Phones keep Nuxt UI's 16px: anything smaller
      // makes iOS zoom into the field on focus.
      { fixed: false, size: 'md', class: 'md:text-[0.9375rem]' },
    ],
    defaultVariants: {
      color: 'secondary',
    },
  },

  // Overlays dim the page with the scrim token, as the boards draw them —
  // ink at 45% (black at 60% in the dark scheme) rather than a light
  // wash. A modal sets its overlay through a variant, the others through
  // the slot.
  modal: {
    variants: {
      overlay: {
        true: { overlay: 'bg-(--ui-scrim)' },
      },
    },
  },

  slideover: {
    slots: {
      overlay: 'bg-(--ui-scrim)',
    },
  },

  drawer: {
    slots: {
      overlay: 'bg-(--ui-scrim)',
    },
  },

  switch: {
    slots: {
      // Off is a neutral track, on is the accent. The base theme draws
      // off as the accent at half strength, for 3:1 against its ground —
      // on Volt that reads as a lighter "on". Dimmed grey keeps the 3:1
      // (3.4:1 on white) without looking switched on.
      base: 'data-[state=unchecked]:bg-(--ui-text-dimmed) data-[state=unchecked]:dark:bg-(--ui-text-dimmed)',
    },
  },

  checkbox: {
    slots: {
      // 6px: on Volt's 12px `--ui-radius` the base's `rounded-sm`
      // turned a 20px box into a circle, which reads as a radio.
      base: 'rounded-[0.375rem]',
    },
    defaultVariants: {
      color: 'secondary',
    },
  },

  navigationMenu: {
    compoundVariants: [
      // The bar's link is a semibold pill: `toned` at rest, ink on the
      // `elevated` fill when hovered or open. The current section keeps
      // the base theme's ink on `elevated`.
      { orientation: 'horizontal', variant: 'pill', class: { link: 'font-semibold before:rounded-full' } },
      { orientation: 'horizontal', variant: 'pill', active: false, class: { link: 'text-toned' } },
      {
        orientation: 'horizontal',
        variant: 'pill',
        active: false,
        disabled: false,
        class: { link: 'hover:before:bg-elevated data-[state=open]:before:bg-elevated' },
      },
    ],
  },
} satisfies UiTheme
