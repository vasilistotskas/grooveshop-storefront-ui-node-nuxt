<script lang="ts" setup>
defineSlots<{
  default(props: object): any
  header(props: object): any
  footer(props: object): any
}>()

const { t } = useI18n()
const tenantStore = useTenantStore()

// Per-tenant chrome. Resolved by schema, exactly as the page builder
// resolves section variants; the platform's own for every tenant
// without a variant (see app/utils/variantRegistry.ts).
const navbar = computed(() =>
  resolveChrome('navbar', tenantStore.schemaName),
)
const footer = computed(() =>
  resolveChrome('footer', tenantStore.schemaName),
)
const mobileNav = computed(() =>
  resolveChrome('mobile_nav', tenantStore.schemaName),
)
// The shopping assistant, per tenant like the rest of the chrome.
const assistant = computed(() =>
  resolveChrome('assistant', tenantStore.schemaName),
)
// The signed-in account area's frame (banner + sidebar), per tenant
// like the rest of the chrome.
const accountShell = computed(() =>
  resolveChrome('account_shell', tenantStore.schemaName),
)
const { $routeBaseName } = useNuxtApp()
const route = useRoute()
const { user, loggedIn } = useUserSession()
// Merchant UI toggle — fails OPEN: core navigation must never vanish
// because the settings endpoint hiccuped.
const mobileBottomNavEnabled = useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', {
  fallback: true,
})

const routeName = computed(() => $routeBaseName(route))

// Account pages get the user-area chrome (account info banner + sidebar
// on lg+). Single layout, route-aware — replaces the old user.vue.
const isAccountRoute = computed(() => {
  const name = routeName.value
  if (typeof name !== 'string') return false
  return name === 'account' || name.startsWith('account-')
})

// Auth-flow pages (login, signup, OAuth callback, password reset, MFA
// challenge) live under /account/* but must NOT render the user chrome
// even if the user is logged in — otherwise a stale loggedIn state
// during a guest-redirect race would wrap the login form in the user's
// account sidebar.
const onAuthFlowRoute = computed(() => {
  const name = routeName.value
  return typeof name === 'string' && isAuthFlowRoute(name)
})

const showUserChrome = computed(
  () => isAccountRoute.value && !onAuthFlowRoute.value && loggedIn.value && user.value,
)

// The frozen tree's tab bar is `fixed bottom-0` and nothing used to
// reserve room for it, so it covered the end of the footer (merchant
// identity + opening hours). Reserve its height — min-h-12 plus its
// safe-area padding — only while it is rendered, and only below `lg`,
// which is the breakpoint `MobileOrTabletOnly` (max-width: 1023px)
// shows it at. A designed storefront's footer keeps its own last line
// clear of its floating dock, so it gets no strip of ground under it.
const footerClass = computed(() =>
  mobileBottomNavEnabled.value && !resolveDesign(tenantStore.schemaName)
    ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0'
    : '',
)
</script>

<template>
  <div class="relative">
    <a
      href="#main-content"
      class="
        sr-only z-50 rounded-md bg-secondary px-4 py-2 text-sm font-medium
        text-white
        focus:not-sr-only focus:fixed focus:top-2 focus:left-2
      "
    >
      {{ t('a11y.skipToContent') }}
    </a>
    <slot name="header">
      <!-- A tenant whose design specifies its own header ships it as a
           chrome variant (see app/utils/variantRegistry.ts) — the same
           seam the page builder already has for sections. Everyone
           else gets the platform's. -->
      <component :is="navbar" />
    </slot>
    <UMain
      id="main-content"
      as="main"
    >
      <component
        :is="accountShell"
        v-if="showUserChrome"
      >
        <slot />
      </component>
      <section
        v-else
        class="flex w-full flex-1 flex-col"
      >
        <slot />
      </section>
    </UMain>
    <slot name="footer">
      <div :class="footerClass">
        <!-- A tenant footer replaces the platform's WHOLE footer
             region, the mobile social row included: a variant exists
             because the tenant's design specifies its own, and the row
             would otherwise float above it unstyled. -->
        <component :is="footer" />
      </div>
    </slot>
    <component
      :is="mobileNav"
      v-if="mobileBottomNavEnabled"
      :include-cart="!isAccountRoute"
    />
    <ClientOnly>
      <component :is="assistant" />
    </ClientOnly>
  </div>
</template>

<i18n lang="yaml">
el:
  a11y:
    skipToContent: Μετάβαση στο κύριο περιεχόμενο
en:
  a11y:
    skipToContent: Skip to the main content
</i18n>
