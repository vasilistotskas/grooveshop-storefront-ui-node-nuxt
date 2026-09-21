/**
 * The tinted pairings whose LABEL fails AA.
 *
 * `success`, `warning` and the tenant accent are light enough that the
 * `soft`/`subtle` variants — which paint the text in the status colour
 * on a 10% tint of it — land between 2.8:1 and 4.2:1. Measured across
 * the catalogue, the offers page, the loyalty ledger, the 2FA settings
 * and the order confirmation.
 *
 * `info`, `primary` and `neutral` are NOT in this list: they measured
 * clean. Narrowing to the colours that fail is what keeps this a bug
 * fix rather than a restyle of a live store.
 */
const TINTED = (['success', 'warning', 'secondary'] as const).flatMap(
  color => (['soft', 'subtle'] as const).map(variant => ({ color, variant })),
)

/**
 * `error` joins them for ALERTS, and only for alerts.
 *
 * In dark mode `--ui-error` resolves to `error-400`, and on a 10% tint
 * of itself the account-deletion alert measured 2.78:1 on its title and
 * all four of its bullets (`/account/settings/privacy`, 2026-09-21).
 * Light mode passes, which is why the first pass — measured in light —
 * recorded error as clean.
 *
 * The BADGE keeps its red label: webside's frozen render uses error
 * badges that pass, and nothing measured says otherwise. `--ui-error`
 * is a platform token, not a tenant one, so this alert fix lands
 * identically on every store — including webside's own auth errors,
 * which carry the same 2.78:1 today.
 */
