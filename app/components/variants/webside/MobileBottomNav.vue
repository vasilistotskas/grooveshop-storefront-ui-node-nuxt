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
 * `app/assets/css/main.css`): it stands on the edge, or on the floating
 * funding strip (`--dock-edge`), is `--dock-tabbar-height` tall plus the
 * rest of the bottom inset it pads, and the sticky add-to-cart bar, the
 * assistant and the cookie notice stack on top of it at every width.
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
          fixed inset-x-0 bottom-(--dock-edge) z-50 block
          h-[calc(var(--dock-tabbar-height)+var(--dock-inset)-var(--dock-edge))]
          w-full border-t border-neutral-200 bg-white
          pb-[calc(var(--dock-inset)-var(--dock-edge))]
          shadow-(--ds-dock-shadow) transition-transform duration-200
          motion-reduce:transition-none
          dark:border-neutral-800 dark:bg-neutral-900
          [&>div]:h-full
          ${keyboardOpen ? 'translate-y-full' : 'translate-y-0'}
        `,
        // The tabs share the bar's width in equal columns (`flex-1` from a
        // zero basis): with `w-full` each kept its content's width and five
        // ran past a 390px screen. A column is 64px at 320, the label set
        // tight without side padding: «Λογαριασμός», the longest, is 59px
        // at 10px in the system face (61px in Arial).
        list: 'size-full',
        item: 'flex min-w-0 flex-1 items-center py-0',
        link: `
          relative flex min-h-12 w-full flex-col items-center justify-center
          gap-0.75 px-0 text-neutral-600
          before:bg-transparent
          data-active:text-accent
          dark:text-neutral-400
          dark:before:bg-transparent
        `,
        // 11px from 360px; 10px on a 320 screen, where «Λογαριασμός» at 11px
        // would outgrow its 64px column.
        linkLabel: `
          text-[0.625rem] leading-tight font-semibold tracking-tight
          min-[22.5rem]:text-[0.6875rem]
        `,
        linkLeadingIcon: 'size-5.5 text-current',
        linkLeadingAvatar: 'size-5.5',
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
