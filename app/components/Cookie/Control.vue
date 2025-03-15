<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR } from '#cookie-control/types'
import { getAllCookieIdsString, getCookieIds, removeCookie } from '#cookie-control/methods'
import 'assets/sass/_cookies.scss'

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
    console.debug('Cookies Initialized')
  }
}

const setCookies = ({
  cookiesOptionalEnabled: cookiesOptionalEnabledNew,
  isConsentGiven: isConsentGivenNew,
}: {
  cookiesOptionalEnabled: Cookie[]
  isConsentGiven: boolean
}) => {
  isConsentGiven.value = isConsentGivenNew // must come before an update to `cookiesEnabled`
  cookiesEnabled.value = isConsentGivenNew
    ? [
        ...moduleOptions.cookies.necessary,
        ...moduleOptions.cookies.optional.filter(cookieOptional => cookiesOptionalEnabledNew.includes(cookieOptional)),
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

    const cookiesOptionalDisabled = moduleOptions.cookies.optional.filter(cookieOptional => !(current || []).includes(cookieOptional))

    for (const cookieOptionalDisabled of cookiesOptionalDisabled) {
      if (!cookieOptionalDisabled.targetCookieIds) continue

      for (const cookieOptionalDisabledId of cookieOptionalDisabled.targetCookieIds) {
        removeCookie(cookieOptionalDisabledId)
      }

      if (cookieOptionalDisabled.src) {
        const srcs = Array.isArray(cookieOptionalDisabled.src) ? cookieOptionalDisabled.src : [cookieOptionalDisabled.src]
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

// initialization
init()

defineExpose({
  accept,
  acceptPartial,
  decline,
  declineAll,
})
</script>

<template>
  <ClientOnly>
    <aside class="cookie-control">
      <div
        v-if="!isConsentGiven && !moduleOptions.isModalForced"
        :class="`cookie-control-Bar`"
      >
        <div class="cookie-control-BarContainer">
          <div>
            <slot name="bar">
              <h2 v-text="t('banner.title')" />
              <p v-text="t('banner.description')" />
            </slot>
          </div>
          <div class="cookie-control-BarButtons">
            <button
              class="cookie-control-BarButtons-ManageCookies"
              type="button"
              @click="isModalActive = true"
              v-text="t('manage_cookies')"
            />
            <button
              class="cookie-control-BarButtons-AcceptAll"
              type="button"
              @click="accept()"
              v-text="t('accept')"
            />
            <button
              v-if="moduleOptions.isAcceptNecessaryButtonEnabled"
              class="cookie-control-BarButtons-Decline"
              type="button"
              @click="decline()"
              v-text="t('decline')"
            />
          </div>
        </div>
      </div>
      <button
        v-if="moduleOptions.isControlButtonEnabled && isConsentGiven"
        :title="t('title')"
        aria-label="Cookie control"
        class="cookie-control-ControlButton"
        data-testid="nuxt-cookie-control-control-button"
        type="button"
        @click="isModalActive = true"
      >
        <svg
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M510.52 255.82c-69.97-.85-126.47-57.69-126.47-127.86-70.17 0-127-56.49-127.86-126.45-27.26-4.14-55.13.3-79.72 12.82l-69.13 35.22a132.221 132.221 0 00-57.79 57.81l-35.1 68.88a132.645 132.645 0 00-12.82 80.95l12.08 76.27a132.521 132.521 0 0037.16 72.96l54.77 54.76a132.036 132.036 0 0072.71 37.06l76.71 12.15c27.51 4.36 55.7-.11 80.53-12.76l69.13-35.21a132.273 132.273 0 0057.79-57.81l35.1-68.88c12.56-24.64 17.01-52.58 12.91-79.91zM176 368c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm32-160c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm160 128c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"
            fill="currentColor"
          />
        </svg>
      </button>
      <LazyCookieModal v-if="isModalActive" />
    </aside>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  title: Cookies
  accept: Αποδοχή
  banner:
    description: Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες για να εξατομικεύσουμε
      το περιεχόμενο και να προσφέρουμε καλύτερη εμπειρία. Μπορείς να επιλέξεις
      την προσαρμογή τους κάνοντας κλικ στο κουμπί προσαρμογής.
    title: "\U0001F36A Γεια. Αυτός ο ιστότοπος χρησιμοποιεί Cookies \U0001F36A"
  decline: Απόρριψη
  manage_cookies: Ρυθμίσεις cookies
</i18n>
