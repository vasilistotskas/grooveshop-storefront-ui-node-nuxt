<script lang="ts" setup>
/**
 * The store's usable social sign-in providers as a two-column grid of
 * labelled buttons — the board's "Google · Facebook · GitHub · Discord".
 * Renders nothing on a store without one (`useSocialProviders`).
 *
 * Google's own rules for its button: its colour "G" sits only on Google's
 * light or dark fill with its stroke (`--google-signin-*`), and the label
 * names the action ("Continue with Google"), never "Google" alone. Every
 * other provider keeps the neutral outline and its name.
 */
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

const { t } = useStoreI18n('components/Account/Provider/List')
const { providers, signIn: loginWithProvider } = useSocialProviders()
</script>

<template>
  <ul
    v-if="providers.length"
    class="grid list-none grid-cols-2 gap-2.5 p-0"
  >
    <li
      v-for="provider in providers"
      :key="provider.id"
    >
      <UButton
        :label="provider.id === 'google' ? t('continue_with', { name: provider.name }) : provider.name"
        :disabled="loading"
        :loading="loading"
        :class="provider.id === 'google'
          ? 'bg-(--google-signin-fill) ring-(--google-signin-stroke) hover:bg-(--google-signin-fill) active:bg-(--google-signin-fill)'
          : undefined"
        color="neutral"
        variant="outline"
        block
        type="button"
        @click="loginWithProvider(provider)"
      >
        <template #leading>
          <AccountProviderIcon
            :provider-id="provider.id"
            class="size-5 shrink-0"
          />
        </template>
      </UButton>
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  continue_with: Συνέχεια με {name}
en:
  continue_with: Continue with {name}
</i18n>
