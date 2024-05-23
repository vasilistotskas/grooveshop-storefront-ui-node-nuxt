<template>
  <nav
    class="
      static z-10 w-auto border-b border-primary-500 bg-transparent px-0
      shadow-none
    "
  >
    <ul
      role="tablist"
      class="flex snap-x gap-4 overflow-x-auto"
    >
      <li
        role="tab"
        class="shrink-0"
      >
        <Anchor
          :to="`/account/settings`"
          :aria-label="$t('pages.account.settings.title')"
          :title="$t('pages.account.settings.title')"
          class="
            block whitespace-nowrap py-4 text-sm text-primary-600 outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.settings.title') }}
          </span>
        </Anchor>
      </li>
      <li
        role="tab"
        class="shrink-0"
      >
        <Anchor
          :to="`/account/addresses`"
          :aria-label="$t('pages.account.addresses.title')"
          :title="$t('pages.account.addresses.title')"
          class="
            block whitespace-nowrap py-4 text-sm text-primary-600 outline-none
          "
        >
          <span
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.addresses.title') }}
          </span>
        </Anchor>
      </li>
    </ul>
  </nav>
</template>
