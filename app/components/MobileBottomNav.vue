<script lang="ts" setup>
/**
 * The phone tab bar.
 *
 * Styled from semantic tokens rather than the neutral ramp directly, so
 * a tenant's own surface and accent colours reach it like every other
 * piece of chrome.
 */
const props = withDefaults(defineProps<{
  includeCart?: boolean
}>(), {
  includeCart: true,
})

const { items } = useMobileNavItems({ includeCart: props.includeCart })

// Hide the bar while the on-screen keyboard is open so it does not eat
// the visible viewport. `visualViewport.height` shrinks when the
// keyboard deploys (iOS & Android); the 150px threshold avoids toggling
// on browser-chrome address-bar collapses.
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
      highlight-color="secondary"
      :ui="{
        root: `
          fixed inset-x-0 bottom-0 z-50 block w-full border-t border-default
          bg-default/90 backdrop-blur-md transition-transform duration-200
          ${keyboardOpen ? 'translate-y-full' : 'translate-y-0'}
        `,
        list: 'w-full',
        item: 'w-full',
        link: `
          relative flex min-h-12 flex-col items-center justify-center gap-0.5
          text-muted
          data-[active=true]:text-highlighted
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
