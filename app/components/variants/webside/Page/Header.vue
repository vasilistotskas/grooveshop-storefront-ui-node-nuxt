<script lang="ts" setup>
defineSlots<{
  default(props: object): any
}>()
</script>

<template>
  <!-- Static replica of what UHeader rendered here, not the component:
       UHeader unconditionally mounts its mobile <Menu> (UModal +
       USlideover + UDrawer/vaul-vue, 23KB minified) even with
       :toggle="false" and no menu — this header is the one place that
       dragged vaul-vue into every page's eager graph (2026-08-29
       audit). The classes are the UHeader theme slots merged with the
       old :ui overrides (root h-auto/border-b-0, container
       max-w-full/px-0, left+right hidden, center flex w-full); the
       data-slot attributes are kept so any styling hooks keep matching.
       If the built-in mobile menu is ever wanted, go back to UHeader —
       it will pull the drawer stack in with it. -->
  <header
    data-slot="root"
    class="sticky top-0 z-50 h-auto bg-default/75 backdrop-blur-sm"
  >
    <div
      data-slot="container"
      class="
        mx-auto flex h-full w-full max-w-full items-center justify-between
        gap-3 px-0
      "
    >
      <div data-slot="center" class="flex w-full">
        <slot />
      </div>
    </div>
  </header>
</template>
