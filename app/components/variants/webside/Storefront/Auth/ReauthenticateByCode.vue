<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/Storefront/Auth/ReauthenticateByCode')
useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const { maskedAddress, sending, requestCode } = useEmailCodeReauthentication()

function onSubmit() {
  return requestCode(() => ({
    title: t('sent'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }))
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
    <UCard
      class="w-full max-w-lg"
      :ui="{
        body: 'space-y-6',
      }"
    >
      <template #header>
        <div class="space-y-2 text-center">
          <div
            class="
              mx-auto flex size-12 items-center justify-center rounded-full
              bg-primary/10
            "
          >
            <UIcon
              name="i-heroicons-envelope"
              class="size-6 text-info"
            />
          </div>
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('description', { address: maskedAddress }) }}
          </p>
        </div>
      </template>

      <WebsideAccount2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE_BY_CODE">
        <form
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UButton
            type="submit"
            color="neutral"
            size="lg"
            block
            :loading="sending"
            icon="i-heroicons-arrow-right"
            trailing
          >
            {{ t('submit') }}
          </UButton>
        </form>
      </WebsideAccount2FaReauthenticateFlow>

      <template #footer>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          :title="t('info.title')"
          :description="t('info.description')"
        />
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επαναπιστοποίηση με κωδικό
  description: Για λόγους ασφαλείας, θα στείλουμε έναν κωδικό 6 ψηφίων στο {address}
  submit: Αποστολή κωδικού
  sent: Ο κωδικός στάλθηκε
  info:
    title: Γιατί χρειάζεται αυτό;
    description: Για την προστασία του λογαριασμού σας, απαιτείται επαναπιστοποίηση για ευαίσθητες ενέργειες
</i18n>
