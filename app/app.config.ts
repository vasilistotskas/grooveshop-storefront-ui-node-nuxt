export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
    },
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8',
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
        base: 'data-[state=unchecked]:bg-(--ui-secondary)/25',
      },
    },
  },
  nuxtIcon: {},
})
