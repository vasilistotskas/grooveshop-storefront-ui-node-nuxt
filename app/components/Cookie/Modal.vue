<script lang="ts" setup>
import { type Cookie, COOKIE_ID_SEPARATOR, ZodCookieTypeEnum } from '#cookie-control/types'
import { getCookieIds } from '#cookie-control/methods'

const { t } = useI18n()
const { $i18n } = useNuxtApp()

const { cookiesEnabled, cookiesEnabledIds, isConsentGiven, isModalActive, moduleOptions } = useCookieControl()

const localCookiesEnabled = ref([...(cookiesEnabled.value || [])])

const onModalClick = () => {
  if (moduleOptions.closeModalOnClickOutside) {
    isModalActive.value = false
  }
}

const resolveLinkEntryText = (entry: [string, unknown]) =>
  typeof entry[1] === 'string' ? $i18n.t(entry[1] as string) : entry[0]

const getName = (name: string) => $i18n.t(name)

const getDescription = (description: string) =>
  `${!moduleOptions.isDashInDescriptionEnabled ? '' : '-'} ${$i18n.t(description)}`

function isCookieEnabled(cookie: Cookie) {
  return localCookiesEnabled.value.some(c => c.id === cookie.id)
}

const toggleCookie = (cookie: Cookie, cookieType: string) => {
  const cookieIndex = getCookieIds(localCookiesEnabled.value).indexOf(cookie.id)
  if (cookieIndex < 0) {
    localCookiesEnabled.value.push(cookie)
    cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
  }
  else {
    if (cookieType === ZodCookieTypeEnum.enum.necessary) {
      cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
      return
    }
    localCookiesEnabled.value.splice(cookieIndex, 1)
    cookiesEnabledIds.value = getCookieIds(localCookiesEnabled.value)
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
        ...moduleOptions.cookies.optional.filter(cookieOptional => cookiesOptionalEnabledNew.includes(cookieOptional)),
      ]
    : []
  cookiesEnabledIds.value = isConsentGivenNew ? getCookieIds(cookiesEnabled.value) : []
}

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

const declineAll = () => {
  setCookies({
    isConsentGiven: true,
    cookiesOptionalEnabled: [],
  })
}

