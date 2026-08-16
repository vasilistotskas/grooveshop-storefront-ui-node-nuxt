<script lang="ts" setup>
const { t } = useI18n()

const open = ref(false)
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-message-circle"
      size="xl"
      color="secondary"
      variant="solid"
      :aria-label="t('chat.open')"
      class="
        fixed right-4 bottom-20 z-40 rounded-full shadow-lg
        md:bottom-6
      "
      @click="open = true"
    />
    <USlideover
      v-model:open="open"
      :title="t('chat.title')"
      :description="t('chat.description')"
      side="right"
      :ui="{ body: `
        flex flex-col overflow-hidden p-0
        sm:p-0
      ` }"
    >
      <template #body>
        <LazyChatPanel />
      </template>
    </USlideover>
  </div>
</template>

<i18n lang="yaml">
el:
  chat:
    open: Άνοιγμα βοηθού αγορών
    title: Βοηθός αγορών
    description: Ρώτησέ με για προϊόντα, διαθεσιμότητα και την παραγγελία σου.
</i18n>
