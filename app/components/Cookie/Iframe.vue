<template>
  <Teleport to="#teleports">
    <iframe
      v-if="isCookieFunctionalEnabled"
      :cookie-enabled="null"
      v-bind="$attrs"
    />
    <div
      v-else
      class="cookie-control-BlockedIframe"
    >
      <p>
        {{ $t('components.cookie.iframe_blocked') }}
        <a
          href="#"
          @click.prevent="isModalActive = true"
          v-text="$t('components.cookie.here')"
        />
      </p>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import type { Cookie } from '#cookie-control/types'

const { cookiesEnabled, isModalActive } = useCookieControl()

const isCookieFunctionalEnabled = computed(
  () =>
    (cookiesEnabled.value || []).filter(
      (cookieEnabled: Cookie) => cookieEnabled.name === 'functional',
    ).length > 0,
)
</script>
