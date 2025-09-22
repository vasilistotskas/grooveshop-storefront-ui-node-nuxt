<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

const pwa = usePWA()
const { t } = useI18n()
const toast = useToast()

const installActions = computed<ButtonProps[]>(() => {
  return [
    {
      variant: 'outline',
      color: 'secondary',
      label: t('install'),
      onClick() {
        pwa?.install()
      },
    },
  ]
})

const reloadActions = computed<ButtonProps[]>(() => {
  return [
    {
      variant: 'outline',
      color: 'secondary',
      label: t('reload'),
      onClick() {
        pwa?.updateServiceWorker()
      },
    },
  ]
})

onMounted(() => {
  if (pwa?.offlineReady || pwa?.needRefresh) {
    toast.add({
      title: pwa?.offlineReady
        ? t('ready_to_work_offline')
        : t('new_content_available'),
      actions: reloadActions.value,
      duration: 0,
      close: {
        color: 'secondary',
        variant: 'outline',
        class: 'rounded-full',
        onClick() {
          pwa?.cancelPrompt()
        },
      },
    })
  }
  if (pwa?.showInstallPrompt && !pwa?.offlineReady && !pwa?.needRefresh) {
    toast.add({
      title: t('install_pwa'),
      actions: installActions.value,
      duration: 0,
      close: {
        color: 'secondary',
        variant: 'outline',
        class: 'rounded-full',
        onClick() {
          pwa?.cancelInstall()
        },
      },
    })
  }
})
</script>

<template>
  <div
    v-if="pwa"
    id="pwa"
  />
</template>

<i18n lang="yaml">
el:
  ready_to_work_offline: Η εφαρμογή είναι έτοιμη να λειτουργήσει εκτός σύνδεσης.
  new_content_available: Νέο διαθέσιμο περιεχόμενο, κάντε κλικ στο κουμπί επαναφόρτωσης για να ανανεώσετε την εφαρμογή.
  reload: Επαναφόρτωση
  close: Κλείσιμο
  install_pwa: Εγκατέστησε την εφαρμογή μας
  install: Εγκατάσταση
</i18n>
