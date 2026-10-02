<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

/**
 * The phone tab bar — a floating dock.
 *
 * Held 12px off the screen's edges and bottom (plus the device's safe
 * area), so the page reads under it rather than ending at a strip. The
 * active tab is an ink pill carrying its icon and label; the others are
 * icons whose label stays in the accessibility tree. The footer keeps
 * its last line clear of the dock with its own bottom padding.
 *
 * Styled from semantic tokens, so a tenant's surface and accent reach
 * it like every other piece of chrome.
 */
const props = withDefaults(defineProps<{
  includeCart?: boolean
}>(), {
  includeCart: true,
})

const { t } = useI18n()
const { items } = useBottomNavItems({ includeCart: props.includeCart })

/** Per-item classes, last in Nuxt UI's merge, so they win over the variants. */
const dockItems = computed<NavigationMenuItem[]>(() =>
  items.value.map(item => ({
    ...item,
    class: item.active
      ? 'h-11.5 gap-2 rounded-2xl bg-inverted px-4 text-inverted'
      : 'size-11.5 justify-center rounded-2xl px-0 text-toned',
    ui: {
      linkLabel: item.active ? 'text-[0.8125rem] font-bold' : 'sr-only',
    },
  })),
)

// Hide the dock while the on-screen keyboard is open so it does not eat
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
      :items="dockItems"
      :aria-label="t('mobile_navigation')"
      color="neutral"
      variant="link"
      :ui="{
        // `[&>div]:flex-1`: the list sits in a wrapper Reka adds, which
        // would otherwise shrink to the icons and bunch them in the
        // middle of the bar.
        root: `
          fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]
          z-50 h-16 rounded-[1.375rem] border border-default bg-default/95 px-2
          shadow-(--ui-overlay-shadow) backdrop-blur-md transition-transform
          duration-200
          [&>div]:flex-1
          ${keyboardOpen ? 'translate-y-[calc(100%+2rem)]' : 'translate-y-0'}
        `,
        list: 'flex size-full items-center justify-between',
        item: 'py-0',
        link: 'before:hidden',
        linkLeadingIcon: 'size-5 text-current',
      }"
    />
  </MobileOrTabletOnly>
</template>

<i18n lang="yaml">
el:
  mobile_navigation: Κύρια πλοήγηση κινητού
en:
  mobile_navigation: Mobile navigation
</i18n>
