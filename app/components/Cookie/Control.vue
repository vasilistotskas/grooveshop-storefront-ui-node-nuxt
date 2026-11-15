<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import { getAllCookieIdsString, getCookieIds, removeCookie } from '#cookie-control/methods'

const { t } = useStoreI18n('components/Cookie/Control')
const tenantStore = useTenantStore()

const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, isModalActive, moduleOptions } = useCookieControl()

const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])
const allCookieIdsString = getAllCookieIdsString(moduleOptions)

// Compute expires only on the client so Date.now() is stable and does not
// produce a hydration mismatch between SSR payload and client re-execution.
const expires = import.meta.client
  ? new Date(Date.now() + moduleOptions.cookieExpiryOffsetMs)
  : undefined

const cookieIsConsentGiven = useCookie(moduleOptions.cookieNameIsConsentGiven, {
  expires,
  ...moduleOptions.cookieOptions,
})
const cookieCookiesEnabledIds = useCookie(moduleOptions.cookieNameCookiesEnabledIds, {
  expires,
  ...moduleOptions.cookieOptions,
})

const accept = () => {
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: moduleOptions.cookies.optional,
  })
}

const acceptPartial = () => {
  const localCookiesEnabledIds = getCookieIds(localCookiesEnabled.value)

  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: [
      ...moduleOptions.cookies.necessary,
      ...moduleOptions.cookies.optional,
    ].filter(cookie => localCookiesEnabledIds.includes(cookie.id)),
  })
}

const decline = () => {
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: moduleOptions.cookies.necessary,
  })
}

const declineAll = () => {
  setCookies({
    isConsentGiven: false,
    cookiesOptionalEnabled: [],
  })
}

const init = () => {
  log.info('cookies', 'Initialized')
}

const setCookies = ({
  cookiesOptionalEnabled: cookiesOptionalEnabledNew,
  isConsentGiven: isConsentGivenNew,
}: {
  cookiesOptionalEnabled: Cookie[]
  isConsentGiven: boolean
}) => {
  isConsentGiven.value = isConsentGivenNew
  cookiesEnabled.value = isConsentGivenNew
    ? [
        ...moduleOptions.cookies.necessary,
        ...moduleOptions.cookies.optional.filter(cookieOptional =>
          cookiesOptionalEnabledNew.includes(cookieOptional),
        ),
      ]
    : []
  cookiesEnabledIds.value = isConsentGivenNew ? getCookieIds(cookiesEnabled.value) : []
}

onBeforeMount(() => {
  if (moduleOptions.isModalForced && !isConsentGiven.value) {
    isModalActive.value = true
  }
})

watch(
  () => cookiesEnabled.value,
  (current) => {
    localCookiesEnabled.value = [...(current || [])]

    if (isConsentGiven.value) {
      cookieCookiesEnabledIds.value = getCookieIds(current || []).join(COOKIE_ID_SEPARATOR)

      if (import.meta.client) {
        for (const cookieEnabled of current || []) {
          if (!cookieEnabled.src) continue

          const srcs = Array.isArray(cookieEnabled.src) ? cookieEnabled.src : [cookieEnabled.src]
          srcs.forEach((src) => {
            if (!document.head.querySelector(`script[src="${src}"]`)) {
              const script = document.createElement('script')
              script.src = src
              document.getElementsByTagName('head')[0]?.appendChild(script)
            }
          })
        }
      }
    }
    else {
      cookieCookiesEnabledIds.value = undefined
    }

    if (import.meta.client) {
      const cookiesOptionalDisabled = moduleOptions.cookies.optional.filter(
        cookieOptional => !(current || []).includes(cookieOptional),
      )

      for (const cookieOptionalDisabled of cookiesOptionalDisabled) {
        if (!cookieOptionalDisabled.targetCookieIds) continue

        for (const cookieOptionalDisabledId of cookieOptionalDisabled.targetCookieIds) {
          removeCookie(cookieOptionalDisabledId)
        }

        if (cookieOptionalDisabled.src) {
          const srcs = Array.isArray(cookieOptionalDisabled.src)
            ? cookieOptionalDisabled.src
            : [cookieOptionalDisabled.src]
          srcs.forEach((src) => {
            document.head.querySelectorAll(`script[src="${src}"]`).forEach((script) => {
              script.parentNode?.removeChild(script)
            })
          })
        }
      }
    }
  },
  { deep: true, immediate: true },
)

