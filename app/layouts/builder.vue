<script lang="ts" setup>
// The editor is drawn in its own palette (`appConfig.builder`), not the
// store's: on a store's host `primary` is the store's brand colour, and the
// editor's controls must look the same on every store and stand apart from
// the store's preview. The store's own tokens are not sent to this page at
// all (`isBuilderEditorPath`). Staff leave the editor by a full page load,
// which gives the storefront its palette back.
const appConfig = useAppConfig()
updateAppConfig({ ui: { colors: { ...appConfig.builder.colors } } })
</script>

<template>
  <div class="fixed inset-0 flex flex-col bg-default text-default">
    <slot />
    <NuxtAnnouncer />
  </div>
</template>
