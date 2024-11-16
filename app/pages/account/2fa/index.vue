<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const authStore = useAuthStore()
const { setupAuthenticators } = authStore
const { totpAuthenticator, recoveryCodesAuthenticator } = storeToRefs(authStore)

onReactivated(async () => {
  await setupAuthenticators()
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />
    <PageBody>
      <div class="grid items-center justify-center">
        <p
          class="
            text-primary-950

            dark:text-primary-50

            text-center
          "
        >
          {{ t('authenticator.app') }}
        </p>
        <div
          v-if="totpAuthenticator" class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950

              dark:text-primary-50

              text-center
            "
          >
            {{ t('active') }}
          </p>
          <UButton
            :label="$t('deactivate')"
            :to="localePath('account-2fa-totp-deactivate')"
            color="primary"
            size="xl"
          />
        </div>
        <div
          v-else class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950

              dark:text-primary-50

              text-center
            "
          >
            {{ t('inactive') }}
          </p>
          <UButton
            :label="$t('activate')"
            :to="localePath('account-2fa-totp-activate')"
            color="primary"
            size="xl"
          />
        </div>
      </div>
      <div
        v-if="recoveryCodesAuthenticator" class="
          grid items-center justify-center
        "
      >
        <p
          class="
            text-primary-950

            dark:text-primary-50

            text-center
          "
        >
          {{ t('recovery-codes.title') }}
        </p>
        <div
          v-if="!recoveryCodesAuthenticator" class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950

              dark:text-primary-50

              text-center
            "
          >
            {{ t('recovery-codes.unset') }}
          </p>
          <UButton
            :label="$t('generate')"
            :to="localePath('account-2fa-recovery-codes-generate')"
            color="primary"
            size="xl"
          />
        </div>
        <div
          v-else class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950

              dark:text-primary-50

              text-center
            "
          >
            {{ t('recovery-codes.info', {
              unused_code_count: recoveryCodesAuthenticator.unused_code_count,
              total_code_count: recoveryCodesAuthenticator.total_code_count,
            }) }}
          </p>
          <UButton
            :label="$t('view')"
            :to="localePath('account-2fa-recovery-codes')"
            color="primary"
            size="xl"
          />
          <UButton
            :label="$t('regenerate')"
            :to="localePath('account-2fa-recovery-codes-generate')"
            color="primary"
            size="xl"
          />
        </div>
      </div>
    </PageBody>
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