const isUnSaved = computed(() => {
  return getCookieIds(cookiesEnabled.value || [])
    .sort()
    .join(COOKIE_ID_SEPARATOR) !== getCookieIds(localCookiesEnabled.value).sort().join(COOKIE_ID_SEPARATOR)
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isModalActive"
      class="
        fixed inset-0 z-[1000] flex items-center overflow-y-auto bg-black/25
        px-4 py-6 pt-8 shadow-xl ring-1 drop-shadow-sm backdrop-blur-[0.125em]
        md:pt-0
      "
      @click.self="onModalClick"
    >
      <p
        v-if="isUnSaved"
        class="
          fixed right-0 bottom-0 left-0 z-50 mx-auto mb-5 border
          border-primary-200 bg-primary-50 p-3 text-center text-sm
          sm:right-16 sm:bottom-6 sm:left-16 sm:max-w-sm sm:rounded-md
          dark:border-primary-700 dark:bg-primary-800
        "
        v-text="t('settings.unsaved')"
      />
      <div
        class="
          relative mb-6 transform rounded-lg border border-primary-200
          bg-primary-50 shadow-xl transition-all
          sm:mx-auto sm:w-full
          md:max-w-3xl
          dark:border-primary-700 dark:bg-primary-800
        "
      >
        <div
          class="
            relative max-h-[90vh] overflow-y-scroll px-4 py-2
            md:max-h-[80vh] md:px-7 md:py-3
          "
        >
          <slot name="modal">
            <h2
              class="
                mt-3 text-2xl font-medium text-primary-600
                dark:text-primary-100
              "
            >
              {{ t('modal.title') }}
            </h2>
            <p
              class="
                mt-6 mb-5 border-b pb-5 text-sm text-primary-600
                dark:text-primary-100
              "
            >
              {{ t('modal.description') }}
            </p>
          </slot>
          <UButton
            v-if="!moduleOptions.isModalForced"
            type="button"
            :label="t('close')"
            color="error"
            variant="solid"
            class="
              absolute top-2 right-6 z-10
              md:top-6
            "
            @click="isModalActive = false"
          />
          <template
            v-for="cookieType in ZodCookieTypeEnum.enum"
            :key="cookieType"
          >
            <template v-if="moduleOptions.cookies[cookieType].length">
              <h2
                class="
                  mt-3 text-lg font-semibold text-primary-600
                  dark:text-primary-100
                "
                v-text="cookieType === ZodCookieTypeEnum.enum.necessary ? $i18n.t('cookies.necessary') : $i18n.t('cookies.optional')"
              />
              <ul>
                <li
                  v-for="cookie in moduleOptions.cookies[cookieType]"
                  :key="cookie.id"
                  class="
                    relative my-3 rounded-md border border-primary-200
                    bg-primary-100 p-3
                    md:p-5
                    dark:border-primary-700 dark:bg-primary-700
                  "
                >
                  <div class="flex flex-col">
                    <USwitch
                      :model-value="isCookieEnabled(cookie)"
                      color="secondary"
                      size="xl"
                      unchecked-icon="i-lucide-x"
                      checked-icon="i-lucide-check"
                      :label="getName(cookie.name)"
                      :disabled="cookieType === ZodCookieTypeEnum.enum.necessary"
                      :ui="{
                        root: 'flex-row-reverse w-full',
                        base: 'cursor-pointer',
                        wrapper: 'w-full m-0',
                        label: 'cursor-pointer',
                      }"
                      @update:model-value="(_: boolean) => toggleCookie(cookie, cookieType)"
                    />
                    <div>
                      <span
                        v-if="moduleOptions.isCookieIdVisible && cookie.targetCookieIds && cookie.targetCookieIds.length"
                        class="mt-2 block text-xs font-normal"
                      >
                        {{ 'IDs: ' + cookie.targetCookieIds.map((id) => `"${id}"`).join(', ') }}
                      </span>
                      <template v-if="Object.entries(cookie.links || {}).length">
                        <span
                          v-for="entry in Object.entries(cookie.links || {})"
                          :key="entry[0]"
                        >
                          <a
                            :href="entry[0]"
                            class="
                              text-blue-600 underline
                              hover:text-blue-800
                            "
                          >
                            {{ resolveLinkEntryText(entry) }}
                          </a>
                        </span>
                      </template>
                    </div>
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
          <div
            class="
              mt-5 mb-2 grid gap-2
              md:flex md:justify-between md:gap-0
            "
          >
            <UButton
              v-if="!moduleOptions.isModalForced"
              :label="t('decline_all')"
              color="neutral"
              variant="outline"
              size="lg"
              @click="() => { declineAll(); isModalActive = false }"
            />
            <div
              class="
                grid gap-2
                md:flex
              "
            >
              <UButton
                :label="t('accept_all')"
                color="neutral"
                variant="outline"
                size="lg"
                @click="() => { accept(); isModalActive = false }"
              />
              <UButton
                :label="t('save')"
                color="secondary"
                variant="solid"
                size="lg"
                @click="() => { acceptPartial(); isModalActive = false }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<i18n lang="yaml">
el:
  title: Cookies
  accept: Αποδοχή
  accept_all: Αποδοχή όλων
  modal:
    title: Προσαρμογή
    description: "Χρησιμοποιούμε διαφορετικούς τύπους cookies για να βελτιστοποιήσουμε την εμπειρία σας στον ιστότοπο μας. Κάνε click στις παρακάτω κατηγορίες για να μάθεις περισσότερα σχετικά με τους σκοπούς τους. Μπορείς να επιλέξεις τους τύπους Cookies που θα επιτρέπονται καθώς και να αλλάξεις τις προτιμήσεις σου αργότερα. Να θυμάσαι ότι η απαγόρευση των cookies μπορεί να επηρεάσει την εμπειρία σου."
  close: Κλείσιμο
  decline_all: Απόρριψη όλων
  save: Αποθήκευση
  settings:
    unsaved: Έχεις μη αποθηκευμένες αλλαγές
</i18n>
