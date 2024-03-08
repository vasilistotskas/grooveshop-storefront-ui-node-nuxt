<script lang="ts" setup>
import {
  getAllCookieIdsString,
  getCookieId,
  getCookieIds,
  removeCookie,
} from '#cookie-control/methods'
import type { Cookie } from '#cookie-control/types'
import { ZodCookieTypeEnum } from '#cookie-control/types'
import 'assets/sass/_cookies.scss'

defineSlots<{
  bar(props: {}): any
  modal(props: {}): any
}>()

const { t } = useI18n()

const {
  cookiesEnabled,
  cookiesEnabledIds,
  isConsentGiven,
  isModalActive,
  moduleOptions,
} = useCookieControl()

// data
const expires = new Date(Date.now() + moduleOptions.cookieExpiryOffsetMs)
const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])
const allCookieIdsString = getAllCookieIdsString(moduleOptions)
const cookieIsConsentGiven = useCookie(moduleOptions.cookieNameIsConsentGiven, {
  expires,
  ...moduleOptions.cookieOptions,
})
const cookieCookiesEnabledIds = useCookie(
  moduleOptions.cookieNameCookiesEnabledIds,
  {
    expires,
    ...moduleOptions.cookieOptions,
  },
)
// computations
const isSaved = computed(
  () =>
    getCookieIds(cookiesEnabled.value || [])
      .sort()
      .join('|') !== getCookieIds(localCookiesEnabled.value).sort().join('|'),
)

// methods
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
    ].filter((cookie) => localCookiesEnabledIds.includes(getCookieId(cookie))),
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
const getName = (name: string) => {
  return name === 'functional'
    ? t('components.cookie.cookies.functional')
    : t(name)
}
const resolveLinkEntryText = (entry: [string, unknown]) => {
  if (typeof entry[1] === 'string') {
    return t(entry[1] as string)
  }
  return entry[0]
}
const init = () => {
  // eslint-disable-next-line no-console
  console.log('Cookies Initialized')
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
        ...moduleOptions.cookies.optional.filter((cookieOptional: Cookie) =>
          cookiesOptionalEnabledNew.includes(cookieOptional),
        ),
      ]
    : []
  cookiesEnabledIds.value = isConsentGivenNew
    ? getCookieIds(cookiesEnabled.value)
    : []
}
const toggleButton = ($event: MouseEvent) => {
  (
    ($event.target as HTMLButtonElement | null)?.nextSibling as HTMLLabelElement
  )?.click()
}

const toggleCookie = (cookie: Cookie) => {
  const cookieIndex = getCookieIds(localCookiesEnabled.value).indexOf(
    getCookieId(cookie),
  )

  if (cookieIndex < 0) {
    localCookiesEnabled.value.push(cookie)
  } else {
    localCookiesEnabled.value.splice(cookieIndex, 1)
  }
}
const toggleLabel = ($event: KeyboardEvent) => {
  if ($event.key === ' ') ($event.target as HTMLLabelElement)?.click()
}
// lifecycle
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
      cookieCookiesEnabledIds.value = getCookieIds(current || []).join('|')

      for (const cookieEnabled of current || []) {
        if (!cookieEnabled.src) continue

        const srcs = Array.isArray(cookieEnabled.src)
          ? cookieEnabled.src
          : [cookieEnabled.src]
        srcs.forEach((src) => {
          const script = document.createElement('script')
          script.src = src
          document.getElementsByTagName('head')[0].appendChild(script)
        })
      }
    } else {
      cookieCookiesEnabledIds.value = undefined
    }

    const cookiesOptionalDisabled = moduleOptions.cookies.optional.filter(
      (cookieOptional) => !(current || []).includes(cookieOptional),
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
          document.head
            .querySelectorAll(`script[src="${src}"]`)
            .forEach((script) => {
              script.parentNode?.removeChild(script)
            })
        })
      }
    }
  },
  { deep: true },
)

