<script lang="ts" setup>
import type { NuxtError } from '#app'

// THIN SHELL by design — nuxt-root.vue STATICALLY imports error.vue, so
// everything written here ships in the entry chunk of every page (the
// full page was 10.5KB minified of the entry, 2026-08-29 audit). The
// actual error page lives in components/ErrorScreen.vue and loads
// through the Lazy auto-wrapper only when an error actually renders;
// nuxt-root mounts us inside the root <Suspense>, so SSR still awaits
// and emits the full error markup. Keep logic out of this file unless
// it must survive a failed chunk load (like the retry below).
const props = defineProps({
  error: Object as () => NuxtError,
})

// Transient SSR failures (backend readiness gaps during HPA churn —
// prod audit 2026-07-02) reach the visitor as a 5xx error page even
// though the backend recovers within seconds. Retry ONCE via
// reloadNuxtApp: its built-in ttl guard (sessionStorage) ignores a
// second reload request within the window, so a real outage settles
// on this page instead of looping. Skipped in dev so errors stay
// visible while debugging. Lives in the shell, not ErrorScreen, so the
// retry fires even if the lazy chunk fails to load.
onMounted(() => {
  const statusCode = props.error?.statusCode ?? 0
  if (!import.meta.dev && statusCode >= 500) {
    reloadNuxtApp({ ttl: 30000 })
  }
})
</script>

<template>
  <LazyErrorScreen v-if="error" :error="error" />
</template>
