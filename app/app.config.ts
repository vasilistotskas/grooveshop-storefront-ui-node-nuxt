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
      },
    },
    input: {
      slots: {
        root: 'w-full',
      },
    },
    selectMenu: {
      slots: {
        base: 'w-full',
      },
    },
    textarea: {
      slots: {
        root: 'w-full',
      },
    },
    button: {
      slots: {
        base: 'cursor-pointer',
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
          class: 'text-white bg-(--ui-secondary) hover:bg-(--ui-secondary)/75 disabled:bg-(--ui-secondary) aria-disabled:bg-(--ui-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ui-secondary) dark:text-white',
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
        trigger: 'cursor-pointer',
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
