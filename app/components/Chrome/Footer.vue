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
      <Socials />
    </div>
  </MobileOrTabletOnly>
  <LazyFooterMobile
    v-if="isMobileOrTablet"
    hydrate-on-visible
  />
  <LazyFooterDesktop
    v-else
    hydrate-on-visible
  />
</template>