watch(isConsentGiven, (current) => {
  if (current === undefined) {
    cookieIsConsentGiven.value = undefined
  }
  else {
    cookieIsConsentGiven.value = current ? allCookieIdsString : '0'
  }
})

init()

defineExpose({
  accept,
  acceptPartial,
  decline,
  declineAll,
})
</script>

<template>
  <aside class="relative z-50">
    <!--
      Client-only on purpose. The consent decision lives in the visitor's
      cookie, but the SWR-cached routes (homepage, catalogue, blog, brand
      pages) are rendered once, anonymously, and served to everyone — so
      the cached HTML carried the banner and every returning visitor saw
      it flash on reload until hydration read their cookie and removed
      it. Rendering it only on the client means the server never commits
      to a consent state it cannot know.
    -->
    <ClientOnly>
      <div
        v-if="tenantStore.hasOptionalServices && !isConsentGiven && !moduleOptions.isModalForced"
        class="
          fixed inset-x-0 bottom-(--dock-stack) z-50 mx-auto
          max-h-[calc(100dvh-var(--dock-stack)-var(--dock-gap))] max-w-sm
          overflow-y-auto rounded-md border border-primary-200 bg-primary-50 p-4
          text-primary-600 shadow-xl
          sm:max-w-xl
          md:px-6
          lg:max-w-4xl
          dark:border-primary-700 dark:bg-primary-800 dark:text-primary-100
        "
      >
        <div
          class="
            flex flex-col items-center justify-between text-xs text-primary-700
            lg:flex-row
            dark:text-primary-100
          "
        >
          <div>
            <slot name="bar">
              <h2
                class="mb-1 font-semibold"
                v-text="t('banner.title')"
              />
              <p
                class="
                  text-sm text-primary-600
                  dark:text-primary-100
                "
                v-text="t('banner.description', { services: tenantStore.optionalServices.join(', ') })"
              />
            </slot>
          </div>
          <!-- Wrapping below `md` only: three large buttons are wider than a
               small phone, and the last one — Decline, the answer that must
               be as easy to give as Accept — ran off the screen. From `md`
               up the row never wraps, so it cannot shrink beside the text
               and stack its buttons. -->
          <div
            class="
              mt-4 ml-auto flex items-center gap-2
              max-md:flex-wrap max-md:justify-end
              md:flex-row-reverse md:space-y-0
              lg:mt-0
            "
          >
            <UButton
              type="button"
              :label="t('manage_cookies')"
              color="secondary"
              variant="solid"
              size="lg"
              @click="() => { isModalActive = true }"
            />
            <UButton
              type="button"
              :label="t('accept')"
              color="neutral"
              variant="outline"
              size="lg"
              @click="accept()"
            />
            <UButton
              v-if="moduleOptions.isAcceptNecessaryButtonEnabled"
              type="button"
              :label="t('decline')"
              color="neutral"
              variant="outline"
              size="lg"
              @click="decline()"
            />
          </div>
        </div>
      </div>
    </ClientOnly>
    <LazyCookieModal v-if="isModalActive" />
  </aside>
</template>

<i18n lang="yaml">
el:
  accept: Αποδοχή
  banner:
    description: "Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για να εξατομικεύσουμε το περιεχόμενο και να προσφέρουμε καλύτερη εμπειρία. Μπορείς να επιλέξεις την προσαρμογή τους κάνοντας κλικ στο κουμπί προσαρμογής. Υπηρεσίες που χρησιμοποιούμε με τη συγκατάθεσή σας: {services}."
    title: "\U0001F36A Γεια. Αυτός ο ιστότοπος χρησιμοποιεί Cookies \U0001F36A"
  decline: Απόρριψη
  manage_cookies: Ρυθμίσεις cookies
en:
  accept: Accept
  banner:
    description: "We use cookies and similar technologies to personalise content and offer a better experience. You can customise them by clicking the customise button. Services we use with your consent: {services}."
    title: "\U0001F36A Hi. This site uses cookies \U0001F36A"
  decline: Decline
  manage_cookies: Cookie settings
</i18n>
