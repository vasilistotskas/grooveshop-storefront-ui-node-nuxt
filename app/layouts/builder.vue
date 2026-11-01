<template>
  <!-- Not persistent: the group would otherwise keep its sizes in a `dashboard` cookie. -->
  <UDashboardGroup :persistent="false">
    <slot />
  </UDashboardGroup>
</template>
