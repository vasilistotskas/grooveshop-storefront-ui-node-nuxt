<script lang="ts" setup>
import type { NotificationAction } from '#ui/types'

const { $pwa } = useNuxtApp()
const { t } = useI18n()

const installActions = ref<NotificationAction[]>([
  {
    variant: 'outline',
    color: 'white',
    label: t('components.pwa.install'),
    click: () => $pwa?.install(),
  },
])

const actions = ref<NotificationAction[]>([])

if ($pwa?.needRefresh) {
  $pwa.updateServiceWorker()
  actions.value.push({
    variant: 'outline',
    color: 'white',
    label: t('components.pwa.reload'),
    click: () => $pwa?.updateServiceWorker(),
  })
}

const id = useId()
</script>

<template>
  <ClientOnly>
    <div
      v-if="$pwa"
      id="pwa"
      class="
        pwa fixed bottom-20 right-0 w-full

        md:bottom-2

        sm:bottom-20
      "
    >
      <UNotification
        v-if="
          $pwa?.offlineReady || $pwa?.needRefresh
        "
        :id="id"
        :actions="actions"
        :timeout="0"
        :title="$pwa?.offlineReady ? $t('components.pwa.ready_to_work_offline') : $t('components.pwa.new_content_available')"
        class="
          m-auto w-[33%]

          md:w-[90%]
        "
        @close="() => $pwa?.cancelPrompt()"
      />
      <UNotification
        v-if="
          $pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh
        "
        :id="id"
        :actions="installActions"
        :timeout="0"
        :title="$t('components.pwa.install_pwa')"
        class="
          m-auto w-[33%]

          md:w-[90%]
        "
        @close="() => $pwa?.cancelInstall()"
      />
    </div>
    <template #fallback>
      <ClientOnlyFallback class="pwa-toast" />
    </template>
  </ClientOnly>
</template>
