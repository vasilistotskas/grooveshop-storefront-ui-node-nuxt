export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
    },
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8',
    },
    formField: {
      slots: {
        error: 'text-xs',
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
        base: 'cursor-pointer data-[state=unchecked]:bg-(--ui-secondary)/25 data-[state=unchecked]:dark:bg-gray-300/25',
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
  },
  icon: {
    mode: 'css',
    cssLayer: 'base',
  },
})
