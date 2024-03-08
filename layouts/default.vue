<script lang="ts" setup>
defineSlots<{
  default(props: {}): any
  header(props: {}): any
  footer(props: {}): any
  'app-before'(props: {}): any
  'app-after'(props: {}): any
}>()
</script>

<template>
  <div class="relative">
    <div id="app-before">
      <slot name="app-before" />
    </div>
    <slot name="header">
      <PageHeader>
        <PageNavbar />
      </PageHeader>
    </slot>
    <main>
      <PageSection class="flex flex-col">
        <div class="flex w-full flex-1 flex-col">
          <slot />
        </div>
      </PageSection>
    </main>
    <slot name="footer">
      <Footer />
    </slot>
    <div id="app-after">
      <slot name="app-after" />
    </div>
  </div>
</template>
