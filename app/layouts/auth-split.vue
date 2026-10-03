<script lang="ts" setup>
/**
 * The sign-in pages in the Volt design: one question on the screen.
 *
 * Desk: the store's ink panel on the left — logo at the top, its name
 * and its line at the foot — and the form centred on the warm ground on
 * the right; no header, footer or assistant. Phone: a slim bar with a
 * way back and the logo, then the form; no footer or tab bar.
 *
 * Chosen per request by `middleware/design-layout.global.ts`, never by
 * a page file: a store frozen in the previous design keeps its layout.
 */
const { t } = useI18n()
const tenantStore = useTenantStore()
const localePath = useLocalePath()
const router = useRouter()

const storeName = computed(() => tenantStore.storeName || '')

/** Back to where the shopper came from, or to the shop when they came from outside it. */
function goBack() {
  if (window.history.state?.back) router.back()
  else navigateTo(localePath('index'))
}
</script>

<template>
  <div
    class="
      flex min-h-dvh flex-col
      lg:grid lg:grid-cols-2
    "
  >
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

    <header
      class="
        flex h-15 items-center justify-between border-b border-default ps-1
        pe-2
        lg:hidden
      "
    >
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        square
        :aria-label="t('back')"
        @click="goBack"
      />
      <Anchor
        :to="'index'"
        :aria-label="storeName"
        class="flex min-w-0 items-center"
      >
        <TenantLogo
          :width="120"
          :height="30"
        />
      </Anchor>
      <span
        class="w-11"
        aria-hidden="true"
      />
    </header>

    <aside
      class="
        relative hidden flex-col justify-between overflow-hidden bg-inverted
        p-12 text-inverted
        lg:flex
      "
    >
      <Anchor
        :to="'index'"
        :aria-label="storeName"
        class="flex items-center self-start"
      >
        <TenantLogo
          :width="150"
          :height="36"
          inverted
        />
      </Anchor>
      <div class="flex flex-col gap-3">
        <UBadge
          v-if="storeName"
          :label="storeName"
          color="neutral"
          class="self-start bg-volt text-on-volt"
        />
        <p
          v-if="tenantStore.storeDescription"
          class="max-w-130 font-display text-[3.5rem]/none font-bold tracking-[-0.02em] text-balance"
        >
          {{ tenantStore.storeDescription }}
        </p>
      </div>
    </aside>

    <main
      id="main-content"
      class="
        flex flex-1 justify-center bg-muted px-4 pt-7 pb-12
        lg:items-center lg:px-12 lg:py-16
      "
    >
      <slot />
    </main>
  </div>
</template>

<i18n lang="yaml">
el:
  back: Πίσω
en:
  back: Back
</i18n>
