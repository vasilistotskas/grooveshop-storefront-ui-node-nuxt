<script lang="ts" setup>
/**
 * The signed-in account area's frame: the account banner across the top
 * and, from `lg` up, the account sidebar beside the page. The default
 * layout mounts it on account routes for a signed-in shopper, around the
 * page.
 */
defineSlots<{
  default(props: object): any
}>()

const { user } = useUserSession()
</script>

<template>
  <div class="grid gap-2 md:gap-6">
    <div
      class="
        bg-primary-100
        md:rounded-b-[94px]
        dark:bg-primary-900
      "
    >
      <WebsideUserAccountInfo
        v-if="user"
        :account="user"
        :orders-count="0"
        :product-favourites-count="0"
        :product-reviews-count="0"
      />
    </div>
    <div
      class="
        mx-auto w-full max-w-main xl:max-w-300 2xl:max-w-375
        md:p-0!
      "
    >
      <div
        class="
          relative mb-12
          md:mb-20
        "
      >
        <div
          class="
            flex-1 flex-col
            md:flex md:w-full md:gap-4
          "
        >
          <div
            class="
              relative mx-auto flex h-full flex-1 flex-col
              md:w-full
              lg:flex-row lg:gap-8
              xl:gap-4
            "
          >
            <aside
              class="
                hidden py-4 pl-0 relative
                lg:block
                xl:pl-8
              "
            >
              <WebsideUserSidebar />
            </aside>
            <!-- `min-w-0`: a flex item defaults to
                 `min-width: auto`, so it cannot shrink below the
                 min-content width of what it holds. The sessions
                 table floored this column at 964px beside a 320px
                 sidebar and pushed the page 65px past a 1280
                 viewport — a horizontal scrollbar on every
                 account page holding a wide table. -->
            <div class="flex w-full min-w-0 flex-col">
              <slot />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
