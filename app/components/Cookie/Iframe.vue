<script lang="ts" setup>
import type { Cookie } from '#cookie-control/types'

const { t } = useI18n()
const { cookiesEnabled, isModalActive } = useCookieControl()

const isCookieFunctionalEnabled = computed(
  () =>
    (cookiesEnabled.value || []).filter(
      (cookieEnabled: Cookie) => cookieEnabled.name === 'functional',
    ).length > 0,
)
</script>

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
        {{ t('iframe_blocked') }}
        <a
          href="#"
          @click.prevent="isModalActive = true"
          v-text="t('here')"
        />
      </p>
    </div>
  </Teleport>
</template>

<i18n lang="yaml">
el:
  here: εδώ
  iframe_blocked: Για να το δείς αυτό, ενεργοποίησε τα λειτουργικά cookies.
</i18n>
