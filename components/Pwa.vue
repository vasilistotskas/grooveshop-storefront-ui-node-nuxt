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

const actions = ref<NotificationAction[]>([

])

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
      v-if="$pwa" id="pwa" class="
        fixed bottom-20 right-0 w-full

        md:bottom-2

        sm:bottom-20
      "
    >
      <UNotification
        v-if="
          $pwa?.offlineReady || $pwa?.needRefresh
        "
        :id="id"
        :close-button="{ id: 'actions', onClick: () => $pwa?.cancelPrompt() }"
        class="m-auto w-[90%]"
        :actions="actions"
        :title="$pwa?.offlineReady ? $t('components.pwa.ready_to_work_offline') : $t('components.pwa.new_content_available')"
        :timeout="0"
      />
      <UNotification
        v-if="
          $pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh
        "
        :id="id"
        :close-button="{ id: 'installActions', onClick: () => $pwa?.cancelInstall() }"
        class="m-auto w-[90%]"
        :actions="installActions"
        :title="$t('components.pwa.install_pwa')"
        :timeout="0"
      />
    </div>
    <template #fallback>
      <ClientOnlyFallback class="pwa-toast" />
    </template>
  </ClientOnly>
</template>
