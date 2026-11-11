<script lang="ts" setup>
/**
 * Webside's phone tab bar: Home, Shop, Blog, Cart (with its count) and
 * Account, each only while its store feature is on. Search stays in the
 * header. The entries are the platform's (`useBottomNavItems`); webside
 * picks its tabs and its cart icon, the one its header and its buy
 * button use.
 *
 * A strip along the screen's bottom edge rather than the default design's
 * floating dock, and it docks as one (`data-dock` + `data-dock-flush`,
 * `app/assets/css/main.css`): it is `--dock-tabbar-height` tall plus the
 * bottom inset it pads, and the sticky add-to-cart bar, the assistant and
 * the cookie notice stack on top of it at every width.
 */
const props = withDefaults(defineProps<{
  includeCart?: boolean
}>(), {
  includeCart: true,
})

const { t } = useStoreI18n('components/variants/webside/MobileBottomNav')

const { items } = useBottomNavItems({
  tabs: ['home', 'shop', 'blog', 'cart', 'account'],
  icons: { cart: 'i-heroicons-shopping-cart' },
  accountAvatar: true,
  includeCart: props.includeCart,
})

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
      :aria-label="t('mobile_navigation')"
      :data-dock="keyboardOpen ? undefined : 'tabbar'"
      data-dock-flush
      highlight
      :ui="{
        root: `
          fixed inset-x-0 bottom-0 z-50 block
          h-[calc(var(--dock-tabbar-height)+var(--dock-inset))] w-full border-t
          border-primary-200 bg-primary-50/90 pb-(--dock-inset) backdrop-blur-md
          transition-transform duration-200
          motion-reduce:transition-none
          dark:border-primary-700 dark:bg-primary-900/90
          [&>div]:h-full
          ${keyboardOpen ? 'translate-y-full' : 'translate-y-0'}
        `,
        list: 'size-full',
        item: 'flex w-full items-center py-0',
        link: `
          relative flex min-h-12 w-full flex-col items-center justify-center
          gap-0.5
          before:bg-transparent
          data-active:text-(--ui-secondary)
          data-active:before:bg-secondary/10
          dark:before:bg-transparent
        `,
        linkLabel: 'text-[10px] leading-tight font-medium',
        linkLeadingIcon: 'size-6',
        linkLeadingAvatar: 'size-6',
      }"
    />
  </MobileOrTabletOnly>
</template>

<i18n lang="yaml">
el:
  mobile_navigation: Γρήγορη πλοήγηση
en:
  mobile_navigation: Quick navigation
</i18n>
