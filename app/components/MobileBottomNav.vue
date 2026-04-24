<script lang="ts" setup>
const props = withDefaults(defineProps<{
  includeCart?: boolean
}>(), {
  includeCart: true,
})

const { items } = useMobileNavItems({ includeCart: props.includeCart })

// Hide the bottom nav while the on-screen keyboard is open so it doesn't
// eat the visible viewport. `visualViewport.height` shrinks when the
// keyboard deploys (iOS & Android). Threshold 150px avoids toggling on
// browser-chrome address-bar collapses.
const keyboardOpen = ref(false)

onMounted(() => {
  if (!window.visualViewport) return
  const vv = window.visualViewport
  const evaluate = () => {
    keyboardOpen.value = window.innerHeight - vv.height > 150
  }
  vv.addEventListener('resize', evaluate)
  evaluate()
  onBeforeUnmount(() => vv.removeEventListener('resize', evaluate))
})
</script>

<template>
  <MobileOrTabletOnly>
    <UNavigationMenu
      orientation="horizontal"
      :items="items"
      :aria-label="'Mobile navigation'"
      highlight
      :ui="{
        root: `
          fixed inset-x-0 bottom-0 z-50 block w-full border-t border-primary-200
          bg-primary-50/90 backdrop-blur-md transition-transform duration-200
          dark:border-primary-700 dark:bg-primary-900/90
          ${keyboardOpen ? 'translate-y-full' : 'translate-y-0'}
        `,
        list: 'w-full',
        item: 'w-full',
        link: `
          relative flex min-h-12 flex-col items-center justify-center gap-0.5
          before:bg-transparent
          data-[active=true]:text-(--ui-secondary)
          data-[active=true]:before:bg-(--ui-secondary)/10
          dark:before:bg-transparent
        `,
        linkLabel: 'text-[10px] leading-tight font-medium',
        linkLeadingIcon: 'size-6',
        linkLeadingAvatar: 'size-6',
      }"
      :style="{
        paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))',
      }"
    />
  </MobileOrTabletOnly>
</template>
