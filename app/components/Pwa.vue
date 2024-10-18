<script lang="ts" setup>
import type { NotificationAction } from '#ui/types'

const { $pwa } = useNuxtApp()
const { t } = useI18n({ useScope: 'local' })

const installActions = ref<NotificationAction[]>([
  {
    variant: 'outline',
    color: 'white',
    label: t('install'),
    click: () => $pwa?.install(),
  },
])

const actions = ref<NotificationAction[]>([])

onMounted(() => {
  if ($pwa?.needRefresh) {
    $pwa.updateServiceWorker()
    actions.value.push({
      variant: 'outline',
      color: 'white',
      label: t('reload'),
      click: () => $pwa?.updateServiceWorker(),
    })
  }
})

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
          ($pwa?.offlineReady || $pwa?.needRefresh) && id
        "
        :id="id"
        :actions="actions"
        :timeout="0"
        :title="$pwa?.offlineReady ? t('ready_to_work_offline') : t('new_content_available')"
        class="
          m-auto w-[80%]

          md:w-[33%]
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
        :title="t('install_pwa')"
        class="
          m-auto w-[80%]

          md:w-[33%]
        "
        @close="() => $pwa?.cancelInstall()"
      />
    </div>
    <template #fallback>
      <ClientOnlyFallback class="pwa-toast" />
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  ready_to_work_offline: Η εφαρμογή είναι έτοιμη να λειτουργήσει εκτός σύνδεσης.
  new_content_available: Νέο διαθέσιμο περιεχόμενο, κάντε κλικ στο κουμπί επαναφόρτωσης
    για να ανανεώσετε την εφαρμογή.
  reload: Επαναφόρτωση
  close: Κλείσιμο
  install_pwa: Εγκατέστησε την εφαρμογή μας
  install: Εγκατάσταση
</i18n>
