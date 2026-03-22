<script lang="ts" setup>
const props = withDefaults(defineProps<{
  includeCart?: boolean
}>(), {
  includeCart: true,
})

const { items } = useMobileNavItems({ includeCart: props.includeCart })
</script>

<template>
  <MobileOrTabletOnly>
    <UNavigationMenu
      orientation="horizontal"
      :items="items"
      :ui="{
        root: `
          fixed inset-x-0 bottom-0 z-50 block w-full border-t border-primary-200
          bg-primary-50
          dark:border-primary-700 dark:bg-primary-900
        `,
        list: 'w-full',
        item: 'w-full',
        link: `
          flex place-items-center justify-center
          before:bg-transparent
          dark:before:bg-transparent
        `,
        linkLabel: 'sr-only',
        linkLeadingIcon: 'size-8',
        linkLeadingAvatar: 'size-8',
      }"
    />
  </MobileOrTabletOnly>
</template>