const TINTED_ALERTS = [
  ...TINTED,
  ...(['soft', 'subtle'] as const).map(
    variant => ({ color: 'error' as const, variant }),
  ),
]

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
    },
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8',
    },
    // Override the default UMain min-height. Nuxt UI v4 ships with
    // ``min-h-[calc(100vh-var(--ui-header-height))]``, but ``100vh`` on
    // iOS Safari/Chrome resolves to the *largest* possible viewport
    // (address-bar collapsed). When the bar is visible, the actual
    // visible area is shorter than 100vh, so the main element extends
    // *below* the bar and the page jolts every time the bar shows or
    // hides. ``100dvh`` (dynamic viewport height) tracks the currently
    // visible area, eliminating that jolt and the "scrolling looks
    // broken" feel on mobile. Falls back to 100vh in browsers without
    // dvh support (Safari <15.4) via the @supports flag layer.
    main: {
      base: 'min-h-[calc(100dvh-var(--ui-header-height))]',
    },
    formField: {
      slots: {
        error: 'text-xs',
        // A field's helper line is `text-muted`, and muted is
        // calibrated against `bg-default` — on a card it measured
        // 4.43:1 on the account settings form. `toned` is the step
        // that clears AA on both surfaces.
        description: 'text-toned',
        help: 'text-toned',
      },
    },
    input: {
      slots: {
        root: 'w-full',
        placeholder: 'text-muted',
      },
    },
    selectMenu: {
      slots: {
        base: 'w-full',
        // Nuxt UI paints a placeholder with `text-dimmed`, which is
        // 2.51:1 on `bg-default` — the worst reading in the account
        // area, on the word that tells you the field is unset. This
        // comes from the component theme, so no source-level rule
        // could have caught it.
        placeholder: 'text-muted',
      },
    },
    textarea: {
      slots: {
        root: 'w-full',
      },
    },
    button: {
      slots: {
        // ``tap-press`` gives every button a pressed state on touch,
        // where there is no hover and the platform's own tap flash is
        // switched off by Tailwind's preflight. Defined in main.css as
        // a plain class on purpose: a ``transition-*`` utility here
        // would collide with the theme's own ``transition-colors`` and
        // be merged away. Reaches buttons rendered as ``<a>`` too —
        // the cart is one — which an element selector cannot.
        base: 'cursor-pointer tap-press',
      },
      variants: {
        size: {
          '3xl': {
            leadingIcon: 'size-12',
            trailingIcon: 'size-12',
          },
        },
      },
      compoundVariants: [
        {
          color: 'secondary',
          variant: 'solid',
          class: 'text-(--ui-on-secondary) bg-(--ui-secondary) hover:bg-(--ui-secondary)/75 disabled:bg-(--ui-secondary) aria-disabled:bg-(--ui-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ui-secondary)',
        },
        // Every NON-solid accent button paints its label with the fill
        // token, which is 4.18:1 on the dark page — measured on the
        // gift-card amount presets and the PDP's price-drop alert.
        // `text-accent` keeps the brand colour and is readable in both
        // schemes; neutralising the label would have thrown the colour
        // away to fix a dark-mode-only problem.
        //
        // `text-(--ui-secondary-text)` rather than the `text-accent`
        // utility: tailwind-merge has to RECOGNISE this as a text
        // colour to drop the variant's own `text-secondary`, and the
        // arbitrary-property form is what the solid rule above already
        // proves it recognises. A custom utility is not in its class
        // map, so both would survive and source order would decide.
        ...(['outline', 'ghost', 'soft', 'subtle'] as const).map(
          variant => ({
            color: 'secondary' as const,
            variant,
            class: 'text-(--ui-secondary-text)',
          }),
        ),
        // `link` needs its STATES too: it is the one variant whose
        // hover, active and disabled classes are text colours rather
        // than backgrounds, so overriding the base alone would leave
        // the pointer landing back on the unreadable fill.
        {
          color: 'secondary',
          variant: 'link',
          class: 'text-(--ui-secondary-text) hover:text-(--ui-secondary-text)/75 active:text-(--ui-secondary-text)/75 disabled:text-(--ui-secondary-text) aria-disabled:text-(--ui-secondary-text)',
        },
      ],
    },
    // A solid secondary badge is the same trap the button compound
    // variant above exists to close. Nuxt UI pairs a solid colour with
    // ``text-inverted``, which is white in light mode but near-BLACK in
    // dark mode — and the tenant accent stays a mid blue in both, so the
    // dark-mode pairing measured 3.7:1 on the catalogue's "New" badge and
    // the offers page's "Gift" one. ``--ui-on-secondary`` is white in both
    // modes by definition, which is what the accent was chosen against.
    // A TINTED badge paints its label in the status colour, and those
    // colours are calibrated as FILLS: on `bg-{color}/10` they measured
    // 2.8-4.2:1 across the catalogue, the offers page, the loyalty
    // ledger and the order-confirmation status. The tint and the ring
    // carry the colour; the words do not. Scoped to the tinted variants
    // so a future `solid` badge keeps its own inverted foreground.
    // Same rule for alerts, plus `error` — see TINTED_ALERTS. Every
    // UAlert in the app is `soft` or `subtle`; the icon keeps the
    // colour, so an error alert still reads as one at a glance.
    alert: {
      compoundVariants: [
        ...TINTED_ALERTS.map(({ color, variant }) => ({
          color,
          variant,
          class: { title: 'text-toned', description: 'text-toned' },
        })),
      ],
    },
    badge: {
      compoundVariants: [
        // `base`, not `label`: with the default slot the text renders
        // straight into the badge root and a `label` override paints
        // nothing. The icon takes the colour back, so the badge still
        // reads as a status at a glance.
        ...TINTED.map(({ color, variant }) => ({
          color,
          variant,
          class: {
            base: 'text-toned',
            leadingIcon: `text-${color}`,
            trailingIcon: `text-${color}`,
          },
        })),
        {
          color: 'secondary',
          variant: 'solid',
          class: 'text-(--ui-on-secondary) bg-(--ui-secondary)',
        },
        // Amber is the other colour `text-inverted` gets wrong, and for
        // the opposite reason: it is LIGHT in both schemes, so the white
        // it is paired with in light mode measured 2.94:1 on the
        // catalogue's "Only N left" badge.
        {
          color: 'warning',
          variant: 'solid',
          class: 'text-(--ui-on-warning)',
        },
      ],
    },
    chip: {
      variants: {
        size: {
          '3xl': 'h-[16px] min-w-[16px] text-[14px]',
        },
      },
    },
    skeleton: {
      base: 'bg-(--ui-color-primary-300) dark:bg-(--ui-color-primary-700)',
    },
    breadcrumb: {
      variants: {
        active: {
          true: {
            link: 'text-(--ui-color-primary-950) dark:text-(--ui-color-primary-50)',
          },
        },
      },
    },
    switch: {
      slots: {
        // Unchecked opacity raised from /25 (~2.8:1) to /50 so the
        // switch track meets WCAG 2.1 AA 3:1 non-text contrast against
        // neutral-50 / neutral-950 backgrounds.
        base: 'cursor-pointer data-[state=unchecked]:bg-(--ui-secondary)/50 data-[state=unchecked]:dark:bg-gray-300/50',
      },
    },
    avatar: {
      variants: {
        size: {
          '4xl': { root: 'size-16 text-2xl' },
          '5xl': { root: 'size-20 text-3xl' },
          '6xl': { root: 'size-24 text-4xl' },
          '7xl': { root: 'size-28 text-5xl' },
        },
      },
    },
    pagination: {
      slots: {
        label: 'w-full',
      },
    },
    tabs: {
      slots: {
        // An INACTIVE trigger is `text-muted`, and a pill list sits on
        // `bg-elevated` — the surface muted is not calibrated against.
        // Measured 4.39:1 on the search page's and the notifications
        // page's own filters, which are the navigation of those pages.
        trigger: 'cursor-pointer data-[state=inactive]:text-toned',
      },
    },
    accordion: {
      slots: {
        trigger: 'cursor-pointer',
      },
    },
    // Push the toast viewport past the sticky header so success /
    // error toasts (e.g. "Προστέθηκε στο καλάθι") don't overlap the
    // header action buttons (cart, user, search). The default
    // ``top-4`` lives in a compound variant inside
    // ``.nuxt/ui/toaster.ts`` ({ position: top-*, class: { viewport:
    // 'top-4' } }). We override THAT compound variant rather than the
    // viewport slot itself — slot-level overrides land BEFORE compound-
    // variant classes in ``tv()``'s merge order, so the default
    // ``top-4`` wins via ``tailwind-merge``'s last-class-wins (the
    // problem we hit when shipping the slot-only override earlier).
    //
    // User-supplied ``compoundVariants`` concat AFTER the theme's
    // defaults, so this entry's calc()-based ``viewport`` class wins
    // the top-offset conflict cleanly. (Avoid writing class-shaped
    // tokens in comments — Tailwind's scanner reads raw file text and
    // emits broken CSS for them.) The CSS variable
    // ``--ui-header-height`` is the same one Nuxt UI exposes for
    // ``UMain`` — anchoring to it keeps the toast immediately below
    // the header at any viewport size without hand-tuned breakpoints.
    toaster: {
      compoundVariants: [
        {
          position: ['top-left', 'top-center', 'top-right'],
          class: {
            viewport: 'top-[calc(var(--ui-header-height)+1rem)]',
          },
        },
      ],
    },
  },
  icon: {
    mode: 'css',
    cssLayer: 'base',
  },
})