watch(isConsentGiven, (current) => {
  if (current === undefined) {
    cookieIsConsentGiven.value = undefined
  } else {
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
              type="button"
              class="cookie-control-BarButtons-Decline"
              @click="decline()"
              v-text="$t('components.cookie.decline')"
            />
          </div>
        </div>
      </div>
    </Transition>
    <button
      v-if="moduleOptions.isControlButtonEnabled && isConsentGiven"
      type="button"
      aria-label="Cookie control"
      class="cookie-control-ControlButton"
      data-testid="nuxt-cookie-control-control-button"
      @click="isModalActive = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path
          fill="currentColor"
          d="M510.52 255.82c-69.97-.85-126.47-57.69-126.47-127.86-70.17 0-127-56.49-127.86-126.45-27.26-4.14-55.13.3-79.72 12.82l-69.13 35.22a132.221 132.221 0 00-57.79 57.81l-35.1 68.88a132.645 132.645 0 00-12.82 80.95l12.08 76.27a132.521 132.521 0 0037.16 72.96l54.77 54.76a132.036 132.036 0 0072.71 37.06l76.71 12.15c27.51 4.36 55.7-.11 80.53-12.76l69.13-35.21a132.273 132.273 0 0057.79-57.81l35.1-68.88c12.56-24.64 17.01-52.58 12.91-79.91zM176 368c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm32-160c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zm160 128c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32z"
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
          v-if="isSaved"
          class="cookie-control-ModalUnsaved"
          v-text="$t('components.cookie.settings.unsaved')"
        />
        <div class="cookie-control-ModalContent">
          <div class="cookie-control-ModalContentInner">
            <slot name="modal">
              <h2>{{ $t('components.cookie.modal.title') }}</h2>
              <p>
                {{ $t('components.cookie.modal.description') }}
              </p>
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
                  v-text="
                    cookieType === ZodCookieTypeEnum.enum.necessary
                      ? $t('components.cookie.cookies.necessary')
                      : $t('components.cookie.cookies.optional')
                  "
                />
                <ul>
                  <li
                    v-for="cookie in moduleOptions.cookies[cookieType]"
                    :key="cookie.id"
                  >
                    <div class="cookie-control-ModalInputWrapper">
                      <input
                        v-if="
                          cookieType === ZodCookieTypeEnum.enum.necessary &&
                            cookie.name !== 'functional'
                        "
                        :id="cookie.name"
                        :name="cookie.name"
                        :placeholder="cookie.name"
                        type="checkbox"
                        disabled
                        checked
                      >
                      <input
                        v-else
                        :id="cookie.name"
                        type="checkbox"
                        :checked="
                          getCookieIds(localCookiesEnabled).includes(
                            getCookieId(cookie),
                          )
                        "
                        @change="toggleCookie(cookie)"
                      >
                      <button type="button" @click="toggleButton($event)">
                        {{ getName(cookie.name) }}
                      </button>
                      <label
                        class="cookie-control-ModalCookieName"
                        :for="getName(cookie.name)"
                        tabindex="0"
                        @keydown="toggleLabel($event)"
                      >
                        {{ getName(cookie.name) }}
                        <span v-if="cookie.description">
                          {{ getDescription(cookie.description) }}
                        </span>
                        <span
                          v-if="
                            moduleOptions.isCookieIdVisible &&
                              cookie.targetCookieIds
                          "
                        >
                          <br>
                          {{
                            'IDs: ' +
                              cookie.targetCookieIds
                                .map((id: string) => `"${id}"`)
                                .join(', ')
                          }}
                        </span>
                        <template
                          v-if="Object.entries(cookie.links || {}).length"
                        >
                          <span
                            v-for="entry in Object.entries(cookie.links || {})"
                            :key="entry[0]"
                          >
                            <br>
                            <a :href="entry[0]">{{
                              resolveLinkEntryText(entry)
                            }}</a>
                          </span>
                        </template>
                      </label>
                    </div>
                  </li>
                </ul>
              </template>
            </template>
            <div class="cookie-control-ModalButtons">
              <button
                type="button"
                @click="
                  () => {
                    acceptPartial()
                    isModalActive = false
                  }
                "
                v-text="$t('components.cookie.save')"
              />
              <button
                type="button"
                @click="
                  () => {
                    accept()
                    isModalActive = false
                  }
                "
                v-text="$t('components.cookie.accept_all')"
              />
              <button
                v-if="!moduleOptions.isModalForced"
                type="button"
                @click="
                  () => {
                    declineAll()
                    isModalActive = false
                  }
                "
                v-text="$t('components.cookie.decline_all')"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </aside>
</template>
