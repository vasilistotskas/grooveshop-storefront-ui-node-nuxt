<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR, ZodCookieTypeEnum } from '#cookie-control/types'
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

const isUnSaved = computed(() => {
  return getCookieIds(cookiesEnabled.value || [])
    .sort()
    .join(COOKIE_ID_SEPARATOR) !== getCookieIds(localCookiesEnabled.value).sort().join(COOKIE_ID_SEPARATOR)
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

const getDescription = (description: string) =>
  `${!moduleOptions.isDashInDescriptionEnabled ? '' : '-'} ${t(description)}`

const getName = (name: string) => t(name)

const resolveLinkEntryText = (entry: [string, unknown]) => (typeof entry[1] === 'string' ? t(entry[1] as string) : entry[0])

const init = () => {
  if (import.meta.env.NODE_ENV !== 'production') {
    console.log('Cookies Initialized')
  }
}

const onModalClick = () => {
  if (moduleOptions.closeModalOnClickOutside) {
    isModalActive.value = false
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

const toggleButton = ($event: MouseEvent) => {
  const target = $event.target as HTMLButtonElement | null
  if (!target) return
  const nextSibling = target.nextSibling as HTMLLabelElement | null
  if (!nextSibling) return
  nextSibling.click()
}

const toggleCookie = (cookie: Cookie) => {
  const cookieIndex = getCookieIds(localCookiesEnabled.value).indexOf(cookie.id)
  if (cookieIndex < 0) {
    localCookiesEnabled.value.push(cookie)
  }
  else {
    if (getName(cookie.name) === t('components.cookie.cookies.necessary')) {
      return
    }
    localCookiesEnabled.value.splice(cookieIndex, 1)
  }
}

const toggleLabel = ($event: KeyboardEvent) => {
  const target = $event.target as HTMLLabelElement | null
  if (!target) return
  if ($event.key === ' ') {
    target.click()
  }
}

onBeforeMount(() => {
  if (moduleOptions.isModalForced && !isConsentGiven.value) {
    isModalActive.value = true
  }
})

watch(
  () => cookiesEnabled.value,
  (current) => {
    if (!import.meta.client) {
      return
    }
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
})
</script>

<template>
  <aside class="cookie-control">
    <Transition :name="`cookie-control-Bar`">
      <div
        v-if="!isConsentGiven && !moduleOptions.isModalForced"
        :class="`cookie-control-Bar`"
      >
        <div class="cookie-control-BarContainer">
          <div>
            <slot name="bar">
              <h2 v-text="$t('components.cookie.banner.title')" />
              <p v-text="$t('components.cookie.banner.description')" />
            </slot>
          </div>
          <div class="cookie-control-BarButtons">
            <button
              class="cookie-control-BarButtons-ManageCookies"
              type="button"
              @click="isModalActive = true"
              v-text="$t('components.cookie.manage_cookies')"
            />
            <button
              class="cookie-control-BarButtons-AcceptAll"
              type="button"
              @click="accept()"
              v-text="$t('components.cookie.accept')"
            />
            <button
              v-if="moduleOptions.isAcceptNecessaryButtonEnabled"
              class="cookie-control-BarButtons-Decline"
              type="button"
              @click="decline()"
              v-text="$t('components.cookie.decline')"
            />
          </div>
        </div>
      </div>
    </Transition>
    <button
      v-if="moduleOptions.isControlButtonEnabled && isConsentGiven"
      :title="$t('common.cookies')"
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
    <Transition name="cookie-control-Modal">
      <div
        v-if="isModalActive"
        class="cookie-control-Modal"
        @click.self="onModalClick"
      >
        <p
          v-if="isUnSaved"
          class="cookie-control-ModalUnsaved"
          v-text="$t('components.cookie.settings.unsaved')"
        />
        <div class="cookie-control-ModalContent">
          <div class="cookie-control-ModalContentInner">
            <slot name="modal">
              <h2>{{ $t('components.cookie.modal.title') }}</h2>
              <p>{{ $t('components.cookie.modal.description') }}</p>
            </slot>
            <button
              v-if="!moduleOptions.isModalForced"
              class="cookie-control-ModalClose"
              type="button"
              @click="isModalActive = false"
              v-text="$t('components.cookie.close')"
            />
            <template
              v-for="cookieType in ZodCookieTypeEnum.enum"
              :key="cookieType"
            >
              <template v-if="moduleOptions.cookies[cookieType].length">
                <h2
                  v-text="cookieType === ZodCookieTypeEnum.enum.necessary ? $t('components.cookie.cookies.necessary') : $t('components.cookie.cookies.optional')"
                />
                <ul>
                  <li
                    v-for="cookie in moduleOptions.cookies[cookieType]"
                    :key="cookie.id"
                  >
                    <div class="cookie-control-ModalInputWrapper">
                      <input
                        v-if="cookieType === ZodCookieTypeEnum.enum.necessary && getName(cookie.name) === $t('components.cookie.cookies.necessary')"
                        :id="cookie.id"
                        :name="getName(cookie.name)"
                        :placeholder="getName(cookie.name)"
                        checked
                        disabled
                        type="checkbox"
                      >
                      <input
                        v-else
                        :id="cookie.id"
                        :checked="getCookieIds(localCookiesEnabled).includes(cookie.id)"
                        type="checkbox"
                        @change="toggleCookie(cookie)"
                      >
                      <button
                        type="button"
                        @click="toggleButton($event)"
                      >
                        {{ getName(cookie.name) }}
                      </button>
                      <label
                        :for="getName(cookie.name)"
                        class="cookie-control-ModalCookieName"
                        tabindex="0"
                        @click="toggleCookie(cookie)"
                        @keydown="toggleLabel($event)"
                      >
                        {{ getName(cookie.name) }}
                        <span v-if="moduleOptions.isCookieIdVisible && cookie.targetCookieIds">
                          {{ 'IDs: ' + cookie.targetCookieIds.map((id) => `"${id}"`).join(', ') }}
                        </span>
                        <template v-if="Object.entries(cookie.links || {}).length">
                          <span
                            v-for="entry in Object.entries(cookie.links || {})"
                            :key="entry[0]"
                          >
                            <a :href="entry[0]">{{ resolveLinkEntryText(entry) }}</a>
                          </span>
                        </template>
                      </label>
                      <ReadMore
                        v-if="cookie.description"
                        :max-chars="100"
                        :text="getDescription(cookie.description)"
                        class="mt-2"
                      />
                    </div>
                  </li>
                </ul>
              </template>
            </template>
            <div class="cookie-control-ModalButtons">
              <button
                type="button"
                @click="() => { acceptPartial(); isModalActive = false }"
                v-text="$t('components.cookie.save')"
              />
              <button
                type="button"
                @click="() => { accept(); isModalActive = false }"
                v-text="$t('components.cookie.accept_all')"
              />
              <button
                v-if="!moduleOptions.isModalForced"
                type="button"
                @click="() => { declineAll(); isModalActive = false }"
                v-text="$t('components.cookie.decline_all')"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </aside>
</template>
