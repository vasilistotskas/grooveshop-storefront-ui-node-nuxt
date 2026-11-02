<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Shell')

const { status, info, open, signOut } = useBuilderSession()

onMounted(open)
</script>

<template>
  <BuilderEditor
    v-if="status === 'signedIn' && info"
    :session="info"
    @sign-out="signOut"
  />
  <main
    v-else
    class="flex flex-1 items-center justify-center p-4"
  >
    <UEmpty
      v-if="status === 'loading'"
      loading
      :title="t('loading')"
    />
    <UEmpty
      v-else
      icon="i-lucide-lock"
      :title="t(`${status}.title`)"
      :description="t(`${status}.description`)"
    />
  </main>
</template>

<i18n lang="yaml">
el:
  loading: Σύνδεση…
  signedOut:
    title: Δεν είστε συνδεδεμένοι
    description: Ανοίξτε τον επεξεργαστή από τη διαχείριση του καταστήματος.
  invalidTicket:
    title: Ο σύνδεσμος δεν ισχύει πια
    description: Ο σύνδεσμος έχει λήξει ή έχει ήδη χρησιμοποιηθεί. Ανοίξτε ξανά τον επεξεργαστή από τη διαχείριση του καταστήματος.
  error:
    title: Η σύνδεση απέτυχε
    description: Δοκιμάστε ξανά σε λίγο.
en:
  loading: Signing in…
  signedOut:
    title: You are not signed in
    description: Open the editor from your store's admin.
  invalidTicket:
    title: This link is no longer valid
    description: The link has expired or was already used. Open the editor again from your store's admin.
  error:
    title: Signing in failed
    description: Try again in a moment.
</i18n>
