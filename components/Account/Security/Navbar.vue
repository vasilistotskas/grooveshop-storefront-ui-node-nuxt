<template>
  <nav
    class="
      z-10 w-full bg-transparent px-4

      lg:static lg:w-auto lg:border-b lg:border-primary-500 lg:bg-transparent
      lg:px-0 lg:shadow-none
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
          :to="`/account/security/password`"
          :aria-label="$t('pages.account.security.password.title')"
          :title="$t('pages.account.security.password.title')"
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
            {{ $t('pages.account.security.password.title') }}
          </span>
        </Anchor>
      </li>
      <li
        role="tab"
        class="shrink-0"
      >
        <Anchor
          :to="`/account/security/mfa`"
          :aria-label="$t('pages.account.security.mfa.title')"
          :title="$t('pages.account.security.mfa.title')"
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
            {{ $t('pages.account.security.mfa.title') }}
          </span>
        </Anchor>
      </li>
    </ul>
  </nav>
</template>
