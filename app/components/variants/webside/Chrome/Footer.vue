<script lang="ts" setup>
const { isMobileOrTablet } = useDevice()
</script>

<template>
  <MobileOrTabletOnly>
    <div class="px-4 pt-6 lg:hidden">
      <LazyWebsideFooterNewsletter hydrate-on-visible />
    </div>
    <div
      class="
        my-6 flex flex-wrap items-center justify-center
        lg:hidden
      "
    >
      <WebsideSocials />
    </div>
  </MobileOrTabletOnly>
  <LazyWebsideFooterMobile
    v-if="isMobileOrTablet"
    hydrate-on-visible
  />
  <LazyWebsideFooterDesktop
    v-else
    hydrate-on-visible
  />
</template>
