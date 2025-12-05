<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import { getAllCookieIdsString, getCookieIds, removeCookie } from '#cookie-control/methods'

const { t } = useI18n()

const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, isModalActive, moduleOptions } = useCookieControl()

const expires = new Date(Date.now() + moduleOptions.cookieExpiryOffsetMs)
const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])
const allCookieIdsString = getAllCookieIdsString(moduleOptions)
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
  if (import.meta.env.NODE_ENV !== 'production') {
    console.info('Cookies Initialized')
  }
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
    else {
      cookieCookiesEnabledIds.value = undefined
    }

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
    <div
      v-if="!isConsentGiven && !moduleOptions.isModalForced"
      class="
          fixed right-0 bottom-2 left-0 z-50 mx-auto max-w-sm rounded-md border
          border-primary-200 bg-primary-50 px-4 py-4 text-primary-600 shadow-xl
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
              v-text="t('banner.description')"
            />
          </slot>
        </div>
        <div
          class="
              mt-4 ml-auto flex items-center gap-2
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
            @click="isModalActive = true"
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
    <button
      v-if="moduleOptions.isControlButtonEnabled && isConsentGiven"
      :title="t('title')"
      aria-label="Cookie control"
      data-testid="nuxt-cookie-control-control-button"
      type="button"
      class="
          fixed bottom-[160px] left-[20px] h-[36px] w-[36px] cursor-pointer
          rounded-full border border-primary-200 bg-primary-50 text-primary-900
          transition duration-200
          hover:bg-white hover:text-primary-700
          focus:ring-primary-200
          dark:border-primary-600 dark:bg-primary-800 dark:text-primary-100
          dark:hover:bg-primary-700 dark:hover:text-white
          dark:focus:ring-primary-700
        "
      @click="isModalActive = true"
    >
      <UIcon
        name="i-unjs:cookie-es"
        mode="svg"
        class="
            absolute top-1/2 left-1/2 max-h-[24px] min-h-[24px] max-w-[24px]
            min-w-[24px] -translate-x-1/2 -translate-y-1/2 transform
            text-primary-600 transition duration-200
            dark:text-primary-100
          "
      />
    </button>
    <LazyCookieModal v-if="isModalActive" />
  </aside>
</template>

<i18n lang="yaml">
el:
  title: Cookies
  accept: Αποδοχή
  banner:
    description: "Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για να εξατομικεύσουμε το περιεχόμενο και να προσφέρουμε καλύτερη εμπειρία. Μπορείς να επιλέξεις την προσαρμογή τους κάνοντας κλικ στο κουμπί προσαρμογής."
    title: "\U0001F36A Γεια. Αυτός ο ιστότοπος χρησιμοποιεί Cookies \U0001F36A"
  decline: Απόρριψη
  manage_cookies: Ρυθμίσεις cookies
</i18n>
