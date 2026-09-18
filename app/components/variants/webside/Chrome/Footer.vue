<script lang="ts" setup>
const { isMobileOrTablet } = useDevice()
</script>

<template>
  <MobileOrTabletOnly>
    <div
      class="
        my-6 flex flex-wrap items-center justify-center
        md:hidden
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
