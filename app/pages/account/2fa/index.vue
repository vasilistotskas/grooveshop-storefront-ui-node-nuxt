<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const authStore = useAuthStore()
const { $i18n } = useNuxtApp()
const { setupAuthenticators } = authStore
const { totpAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

await setupAuthenticators()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />

    <div class="grid items-center justify-center">
      <p
        class="
            text-primary-950 text-center

            dark:text-primary-50
          "
      >
        {{ t('authenticator.app') }}
      </p>
      <div
        v-if="totpAuthenticator"
        class="
            grid items-center justify-center justify-items-center gap-4
          "
      >
        <p
          class="
              text-primary-950 text-center

              dark:text-primary-50
            "
        >
          {{ t('active') }}
        </p>
        <UButton
          :label="$i18n.t('deactivate')"
          :to="localePath('account-2fa-totp-deactivate')"
          color="neutral"
          size="xl"
        />
      </div>
      <div
        v-else
        class="
            grid items-center justify-center justify-items-center gap-4
          "
      >
        <p
          class="
              text-primary-950 text-center

              dark:text-primary-50
            "
        >
          {{ t('inactive') }}
        </p>
        <UButton
          :label="$i18n.t('activate')"
          :to="localePath('account-2fa-totp-activate')"
          color="neutral"
          size="xl"
        />
      </div>
    </div>
    <div
      v-if="recoveryCodesAuthenticator"
      class="
          grid items-center justify-center
        "
    >
      <p
        class="
            text-primary-950 text-center

            dark:text-primary-50
          "
      >
        {{ t('recovery-codes.title') }}
      </p>
      <div
        v-if="!recoveryCodesAuthenticator"
        class="
            grid items-center justify-center justify-items-center gap-4
          "
      >
        <p
          class="
              text-primary-950 text-center

              dark:text-primary-50
            "
        >
          {{ t('recovery-codes.unset') }}
        </p>
        <UButton
          :label="$i18n.t('generate')"
          :to="localePath('account-2fa-recovery-codes-generate')"
          color="neutral"
          size="xl"
        />
      </div>
      <div
        v-else
        class="
            grid items-center justify-center justify-items-center gap-4
          "
      >
        <p
          class="
              text-primary-950 text-center

              dark:text-primary-50
            "
        >
          {{ t('recovery-codes.info', {
            unused_code_count: recoveryCodesAuthenticator.unused_code_count,
            total_code_count: recoveryCodesAuthenticator.total_code_count,
          }) }}
        </p>
        <UButton
          :label="$i18n.t('view')"
          :to="localePath('account-2fa-recovery-codes')"
          color="neutral"
          size="xl"
        />
        <UButton
          :label="$i18n.t('regenerate')"
          :to="localePath('account-2fa-recovery-codes-generate')"
          color="neutral"
          size="xl"
        />
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Two-Factor Authentication
  authenticator:
    app: Εφαρμογή ελέγχου ταυτότητας
  active: Η επαλήθευση με χρήση εφαρμογής ελέγχου ταυτότητας είναι ενεργή.
  inactive: Η εφαρμογή ελέγχου ταυτότητας δεν είναι ενεργή.
  recovery-codes:
    title: Κωδικοί ανάκτησης
    unset: Δεν έχουν οριστεί κωδικοί ανάκτησης
    info: Έχεις {unused_code_count} από τους {total_code_count} κωδικούς ανάκτησης
      διαθέσιμους.
</i18n>
