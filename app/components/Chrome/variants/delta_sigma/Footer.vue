<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's footer, measured off the artboards rather than
 * approximated.
 *
 * Every number below was read from the reference render at 1440px: a
 * full-bleed 1px `#1E293B` rule above, 56px of top padding, an 80px
 * gutter, a 1280px inner track, the identity lockup left with the
 * Γ.Ε.ΜΗ. line 16px under it, the link and contact columns right at a
 * 64px gap, monospace 10.5px/0.14em uppercase column heads at
 * `#475569`, 13.5px/17px `#94A3B8` links, addresses at 13.5px/1.65,
 * phone numbers in monospace 12.5px/1.8 at `#CBD5E1`, a teal email, a
 * 44px gap to the inner rule and a 22px-padded legal row at 12.5px.
 *
 * The artboard's identity column carries NO blurb — the lockup and the
 * Γ.Ε.ΜΗ. number, nothing else — and its legal row carries only the
 * copyright and LinkedIn. Both are omissions by design, not gaps. The
 * legal pages stay reachable the way the platform already allows an
 * operator-configured footer to reach them: as a `NavigationMenu` row.
 *
 * Everything that reads as content is DATA, not markup: the link
 * columns come from the tenant's `NavigationMenu` footer rows (per
 * locale, so the English site gets English headings), the offices and
 * phones from `STORE_OFFICES`, and the Γ.Ε.ΜΗ. and email from the
 * merchant identity. Nothing about this tenant's content is hardcoded
 * here — only its design is.
 */
const { t } = useI18n()
const { footerColumns } = useNavigation()
const tenantStore = useTenantStore()
const { identity } = useMerchantIdentity()
// The PUBLIC offices, not `identity`'s registered seat: the design's
// contact column lists the two addresses a customer visits, and the
// seat is a third address that belongs on an invoice.
const { offices, phones } = useStoreOffices()

const year = new Date().getFullYear()
</script>

<template>
  <footer
    class="
      border-t border-[#1E293B] bg-[#020617] px-5 pt-14 pb-8
      lg:px-20
    "
  >
    <div
      class="
        mx-auto flex max-w-[1280px] flex-col gap-10 border-b border-[#1E293B]
        pb-11
        lg:flex-row lg:justify-between lg:gap-15
      "
    >
      <div class="flex w-full max-w-[320px] flex-col gap-4">
        <ChromeVariantsDeltaSigmaLogo :show-caption="true" />
        <p
          v-if="identity?.registrationNumber"
          class="font-mono text-[11.5px] leading-none text-[#475569]"
        >
          {{ t('gemi') }}: {{ identity.registrationNumber }}
        </p>
      </div>

      <div class="flex flex-col gap-10 sm:flex-row sm:gap-16">
        <div
          v-for="column in footerColumns ?? []"
          :key="column.label"
          class="flex flex-col gap-3.5"
        >
          <p
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-[#475569] uppercase
            "
          >
            {{ column.label }}
          </p>
          <NuxtLinkLocale
            v-for="child in column.children"
            :key="child.label"
            :to="(child.to ?? '/') as RouteLocationNamedI18n"
            class="
              text-[13.5px] leading-[17px] text-[#94A3B8] transition-colors
              hover:text-white
            "
          >
            {{ child.label }}
          </NuxtLinkLocale>
        </div>

        <div class="flex w-full max-w-[260px] flex-col gap-3.5">
          <p
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-[#475569] uppercase
            "
          >
            {{ t('contact') }}
          </p>
          <p
            v-for="office in offices"
            :key="office.label"
            class="text-[13.5px] leading-[1.65] text-[#94A3B8]"
          >
            {{ office.addressLine }}
          </p>
          <p
            v-if="phones.length"
            class="font-mono text-[12.5px] leading-[1.8] text-[#CBD5E1]"
          >
            <span
              v-for="phone in phones"
              :key="phone"
              class="block"
            >{{ phone }}</span>
          </p>
          <a
            v-if="identity?.email"
            :href="`mailto:${identity.email}`"
            class="
              text-[13.5px] text-[#5BC4C4] transition-colors
              hover:text-[#8EDBDA]
            "
          >{{ identity.email }}</a>
        </div>
      </div>
    </div>

    <div
      class="
        mx-auto flex max-w-[1280px] flex-col gap-4 pt-5.5 text-[12.5px]
        text-[#475569]
        sm:flex-row sm:items-center sm:justify-between
      "
    >
      <span>
        © {{ year }} {{ tenantStore.storeName || 'Δelta Σigma' }}.
        {{ t('rights') }}
      </span>
      <a
        v-if="tenantStore.config?.socialsLinkedin"
        :href="tenantStore.config.socialsLinkedin"
        target="_blank"
        rel="noopener noreferrer"
        class="
          flex items-center gap-1.5 transition-colors
          hover:text-[#94A3B8]
        "
      >
        <UIcon
          name="i-lucide:linkedin"
          class="size-[15px]"
        />
        LinkedIn
      </a>
    </div>
  </footer>
</template>

<i18n lang="yaml">
el:
  gemi: Γ.Ε.ΜΗ.
  contact: Επικοινωνία
  rights: Με επιφύλαξη παντός δικαιώματος.
en:
  gemi: GEMI
  contact: Contact
  rights: All rights reserved.
</i18n>
